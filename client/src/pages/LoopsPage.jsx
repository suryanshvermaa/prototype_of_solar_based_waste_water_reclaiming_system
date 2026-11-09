import LiveChart, { Legend } from '../components/LiveChart';
import { Card, CardHeader, Stat } from '../components/ui';
import { fmt, signed } from '../utils/format';

const S = {
  temp: [
    { key: 'tSet', label: 'T*', color: 'c-target', dashed: true, step: true, unit: '°C' },
    { key: 'outletTemp', label: 'Outlet', color: 'c-outlet', area: true, unit: '°C' },
    { key: 'inletTemp', label: 'Inlet', color: 'c-inlet', width: 1.5, unit: '°C' },
  ],
  eT: [{ key: 'eT', label: 'eₜ = Tout − T*', color: 'c-outlet', area: true, unit: '°C' }],
  flow: [
    { key: 'qSet', label: 'q*', color: 'c-target', dashed: true, unit: 'L/min', decimals: 3 },
    { key: 'flowRate', label: 'q', color: 'c-flow', area: true, unit: 'L/min', decimals: 3 },
  ],
  eq: [{ key: 'eq', label: 'e_q = q* − q', color: 'c-flow', area: true, unit: 'L/min', decimals: 3 }],
  pwm: [
    { key: 'pwmRaw', label: 'Requested (unclipped)', color: 'c-target', dashed: true, decimals: 1 },
    { key: 'pwm', label: 'Applied', color: 'c-pwm', area: true, decimals: 1 },
  ],
  integ: [
    { key: 'iQ', label: 'I_q (inner)', color: 'c-pwm', decimals: 2 },
  ],
  integT: [
    { key: 'iT', label: 'I_T (outer)', color: 'c-outlet', decimals: 4 },
  ],
};

function Panel({ title, subtitle, series, data, isDark, refs, height = 220 }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} right={<Legend series={series} />} />
      <LiveChart data={data} series={series} refs={refs} isDark={isDark} height={height} />
    </Card>
  );
}

export default function LoopsPage({ latest, recent, isDark }) {
  const d = latest ?? {};
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="T*" value={fmt(d.tSet, 1)} unit="°C" tone="warn" />
        <Stat label="Tout" value={fmt(d.outletTemp, 2)} unit="°C" />
        <Stat label="e_T" value={signed(d.eT, 2)} unit="°C" />
        <Stat label="q*" value={fmt(d.qSet, 3)} unit="L/min" tone="warn" />
        <Stat label="q" value={fmt(d.flowRate, 3)} unit="L/min" />
        <Stat label="e_q" value={signed(d.eq, 3)} />
        <Stat label="PWM" value={fmt(d.pwm, 0)} hint={d.sat ? `saturated ${d.sat > 0 ? 'high' : 'low'}` : 'within limits'} tone={d.sat ? 'warn' : undefined} />
        <Stat label="Sample age" value={fmt(d.ageMs, 0)} unit="ms" tone={d.ageMs > 3000 ? 'bad' : undefined} />
      </div>

      <h2 className="label pt-1">Outer loop &middot; outlet temperature PI (5 s)</h2>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2"><Panel title="Outlet temperature vs target" series={S.temp} data={recent} isDark={isDark} height={260} /></div>
        <Panel title="Temperature error" subtitle="±0.5 °C tolerance band" series={S.eT} data={recent} isDark={isDark} height={260}
          refs={[{ y: 0.5, label: '+0.5', color: 'c-ok' }, { y: -0.5, label: '−0.5', color: 'c-ok' }]} />
      </div>

      <h2 className="label pt-1">Inner loop &middot; flow PI (1 s)</h2>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2"><Panel title="Measured flow vs setpoint" series={S.flow} data={recent} isDark={isDark} height={260}
          refs={[{ y: 0.5, label: 'q min', color: 'ink-mute' }, { y: 3.5, label: 'q max', color: 'ink-mute' }]} /></div>
        <Panel title="Flow error" series={S.eq} data={recent} isDark={isDark} height={260} refs={[{ y: 0, label: '' }]} />
      </div>

      <h2 className="label pt-1">Actuator &amp; anti-windup</h2>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Pump PWM" subtitle="Gap between requested and applied = saturation" series={S.pwm} data={recent} isDark={isDark}
          refs={[{ y: 80, label: 'u min 80', color: 'c-bad' }, { y: 255, label: 'u max 255', color: 'c-bad' }]} />
        <Panel title="Inner integrator" subtitle="Frozen while pushing into a limit" series={S.integ} data={recent} isDark={isDark} />
        <Panel title="Outer integrator" subtitle="Frozen when inner loop blocks demand" series={S.integT} data={recent} isDark={isDark} />
      </div>
    </div>
  );
}
