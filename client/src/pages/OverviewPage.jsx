import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Flame, GitBranch, ListChecks, Thermometer, Zap } from 'lucide-react';
import Kpi from '../components/Kpi';
import LiveChart, { Legend } from '../components/LiveChart';
import LoopDiagram from '../components/LoopDiagram';
import ControlPanel from '../components/ControlPanel';
import ModeStepper from '../components/ModeStepper';
import EventList from '../components/EventList';
import { Card, CardHeader } from '../components/ui';
import { fmt, signed } from '../utils/format';

const TEMP_SERIES = [
  { key: 'tSet', label: 'Target T*', color: 'c-target', dashed: true, step: true, unit: '°C' },
  { key: 'outletTemp', label: 'Outlet', color: 'c-outlet', area: true, unit: '°C' },
  { key: 'inletTemp', label: 'Inlet', color: 'c-inlet', width: 1.5, unit: '°C' },
];
const FLOW_SERIES = [
  { key: 'qSet', label: 'Setpoint q*', color: 'c-target', dashed: true, unit: 'L/min', decimals: 3 },
  { key: 'flowRate', label: 'Measured q', color: 'c-flow', area: true, unit: 'L/min', decimals: 3 },
];

export default function OverviewPage({ latest, recent, events, source, isDark }) {
  const d = latest ?? {};
  const spark = recent.slice(-90);
  const eT = d.eT;
  const eTone = eT == null ? 'text-ink-mute' : Math.abs(eT) <= 0.5 ? 'text-ok' : Math.abs(eT) <= 1.5 ? 'text-warn' : 'text-bad';
  const pwmPct = d.pwm != null ? (d.pwm / 255) * 100 : 0;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {d.sensorError && (
        <div className="card border-bad/30 bg-bad/10 p-4 text-sm text-bad">
          Sensor error from controller: <b>{d.sensorErrorMessage}</b>. Check the DS18B20 wiring and the 4.7 k&Omega; pull-up.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Outlet temperature" icon={Thermometer} color="c-outlet" value={fmt(d.outletTemp, 2)} unit="&deg;C"
          sub={<>target {fmt(d.tSet, 1)} &deg;C &middot; <span className={eTone}>e<sub>T</sub> {signed(eT, 2)}</span></>}
          spark={spark} sparkKey="outletTemp" sparkKey2="tSet"
        />
        <Kpi
          label="Flow rate" icon={Droplets} color="c-flow" value={fmt(d.flowRate, 2)} unit="L/min"
          sub={<>setpoint q* {fmt(d.qSet, 2)} &middot; e<sub>q</sub> {signed(d.eq, 3)}</>}
          spark={spark} sparkKey="flowRate" sparkKey2="qSet"
        />
        <Kpi
          label="Pump command" icon={Zap} color="c-pwm" value={fmt(d.pwm, 0)} unit="/ 255"
          sub={d.sat ? <span className="text-warn">Saturated {d.sat > 0 ? 'high' : 'low'} &middot; integrators held</span> : `${fmt(pwmPct, 0)} % duty · limits 80–255`}
        >
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/5">
            <div className="h-full rounded-full bg-pwm transition-all duration-500" style={{ width: `${pwmPct}%` }} />
          </div>
          <div className="relative mt-1 h-3 text-[10px] text-ink-mute">
            <span className="absolute" style={{ left: `${(80 / 255) * 100}%` }}>&#9650; 80</span>
          </div>
        </Kpi>
        <Kpi
          label="Absorbed heat" icon={Flame} color="c-target" value={fmt(d.heatW, 0)} unit="W"
          sub={<>&Delta;T {fmt(d.deltaTemp, 2)} &deg;C &middot; inlet {fmt(d.inletTemp, 1)} &deg;C</>}
          spark={spark} sparkKey="heatW"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader icon={GitBranch} title="Cascade loop · live" subtitle="Signals update every second; animated wires show which loops are closed" />
          <div className="-mx-1 overflow-x-auto">
            <div className="min-w-[640px]"><LoopDiagram d={d} /></div>
          </div>
          <div className="mt-4 border-t hairline pt-4">
            <ModeStepper mode={d.ctrlMode} fault={d.fault} />
          </div>
        </Card>
        <ControlPanel latest={d} source={source} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Temperature tracking" subtitle="Outer loop: outlet follows T*" right={<Legend series={TEMP_SERIES} />} />
          <LiveChart data={recent} series={TEMP_SERIES} isDark={isDark} />
        </Card>
        <Card>
          <CardHeader title="Flow tracking" subtitle="Inner loop: measured flow follows q*" right={<Legend series={FLOW_SERIES} />} />
          <LiveChart data={recent} series={FLOW_SERIES} isDark={isDark} />
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={ListChecks} title="Recent events" subtitle="Mode changes, faults and commands"
          right={<Link to="/events" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">All events <ArrowRight className="h-3 w-3" /></Link>}
        />
        <EventList events={events} limit={5} />
      </Card>
    </div>
  );
}
