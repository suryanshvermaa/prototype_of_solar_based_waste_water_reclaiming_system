import { API_URL } from './config';

async function getJson(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const fetchLatestData = () => getJson('/data');
export const fetchHistory = () => getJson('/history');
export const fetchEvents = () => getJson('/events');
export const csvLogUrl = () => `${API_URL}/logs/current`;

/** cmd: 'setpoint' (value in degC) | 'reset' | 'stop' | 'sim:cloud' | 'sim:clog' | 'sim:inlet' | 'sim:sensor' */
export async function sendCommand(cmd, value) {
  const res = await fetch(`${API_URL}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd, value }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}
