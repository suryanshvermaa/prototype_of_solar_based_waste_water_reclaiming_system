import { useMemo, useState } from 'react';
import { Gauge, Info, Timer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, Segmented, Stat, Empty } from '../components/ui';
import { token } from '../components/LiveChart';
import { computeMetrics, fmt } from '../utils/format';

const BANDS = [
  { value: 0.25, label: '±0.25 °C' },
  { value: 0.5, label: '±0.5 °C' },
  { value: 1, label: '±1 °C' },
];

// colour by error magnitude (outer edge of the bin), symmetric about zero
function edgeTone(b) {
  const m = Math.max(Math.abs(b.lo), Math.abs(b.hi));
  return m <= 0.5 ? 'c-ok' : m <= 1 ? 'c-warn' : 'c-bad';
}

function ErrorHistogram({ points }) {
  const bins = useMemo(() => {
    const edges = [-2, -1.5, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 1.5, 2];
    const out = edges.slice(0, -1).map((lo, i) => ({ lo, hi: edges[i + 1], label: `${lo}`, n: 0 }));
    points.filter((p) => p.ctrlMode === 'CASCADE' && p.eT != null).forEach((p) => {
      const e = Math.max(-1.999, Math.min(1.999, p.eT));
      const b = out.find((x) => e >= x.lo && e < x.hi);
      if (b) b.n++;
    });
    return out;
  }, [points]);
  if (!bins.some((b) => b.n)) return <Empty>Needs samples in CASCADE mode</Empty>;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke={token('line', 0.07)} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: token('ink-mute'), fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: token('ink-mute'), fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: token('line', 0.05) }}
            content={({ active, payload }) => active && payload?.length ? (
              <div className="card px-3 py-2 text-xs">
                <div className="text-ink-mute">e<sub>T</sub> {payload[0].payload.lo} to {payload[0].payload.hi} &deg;C</div>
                <div className="num font-semibold text-ink">{payload[0].value} samples</div>
              </div>
            ) : null}
          />
          <Bar dataKey="n" radius={[6, 6, 0, 0]}>
            {bins.map((b) => (
              <Cell key={b.lo} fill={token(edgeTone(b), 0.85)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PerformancePage({ recent, windowLabel }) {
  const [band, setBand] = useState(0.5);
  const m = useMemo(() => computeMetrics(recent, band), [recent, band]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Card>
        <CardHeader
          icon={Gauge} title="Closed-loop performance"
          subtitle={`Computed live over the ${windowLabel} chart window, CASCADE samples only`}
          right={<Segmented label="Tolerance band" value={band} options={BANDS} onChange={setBand} />}
        />
        {!m ? (
          <Empty>Collecting samples in CASCADE mode&hellip;</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="MAE  |e_T|" value={fmt(m.mae, 3)} unit="°C" tone={m.mae <= band ? 'ok' : 'warn'} hint="mean absolute error" />
            <Stat label="RMS  e_T" value={fmt(m.rms, 3)} unit="°C" />
            <Stat label="Peak |e_T|" value={fmt(m.maxAbs, 2)} unit="°C" tone={m.maxAbs > 2 * band ? 'bad' : undefined} />
            <Stat label="IAE" value={fmt(m.iae, 1)} unit="°C·s" hint="integral of |e_T|" />
            <Stat label="Time in band" value={fmt(m.inBandPct, 1)} unit="%" tone={m.inBandPct >= 90 ? 'ok' : 'warn'} hint={`within ±${band} °C`} />
            <Stat label="Flow loop MAE" value={fmt(m.flowMae, 3)} unit="L/min" hint="|q* − q|" />
            <Stat label="PWM saturated" value={fmt(m.satPct, 1)} unit="%" tone={m.satPct > 10 ? 'warn' : 'ok'} />
            <Stat label="Mean heat" value={fmt(m.meanHeat, 0)} unit="W" hint={`${m.n} samples`} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader icon={Timer} title="Last setpoint step" subtitle="Settling = time until |e_T| stays inside the band" />
          {m?.step ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Step" value={`${fmt(m.step.from, 1)}→${fmt(m.step.to, 1)}`} unit="°C" />
              <Stat label="At" value={new Date(m.step.at).toLocaleTimeString()} />
              <Stat label="Settling time" value={m.step.settlingS == null ? 'not yet' : fmt(m.step.settlingS, 0)} unit={m.step.settlingS == null ? '' : 's'} tone={m.step.settlingS == null ? 'warn' : 'ok'} />
              <Stat label="Overshoot" value={fmt(m.step.overshoot, 2)} unit="°C" />
            </div>
          ) : (
            <Empty>Change T* on the Overview page to measure a step response</Empty>
          )}
        </Card>
        <Card>
          <CardHeader title="Error distribution" subtitle="Histogram of e_T = Tout − T*" />
          <ErrorHistogram points={recent} />
        </Card>
      </div>

      <div className="card flex items-start gap-3 p-4 text-xs leading-relaxed text-ink-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          These are the metrics planned for the validation trials in the major-project report (MAE, IAE, settling, overshoot,
          % saturation). For a formal comparison with the legacy P controller, run each controller under the same disturbance
          and download the CSV from the Data log page. In the simulation modes (MOCK and firmware simulation) the numbers come from a simulated plant, not hardware.
        </p>
      </div>
    </div>
  );
}
