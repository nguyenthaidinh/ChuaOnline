/** Local, isolated audit. Does not join or alter a running user's room. */
import { mkdir, writeFile, stat, readdir } from 'node:fs/promises';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { createTempleServer } from '../server/index.ts';
import { TempleRoom } from '../server/room.ts';
import { essentialAssets } from '../src/room/layout.ts';
import { sampleCharacter, FALLBACK_ARTWORK } from '../src/room/characterAnimation.ts';
import { entryDurationMs } from '../src/room/ritual.ts';

const output = resolve(process.argv[2] ?? 'docs/performance-audit');
await mkdir(output, { recursive: true });
const appearances = ['man', 'woman', 'granny'];
const kinds = ['bow', 'incense', 'lotus', 'petal', 'bell'];
const all = Object.fromEntries(appearances.map(a => [a, true]));
const full = { movement: true, directions: true, expandedDirections: true,
  variantMovement: { woman: true, granny: true }, variantGaits: { woman: true, granny: true },
  incense: all, rituals: all, closingSteps: all, ritualExtension: all };
const frames = new Map();
let samples = 0;
function collect(person, start, end) {
  for (const artwork of [FALLBACK_ARTWORK, full]) {
    for (let now = start; now <= end + 80; now += 80) {
      const { frame } = sampleCharacter(person, now, false, artwork);
      samples++;
      const key = `${frame.image}:${frame.columns}:${frame.rows}:${frame.atlasCell}`;
      frames.set(key, { image: frame.image, columns: frame.columns, rows: frame.rows, cell: frame.atlasCell });
    }
  }
}
for (const appearance of appearances) for (const seat of [0, 5, 18, 23]) {
  collect({ id: 'entry', name: 'Audit', seat, appearance, joinedAt: 100000, entryVersion: 5,
    action: null, completed: null }, 100000, 100000 + entryDurationMs(seat, 5));
  for (let slot = 0; slot < 4; slot++) for (const kind of kinds) {
    let now = 100000;
    const room = new TempleRoom(() => now);
    const guests = Array.from({ length: 24 }, (_, i) => room.join(`Audit ${i}`, appearance));
    now += 30000;
    const blockers = guests.filter((_, i) => i !== seat).slice(0, slot);
    for (const [i, guest] of blockers.entries()) room.action(guest.token, kind, `blocker-${i}`);
    room.action(guests[seat].token, kind, 'audit-action');
    const person = room.snapshot().people.find(p => p.id === guests[seat].selfId);
    collect(person, person.action.startedAt, person.action.endsAt);
  }
}
const essential = {};
for (const layout of ['desktop', 'mobile']) {
  essential[layout] = await Promise.all(essentialAssets(layout).map(async url => ({
    path: url.replace(/^\//, ''), bytes: (await stat(resolve('public', '.' + url))).size,
  })));
}
const server = createTempleServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const http = [];
async function probe(path, options = {}) {
  const response = await fetch(base + path, options);
  const bytes = (await response.arrayBuffer()).byteLength;
  http.push({ path, requestHeaders: options.headers ?? {}, status: response.status,
    headers: Object.fromEntries(response.headers), bytes });
}
let rateLimit;
try {
  const js = (await readdir('dist/assets')).find(p => /^index-.*\.js$/.test(p));
  await probe('/assets/fonts/noto-serif-vietnamese.woff2');
  await probe('/assets/visual-v2/hall-desktop.webp');
  await probe('/assets/' + js, { headers: { 'Accept-Encoding': 'gzip, br' } });
  await probe('/assets/visual-v2/hall-desktop.webp', { headers: { 'If-Modified-Since': new Date(Date.now() + 60000).toUTCString() } });
  await probe('/assets/tanphat/music/music1.mp3', { headers: { Range: 'bytes=0-1023' } });
  const post = (path, body, token) => fetch(base + '/api/room/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  const join = await (await post('join', { name: 'Audit', appearance: 'man' })).json();
  for (let i = 2; i <= 182; i++) {
    const response = await post('heartbeat', {}, join.token);
    const body = await response.json();
    if (response.status === 429) { rateLimit = { requestNumber: i, status: 429, message: body.error }; break; }
  }
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
await writeFile(resolve(output, 'source-and-http.json'), JSON.stringify({
  recordedAt: new Date().toISOString(), samples, uniqueFrames: frames.size,
  sampling: '80 ms, seats 0/5/18/23, all 3 appearances, all 4 stations, all 5 rites; full and fallback artwork. Not an exhaustive partial-readiness or pixel-paint test.',
  essential, http, rateLimit, frames: [...frames.values()],
}, null, 2) + '\n');
console.log(JSON.stringify({ output, samples, uniqueFrames: frames.size, http: http.map(({ path, status, bytes }) => ({ path, status, bytes })), rateLimit }));
