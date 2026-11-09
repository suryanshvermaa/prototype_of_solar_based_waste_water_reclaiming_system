export function fmt(v, d = 1, fallback = '--') {
  const n = Number(v);
  if (v === null || v === undefined || !Number.isFinite(n)) return fallback;
  return n.toFixed(d);
}

export function signed(v, d = 2) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return '--';
  return `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(d)}`;
}

export const clockTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const MODE_META = {
  INIT: { label: 'Initialising', tone: 'warn', hint: 'Scanning and mapping sensors' },
  FLOW_ONLY: { label: 'Flow loop only', tone: 'warn', hint: 'Establishing circulation at q₀ before enabling temperature control' },
  CASCADE: { label: 'Cascade active', tone: 'ok', hint: 'Outer temperature PI and inner flow PI running' },
  FAULT: { label: 'Fault', tone: 'bad', hint: 'Protection active: heat isolated, pump in safe action' },
  STOPPED: { label: 'Stopped', tone: 'bad', hint: 'Pump off. Reset to restart the sequence' },
  LEGACY: { label: 'Legacy P firmware', tone: 'warn', hint: 'Minor-project firmware detected (no setpoint telemetry)' },
};

export const FAULT_BITS = [
  { bit: 1, name: 'Sensor fault', detail: 'Invalid or disconnected DS18B20 reading' },
  { bit: 2, name: 'Stale sample', detail: 'Temperature sample older than 3 s' },
  { bit: 4, name: 'Over-temperature', detail: 'Outlet above 70 °C trip limit' },
  { bit: 8, name: 'No flow', detail: 'Flow < 0.15 L/min for 5 s at PWM > 200' },
];

export const decodeFaults = (code) => FAULT_BITS.filter((f) => (Number(code) || 0) & f.bit);

export const toneText = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', info: 'text-flow', neutral: 'text-ink-soft' };
export const toneBg = { ok: 'bg-ok/10', warn: 'bg-warn/10', bad: 'bg-bad/10', info: 'bg-flow/10', neutral: 'bg-ink/5' };

/**
 * Closed-loop performance over a set of samples (only CASCADE samples with a target count).
 * band: tolerance band for "in band" and settling (degC).
 */
export function computeMetrics(points, band = 0.5) {
  const pts = points.filter((p) => p.ctrlMode === 'CASCADE' && p.eT != null);
  if (pts.length < 2) return null;
  let sumAbs = 0, sumSq = 0, maxAbs = 0, iae = 0, inBand = 0, sat = 0, eqAbs = 0, eqN = 0, heat = 0, heatN = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const e = Math.abs(p.eT);
    const dt = i > 0 ? Math.min(5, (p.ts - pts[i - 1].ts) / 1000) : 1;
    sumAbs += e; sumSq += e * e; maxAbs = Math.max(maxAbs, e); iae += e * dt;
    if (e <= band) inBand++;
    if (p.sat) sat++;
    if (p.eq != null) { eqAbs += Math.abs(p.eq); eqN++; }
    if (p.heatW != null) { heat += p.heatW; heatN++; }
  }
  const n = pts.length;

  // last setpoint step: settling time and overshoot
  let step = null;
  for (let i = pts.length - 1; i > 0; i--) {
    if (Math.abs(pts[i].tSet - pts[i - 1].tSet) > 0.05) {
      const from = pts[i - 1].tSet, to = pts[i].tSet, t0 = pts[i].ts;
      const after = pts.slice(i);
      let settledAt = null;
      for (let j = 0; j < after.length; j++) {
        if (after.slice(j).every((p) => Math.abs(p.eT) <= band)) { settledAt = after[j].ts; break; }
      }
      const dir = Math.sign(to - from);
      const over = Math.max(0, ...after.map((p) => dir * (p.outletTemp - to)));
      step = { from, to, at: t0, settlingS: settledAt ? (settledAt - t0) / 1000 : null, overshoot: over };
      break;
    }
  }

  return {
    n,
    mae: sumAbs / n,
    rms: Math.sqrt(sumSq / n),
    maxAbs,
    iae,
    inBandPct: (inBand / n) * 100,
    satPct: (sat / n) * 100,
    flowMae: eqN ? eqAbs / eqN : null,
    meanHeat: heatN ? heat / heatN : null,
    step,
  };
}

export const SOURCE_LABEL = { REAL: 'Hardware', MOCK: 'Simulation', FIRMWARE_SIM: 'Firmware sim' };

export const WINDOWS = [
  { value: 60, label: '1 min' },
  { value: 300, label: '5 min' },
  { value: 900, label: '15 min' },
];
