import { AlertTriangle, CheckCircle2, Info, Terminal, XCircle } from 'lucide-react';
import { clockTime, toneText } from '../utils/format';
import { Empty } from './ui';

const ICON = { success: CheckCircle2, danger: XCircle, warning: AlertTriangle, info: Info };
const TONE = { success: 'ok', danger: 'bad', warning: 'warn', info: 'info' };

export default function EventList({ events, limit }) {
  const list = limit ? events.slice(0, limit) : events;
  if (!list.length) return <Empty>No events yet</Empty>;
  return (
    <ul className="divide-y hairline">
      {list.map((e) => {
        const Icon = e.type === 'command' ? Terminal : ICON[e.severity] ?? Info;
        return (
          <li key={e.id} className="flex items-start gap-3 py-2.5 animate-fade-up">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneText[TONE[e.severity] ?? 'neutral']}`} />
            <div className="min-w-0 flex-1 text-sm text-ink">{e.message}</div>
            <time className="num shrink-0 text-[11px] text-ink-mute">{clockTime(e.time)}</time>
          </li>
        );
      })}
    </ul>
  );
}
