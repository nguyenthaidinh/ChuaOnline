/** Run only against a dedicated local QA server: fills its room with temporary guests. */
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const base = process.argv[2] ?? 'http://127.0.0.1:4186';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local QA only');
const guests = [], controllers = [], watches = [], timings = [], errors = [];
const report = { viewers: 200, peakPeople: 0, peakActions: 0, actions: [], sseBytes: 0 };
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
async function post(path, body, token) {
  const start = performance.now();
  const response = await fetch(`${base}/api/room/${path}`, { method: 'POST', headers: {
    'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  timings.push({ path, ms: performance.now() - start, status: response.status });
  if (!response.ok) throw Error(`${path}: ${response.status}`);
  return data;
}
const room = async () => (await fetch(`${base}/api/room`)).json();
async function watch() {
  const controller = new AbortController(); controllers.push(controller);
  try {
    const response = await fetch(`${base}/api/room/events`, { signal: controller.signal });
    if (!response.ok) throw Error(`SSE: ${response.status}`);
    for await (const chunk of response.body) report.sseBytes += chunk.length;
  } catch (error) { if (error.name !== 'AbortError') errors.push(String(error)); }
}
try {
  const initial = await room();
  if (initial.people.length > 1) throw Error('Use a dedicated QA room with at most one browser tester');
  for (let i = initial.people.length; i < 24; i++) {
    const appearance = ['man', 'woman', 'granny'][i % 3];
    guests.push({ ...await post('join', { name: `QA ${i + 1}`, appearance }), appearance });
  }
  for (let i = 0; i < report.viewers; i++) watches.push(watch());
  await new Promise(resolve => setTimeout(resolve, 10000));
  const counts = [0, 0, 0, 0], kinds = ['incense', 'lotus', 'petal', 'bell', 'bow'];
  const start = Date.now(); let heartbeatAt = start;
  while (!stopping && Date.now() - start < 180000) {
    let snapshot = await room();
    report.peakPeople = Math.max(report.peakPeople, snapshot.people.length);
    for (const [index, guest] of guests.slice(0, 4).entries()) {
      const member = snapshot.people.find(person => person.id === guest.selfId);
      if (counts[index] >= 5 || member?.action || snapshot.people.filter(person => person.action).length >= 4) continue;
      const kind = kinds[counts[index]++];
      snapshot = await post('action', { kind, requestId: randomUUID() }, guest.token);
      report.actions.push({ appearance: guest.appearance, kind });
    }
    report.peakActions = Math.max(report.peakActions, snapshot.people.filter(person => person.action).length);
    if (counts.every(count => count === 5) && snapshot.people.every(person => !person.action)) break;
    if (Date.now() - heartbeatAt >= 20000) {
      await Promise.all(guests.map(guest => post('heartbeat', {}, guest.token)));
      heartbeatAt = Date.now();
      console.log(JSON.stringify({ elapsedSeconds: Math.round((Date.now() - start) / 1000), actions: report.actions.length }));
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  report.completed = counts.every(count => count === 5) && (await room()).people.every(person => !person.action);
} catch (error) { errors.push(String(error)); }
finally {
  controllers.forEach(controller => controller.abort()); await Promise.allSettled(watches);
  const cleanup = await Promise.allSettled(guests.map(guest => post('leave', {}, guest.token)));
  cleanup.forEach(result => { if (result.status === 'rejected') errors.push(String(result.reason)); });
  const sorted = timings.map(value => value.ms).sort((a, b) => a - b);
  Object.assign(report, { errors, p95Ms: sorted[Math.floor(sorted.length * .95)], requestCount: timings.length,
    statusCounts: timings.reduce((result, value) => ({ ...result, [value.status]: (result[value.status] ?? 0) + 1 }), {}),
    remainingPeople: (await room()).people.length,
    note: 'Local API/SSE load plus one optional rendered browser. Not 200 rendered browsers, WAN or physical mobile measurements.' });
  await mkdir('docs/performance-audit/optimized', { recursive: true });
  await writeFile('docs/performance-audit/optimized/load.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (errors.length || !report.completed) process.exitCode = 1;
}
