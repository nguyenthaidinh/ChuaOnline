import test from 'node:test';
import assert from 'node:assert/strict';
import { ambientDevotees, AMBIENT_DEVOTEE_TARGET } from '../src/room/ambientDevotees.ts';
import { TempleRoom } from '../server/room.ts';
import { ROOM_CAPACITY } from '../src/room/protocol.ts';

test('quiet rooms have a stable seated crowd with three robes and a clear centre aisle', () => {
  const people = ambientDevotees([]);
  assert.equal(people.length, 12);
  assert.equal(new Set(people.map(person => person.seat)).size, 12);
  for (const person of people) {
    assert.ok(person.seat >= 6 && person.seat < ROOM_CAPACITY);
    assert.ok(person.seat % 6 < 4, 'Keep the two centre seats and the front row free.');
  }
  for (const appearance of ['man', 'woman', 'granny']) {
    assert.equal(people.filter(person => person.appearance === appearance).length, 4);
  }
  assert.deepEqual(ambientDevotees([]), people);
});

test('every real seat remains reserved and ambient occupants decline as visitors arrive', () => {
  // Exercise scattered reservations, not only the server\'s sequential allocation.
  const order = Array.from({ length: ROOM_CAPACITY }, (_, index) => index * 7 % ROOM_CAPACITY);
  for (let count = 0; count <= ROOM_CAPACITY; count++) {
    const real = order.slice(0, count).map(seat => ({ seat }));
    const ambient = ambientDevotees(real);
    assert.equal(ambient.length, Math.max(0, AMBIENT_DEVOTEE_TARGET - count));
    assert.equal(new Set([...real, ...ambient].map(person => person.seat)).size, count + ambient.length);
    assert.deepEqual(ambientDevotees([...real].reverse()), ambient, 'Snapshot ordering cannot shuffle the crowd.');
  }
});

test('decorative occupants never become server members or consume seats reserved during rituals', () => {
  const room = new TempleRoom();
  assert.equal(ambientDevotees(room.snapshot().people).length, 12);
  assert.equal(room.snapshot().people.length, 0);
  for (let index = 0; index < ROOM_CAPACITY; index++) {
    const guest = room.join(`Visitor ${index}`, 'man');
    if (index === 6) room.action(guest.token, 'bow', 'ambient-reserved-seat');
    const snapshot = room.snapshot();
    const ambient = ambientDevotees(snapshot.people);
    assert.equal(snapshot.people.length, index + 1);
    assert.ok(ambient.every(bot => snapshot.people.every(person => person.seat !== bot.seat)));
  }
  assert.equal(ambientDevotees(room.snapshot().people).length, 0);
  assert.equal(room.snapshot().people.length, ROOM_CAPACITY);
});
