/**
 * Single source of truth for live controller telemetry.
 * Socket.IO push with REST fallback, server-side history hydration and event log.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocket } from '../services/socket';
import { fetchEvents, fetchHistory, fetchLatestData } from '../services/api';

const MAX_POINTS = 900; // 15 min at 1 Hz

function toPoint(p) {
  return {
    ts: p.receivedAt ?? p.serverTime ?? Date.now(),
    ctrlMode: p.ctrlMode,
    tSet: p.tSet, outletTemp: p.outletTemp, inletTemp: p.inletTemp, deltaTemp: p.deltaTemp, eT: p.eT,
    qSet: p.qSet, flowRate: p.flowRate, eq: p.eq,
    pwm: p.pwm, pwmRaw: p.pwmRaw, iT: p.iT, iQ: p.iQ, sat: p.sat, fault: p.fault,
    heatW: p.heatW, ageMs: p.ageMs, simSolarW: p.simSolarW,
  };
}

export function useTelemetry() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastTsRef = useRef(0);
  const lastSeenRef = useRef(0);

  const apply = useCallback((p) => {
    if (!p) return;
    setLatest(p);
    setLoading(false);
    lastSeenRef.current = Date.now();
    const ts = p.receivedAt;
    if (!p.sensorError && ts && ts !== lastTsRef.current && p.outletTemp != null) {
      lastTsRef.current = ts;
      setHistory((h) => {
        const next = h.length >= MAX_POINTS ? h.slice(h.length - MAX_POINTS + 1) : h.slice();
        next.push(toPoint(p));
        return next;
      });
    }
  }, []);

  // hydrate from server buffers
  useEffect(() => {
    fetchHistory()
      .then((rows) => {
        const pts = rows.filter((r) => r.outletTemp != null).map(toPoint);
        if (pts.length) lastTsRef.current = pts[pts.length - 1].ts;
        setHistory(pts.slice(-MAX_POINTS));
      })
      .catch(() => {});
    fetchEvents().then((e) => setEvents(e.slice().reverse())).catch(() => {});
    fetchLatestData().then(apply).catch(() => setLoading(false));
  }, [apply]);

  useEffect(() => {
    // created per effect run so React StrictMode's mount/unmount/mount gets a live socket
    const socket = createSocket();
    const on = () => setSocketConnected(true);
    const off = () => setSocketConnected(false);
    const onEvent = (ev) => setEvents((e) => [ev, ...e].slice(0, 200));
    setSocketConnected(socket.connected);
    socket.on('connect', on);
    socket.on('disconnect', off);
    socket.on('connect_error', off);
    socket.on('sensorData', apply);
    socket.on('controllerEvent', onEvent);
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
      socket.off('connect_error', off);
      socket.off('sensorData', apply);
      socket.off('controllerEvent', onEvent);
      socket.disconnect();
    };
  }, [apply]);

  // REST fallback when the socket is quiet
  useEffect(() => {
    const id = setInterval(() => {
      if (socketConnected && Date.now() - lastSeenRef.current < 3000) return;
      fetchLatestData().then(apply).catch(() => {});
    }, 1500);
    return () => clearInterval(id);
  }, [socketConnected, apply]);

  const source = latest?.mode ?? 'MOCK';
  const linkUp = socketConnected && (source === 'MOCK' || Boolean(latest?.connected));

  return { latest, history, events, socketConnected, linkUp, source, loading };
}
