/*
  Normalises one JSON line from the Arduino into the payload used by the dashboard.

  Major project (PI cascade firmware, rev PI-CASCADE-*) sends:
    {"mode":"CASCADE","tSet":35,"inletTemp":30,"outletTemp":35.06,"deltaTemp":5.06,
     "eT":0.06,"qSet":0.862,"flowRate":0.844,"eq":0.018,"pwm":101.2,"pwmRaw":101.2,
     "iT":-0.65,"iQ":-1.15,"sat":0,"ageMs":412,"fault":0,"rev":"PI-CASCADE-1.0"}

  Minor project firmware (still accepted) sends:
    {"flowRate":2.45,"inletTemp":32.5,"outletTemp":45.2,"deltaTemp":12.7,"pwm":130}

  Error line: {"error":"sensor_not_detected"}

  NOTE: the firmware key "mode" (controller state) is renamed to "ctrlMode" because
  "mode" in the dashboard payload means the server data source (MOCK / REAL).
*/

const CTRL_MODES = ['INIT', 'FLOW_ONLY', 'CASCADE', 'FAULT', 'STOPPED'];

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

const EMPTY = {
  ctrlMode: null,
  tSet: null,
  inletTemp: null,
  outletTemp: null,
  deltaTemp: null,
  eT: null,
  qSet: null,
  flowRate: null,
  eq: null,
  pwm: null,
  pwmRaw: null,
  iT: null,
  iQ: null,
  sat: 0,
  ageMs: null,
  fault: 0,
  rev: null,
  heatW: null,
  sensorError: false,
  sensorErrorMessage: null
};

function normalizeIncomingSensorData(raw) {
  if (!raw || typeof raw !== 'object') return null;

  if (typeof raw.error === 'string' && toNumber(raw.error) === null) {
    return { ...EMPTY, sensorError: true, sensorErrorMessage: raw.error };
  }

  const flowRate = toNumber(raw.flowRate);
  const inletTemp = toNumber(raw.inletTemp ?? raw.temperature1);
  const outletTemp = toNumber(raw.outletTemp ?? raw.temperature2);
  const pwm = toNumber(raw.pwm ?? raw.motorSpeed);
  if (inletTemp === null || outletTemp === null || pwm === null) return null;

  const deltaTemp = toNumber(raw.deltaTemp) ?? outletTemp - inletTemp;
  const tSet = toNumber(raw.tSet);
  const qSet = toNumber(raw.qSet);
  const ctrlMode = CTRL_MODES.includes(raw.mode) ? raw.mode : tSet === null ? 'LEGACY' : null;

  // Absorbed heat estimate: P = m_dot * cp * dT, q in L/min (1 L ~ 1 kg)
  const heatW = flowRate !== null ? (flowRate / 60) * 4186 * deltaTemp : null;

  return {
    ...EMPTY,
    ctrlMode,
    tSet,
    inletTemp,
    outletTemp,
    deltaTemp,
    eT: toNumber(raw.eT) ?? (tSet !== null ? outletTemp - tSet : null),
    qSet,
    flowRate,
    eq: toNumber(raw.eq) ?? (qSet !== null && flowRate !== null ? qSet - flowRate : null),
    pwm,
    pwmRaw: toNumber(raw.pwmRaw),
    iT: toNumber(raw.iT),
    iQ: toNumber(raw.iQ),
    sat: toNumber(raw.sat) ?? 0,
    ageMs: toNumber(raw.ageMs),
    fault: toNumber(raw.fault) ?? 0,
    rev: typeof raw.rev === 'string' ? raw.rev : null,
    heatW
  };
}

module.exports = { normalizeIncomingSensorData, EMPTY, CTRL_MODES };
