/*
  Solar Cascade Control - IoT backend (major project)

  Arduino (PI cascade firmware) -> USB serial JSON -> Node.js (Express + Socket.IO) -> React

  - MODE=MOCK : physics-based simulation of the PI cascade (no hardware needed)
  - MODE=REAL : reads newline-delimited JSON from the Arduino via serialport
  - MODE=FIRMWARE_SIM : runs the real firmware compiled for the PC against simulated
                 DS18B20 / YF-S201 / L298N + pump hardware (FIRMWARE_SIM_EXE = path to plant_sim)

  REST
    GET  /data           latest payload
    GET  /history        last HISTORY_SIZE samples (default 900 = 15 min at 1 Hz)
    GET  /events         controller events (mode changes, faults, commands)
    GET  /logs/current   CSV log of this server run (download)
    POST /command        {cmd:"setpoint",value:35} | {cmd:"reset"} | {cmd:"stop"}
                         MOCK only: sim:cloud | sim:clog | sim:inlet | sim:sensor
  Socket.IO
    sensorData  every packet       controllerEvent  on each event
*/

const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const { generateMockSensorData, mockCommand } = require('./mockData');
const { normalizeIncomingSensorData, EMPTY } = require('./validate');
const { createRunLogger } = require('./logger');

dotenv.config();

const MODE = String(process.env.MODE || 'MOCK').toUpperCase();
if (!['MOCK', 'REAL', 'FIRMWARE_SIM'].includes(MODE)) throw new Error('Invalid MODE. Use MOCK, REAL or FIRMWARE_SIM');

const PORT = Number(process.env.PORT || 3001);
const HISTORY_SIZE = Number(process.env.HISTORY_SIZE || 900);
const SERIAL_PORT = process.env.SERIAL_PORT;
const SERIAL_BAUD = Number(process.env.SERIAL_BAUD || 9600);
const CORS_ORIGIN = (() => {
  const raw = process.env.CORS_ORIGIN;
  if (raw === '*') return '*';
  if (raw && raw.trim()) return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
})();

const FIRMWARE_SIM_EXE = process.env.FIRMWARE_SIM_EXE;
if (MODE === 'FIRMWARE_SIM' && !FIRMWARE_SIM_EXE) throw new Error('MODE=FIRMWARE_SIM requires FIRMWARE_SIM_EXE (path to plant_sim.exe)');
if (MODE === 'REAL' && !SERIAL_PORT) throw new Error('MODE=REAL requires SERIAL_PORT (e.g. COM3 or /dev/ttyACM0)');

const app = express();
app.use(express.json());
app.use(cors({ origin: CORS_ORIGIN, methods: ['GET', 'POST'] }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] } });

const runLog = createRunLogger(path.join(__dirname, '..', 'logs'));

let arduinoConnected = MODE === 'MOCK';
let lastReceivedAt = null;
let lastSensorData = { ...EMPTY };
const history = [];
const events = [];
let serial = null;

function currentPayload() {
  return {
    ...lastSensorData,
    mode: MODE,
    connected: MODE === 'MOCK' ? true : arduinoConnected,
    receivedAt: lastReceivedAt,
    serverTime: Date.now()
  };
}

function addEvent(type, severity, message) {
  const ev = { id: `${Date.now()}-${events.length}`, time: Date.now(), type, severity, message };
  events.push(ev);
  if (events.length > 200) events.shift();
  io.emit('controllerEvent', ev);
}

const FAULT_NAMES = { 1: 'sensor fault', 2: 'stale temperature sample', 4: 'over-temperature', 8: 'no flow at high PWM' };
function decodeFault(code) {
  return Object.entries(FAULT_NAMES).filter(([bit]) => code & Number(bit)).map(([, n]) => n);
}

function accept(normalized, extras = {}) {
  const prev = lastSensorData;
  lastSensorData = { ...normalized, ...extras };
  lastReceivedAt = Date.now();

  if (normalized.sensorError && !prev.sensorError) {
    addEvent('sensor', 'danger', `Sensor error reported: ${normalized.sensorErrorMessage}`);
  }
  if (normalized.ctrlMode && prev.ctrlMode && normalized.ctrlMode !== prev.ctrlMode) {
    const sev = normalized.ctrlMode === 'FAULT' || normalized.ctrlMode === 'STOPPED' ? 'danger'
      : normalized.ctrlMode === 'CASCADE' ? 'success' : 'info';
    addEvent('mode', sev, `Controller mode ${prev.ctrlMode} → ${normalized.ctrlMode}`);
  }
  if ((normalized.fault || 0) !== (prev.fault || 0) && normalized.fault) {
    addEvent('fault', 'danger', `Fault code ${normalized.fault}: ${decodeFault(normalized.fault).join(', ')}`);
  }

  const payload = currentPayload();
  if (!normalized.sensorError) {
    history.push(payload);
    if (history.length > HISTORY_SIZE) history.shift();
    runLog.write(payload);
  }
  io.emit('sensorData', payload);
}

// ---------------- REST ----------------
app.get('/data', (req, res) => res.json(currentPayload()));
app.get('/history', (req, res) => res.json(history));
app.get('/events', (req, res) => res.json(events));
app.get('/logs/current', (req, res) => res.download(runLog.file));

app.post('/command', async (req, res) => {
  const { cmd, value } = req.body || {};
  try {
    if (MODE === 'MOCK') {
      const r = mockCommand(cmd, value);
      if (!r.ok) return res.status(400).json(r);
    } else {
      let line;
      if (cmd === 'setpoint') {
        const v = Number(value);
        if (!(v > 20 && v < 65)) return res.status(400).json({ ok: false, error: 'Setpoint must be between 20 and 65 °C' });
        line = `T${v.toFixed(2)}`;
      } else if (cmd === 'reset') line = 'R';
      else if (cmd === 'stop') line = 'S';
      else if (MODE === 'FIRMWARE_SIM' && String(cmd).startsWith('sim:')) line = cmd;
      else return res.status(400).json({ ok: false, error: `Command ${cmd} is not available on hardware` });
      await serial.write(line);
    }
    const label = cmd === 'setpoint' ? `Setpoint T* set to ${Number(value).toFixed(1)} °C`
      : cmd === 'reset' ? 'Fault reset requested' : cmd === 'stop' ? 'Pump stop requested'
      : `Simulation disturbance: ${String(cmd).replace('sim:', '')}`;
    addEvent('command', cmd === 'stop' ? 'warning' : 'info', label);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

io.on('connection', (socket) => socket.emit('sensorData', currentPayload()));

// ---------------- data sources ----------------
if (MODE === 'REAL' || MODE === 'FIRMWARE_SIM') {
  const linkName = MODE === 'REAL' ? `Arduino on ${SERIAL_PORT}` : 'Firmware simulator';
  const opts = {
    onStatus: (status) => {
      const was = arduinoConnected;
      arduinoConnected = Boolean(status?.connected);
      if (was !== arduinoConnected) {
        addEvent('link', arduinoConnected ? 'success' : 'danger',
          arduinoConnected ? `${linkName} connected` : `${linkName} link lost`);
      }
    },
    onLine: (line) => {
      let parsed;
      try { parsed = JSON.parse(String(line).trim()); } catch (_) { return; }
      const normalized = normalizeIncomingSensorData(parsed);
      if (normalized) accept(normalized);
    }
  };
  serial = MODE === 'REAL'
    ? require('./serialReader').startSerialLineReader({ portPath: SERIAL_PORT, baudRate: SERIAL_BAUD, ...opts })
    : require('./processReader').startProcessLineReader({ exePath: FIRMWARE_SIM_EXE, ...opts });
  // keep clients updated about link state even when no data arrives
  setInterval(() => io.emit('sensorData', currentPayload()), 2000);
} else {
  setInterval(() => {
    const raw = generateMockSensorData();
    const normalized = normalizeIncomingSensorData(raw);
    if (normalized) accept(normalized, raw.simSolarW !== undefined ? { simSolarW: raw.simSolarW, simClogged: raw.simClogged } : {});
  }, 1000);
}

addEvent('link', 'info', `Server started in ${MODE} mode`);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}  (MODE=${MODE})`);
  if (MODE === 'REAL') console.log(`Serial: ${SERIAL_PORT} @ ${SERIAL_BAUD}`);
  console.log(`Logging to ${runLog.file}`);
});
