import { useState } from 'react';
import { Database, Download, FileDown } from 'lucide-react';
import { Card, CardHeader, Empty } from '../components/ui';
import { csvLogUrl } from '../services/api';
import { clockTime, fmt } from '../utils/format';

const COLS = [
  { key: 'ts', label: 'Time', render: (r) => clockTime(r.ts) },
  { key: 'ctrlMode', label: 'Mode', render: (r) => r.ctrlMode ?? '--' },
  { key: 'tSet', label: 'T* °C', d: 1 },
  { key: 'outletTemp', label: 'Tout °C', d: 2 },
  { key: 'inletTemp', label: 'Tin °C', d: 2 },
  { key: 'eT', label: 'e_T', d: 2 },
  { key: 'qSet', label: 'q* L/min', d: 3 },
  { key: 'flowRate', label: 'q L/min', d: 3 },
  { key: 'pwm', label: 'PWM', d: 0 },
  { key: 'sat', label: 'Sat', d: 0 },
  { key: 'heatW', label: 'Heat W', d: 0 },
  { key: 'fault', label: 'Fault', d: 0 },
];

function exportVisible(rows) {
  const head = COLS.map((c) => c.label).join(',');
  const body = rows.map((r) => COLS.map((c) => (c.key === 'ts' ? new Date(r.ts).toISOString() : r[c.key] ?? '')).join(','));
  const blob = new Blob([[head, ...body].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cascade-window-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function DataPage({ recent }) {
  const [page, setPage] = useState(0);
  const per = 25;
  const rows = recent.slice().reverse();
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const view = rows.slice(page * per, page * per + per);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Card>
        <CardHeader
          icon={Database} title="Telemetry samples" subtitle={`${rows.length} samples in the current window (newest first)`}
          right={
            <div className="flex gap-2">
              <button className="btn-ghost text-xs" onClick={() => exportVisible(recent)} disabled={!rows.length}>
                <FileDown className="h-3.5 w-3.5" /> Window CSV
              </button>
              <a className="btn-primary text-xs" href={csvLogUrl()}>
                <Download className="h-3.5 w-3.5" /> Full run log
              </a>
            </div>
          }
        />
        {!rows.length ? <Empty /> : (
          <>
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-y hairline text-left">
                    {COLS.map((c) => <th key={c.key} className="label whitespace-nowrap px-5 py-2.5 font-semibold">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {view.map((r) => (
                    <tr key={r.ts} className="border-b hairline transition hover:bg-ink/[.03]">
                      {COLS.map((c) => (
                        <td key={c.key} className={`num whitespace-nowrap px-5 py-2 ${c.key === 'fault' && r.fault ? 'text-bad' : c.key === 'sat' && r.sat ? 'text-warn' : 'text-ink-soft'}`}>
                          {c.render ? c.render(r) : fmt(r[c.key], c.d)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-ink-mute">
              <span>Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <button className="btn-ghost px-2.5 py-1 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Newer</button>
                <button className="btn-ghost px-2.5 py-1 text-xs" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Older</button>
              </div>
            </div>
          </>
        )}
      </Card>
      <p className="px-1 text-xs text-ink-mute">
        The server writes every sample of this run to <code className="num">server/logs/run-*.csv</code>, including integrator states and sample age.
      </p>
    </div>
  );
}
