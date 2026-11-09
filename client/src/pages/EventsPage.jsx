import { useMemo, useState } from 'react';
import { Bell, ShieldAlert, ShieldCheck } from 'lucide-react';
import EventList from '../components/EventList';
import { Card, CardHeader, Segmented } from '../components/ui';
import { FAULT_BITS } from '../utils/format';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'fault', label: 'Faults' },
  { value: 'mode', label: 'Mode' },
  { value: 'command', label: 'Commands' },
];

export default function EventsPage({ latest, events }) {
  const [filter, setFilter] = useState('all');
  const code = Number(latest?.fault) || 0;
  const list = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => (filter === 'fault' ? ['fault', 'sensor', 'link'].includes(e.type) : e.type === filter))),
    [events, filter],
  );

  return (
    <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 xl:grid-cols-3">
      <Card className="xl:col-span-1">
        <CardHeader
          icon={code ? ShieldAlert : ShieldCheck} title="Protection status"
          subtitle={`Fault register = ${code} (bit flags from the firmware)`}
        />
        <ul className="space-y-2">
          {FAULT_BITS.map((f) => {
            const on = Boolean(code & f.bit);
            return (
              <li key={f.bit} className={`flex items-start gap-3 rounded-xl p-3 ${on ? 'bg-bad/10' : 'bg-ink/[.03]'}`}>
                <span className={`num mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold ${on ? 'bg-bad text-white' : 'bg-ink/5 text-ink-mute'}`}>
                  {f.bit}
                </span>
                <div>
                  <div className={`text-sm font-medium ${on ? 'text-bad' : 'text-ink'}`}>{f.name}</div>
                  <div className="text-xs text-ink-mute">{f.detail}</div>
                </div>
                <span className={`ml-auto text-[11px] font-semibold ${on ? 'text-bad' : 'text-ok'}`}>{on ? 'ACTIVE' : 'OK'}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-ink-mute">
          On a fault the controller clears the heat-isolation output. With only over-temperature and healthy flow it keeps
          circulating at full PWM; any sensor or flow fault stops the pump until <b>Reset</b> is sent.
        </p>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader icon={Bell} title="Event log" subtitle={`${events.length} events this session`} right={<Segmented label="Filter events" value={filter} options={FILTERS} onChange={setFilter} />} />
        <EventList events={list} />
      </Card>
    </div>
  );
}
