import { fmt } from '../utils/format';

/** Live block diagram of the temperature-flow cascade with current signal values. */
export default function LoopDiagram({ d }) {
  const mode = d?.ctrlMode;
  const outerOn = mode === 'CASCADE';
  const innerOn = mode === 'CASCADE' || mode === 'FLOW_ONLY';
  const sat = d?.sat ?? 0;

  const Block = ({ x, y, w = 150, h = 62, title, sub, on, tone = 'accent' }) => (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx="12"
        className={on ? `fill-${tone}/10 stroke-${tone}` : 'fill-surface-sunken stroke-ink-mute/40'}
        strokeWidth="1.4"
      />
      <text x={x + w / 2} y={y + 27} textAnchor="middle" className="fill-ink text-[13px] font-semibold">{title}</text>
      <text x={x + w / 2} y={y + 45} textAnchor="middle" className="fill-ink-mute text-[11px]">{sub}</text>
    </g>
  );

  const Wire = ({ d: path, on, color = 'accent' }) => (
    <path
      d={path} fill="none" strokeWidth="2" markerEnd="url(#arrow)"
      className={`${on ? `stroke-${color} animate-dash` : 'stroke-ink-mute/40'}`}
      strokeDasharray={on ? '7 5' : undefined}
    />
  );

  const Val = ({ x, y, label, value, color }) => (
    <g>
      <text x={x} y={y} textAnchor="middle" className="fill-ink-mute text-[10px] font-semibold uppercase tracking-wider">{label}</text>
      <text x={x} y={y + 16} textAnchor="middle" className={`fill-${color} num text-[13px] font-semibold`}>{value}</text>
    </g>
  );

  const Sum = ({ cx, cy, on }) => (
    <g>
      <circle cx={cx} cy={cy} r="11" className={on ? 'fill-surface stroke-accent' : 'fill-surface stroke-ink-mute/40'} strokeWidth="1.5" />
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-ink text-[12px] font-semibold">&Sigma;</text>
    </g>
  );

  return (
    <svg viewBox="0 0 980 250" className="h-auto w-full" role="img" aria-label="Cascade control loop diagram">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-ink-mute" />
        </marker>
      </defs>

      {/* setpoint */}
      <Val x={34} y={20} label="T*" value={`${fmt(d?.tSet, 1)}°C`} color="target" />
      <Wire d="M34 46 V82" on={outerOn} color="target" />
      <Sum cx={34} cy={94} on={outerOn} />
      <Wire d="M45 94 H88" on={outerOn} />

      <Block x={90} y={63} title="Temperature PI" sub="outer · 5 s" on={outerOn} />
      <Wire d="M240 94 H318" on={outerOn} color="target" />
      <Val x={279} y={62} label="q*" value={`${fmt(d?.qSet, 2)}`} color="target" />
      <Sum cx={330} cy={94} on={innerOn} />
      <Wire d="M341 94 H378" on={innerOn} />

      <Block x={380} y={63} title="Flow PI" sub="inner · 1 s" on={innerOn} />
      <Wire d="M530 94 H578" on={innerOn} color="pwm" />
      <Val x={554} y={62} label="PWM" value={fmt(d?.pwm, 0)} color="pwm" />

      <Block x={580} y={63} w={140} title="Pump + L298N" sub={sat ? (sat > 0 ? 'saturated high' : 'saturated low') : 'hydraulic plant'} on={innerOn} tone={sat ? 'warn' : 'pwm'} />
      <Wire d="M720 94 H778" on={innerOn} color="flow" />
      <Val x={749} y={62} label="q" value={fmt(d?.flowRate, 2)} color="flow" />

      <Block x={780} y={63} w={140} title="Fresnel receiver" sub={d?.simSolarW ? `~${fmt(d.simSolarW, 0)} W solar (sim)` : 'thermal plant'} on={innerOn} tone="outlet" />
      <Wire d="M920 94 H972" on={innerOn} color="outlet" />
      <Val x={946} y={62} label="Tout" value={`${fmt(d?.outletTemp, 2)}`} color="outlet" />
      <Wire d="M850 20 V60" on={innerOn} color="inlet" />
      <text x={862} y={30} className="fill-ink-mute text-[10px]">sun, T<tspan baselineShift="sub">in</tspan> {fmt(d?.inletTemp, 1)}&deg;C</text>

      {/* inner feedback */}
      <path d="M750 94 V160 H330 V107" fill="none" strokeWidth="1.6" markerEnd="url(#arrow)"
        className={innerOn ? 'stroke-flow/70' : 'stroke-ink-mute/30'} />
      <text x={540} y={154} textAnchor="middle" className="fill-ink-mute text-[11px]">
        flow feedback · e<tspan baselineShift="sub">q</tspan> = q* − q =
        <tspan className="fill-flow num font-semibold"> {fmt(d?.eq, 3)}</tspan> L/min
      </text>

      {/* outer feedback */}
      <path d="M946 94 V215 H34 V107" fill="none" strokeWidth="1.6" markerEnd="url(#arrow)"
        className={outerOn ? 'stroke-outlet/70' : 'stroke-ink-mute/30'} />
      <text x={490} y={209} textAnchor="middle" className="fill-ink-mute text-[11px]">
        temperature feedback · e<tspan baselineShift="sub">T</tspan> = Tout − T* =
        <tspan className="fill-outlet num font-semibold"> {fmt(d?.eT, 2)}</tspan> &deg;C (reversed sign: hotter → more flow)
      </text>
    </svg>
  );
}
