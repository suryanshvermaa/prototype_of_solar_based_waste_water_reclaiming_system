/*
  Starts the backend in FIRMWARE_SIM mode: the real Arduino firmware (main.cpp) compiled for the
  PC runs against simulated prototype hardware and is read like the serial port.

  pnpm start:fw-sim
  Set FIRMWARE_SIM_EXE in server/.env if plant_sim.exe is somewhere else.
*/
const path = require('path');
require('dotenv').config();

process.env.MODE = 'FIRMWARE_SIM';
process.env.FIRMWARE_SIM_EXE = process.env.FIRMWARE_SIM_EXE ||
  path.resolve(__dirname, '../../../major_project_report/firmware/sim/plant_sim.exe');

require('./index');
