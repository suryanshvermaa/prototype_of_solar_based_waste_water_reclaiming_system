import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { clockTime } from '../utils/format';
import { Empty } from './ui';

/** Read a CSS colour token as an rgb() string (charts need real colours). */
export function token(name, alpha = 1) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return alpha === 1 ? `rgb(${v})` : `rgb(${v} / ${alpha})`;
}

function Tip({ active, payload, label, series }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card min-w-[170px] px-3 py-2.5 text-xs shadow-2xl">
      <div className="mb-1.5 font-medium text-ink-mute">{clockTime(label)}</div>
      {payload.filter((p) => !p.dataKey.endsWith('__area')).map((p) => {
        const s = series.find((x) => x.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <span className="h-2 w-2 rounded-full" style={{ background: p.stroke }} />
              {s?.label ?? p.dataKey}
            </span>
            <span className="num font-medium text-ink">
              {p.value == null ? '--' : Number(p.value).toFixed(s?.decimals ?? 2)}
              {s?.unit ? ` ${s.unit}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * series: [{ key, label, color (token name), unit, decimals, dashed, area, width, step }]
 * refs:   [{ y, label, color }]
 */
export default function LiveChart({ data, series, refs = [], height = 240, domain, isDark }) {
  if (!data?.length) return <div style={{ height }}><Empty /></div>;
  const grid = token('line', isDark ? 0.06 : 0.07);
  const tick = { fill: token('ink-mute'), fontSize: 11, fontFamily: 'Inter' };
  const t0 = data[0].ts;
  const t1 = data[data.length - 1].ts;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
          <defs>
            {series.filter((s) => s.area).map((s) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={token(s.color)} stopOpacity={0.28} />
                <stop offset="100%" stopColor={token(s.color)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="ts" type="number" domain={[t0, t1]} scale="time"
            tickFormatter={clockTime} tick={tick} axisLine={false} tickLine={false} minTickGap={70}
          />
          <YAxis
            tick={tick} axisLine={false} tickLine={false} width={44}
            domain={domain ?? ['auto', 'auto']} tickFormatter={(v) => String(Number(Number(v).toFixed(2)))}
          />
          <Tooltip
            content={(p) => <Tip {...p} series={series} />}
            cursor={{ stroke: token('line', 0.15), strokeWidth: 1 }}
          />
          {refs.map((r) => (
            <ReferenceLine
              key={`${r.label}-${r.y}`} y={r.y} stroke={token(r.color ?? 'ink-mute', 0.55)} strokeDasharray="3 4"
              label={{ value: r.label, position: 'insideTopRight', fill: token('ink-mute'), fontSize: 10 }}
            />
          ))}
          {series.filter((s) => s.area).map((s) => (
            <Area
              key={`${s.key}__area`} dataKey={s.key} type="monotone" stroke="none"
              fill={`url(#g-${s.key})`} isAnimationActive={false} tooltipType="none"
            />
          ))}
          {series.map((s) => (
            <Line
              key={s.key} dataKey={s.key} type={s.step ? 'stepAfter' : 'monotone'} stroke={token(s.color)}
              strokeWidth={s.width ?? 2} strokeDasharray={s.dashed ? '6 5' : undefined}
              dot={false} isAnimationActive={false} connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ series }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-ink-mute">
          <span
            className="h-0.5 w-4 rounded"
            style={{
              background: s.dashed
                ? `repeating-linear-gradient(90deg, rgb(var(--${s.color})) 0 4px, transparent 4px 7px)`
                : `rgb(var(--${s.color}))`,
            }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}
