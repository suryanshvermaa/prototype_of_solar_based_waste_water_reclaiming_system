/*
  FIRMWARE_SIM mode: runs the firmware-in-the-loop simulator (the real Arduino firmware compiled
  for the PC against simulated DS18B20 / YF-S201 / L298N + pump hardware) and treats its
  stdout/stdin exactly like the Arduino's serial port. Same interface as serialReader.
*/
const { spawn } = require('child_process');
const readline = require('readline');

function startProcessLineReader({ exePath, onLine, onStatus, logger = console, restartDelayMs = 3000 }) {
  let child = null;
  let stopping = false;

  function start() {
    logger.info(`[fw-sim] starting ${exePath} --realtime`);
    child = spawn(exePath, ['--realtime'], { stdio: ['pipe', 'pipe', 'pipe'] });
    onStatus?.({ connected: true });
    readline.createInterface({ input: child.stdout }).on('line', (l) => onLine?.(l));
    readline.createInterface({ input: child.stderr }).on('line', (l) => logger.info(`[fw-sim] ${l}`));
    child.on('error', (err) => logger.error('[fw-sim] error:', err.message));
    child.on('exit', (code) => {
      onStatus?.({ connected: false });
      if (!stopping) {
        logger.warn(`[fw-sim] exited (${code}), restarting`);
        setTimeout(start, restartDelayMs);
      }
    });
  }

  function write(line) {
    return new Promise((resolve, reject) => {
      if (!child || child.exitCode !== null) return reject(new Error('Firmware simulator is not running'));
      child.stdin.write(`${line}\n`, (err) => (err ? reject(err) : resolve()));
    });
  }

  function stop() {
    stopping = true;
    child?.kill();
  }

  start();
  return { write, stop };
}

module.exports = { startProcessLineReader };
