import { Cpu, MonitorCog, Palette, Server } from 'lucide-react';
import { Card, CardHeader, Segmented } from '../components/ui';
import { API_URL } from '../services/config';
import { WINDOWS } from '../utils/format';

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-ink-soft">{k}</span>
      <span className="num text-right text-xs text-ink">{v}</span>
    </div>
  );
}

export default function SettingsPage({ isDark, setDark, windowSec, setWindowSec, latest, source, socketConnected }) {
  return (
    <div className="grid max-w-5xl grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-2">
      <Card>
        <CardHeader icon={Palette} title="Appearance" />
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-ink-soft">Theme</span>
          <Segmented label="Theme" value={isDark ? 'dark' : 'light'} onChange={(v) => setDark(v === 'dark')}
            options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-ink-soft">Chart window</span>
          <Segmented label="Chart window" value={windowSec} onChange={setWindowSec} options={WINDOWS} />
        </div>
      </Card>

      <Card>
        <CardHeader icon={Server} title="Connection" />
        <div className="divide-y hairline">
          <Row k="Backend" v={API_URL} />
          <Row k="Data source" v={source === 'REAL' ? 'Arduino (serial)' : source === 'FIRMWARE_SIM' ? 'Real firmware on simulated hardware' : 'JS simulation (MOCK)'} />
          <Row k="WebSocket" v={socketConnected ? 'connected' : 'disconnected'} />
          <Row k="Serial link" v={source !== 'MOCK' ? (latest?.connected ? 'open' : 'closed') : 'n/a'} />
        </div>
      </Card>

      <Card>
        <CardHeader icon={Cpu} title="Controller" subtitle="Initial settings from the major-project report (Table 4.3)" />
        <div className="divide-y hairline">
          <Row k="Firmware" v={latest?.rev ?? '--'} />
          <Row k="Outer PI (5 s)" v="Kp,T 0.30 · Ki,T 0.0085" />
          <Row k="Inner PI (1 s)" v="Kp,q 20 · Ki,q 10" />
          <Row k="Flow limits" v="0.5 – 3.5 L/min" />
          <Row k="PWM limits" v="80 – 255" />
          <Row k="Over-temperature trip" v="70 °C" />
        </div>
      </Card>

      <Card>
        <CardHeader icon={MonitorCog} title="Switching to hardware" />
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>Flash <code className="num text-xs">main.cpp</code> / <code className="num text-xs">pi_cascade_controller.ino</code> to the Uno.</li>
          <li>Close the Arduino Serial Monitor (it locks the port).</li>
          <li>In <code className="num text-xs">server/.env</code> set <code className="num text-xs">MODE=REAL</code> and <code className="num text-xs">SERIAL_PORT=COM3</code> (your port).</li>
          <li>Restart the server with <code className="num text-xs">pnpm start</code>.</li>
        </ol>
      </Card>
    </div>
  );
}
