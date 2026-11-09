import { toneBg, toneText } from '../utils/format';

export function Card({ className = '', children, ...rest }) {
  return (
    <section className={`card p-5 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-mute">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Badge({ tone = 'neutral', children, dot = false, pulse = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneBg[tone]} ${toneText[tone]}`}>
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? 'animate-pulse-ring' : ''}`} />
      )}
      {children}
    </span>
  );
}

export function Segmented({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, unit, tone, hint }) {
  return (
    <div className="rounded-xl bg-surface-sunken/70 p-3.5">
      <div className="label">{label}</div>
      <div className={`mt-1.5 flex items-baseline gap-1 ${tone ? toneText[tone] : 'text-ink'}`}>
        <span className="num text-xl font-semibold">{value}</span>
        {unit && <span className="text-xs text-ink-mute">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-ink-mute">{hint}</div>}
    </div>
  );
}

export function Empty({ children = 'Waiting for data…' }) {
  return <div className="grid h-full min-h-[120px] place-items-center text-xs text-ink-mute">{children}</div>;
}
