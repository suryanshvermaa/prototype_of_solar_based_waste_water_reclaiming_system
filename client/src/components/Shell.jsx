import { NavLink } from 'react-router-dom';
import {
  Activity, Bell, Database, Gauge, LayoutDashboard, Menu, Moon, Settings, Sun, Wifi, WifiOff, X,
} from 'lucide-react';
import { MODE_META, SOURCE_LABEL } from '../utils/format';
import { Badge } from './ui';

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/loops', label: 'Control loops', icon: Activity },
  { to: '/performance', label: 'Performance', icon: Gauge },
  { to: '/events', label: 'Events & faults', icon: Bell },
  { to: '/data', label: 'Data log', icon: Database },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-target to-outlet shadow-lg shadow-outlet/20">
        <Sun className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">Solar Cascade</div>
        <div className="truncate text-[11px] text-ink-mute">PI control &middot; NIT Patna</div>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose, unread }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r hairline bg-surface/95 backdrop-blur-xl transition-transform
          lg:static lg:translate-x-0 lg:bg-surface/60 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button className="mr-3 rounded-lg p-2 text-ink-mute hover:bg-ink/5 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end} onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-accent/10 font-medium text-accent' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {to === '/events' && unread > 0 && (
                <span className="num rounded-full bg-bad px-1.5 text-[10px] font-semibold text-white">{unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-xl bg-ink/[.04] p-3 text-[11px] leading-relaxed text-ink-mute">
          Outer loop: outlet temperature &rarr; q*<br />Inner loop: measured flow &rarr; pump PWM
        </div>
      </aside>
    </>
  );
}

export function Topbar({ title, latest, linkUp, source, isDark, onToggleTheme, onMenu }) {
  const mode = latest?.ctrlMode;
  const meta = MODE_META[mode];
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b hairline bg-surface/60 px-4 backdrop-blur-xl sm:px-6">
      <button className="rounded-lg p-2 text-ink-soft hover:bg-ink/5 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-ink">{title}</h1>
        <p className="hidden truncate text-xs text-ink-mute sm:block">Fresnel collector prototype &middot; wastewater reclamation</p>
      </div>
      {meta && <span className="hidden md:inline-flex"><Badge tone={meta.tone} dot pulse={mode === 'CASCADE'}>{meta.label}</Badge></span>}
      <Badge tone={linkUp ? 'ok' : 'bad'}>
        {linkUp ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {SOURCE_LABEL[source] ?? source}
      </Badge>
      <button
        onClick={onToggleTheme} aria-label="Toggle colour theme"
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition hover:bg-ink/5 hover:text-ink"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}
