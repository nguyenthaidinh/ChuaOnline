import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleEntry, sampleSharedRitual, sharedRitualDurationMs, ENTRY_DURATION_MS } from '../src/room/ritual.ts';
import { TempleRoom, RoomError } from '../server/room.ts';
import type { SharedAction, OfferingKind } from '../src/room/protocol.ts';

test('entry uses all walking and sitting frames, then remains seated', () => {
  const frames = new Set<number>();
  for (let ms = 0; ms < ENTRY_DURATION_MS; ms += 20) {
    const entry = sampleEntry(1000, 1000 + ms);
    assert.ok(entry.travel >= 0 && entry.travel <= 1);
    if (entry.spriteFrame !== null) frames.add(entry.spriteFrame);
  }
  assert.deepEqual([...frames].sort(), [0,1,2,3,4,5,6,7]);
  assert.equal(sampleEntry(1000, 100000).phase, 'idle');
});

test('bow ritual stands, walks, kneels, bows three times, rises, returns and sits', () => {
  const action: SharedAction = { id: 'bow-test', actorId: 'person', kind: 'bow', bowCount: 3, startedAt: 1000, endsAt: 1000+sharedRitualDurationMs('bow'), slot: 0 };
  const phases = new Set<string>();
  const counts = new Set<number>();
  for (let ms = 0; ms <= sharedRitualDurationMs('bow') + 30; ms += 20) {
    const pose = sampleSharedRitual(action, 1000 + ms);
    phases.add(pose.phase); counts.add(pose.completedBows);
    assert.ok(pose.travel >= 0 && pose.travel <= 1);
    assert.ok(pose.spriteFrame === null || pose.spriteFrame >= 0 && pose.spriteFrame <= 7);
  }
  assert.deepEqual([...phases], ['standing','moving','settling','performing','rising','returning','seating','complete']);
  assert.deepEqual([...counts], [0,1,2,3]);
  const final = sampleSharedRitual(action, 999999);
  assert.equal(final.travel, 0); assert.equal(final.completedBows, 3); assert.equal(final.spriteFrame, null);
});

test('all four free offerings have a finite shared sequence and completion metadata', () => {
  let now = 1000;
  const room = new TempleRoom(() => now);
  for (const [index, kind] of (['incense','lotus','petal','bell'] as OfferingKind[]).entries()) {
    const guest = room.join(`Guest ${index}`, 'man');
    room.action(guest.token, kind, `offering-${index}`);
    const action = room.snapshot().people.find(person => person.id === guest.selfId)!.action!;
    assert.equal(action.offering, kind);
    assert.equal(action.kind, 'incense');
    assert.ok(action.startedAt >= now + ENTRY_DURATION_MS);
    assert.equal(sampleSharedRitual(action, action.startedAt+3000).phase, 'performing');
  }
  const other = room.join('Wait', 'woman');
  assert.throws(() => room.action(other.token, 'lotus', 'overflow-action'), (error: unknown) => error instanceof RoomError && error.status === 409);
  assert.throws(() => room.action(other.token, 'coins', 'invalid-action'), (error: unknown) => error instanceof RoomError && error.status === 400);
  now = Math.max(...room.snapshot().people.map(person => person.action?.endsAt ?? 0)) + 1;
  room.sweep();
  assert.ok(room.snapshot().people.every(person => person.action === null));
  assert.deepEqual(room.snapshot().people.slice(0,4).map(person=>person.completed?.offering), ['incense','lotus','petal','bell']);
});

test('absolute poses survive late joining, reflow and backwards sampling without mutation', () => {
  const action: SharedAction = { id:'flower',actorId:'person',kind:'incense',offering:'lotus',bowCount:3,slot:0,startedAt:1000,endsAt:1000+sharedRitualDurationMs('incense') };
  const middle = sampleSharedRitual(action,5000);
  sampleSharedRitual(action,action.endsAt+100);
  assert.deepEqual(sampleSharedRitual(action,5000),middle);
  assert.equal(sampleSharedRitual(action,action.endsAt).phase,'complete');
});
