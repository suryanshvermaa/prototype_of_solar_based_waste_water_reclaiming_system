import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { token } from './LiveChart';

/** KPI tile: big live value, secondary comparison line, sparkline. */
export default function Kpi({ label, icon: Icon, value, unit, color, sub, subTone = 'text-ink-mute', spark, sparkKey, sparkKey2, children }) {
  return (
    <div className="card card-hover relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl"
        style={{ background: `rgb(var(--${color}) / .12)` }}
      />
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {Icon && <Icon className="h-4 w-4" style={{ color: `rgb(var(--${color}))` }} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="num text-[28px] font-semibold leading-none text-ink">{value}</span>
        {unit && <span className="text-sm text-ink-mute">{unit}</span>}
      </div>
      {sub && <div className={`mt-1.5 text-xs ${subTone}`}>{sub}</div>}
      {children}
      {spark?.length > 1 && (
        <div className="-mx-1 mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark}>
              <YAxis hide domain={['auto', 'auto']} />
              {sparkKey2 && (
                <Line dataKey={sparkKey2} stroke={token('c-target')} strokeWidth={1.2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              )}
              <Line dataKey={sparkKey} stroke={token(color)} strokeWidth={1.8} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
