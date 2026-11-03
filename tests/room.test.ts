import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { TempleRoom, RoomError } from '../server/room.ts';
import { createTempleServer } from '../server/index.ts';
import { RitualTimeline } from '../src/services/ritualTimeline.ts';
import { INCENSE_SECONDS, WALK_SECONDS, type JoinResult, type RoomSnapshot } from '../src/room/protocol.ts';

test('one shared room has real members only, unique seats and private credentials', () => {
  const room = new TempleRoom();
  assert.equal(room.snapshot().people.length, 0);
  const a = room.join('An Nhiên', 'man'), b = room.join('Bình An', 'woman');
  assert.equal(room.snapshot().people.length, 2);
  assert.notEqual(a.selfId, b.selfId);
  assert.notEqual(room.snapshot().people[0].seat, room.snapshot().people[1].seat);
  assert.equal(JSON.stringify(room.snapshot()).includes(a.token), false);
  assert.throws(() => room.action('invalid', 'bow', 'request-0001'), (error: unknown) => error instanceof RoomError && error.status === 401);
});

test('server rejects conflicting actions, deduplicates requests and controls only the token owner', () => {
  const room = new TempleRoom();
  const a = room.join('A', 'man'), b = room.join('B', 'woman');
  room.action(a.token, 'bow', 'request-0001');
  const before = room.snapshot().people[0].action!;
  room.action(a.token, 'bow', 'request-0001');
  assert.equal(room.snapshot().people[0].action?.id, before.id);
  assert.throws(() => room.action(a.token, 'incense', 'request-0002'), (error: unknown) => error instanceof RoomError && error.status === 409);
  assert.equal(room.snapshot().people[1].action, null);
  room.action(b.token, 'incense', 'request-0003');
  assert.notEqual(room.snapshot().people[1].action?.slot, before.slot);
});

test('late joiners sample the same three-bow sequence and server completes it once', () => {
  let now = 1000;
  const room = new TempleRoom(() => now);
  const a = room.join('A', 'man');
  room.action(a.token, 'bow', 'request-0001');
  now += 7000;
  const b = room.join('B', 'woman');
  const remote = b.room.people.find(person => person.id === a.selfId)!.action!;
  const one = new RitualTimeline(remote, () => {}, WALK_SECONDS, INCENSE_SECONDS).sampleAt((now - remote.startedAt) / 1000);
  const two = new RitualTimeline(remote, () => {}, WALK_SECONDS, INCENSE_SECONDS).sampleAt((now - remote.startedAt) / 1000);
  assert.deepEqual(one, two);
  assert.equal(one.phase, 'performing');
  now = remote.endsAt + 1;
  room.sweep();
  assert.equal(room.snapshot().people[0].action, null);
  assert.equal(room.snapshot().people[0].completed?.kind, 'bow');
  const revision = room.snapshot().revision;
  room.sweep(); assert.equal(room.snapshot().revision, revision);
});

test('leave and stale heartbeat cleanup remove visitors and reuse seats', () => {
  let now = 0;
  const room = new TempleRoom(() => now);
  const a = room.join('A', 'man'), b = room.join('B', 'woman');
  room.leave(a.token);
  assert.equal(room.snapshot().people.length, 1);
  const c = room.join('C', 'granny');
  assert.equal(c.room.people.find(person => person.id === c.selfId)?.seat, 0);
  now = 80000; room.heartbeat(b.token);
  now = 90001; room.sweep();
  assert.deepEqual(room.snapshot().people.map(person => person.name), ['B']);
});

test('capacity and malformed names/appearances/actions are bounded', () => {
  const room = new TempleRoom();
  assert.throws(() => room.join('x'.repeat(33), 'man'));
  assert.throws(() => room.join('A', '__proto__'));
  assert.throws(() => room.join('A', { toString: 'man' }));
  for (let i = 0; i < 24; i++) room.join(`Visitor ${i}`, 'man');
  assert.throws(() => room.join('overflow', 'man'), (error: unknown) => error instanceof RoomError && error.status === 409);
  assert.equal(room.snapshot().people.length, 24);
});

test('HTTP/SSE synchronizes two independent clients, rejects wrong origins and never trusts client person IDs', async () => {
  const server = createTempleServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const controller = new AbortController();
  const post = (path: string, data: unknown, token?: string, origin?: string) => fetch(base + '/api/room/' + path,
    { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(data) });
  try {
    const a = await (await post('join', { name: 'An Nhiên', appearance: 'man' })).json() as JoinResult;
    const b = await (await post('join', { name: 'Bình An', appearance: 'woman' })).json() as JoinResult;
    const response = await fetch(base + '/api/room/events', { signal: controller.signal });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    assert.match(decoder.decode((await reader.read()).value), /Bình An/);
    const accepted = await post('action', { kind: 'bow', requestId: 'request-http-1', actorId: b.selfId }, a.token);
    assert.equal(accepted.status, 200);
    const room = await accepted.json() as RoomSnapshot;
    assert.equal(room.people.find(person => person.id === a.selfId)?.action?.kind, 'bow');
    assert.equal(room.people.find(person => person.id === b.selfId)?.action, null);
    const event = decoder.decode((await reader.read()).value);
    assert.match(event, /"kind":"bow"/);
    assert.equal(event.includes(a.token), false);
    assert.equal((await post('action', { kind: 'bow', requestId: 'request-http-2' }, a.token)).status, 409);
    assert.equal((await post('action', { kind: 'bow', requestId: 'request-http-3' }, b.token, 'https://unrelated.invalid')).status, 403);
    assert.equal((await post('action', { kind: 'bow', requestId: 'request-null-origin' }, b.token, 'null')).status, 403);
    assert.equal((await post('action', { kind: 'bow', requestId: 'request-http-4' }, 'bad')).status, 401);
    await post('leave', {}, b.token);
    const after = await (await fetch(base + '/api/room')).json() as RoomSnapshot;
    assert.equal(after.people.length, 1);
  } finally {
    controller.abort(); server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
