import { useEffect, useState } from 'react';
import { CloudSun, Droplet, Gauge, Octagon, RotateCcw, SlidersHorizontal, Thermometer, Waves, Wrench } from 'lucide-react';
import { sendCommand } from '../services/api';
import { Card, CardHeader } from './ui';

const MIN = 25, MAX = 60;

export default function ControlPanel({ latest, source }) {
  const mode = latest?.ctrlMode;
  const current = latest?.tSet;
  const [draft, setDraft] = useState(current ?? 35);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => { if (!touched && current != null) setDraft(current); }, [current, touched]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t); }, [msg]);

  const run = async (cmd, value, okText) => {
    setBusy(cmd);
    try {
      await sendCommand(cmd, value);
      setMsg({ tone: 'ok', text: okText });
      if (cmd === 'setpoint') setTouched(false);
    } catch (e) {
      setMsg({ tone: 'bad', text: e.message });
    } finally {
      setBusy(null);
    }
  };

  const legacy = mode === 'LEGACY';
  const canReset = mode === 'FAULT' || mode === 'STOPPED';
  const dirty = current == null || Math.abs(Number(draft) - current) > 0.04;

  return (
    <Card className="flex flex-col">
      <CardHeader icon={SlidersHorizontal} title="Controller commands" subtitle="Sent to the Arduino over serial (T*, reset, stop)" />

      <div className="label mb-2 flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5" /> Outlet target T*</div>
      <div className="flex items-end gap-3">
        <div className="num text-4xl font-semibold text-target">{Number(draft).toFixed(1)}</div>
        <div className="pb-1.5 text-sm text-ink-mute">&deg;C</div>
        {current != null && dirty && (
          <div className="pb-1.5 text-xs text-ink-mute">current {current.toFixed(1)} &deg;C</div>
        )}
      </div>
      <input
        type="range" min={MIN} max={MAX} step={0.5} value={draft} disabled={legacy}
        onChange={(e) => { setDraft(Number(e.target.value)); setTouched(true); }}
        className="mt-3 w-full accent-[rgb(var(--c-target))]"
        aria-label="Outlet temperature target"
      />
      <div className="mt-1 flex justify-between text-[10px] text-ink-mute"><span>{MIN} &deg;C</span><span>{MAX} &deg;C</span></div>

      <div className="mt-4 flex gap-2">
        <button
          className="btn-primary flex-1" disabled={legacy || !dirty || busy === 'setpoint'}
          onClick={() => run('setpoint', draft, `T* set to ${Number(draft).toFixed(1)} °C`)}
        >
          <Gauge className="h-4 w-4" /> Apply target
        </button>
        {touched && (
          <button className="btn-ghost" onClick={() => { setTouched(false); setDraft(current ?? 35); }}>Cancel</button>
        )}
      </div>

      <div className="my-5 border-t hairline" />

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-ghost" disabled={!canReset || busy === 'reset'} onClick={() => run('reset', undefined, 'Reset sent, restarting sequence')}>
          <RotateCcw className="h-4 w-4" /> Reset fault
        </button>
        {confirmStop ? (
          <button className="btn bg-bad text-white hover:brightness-110" onClick={() => { setConfirmStop(false); run('stop', undefined, 'Pump stopped'); }}>
            <Octagon className="h-4 w-4" /> Confirm stop
          </button>
        ) : (
          <button className="btn-danger" disabled={mode === 'STOPPED' || legacy} onClick={() => { setConfirmStop(true); setTimeout(() => setConfirmStop(false), 4000); }}>
            <Octagon className="h-4 w-4" /> Stop pump
          </button>
        )}
      </div>
      {legacy && <p className="mt-3 text-xs text-warn">Minor-project firmware detected: commands need the PI cascade firmware.</p>}

      {source !== 'REAL' && (
        <>
          <div className="my-5 border-t hairline" />
          <div className="label mb-2">Simulation disturbances</div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost text-xs" onClick={() => run('sim:cloud', undefined, 'Cloud passing for 2 min')}><CloudSun className="h-3.5 w-3.5" /> Cloud</button>
            <button className="btn-ghost text-xs" onClick={() => run('sim:clog', undefined, 'Pipe resistance toggled')}>
              <Wrench className="h-3.5 w-3.5" /> {latest?.simClogged ? 'Unclog pipe' : 'Clog pipe'}
            </button>
            <button className="btn-ghost text-xs" onClick={() => run('sim:inlet', undefined, 'Inlet temperature step')}><Waves className="h-3.5 w-3.5" /> Inlet step</button>
            <button className="btn-ghost text-xs" onClick={() => run('sim:sensor', undefined, 'Sensor dropout injected')}><Octagon className="h-3.5 w-3.5" /> Sensor fault</button>
            {source === 'FIRMWARE_SIM' && (
              <button className="btn-ghost col-span-2 text-xs" onClick={() => run('sim:dry', undefined, 'Pump dry-run toggled')}><Droplet className="h-3.5 w-3.5" /> Toggle dry pump (no-flow fault)</button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-ink-mute">Simulation only: injects disturbances into the simulated plant{source === 'FIRMWARE_SIM' ? ' around the real firmware' : ''}.</p>
        </>
      )}

      {msg && (
        <div role="status" className={`mt-4 rounded-lg px-3 py-2 text-xs ${msg.tone === 'ok' ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>
          {msg.text}
        </div>
      )}
    </Card>
  );
}
