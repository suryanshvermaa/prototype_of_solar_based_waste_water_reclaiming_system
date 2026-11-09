import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NAV, Sidebar, Topbar } from './components/Shell';
import { useTelemetry } from './hooks/useTelemetry';
import OverviewPage from './pages/OverviewPage';
import LoopsPage from './pages/LoopsPage';
import PerformancePage from './pages/PerformancePage';
import EventsPage from './pages/EventsPage';
import DataPage from './pages/DataPage';
import SettingsPage from './pages/SettingsPage';
import { WINDOWS } from './utils/format';


function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

function AppShell() {
  // ?theme=light|dark overrides the saved theme (useful for screenshots / printing)
  const [isDark, setDark] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('theme');
    return t === 'light' ? false : t === 'dark' ? true : load('theme-dark', true);
  });
  const [windowSec, setWindowSec] = useState(() => load('window-sec', 300));
  const [menuOpen, setMenuOpen] = useState(false);
  const [seenEvents, setSeenEvents] = useState(0);
  const location = useLocation();
  const t = useTelemetry();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    save('theme-dark', isDark);
  }, [isDark]);
  useEffect(() => save('window-sec', windowSec), [windowSec]);

  const recent = useMemo(() => {
    if (!t.history.length) return [];
    const end = t.history[t.history.length - 1].ts;
    return t.history.filter((p) => p.ts >= end - windowSec * 1000);
  }, [t.history, windowSec]);

  const dangerCount = t.events.filter((e) => e.severity === 'danger').length;
  useEffect(() => { if (location.pathname === '/events') setSeenEvents(dangerCount); }, [location.pathname, dangerCount]);

  const title = NAV.find((n) => n.to === location.pathname)?.label ?? 'Overview';
  const windowLabel = WINDOWS.find((w) => w.value === windowSec)?.label ?? `${windowSec} s`;
  const common = { latest: t.latest, recent, isDark, source: t.source };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} unread={Math.max(0, dangerCount - seenEvents)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title} latest={t.latest} linkUp={t.linkUp} source={t.source}
          isDark={isDark} onToggleTheme={() => setDark((d) => !d)} onMenu={() => setMenuOpen(true)}
        />
        <main key={location.pathname} className="flex-1 overflow-y-auto animate-fade-up">
          <Routes>
            <Route path="/" element={<OverviewPage {...common} events={t.events} />} />
            <Route path="/loops" element={<LoopsPage {...common} />} />
            <Route path="/performance" element={<PerformancePage {...common} windowLabel={windowLabel} />} />
            <Route path="/events" element={<EventsPage latest={t.latest} events={t.events} />} />
            <Route path="/data" element={<DataPage recent={recent} />} />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  isDark={isDark} setDark={setDark} windowSec={windowSec} setWindowSec={setWindowSec}
                  latest={t.latest} source={t.source} socketConnected={t.socketConnected}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
