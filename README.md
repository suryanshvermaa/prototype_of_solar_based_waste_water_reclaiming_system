# Solar Cascade — PI Control Dashboard

Full-stack IoT dashboard for the **major project: PI-based temperature–flow cascade control of a Fresnel solar collector prototype for wastewater reclamation** (NIT Patna, Electrical Engineering, 2026–2027). It extends the minor-project dashboard ("Prototype of Solar Based Waste Water Reclaiming System").

The Arduino runs two PI loops: an **outer loop** turns the outlet-temperature error into a flow setpoint `q*`, and an **inner loop** turns the flow error into the pump PWM. The dashboard shows both loops live, sends commands to the controller and records every sample.

---

## Features

- **Overview**: live cascade block diagram with signal values, controller state machine (INIT → FLOW_ONLY → CASCADE, FAULT, STOPPED), KPI tiles with sparklines, temperature and flow tracking charts.
- **Controller commands**: set the outlet target `T*`, reset after a fault, stop the pump. These are sent to the Arduino over serial as `T35.0`, `R` and `S`.
- **Control loops**: `T*` vs outlet, temperature error with tolerance band, `q*` vs measured flow, PWM requested vs applied (saturation), and both integrator states (anti-windup).
- **Performance**: live MAE, RMS, IAE, peak error, time in band, flow-loop error, % PWM saturation, settling time and overshoot of the last setpoint step, error histogram.
- **Events & faults**: decoded fault register (sensor, stale sample, over-temperature, no flow) and a filterable event log.
- **Data log**: sample table, CSV export of the chart window, and download of the full run log that the server writes to `server/logs/`.
- Light/dark theme, 1/5/15-minute chart windows, responsive layout.

## Hardware (inputs and outputs)

Only the minor-project components are used:

| Role | Component | Arduino pin |
|---|---|---|
| Input | DS18B20 inlet temperature | D3 (1-Wire, 4.7 kΩ pull-up) |
| Input | DS18B20 outlet temperature | D3 (same bus) |
| Input | YF-S201 Hall-effect flow sensor | D2 (INT0) |
| Output | L298N → 12 V DC pump | D5 (ENA, PWM), D8/D9 (IN1/IN2) |

The firmware also supports an optional heat-isolation relay on D7, but it is **disabled by default** (`USE_HEAT_ISOLATION 0`), so no extra parts are needed.

Firmware: `major_project_report/firmware/src/main.cpp` (PlatformIO) or `pi_cascade_controller/pi_cascade_controller.ino` (Arduino IDE). Libraries: OneWire, DallasTemperature.

---

## Getting started (pnpm)

```bash
cd server
pnpm install
pnpm start
```

```bash
cd client
pnpm install
pnpm dev
```

Open http://localhost:5173. Both folders contain a `pnpm-workspace.yaml` that allows the build scripts of `esbuild` (client) and `@serialport/bindings-cpp` (server).

### Data source modes (`server/.env`)

| Mode | What runs | How to start |
|---|---|---|
| `MOCK` (default) | JavaScript simulation of the cascade (same control logic, assumed plant) | `pnpm start` |
| `FIRMWARE_SIM` | The **real firmware** compiled for the PC, running against simulated DS18B20 / YF-S201 / L298N + pump hardware | `pnpm start:fw-sim` |
| `REAL` | Arduino over USB serial | `MODE=REAL` and `SERIAL_PORT=COM3` in `.env`, then `pnpm start` |

```env
MODE=REAL
PORT=3001
CORS_ORIGIN=http://localhost:5173
SERIAL_PORT=COM3        # Linux: /dev/ttyACM0
SERIAL_BAUD=9600
# FIRMWARE_SIM_EXE=../../major_project_report/firmware/sim/plant_sim.exe
```

Close the Arduino IDE Serial Monitor before starting in `REAL` mode; it locks the port.

### Telemetry protocol (1 Hz, newline-delimited JSON)

```json
{"mode":"CASCADE","tSet":35.00,"inletTemp":30.00,"outletTemp":35.06,"deltaTemp":5.06,"eT":0.06,
 "qSet":0.862,"flowRate":0.844,"eq":0.018,"pwm":101.2,"pwmRaw":101.2,"iT":-0.6551,"iQ":-1.15,
 "sat":0,"ageMs":412,"fault":0,"rev":"PI-CASCADE-1.0"}
```

Fault bits: 1 sensor, 2 stale sample, 4 over-temperature, 8 no flow. The minor-project format (`flowRate, inletTemp, outletTemp, deltaTemp, pwm`) is still accepted and shown as "Legacy P firmware".

### Server API

| Endpoint | Description |
|---|---|
| `GET /data` | latest sample |
| `GET /history` | last 900 samples |
| `GET /events` | controller events |
| `GET /logs/current` | CSV of this server run |
| `POST /command` | `{"cmd":"setpoint","value":35}`, `{"cmd":"reset"}`, `{"cmd":"stop"}`; in simulation also `sim:cloud`, `sim:clog`, `sim:inlet`, `sim:sensor` (`sim:dry` in FIRMWARE_SIM) |

Socket.IO events: `sensorData` (every sample), `controllerEvent`.

---

## Project structure

```
server/src/
  index.js              Express + Socket.IO, commands, history, events
  mockData.js           MOCK: cascade simulation (same logic as the firmware)
  serialReader.js       REAL: serial port reader/writer
  processReader.js      FIRMWARE_SIM: runs plant_sim.exe like a serial port
  start-firmware-sim.js pnpm start:fw-sim entry
  validate.js           telemetry normalisation (cascade + legacy formats)
  logger.js             CSV run log in server/logs/
client/src/
  App.jsx               routes, theme, chart window
  hooks/useTelemetry.js socket + REST fallback, history, events
  components/           Shell, LoopDiagram, ControlPanel, Kpi, LiveChart, ModeStepper, EventList, ui
  pages/                Overview, Loops, Performance, Events, Data, Settings
arduino/iot_dashboard/  minor-project sketch (legacy P controller)
```
