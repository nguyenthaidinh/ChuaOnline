import test from 'node:test';
import assert from 'node:assert/strict';
import { ambientDevotees, createAmbientCrowd, AMBIENT_DEVOTEE_MIN, AMBIENT_DEVOTEE_MAX } from '../src/room/ambientDevotees.ts';
import { TempleRoom } from '../server/room.ts';
import { logicalSeat } from '../src/room/motion.ts';
import { seatPoint } from '../src/room/layout.ts';
import { ROOM_CAPACITY } from '../src/room/protocol.ts';

test('quiet rooms have a stable seated crowd with three robes and a clear centre aisle', () => {
  const crowd = createAmbientCrowd(() => .999);
  const people = ambientDevotees([], crowd);
  assert.equal(people.length, 12);
  assert.equal(new Set(people.map(person => person.seat)).size, 12);
  for (const person of people) {
    assert.ok(person.seat >= 6 && person.seat < ROOM_CAPACITY);
    assert.ok(Math.abs(logicalSeat(person.seat).x) >= 1.2, 'Keep the centre aisle clear.');
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


test('seating fills horizontal rows with spacing and stays inside both viewports at capacity', () => {
  const people = ambientDevotees([], createAmbientCrowd(() => .999));
  assert.deepEqual(people.map(person => Math.floor(person.seat / 6)), [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]);
  for (const layout of ['desktop', 'mobile'] as const) {
    for (let row = 0; row < ROOM_CAPACITY / 6; row++) {
      const points = Array.from({ length: 6 }, (_, column) => seatPoint(row * 6 + column, layout)).sort((a, b) => a.x - b.x);
      for (const point of points) {
        assert.ok(point.x > 6 && point.x < 94, `${layout}: horizontal margin`);
        assert.ok(point.y > 65 && point.y < 94, `${layout}: floor bounds`);
        assert.equal(point.y, points[0].y);
      }
      for (let i = 1; i < points.length; i++) assert.ok(points[i].x - points[i - 1].x >= 7, `${layout}: seat spacing`);
      if (row > 0) assert.ok(points[0].y - seatPoint((row - 1) * 6, layout).y > 5.4, `${layout}: row spacing`);
    }
  }
});


test('visits randomize seat selection and identities without reshuffling a live crowd', () => {
  const layouts = new Set<string>();
  const names = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    let state = seed;
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const crowd = createAmbientCrowd(random);
    layouts.add(crowd.people.map(person => person.seat).sort((a, b) => a - b).join(','));
    names.add(crowd.people.map(person => person.name).join(','));
    const before = ambientDevotees([], crowd);
    assert.deepEqual(ambientDevotees([], crowd), before);
    const after = ambientDevotees([{ seat: before[0].seat }], crowd);
    for (const person of after) assert.ok(before.includes(person), 'Existing identities keep their seat and name.');
    assert.ok(after.every(person => person.seat !== before[0].seat));
  }
  assert.ok(layouts.size > 15, 'Different visits should use different occupied seats.');
  assert.ok(names.size > 15);
});
