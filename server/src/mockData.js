/*
  MOCK mode: physics-based simulation of the PI temperature-flow cascade.

  It runs the same control logic as the Arduino firmware (pi_cascade_controller):
  outer outlet-temperature PI -> flow setpoint q*, inner flow PI -> pump PWM,
  conditional-integration anti-windup, bumpless start, supervisory state machine
  (INIT -> FLOW_ONLY -> CASCADE, FAULT, STOPPED) and the same JSON fields.

  Plant parameters are ASSUMED values (same as the report's simulation study):
  300 W net heat, 0.5-3.5 L/min. They make the dashboard behave realistically;
  they are not prototype measurements.
*/

const CP = 4186;          // J/(kg K)
const C_TH = 3000;        // J/K receiver heat capacity
const UA = 1.5;           // W/K loss coefficient
const T_AMB = 30;
const KQ = 0.0205;        // (L/min)/PWM count
const U_DZ = 60;          // pump dead-zone
const TAU_Q = 1.5;        // s
const TAU_S = 6;          // s probe lag
const K_FLOW = 7.5;       // Hz per L/min (450 pulses/L)

const Q_MIN = 0.5, Q_MAX = 3.5, U_MIN = 80, U_MAX = 255;
const Q0 = 1.5, U0 = 120;
const T_MAX = 70;
const FLOW_SETTLE_S = 20;

const F_SENSOR = 1, F_STALE = 2, F_OVERTEMP = 4, F_NOFLOW = 8;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

class PI {
  constructor(kp, ki, bias, lo, hi) {
    Object.assign(this, { kp, ki, bias, lo, hi, integ: 0, raw: bias, satHi: false, satLo: false });
  }
  step(e, ts, freeze = false) {
    this.raw = this.bias + this.kp * e + this.integ;
    const out = clamp(this.raw, this.lo, this.hi);
    this.satHi = this.raw >= this.hi;
    this.satLo = this.raw <= this.lo;
    const push = (this.satHi && e > 0) || (this.satLo && e < 0);
    if (!push && !freeze) this.integ += this.ki * e * ts;
    return out;
  }
  bumpless(applied, e) { this.integ = applied - this.bias - this.kp * e; }
  reset() { this.integ = 0; this.raw = this.bias; this.satHi = this.satLo = false; }
}

class CascadeSim {
  constructor() {
    this.inner = new PI(20, 10, U0, U_MIN, U_MAX);
    this.outer = new PI(0.3, 0.0085, Q0, Q_MIN, Q_MAX);
    this.tSet = 35;
    this.reset(true);
  }

  reset(full = false) {
    if (full) {
      this.t = 0;
      this.tR = 30;            // receiver temperature
      this.tProbe = 30;        // outlet probe temperature
      this.q = 0;              // true flow
      this.pulseAcc = 0;
      this.pulses = 0;
      this.qBuf = [];
      this.solar = 300;        // W
      this.tIn = 30;
      this.headFactor = 1;
      this.cloudUntil = 0;
      this.sensorFailUntil = 0;
    }
    this.inner.reset();
    this.outer.reset();
    this.u = 0;
    this.qStar = Q0;
    this.qMeas = 0;
    this.fault = 0;
    this.mode = 'INIT';
    this.modeSince = this.t;
    this.noFlowSince = null;
  }

  setMode(m) {
    if (m === this.mode) return;
    if (m === 'CASCADE') this.outer.bumpless(this.qStar, this.tOut() - this.tSet);
    if (m === 'FLOW_ONLY') { this.inner.bumpless(this.u > 0 ? this.u : U0, 0); this.qStar = Q0; }
    this.mode = m;
    this.modeSince = this.t;
  }

  tOut() { return Math.round(this.tProbe / 0.0625) * 0.0625; }

  // ---- commands (same as firmware serial commands) ----
  command(cmd, value) {
    if (cmd === 'setpoint') {
      const v = Number(value);
      if (!(v > 20 && v < T_MAX - 5)) return { ok: false, error: 'Setpoint must be between 20 and 65 °C' };
      this.tSet = v;
      return { ok: true };
    }
    if (cmd === 'reset') {
      if (this.mode !== 'FAULT' && this.mode !== 'STOPPED') return { ok: false, error: 'Reset is only accepted in FAULT or STOPPED' };
      this.reset(false);
      return { ok: true };
    }
    if (cmd === 'stop') { this.u = 0; this.mode = 'STOPPED'; this.modeSince = this.t; return { ok: true }; }
    // simulation-only disturbances
    if (cmd === 'sim:cloud') { this.cloudUntil = this.t + 120; return { ok: true }; }
    if (cmd === 'sim:clog') { this.headFactor = this.headFactor < 1 ? 1 : 0.7; return { ok: true }; }
    if (cmd === 'sim:inlet') { this.tIn = this.tIn > 30.5 ? 30 : 32; return { ok: true }; }
    if (cmd === 'sim:sensor') { this.sensorFailUntil = this.t + 8; return { ok: true }; }
    return { ok: false, error: `Unknown command ${cmd}` };
  }

  plantStep(dt) {
    // slowly varying sun + optional cloud passage
    const base = 300 + 25 * Math.sin(this.t / 240);
    const target = this.t < this.cloudUntil ? 200 : base;
    this.solar += (target - this.solar) * Math.min(1, dt / 20);

    const qss = Math.max(0, KQ * this.headFactor * (this.u - U_DZ));
    this.q += (dt / TAU_Q) * (qss - this.q);
    const mdot = this.q / 60;
    const heatIn = this.fault ? 0 : this.solar; // firmware clears the heat-isolation output on a fault
    this.tR += (dt / C_TH) * (heatIn - mdot * CP * (this.tR - this.tIn) - UA * (this.tR - T_AMB));
    this.tProbe += (dt / TAU_S) * (this.tR - this.tProbe);
    this.pulseAcc += K_FLOW * this.q * dt;
    const whole = Math.floor(this.pulseAcc);
    this.pulses += whole;
    this.pulseAcc -= whole;
  }

  // advance one second and return a firmware-format packet
  tick() {
    for (let i = 0; i < 10; i++) { this.plantStep(0.1); this.t += 0.1; }
    this.t = round(this.t, 1);

    const raw = this.pulses / K_FLOW; this.pulses = 0;
    this.qBuf = [...this.qBuf, raw].slice(-3);
    this.qMeas = this.qBuf.reduce((a, b) => a + b, 0) / this.qBuf.length;

    const sensorBad = this.t < this.sensorFailUntil;
    const tOut = this.tOut();

    if (this.mode === 'INIT' && !sensorBad && this.t > 2) this.setMode('FLOW_ONLY');

    if (this.mode === 'FLOW_ONLY' || this.mode === 'CASCADE') {
      if (sensorBad) this.trip(F_SENSOR);
      else if (tOut > T_MAX) this.trip(F_OVERTEMP);
      if (this.u > 200 && this.qMeas < 0.15) {
        this.noFlowSince ??= this.t;
        if (this.t - this.noFlowSince > 5) this.trip(F_NOFLOW);
      } else this.noFlowSince = null;
    }

    if (this.mode === 'FLOW_ONLY' || this.mode === 'CASCADE') {
      this.u = this.inner.step(this.qStar - this.qMeas, 1);
      if (this.mode === 'FLOW_ONLY' && this.t - this.modeSince > FLOW_SETTLE_S &&
          Math.abs(this.qStar - this.qMeas) < 0.2) this.setMode('CASCADE');
      if (this.mode === 'CASCADE' && Math.round(this.t) % 5 === 0) {
        const eT = tOut - this.tSet;
        const blocked = (this.inner.satHi && eT > 0) || (this.inner.satLo && eT < 0);
        this.qStar = this.outer.step(eT, 5, blocked);
      }
    } else if (this.mode === 'FAULT') {
      if ((this.fault & F_OVERTEMP) && !(this.fault & (F_NOFLOW | F_SENSOR))) this.u = U_MAX;
      else { this.u = 0; this.mode = 'STOPPED'; this.modeSince = this.t; }
    } else {
      this.u = 0;
    }

    if (sensorBad) return { error: 'sensor_not_detected' };

    const tIn = Math.round(this.tIn / 0.0625) * 0.0625;
    return {
      mode: this.mode,
      tSet: round(this.tSet, 2),
      inletTemp: round(tIn, 2),
      outletTemp: round(tOut, 2),
      deltaTemp: round(tOut - tIn, 2),
      eT: round(tOut - this.tSet, 2),
      qSet: round(this.qStar, 3),
      flowRate: round(this.qMeas, 3),
      eq: round(this.qStar - this.qMeas, 3),
      pwm: round(this.u, 1),
      pwmRaw: round(this.inner.raw, 1),
      iT: round(this.outer.integ, 4),
      iQ: round(this.inner.integ, 2),
      sat: this.inner.satHi ? 1 : this.inner.satLo ? -1 : 0,
      ageMs: 250 + Math.round(Math.random() * 500),
      fault: this.fault,
      rev: 'PI-CASCADE-1.0 (sim)',
      // simulation-only extras (not sent by the Arduino)
      simSolarW: round(this.solar, 0),
      simClogged: this.headFactor < 1
    };
  }

  trip(code) {
    this.fault |= code;
    this.mode = 'FAULT';
    this.modeSince = this.t;
  }
}

const sim = new CascadeSim();

module.exports = {
  generateMockSensorData: () => sim.tick(),
  mockCommand: (cmd, value) => sim.command(cmd, value)
};
