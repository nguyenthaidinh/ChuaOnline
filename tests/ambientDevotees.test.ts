import test from 'node:test';
import assert from 'node:assert/strict';
import { ambientDevotees, createAmbientCrowd, AMBIENT_DEVOTEE_MIN, AMBIENT_DEVOTEE_MAX } from '../src/room/ambientDevotees.ts';
import { TempleRoom } from '../server/room.ts';
import { ROOM_CAPACITY } from '../src/room/protocol.ts';

test('quiet rooms have a stable seated crowd with three robes and a clear centre aisle', () => {
  const crowd = createAmbientCrowd(() => .999);
  const people = ambientDevotees([], crowd);
  assert.equal(people.length, 12);
  assert.equal(new Set(people.map(person => person.seat)).size, 12);
  for (const person of people) {
    assert.ok(person.seat >= 6 && person.seat < ROOM_CAPACITY);
    assert.ok(person.seat % 6 < 4, 'Keep the two centre seats and the front row free.');
  }
  for (const appearance of ['man', 'woman', 'granny']) {
    assert.equal(people.filter(person => person.appearance === appearance).length, 4);
  }
  assert.deepEqual(ambientDevotees([], crowd), people);
});

test('each visit chooses a bounded crowd and unique Vietnamese names without changing an existing visit', () => {
  const targets = new Set<number>();
  const identities = new Set<string>();
  for (const random of [() => 0, () => .2, () => .4, () => .6, () => .8, () => .999]) {
    const crowd = createAmbientCrowd(random);
    const people = ambientDevotees([], crowd);
    assert.ok(crowd.target >= AMBIENT_DEVOTEE_MIN && crowd.target <= AMBIENT_DEVOTEE_MAX);
    assert.equal(people.length, crowd.target);
    assert.equal(new Set(crowd.people.map(person => person.name)).size, crowd.people.length);
    for (const person of crowd.people) {
      assert.equal(person.name.normalize('NFC'), person.name);
      assert.ok(person.name.trim().length > 3);
      assert.doesNotMatch(person.name, /bot|khách|visitor|\d/i);
    }
    targets.add(crowd.target);
    identities.add(JSON.stringify(crowd.people.map(person => person.name)));
    assert.deepEqual(ambientDevotees([], crowd), people);
    const afterJoin = ambientDevotees([{ seat: 0 }], crowd);
    for (const person of afterJoin) assert.equal(person, people.find(before => before.seat === person.seat));
  }
  assert.equal(targets.size, AMBIENT_DEVOTEE_MAX - AMBIENT_DEVOTEE_MIN + 1);
  assert.ok(identities.size > 1);
});

test('every real seat remains reserved and ambient occupants decline as visitors arrive', () => {
  // Exercise scattered reservations, not only the server\'s sequential allocation.
  const order = Array.from({ length: ROOM_CAPACITY }, (_, index) => index * 7 % ROOM_CAPACITY);
  for (const random of [() => 0, () => .4, () => .999]) {
    const crowd = createAmbientCrowd(random);
    for (let count = 0; count <= ROOM_CAPACITY; count++) {
      const real = order.slice(0, count).map(seat => ({ seat }));
      const ambient = ambientDevotees(real, crowd);
      assert.equal(ambient.length, Math.max(0, crowd.target - count));
      assert.equal(new Set([...real, ...ambient].map(person => person.seat)).size, count + ambient.length);
      assert.deepEqual(ambientDevotees([...real].reverse(), crowd), ambient, 'Snapshot ordering cannot shuffle the crowd.');
    }
  }
});

test('decorative occupants never become server members or consume seats reserved during rituals', () => {
  const room = new TempleRoom();
  const crowd = createAmbientCrowd(() => .999);
  assert.equal(ambientDevotees(room.snapshot().people, crowd).length, 12);
  assert.equal(room.snapshot().people.length, 0);
  for (let index = 0; index < ROOM_CAPACITY; index++) {
    const guest = room.join(`Visitor ${index}`, 'man');
    if (index === 6) room.action(guest.token, 'bow', 'ambient-reserved-seat');
    const snapshot = room.snapshot();
    const ambient = ambientDevotees(snapshot.people, crowd);
    assert.equal(snapshot.people.length, index + 1);
    assert.ok(ambient.every(bot => snapshot.people.every(person => person.seat !== bot.seat)));
  }
  assert.equal(ambientDevotees(room.snapshot().people, crowd).length, 0);
  assert.equal(room.snapshot().people.length, ROOM_CAPACITY);
});
