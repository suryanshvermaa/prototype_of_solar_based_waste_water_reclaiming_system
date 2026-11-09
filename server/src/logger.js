/*
  CSV run logger: one file per server start in server/logs/.
  Every accepted packet is appended with a timestamp so trials can be analysed later
  (commissioning tests T5-T9 in the report).
*/
const fs = require('fs');
const path = require('path');

const COLUMNS = [
  'timestamp', 'ctrlMode', 'tSet', 'inletTemp', 'outletTemp', 'deltaTemp', 'eT',
  'qSet', 'flowRate', 'eq', 'pwm', 'pwmRaw', 'iT', 'iQ', 'sat', 'ageMs', 'fault', 'heatW', 'rev'
];

function createRunLogger(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `run-${stamp}.csv`);
  fs.writeFileSync(file, COLUMNS.join(',') + '\n');

  function write(sample) {
    const row = COLUMNS.map((c) => {
      if (c === 'timestamp') return new Date(sample.receivedAt).toISOString();
      const v = sample[c];
      if (v === null || v === undefined) return '';
      return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v;
    });
    fs.appendFile(file, row.join(',') + '\n', () => {});
  }

  return { file, write };
}

module.exports = { createRunLogger };
