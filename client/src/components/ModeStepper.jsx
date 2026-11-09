import { AlertOctagon, Check } from 'lucide-react';
import { MODE_META, decodeFaults } from '../utils/format';

const STEPS = ['INIT', 'FLOW_ONLY', 'CASCADE'];

/** Supervisory state machine progress: INIT -> FLOW_ONLY -> CASCADE, with FAULT/STOPPED overlay. */
export default function ModeStepper({ mode, fault }) {
  const tripped = mode === 'FAULT' || mode === 'STOPPED';
  const idx = STEPS.indexOf(mode);
  const meta = MODE_META[mode] ?? { label: 'Waiting for controller', hint: 'No telemetry yet' };
  const faults = decodeFaults(fault);

  return (
    <div>
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = !tripped && idx > i;
          const active = !tripped && idx === i;
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition
                  ${active ? (s === 'CASCADE' ? 'bg-ok text-white dark:text-slate-900 animate-pulse-ring' : 'bg-warn text-white dark:text-slate-900')
                    : done ? 'bg-ok/15 text-ok' : 'bg-ink/5 text-ink-mute'}`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={`hidden truncate text-xs font-medium sm:block ${active ? 'text-ink' : 'text-ink-mute'}`}>
                {MODE_META[s].label}
              </span>
              {i < STEPS.length - 1 && <span className={`h-px flex-1 ${done ? 'bg-ok/50' : 'bg-ink/10'}`} />}
            </li>
          );
        })}
      </ol>
      <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${tripped ? 'bg-bad/10 text-bad' : 'bg-ink/[.04] text-ink-soft'}`}>
        {tripped && <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
        <span>
          <b className="font-semibold">{meta.label}.</b> {meta.hint}
          {faults.length > 0 && <> &middot; {faults.map((f) => f.name).join(', ')}</>}
        </span>
      </div>
    </div>
  );
}
