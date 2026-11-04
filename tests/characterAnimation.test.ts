import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCharacter, FALLBACK_ARTWORK, type ArtworkAvailability } from '../src/room/characterAnimation.ts';
import { DIRECTIONAL_ARTWORK, DIRECTIONAL_WALKS } from '../src/room/directionalMovementGeometry.ts';
import { characterManifest } from '../src/room/animationManifest.ts';
import { incenseAcquisitionTime, incenseBase, incenseOwnership } from '../src/room/incenseAnimation.ts';
import { actorMetrics, incenseWorldSize, offeringWorldHeight, projectFloor, stationAnchor } from '../src/room/layout.ts';
import { offeringReceiver } from '../src/room/offeringAnimation.ts';
import { RITUAL_ARTWORK } from '../src/room/ritualPoseGeometry.ts';
import { ritualPropGeometry } from '../src/room/ritualContacts.ts';
import { actionMovement, entryRoute, logicalAltar, logicalSeat, ritualRoute, routeDurationMs, sampleRoute } from '../src/room/motion.ts';
import { entryDurationMs, interactionTime, performanceMs, sampleEntry, sampleSharedRitual, sharedRitualDurationMs } from '../src/room/ritual.ts';
import { offeringCandidates, visibleOfferings } from '../src/room/placedOfferings.ts';
import { ritualSchedule } from '../src/shared/ritualSchedule.ts';
import { TempleRoom } from '../server/room.ts';
import type { Appearance, RoomActionKind, RoomMember, RoomSnapshot, SharedAction } from '../src/room/protocol.ts';

const APPEARANCES: Appearance[] = ['man', 'woman', 'granny'];
const RITES: RoomActionKind[] = ['incense', 'lotus', 'petal', 'bell', 'bow'];
const FULL_ARTWORK: ArtworkAvailability & { rituals: Record<Appearance, boolean> } = {
  movement: true, directions: true,
  incense: { man: true, woman: true, granny: true },
  // New ritual-specific art is tested separately when it exists. This suite covers its fallback.
  rituals: { man: false, woman: false, granny: false },
};
const NO_ARTWORK = { ...FALLBACK_ARTWORK, rituals: { man: false, woman: false, granny: false } };
const WITH_RITUALS = { ...FULL_ARTWORK, rituals: { man: true, woman: true, granny: true } };
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9);
const closePoint = (actual: { x: number; z: number }, expected: { x: number; z: number }) => {
  close(actual.x, expected.x); close(actual.z, expected.z);
};

function visitor(appearance: Appearance, rite: RoomActionKind, seat = 0, slot = 0, movementVersion: 2 | 3 = 3): RoomMember {
  const movement = actionMovement(seat, slot, rite === 'bow', movementVersion);
  const kind = rite === 'bow' ? 'bow' : 'incense';
  const timelineVersion = rite === 'incense' ? 2 : 1;
  const startedAt = 100000;
  const action: SharedAction = {
    id: `fixture-${appearance}-${rite}-${seat}-${slot}`, actorId: 'fixture', bowCount: 3,
    kind, slot, startedAt, timelineVersion, movement,
    endsAt: startedAt + sharedRitualDurationMs(kind, movement, rite === 'bow' ? 'incense' : rite, timelineVersion),
    ...(rite === 'bow' ? {} : { offering: rite }),
  };
  return { id: 'fixture', name: 'Fixture', appearance, seat, joinedAt: 0, entryVersion: 3, action, completed: null };
}

function performanceStart(action: SharedAction) {
  const clips = ritualSchedule(action.timelineVersion).clips;
  return action.startedAt + clips.standUp + action.movement!.outboundMs + (action.kind === 'bow' ? clips.kneelDown : 0);
}

function roomFor(person: RoomMember, now: number): RoomSnapshot {
  return { revision: 1, now, capacity: 24, people: [person], offerings: [] };
}

function assertValidFrame(sample: ReturnType<typeof sampleCharacter>) {
  assert.ok(Number.isFinite(sample.point.x) && Number.isFinite(sample.point.z));
  assert.ok(sample.frame.atlasCell >= 0 && sample.frame.atlasCell < sample.frame.columns * sample.frame.rows);
  if (!sample.held) return;
  assert.ok(sample.frame.hand);
  assert.ok(sample.frame.handMask && sample.frame.handMask.length >= 3);
  for (const point of [sample.frame.hand, ...sample.frame.handMask]) {
    assert.ok(point.x > 0 && point.x < sample.canvasWidth);
    assert.ok(point.y > 0 && point.y < sample.canvasHeight);
  }
}

test('all appearances and rites reconstruct valid deterministic frames across every seat and station', () => {
  let checked = 0;
  for (const appearance of APPEARANCES) for (const rite of RITES) for (let seat = 0; seat < 24; seat++) for (let slot = 0; slot < 4; slot++) {
    const person = visitor(appearance, rite, seat, slot), action = person.action!;
    const clips = ritualSchedule(action.timelineVersion).clips;
    const performStart = performanceStart(action);
    const performanceEnd = performStart + performanceMs(action.kind, action.offering, action.timelineVersion);
    const times = [action.startedAt, action.startedAt + clips.standUp / 2,
      action.startedAt + clips.standUp + action.movement!.outboundMs * 0.1,
      action.startedAt + clips.standUp + action.movement!.outboundMs * 0.5,
      performStart, performStart + 500, performanceEnd,
      action.endsAt - clips.sitDown - action.movement!.returnMs * 0.4,
      action.endsAt - clips.sitDown / 2, action.endsAt];
    const at = interactionTime(action);
    if (at !== null) times.push(at - 1, at, at + 1);
    const before = structuredClone(person);
    for (const now of times) {
      const sample = sampleCharacter(person, now, false, FULL_ARTWORK);
      assertValidFrame(sample);
      assert.deepEqual(sampleCharacter(structuredClone(person), now, false, FULL_ARTWORK), sample);
      const fallback = sampleCharacter(person, now, false, NO_ARTWORK);
      assertValidFrame(fallback);
      assert.deepEqual(fallback.point, sample.point);
      assert.equal(fallback.phase, sample.phase);
      const expectedWidth = fallback.frame.modernKind ? 384 : characterManifest(appearance).frameWidth;
      assert.equal(fallback.canvasWidth, expectedWidth);
      assert.equal(fallback.canvasHeight, fallback.canvasWidth * 4 / 3);
    }
    const end = sampleCharacter(person, action.endsAt, false, FULL_ARTWORK);
    assert.deepEqual(end.point, logicalSeat(seat));
    assert.equal(end.active, false);
    if (rite === 'bow') assert.equal(end.completedBows, 3);
    assert.deepEqual(person, before);
    checked++;
  }
  assert.equal(checked, 1440);
});

test('held ownership and server placement switch once at the same marker in every appearance', () => {
  for (const appearance of APPEARANCES) for (const rite of RITES.filter(rite => rite !== 'bow')) for (let seat = 0; seat < 24; seat++) for (let slot = 0; slot < 4; slot++) {
    const person = visitor(appearance, rite, seat, slot), action = person.action!, at = interactionTime(action)!;
    const candidates = offeringCandidates(roomFor(person, at));
    for (const assets of [FULL_ARTWORK, NO_ARTWORK]) {
      const before = sampleCharacter(person, at - 1, false, assets);
      const contact = sampleCharacter(person, at, false, assets);
      const after = sampleCharacter(person, at + 1, false, assets);
      assert.equal(before.held, true);
      assert.equal(contact.held, rite === 'bell');
      assert.equal(after.held, rite === 'bell');
      assertValidFrame(before);
    }
    assert.equal(visibleOfferings(candidates, at - 1).length, 0);
    const expectedPlaced = rite === 'bell' ? 0 : 1;
    assert.equal(visibleOfferings(candidates, at).length, expectedPlaced);
    if (expectedPlaced) {
      const late = roomFor(structuredClone(person), at + 1);
      late.offerings = structuredClone(candidates);
      assert.equal(offeringCandidates(late).length, 1);
      assert.equal(visibleOfferings(offeringCandidates(late), at + 1)[0].id, action.id + ':placed');
    }
  }
});

test('native canvas follows the selected frame when variant incense loads or falls back', () => {
  for (const appearance of APPEARANCES) for (const rite of RITES) {
    const person = visitor(appearance, rite, 23, 3), at = performanceStart(person.action!) + 600;
    const authored = sampleCharacter(person, at, false, FULL_ARTWORK);
    const fallback = sampleCharacter(person, at, false, NO_ARTWORK);
    const manifest = characterManifest(appearance);
    assert.equal(fallback.canvasWidth, manifest.frameWidth);
    assert.equal(fallback.canvasHeight, manifest.frameHeight);
    assert.equal(authored.canvasWidth, rite === 'incense' ? 384 : manifest.frameWidth);
    assert.equal(authored.canvasHeight, rite === 'incense' ? 512 : manifest.frameHeight);
    assert.equal(authored.frame.modernKind, rite === 'incense' ? 'incense' : undefined);
    assertValidFrame(authored); assertValidFrame(fallback);
  }
});

test('one failed incense identity keeps its own fallback on the v2 contact clock', () => {
  const partial = { ...FULL_ARTWORK, incense: { man: true, woman: false, granny: true } };
  for (const appearance of APPEARANCES) {
    const person = visitor(appearance, 'incense', 5, 1), action = person.action!, at = interactionTime(action)!;
    const sample = sampleCharacter(person, at - 1, false, partial);
    assert.equal(sample.frame.modernKind, appearance === 'woman' ? undefined : 'incense');
    const before = sampleCharacter(person, at - 1, false, NO_ARTWORK);
    const contact = sampleCharacter(person, at, false, NO_ARTWORK);
    assert.equal(before.frame.cell, 11, 'fallback must retain its pre-contact frame until the v2 marker');
    assert.equal(contact.frame.cell, 12, 'fallback must reach its release frame at the v2 marker');
    assert.equal(before.held, true); assert.equal(contact.held, false);
    assert.equal(before.canvasWidth, characterManifest(appearance).frameWidth);
    assert.equal(interactionTime(action), at);
    assert.equal(sampleCharacter(person, action.endsAt, false, NO_ARTWORK).active, false);
  }
});

test('reduced motion keeps incense visible in its owner and all rites preserve their marker', () => {
  for (const appearance of APPEARANCES) for (const rite of RITES) {
    const person = visitor(appearance, rite, 12, 2), action = person.action!;
    const at = interactionTime(action);
    if (at === null) {
      const reduced = sampleCharacter(person, performanceStart(action) + 1000, true, FULL_ARTWORK);
      assert.equal(reduced.clip, 'kneeling'); assert.equal(reduced.held, false);
      continue;
    }
    for (const assets of [FULL_ARTWORK, NO_ARTWORK]) {
      const before = sampleCharacter(person, at - 1, true, assets);
      assert.equal(before.held, true); assertValidFrame(before);
      assert.equal(sampleCharacter(person, at, true, assets).held, rite === 'bell');
      assert.equal(sampleCharacter(person, action.endsAt, true, assets).active, false);
    }
    if (rite !== 'incense') continue;
    const pickup = incenseAcquisitionTime(action), candidates = offeringCandidates(roomFor(person, at));
    for (const now of [performanceStart(action), pickup - 1, pickup, pickup + 1, at - 1, at, at + 1]) {
      const sample = sampleCharacter(person, now, true, FULL_ARTWORK);
      const source = incenseOwnership(action, now) === 'source' ? 1 : 0;
      const placed = visibleOfferings(candidates, now).length;
      assert.equal(source + Number(sample.held) + placed, 1);
      assertValidFrame(sample);
    }
  }
});

test('each authored incense identity hands off to the same urn base in both floor projections', () => {
  for (const appearance of APPEARANCES) for (let slot = 0; slot < 4; slot++) {
    const person = visitor(appearance, 'incense', 23, slot), at = interactionTime(person.action!)!;
    const held = sampleCharacter(person, at - 1, false, FULL_ARTWORK);
    assert.ok(held.frame.hand);
    const base = incenseBase(held.frame.hand);
    for (const layout of ['desktop', 'mobile'] as const) {
      const point = logicalAltar(slot), floor = projectFloor(point, layout), metrics = actorMetrics(point, layout);
      const urn = stationAnchor(slot, layout, 'incense'), dimensions = incenseWorldSize(slot, layout);
      close(floor.x + (base.x - 192) / 384 * metrics.canvasWidth, urn.x);
      close(floor.y + (base.y - 468) / 512 * metrics.canvasHeight, urn.y + dimensions.insertion);
    }
  }
});

test('bell movement3 retains its tool at contact while an in-flight movement2 action keeps the old rule', () => {
  for (const appearance of APPEARANCES) {
    const modern = visitor(appearance, 'bell', 12, 2), at = interactionTime(modern.action!)!;
    const legacy = { ...modern, action: { ...modern.action!, movement: { ...modern.action!.movement!, version: 2 as const } } };
    assert.equal(interactionTime(legacy.action), at);
    for (const assets of [FULL_ARTWORK, NO_ARTWORK]) {
      assert.equal(sampleCharacter(modern, at - 1, false, assets).held, true);
      assert.equal(sampleCharacter(modern, at, false, assets).held, true);
      assert.equal(sampleCharacter(modern, at + 1, false, assets).held, true);
      assert.equal(sampleCharacter(legacy, at - 1, false, assets).held, true);
      assert.equal(sampleCharacter(legacy, at, false, assets).held, false);
    }
    assert.equal(offeringCandidates(roomFor(modern, at)).length, 0);
  }
});

test('authored left and right movement uses distinct source cells without horizontal flipping', () => {
  const headings = new Set<string>();
  for (let seat = 0; seat < 24; seat++) for (let slot = 0; slot < 4; slot++) {
    const person = visitor('man', 'incense', seat, slot), action = person.action!;
    const clips = ritualSchedule(action.timelineVersion).clips;
    const routes = [
      { start: action.startedAt + clips.standUp, duration: action.movement!.outboundMs },
      { start: action.endsAt - clips.sitDown - action.movement!.returnMs, duration: action.movement!.returnMs },
    ];
    for (const route of routes) for (let step = 1; step < 40; step++) {
      const now = route.start + route.duration * step / 40;
      const sample = sampleCharacter(person, now, false, FULL_ARTWORK);
      if (sample.heading !== 'left' && sample.heading !== 'right') continue;
      headings.add(sample.heading);
      assert.equal(sample.frame.image, DIRECTIONAL_ARTWORK.image);
      assert.equal(sample.flip, false);
      assert.ok(DIRECTIONAL_WALKS[sample.heading].some(frame => frame.cell === sample.frame.atlasCell));
      const unavailable = sampleCharacter(person, now, false, { ...FULL_ARTWORK, directions: false });
      assert.notEqual(unavailable.frame.image, DIRECTIONAL_ARTWORK.image);
      assert.deepEqual(unavailable.point, sample.point);
    }
  }
  assert.deepEqual([...headings].sort(), ['left', 'right']);
});

test('legacy entry and movement snapshots remain linear after the server starts issuing version3', () => {
  for (let seat = 0; seat < 24; seat++) {
    const joinedAt = 1000, route = entryRoute(seat), walkMs = routeDurationMs(route);
    const old: RoomMember = { id: 'entry', name: 'Entry', appearance: 'woman', seat, joinedAt, action: null, completed: null };
    const modern = { ...old, entryVersion: 3 as const };
    for (const fraction of [0.05, 0.25, 0.5, 0.95]) {
      const now = joinedAt + walkMs * fraction;
      const expected = sampleRoute(route, fraction);
      closePoint(sampleCharacter(old, now, false, FULL_ARTWORK).point, expected.point);
      const oldEntry = sampleEntry(joinedAt, now, seat);
      close(oldEntry.distance, expected.distance);
      assert.equal('locomotion' in oldEntry, false);
    }
    for (const time of [walkMs, entryDurationMs(seat)]) {
      const legacy = sampleCharacter(old, joinedAt + time, false, FULL_ARTWORK);
      const upgraded = sampleCharacter(modern, joinedAt + time, false, FULL_ARTWORK);
      assert.deepEqual(legacy.point, upgraded.point);
      assert.equal(legacy.phase, upgraded.phase);
    }
    for (let slot = 0; slot < 4; slot++) for (const rite of RITES) {
      const person = visitor('woman', rite, seat, slot, 2), action = person.action!;
      const clips = ritualSchedule(action.timelineVersion).clips;
      const elapsed = action.movement!.outboundMs * 0.25;
      const now = action.startedAt + clips.standUp + elapsed;
      const expected = sampleRoute(ritualRoute(seat, slot, false, rite === 'bow'), elapsed / action.movement!.outboundMs);
      const pose = sampleSharedRitual(action, now);
      closePoint(pose.point, expected.point); close(pose.distance, expected.distance);
      assert.equal(pose.locomotion, undefined);
      closePoint(sampleCharacter(person, now, false, FULL_ARTWORK).point, expected.point);
      const upgraded = { ...action, movement: { ...action.movement!, version: 3 as const } };
      assert.equal(interactionTime(upgraded), interactionTime(action));
      assert.equal(sharedRitualDurationMs(action.kind, upgraded.movement, action.offering, action.timelineVersion), action.endsAt - action.startedAt);
      assert.deepEqual(sampleSharedRitual(action, action.endsAt).point, sampleSharedRitual(upgraded, upgraded.endsAt).point);
    }
  }
});

test('a queued incense-v2 action cannot stretch an in-progress legacy or v3 entry', () => {
  for (const appearance of APPEARANCES) for (let seat = 0; seat < 24; seat++) for (const entryVersion of [undefined, 3] as const) {
    const person = visitor(appearance, 'incense', seat);
    person.joinedAt = 1000; person.entryVersion = entryVersion;
    const oldStart = person.action!.startedAt;
    person.action!.startedAt = person.joinedAt + entryDurationMs(seat);
    person.action!.endsAt += person.action!.startedAt - oldStart;
    const withoutQueued = { ...person, action: null };
    const walkMs = routeDurationMs(entryRoute(seat));
    for (const elapsed of [walkMs * 0.3, walkMs, (walkMs + entryDurationMs(seat)) / 2, entryDurationMs(seat) - 0.001]) {
      const now = person.joinedAt + elapsed;
      const queued = sampleCharacter(person, now, false, FULL_ARTWORK);
      const expected = sampleCharacter(withoutQueued, now, false, FULL_ARTWORK);
      assert.equal(queued.entering, true);
      assert.equal(queued.held, false);
      assert.equal(queued.phase, expected.phase);
      assert.deepEqual(queued.point, expected.point);
      assert.deepEqual(queued.frame, expected.frame);
    }
  }
});

test('new guests publish entry4 and action clocks select incense4 or transition3', () => {
  for (const appearance of APPEARANCES) for (const rite of RITES) {
    let now = 1000;
    const room = new TempleRoom(() => now), guest = room.join('Version QA', appearance);
    const joined = guest.room.people[0];
    assert.equal(joined.entryVersion, 4);
    room.action(guest.token, rite, `version-${appearance}-${rite}`);
    const action = room.snapshot().people[0].action!;
    assert.equal(action.movement?.version, 3);
    assert.equal(action.timelineVersion, rite === 'incense' ? 4 : 3);
    assert.equal(action.startedAt, joined.joinedAt + entryDurationMs(joined.seat,joined.entryVersion));
    const oldMovement = { ...action.movement!, version: 2 as const };
    const oldAction = { ...action, movement: oldMovement };
    assert.equal(action.endsAt, action.startedAt + sharedRitualDurationMs(action.kind, oldMovement, action.offering, action.timelineVersion));
    assert.equal(interactionTime(action), interactionTime(oldAction));
    const marker = interactionTime(action);
    if (marker !== null) {
      now = marker - 1; room.sweep(); assert.equal(room.snapshot().offerings.length, 0);
      now = marker; room.sweep();
      assert.equal(room.snapshot().offerings.length, rite === 'bell' ? 0 : 1);
      room.sweep(); assert.equal(room.snapshot().offerings.length, rite === 'bell' ? 0 : 1);
    }
    now = action.endsAt; room.sweep();
    assert.equal(room.snapshot().people[0].action, null);
    assert.equal(room.snapshot().people[0].completed?.at, action.endsAt);
  }
});

test('new ritual selection keeps a closed-grip bell source across strike and uses logical prop dimensions', () => {
  for (const appearance of APPEARANCES) {
    const bell = visitor(appearance, 'bell', 23, 3), at = interactionTime(bell.action!)!;
    for (const delta of [-1, 0, 1, 219, 221]) {
      const sample = sampleCharacter(bell, at + delta, false, WITH_RITUALS);
      const expectedId = delta < 0 ? 'bell-ready' : delta < 220 ? 'bell-contact' : 'bell-recoil';
      assert.equal(sample.frame.sourceId, expectedId);
      assert.equal(sample.frame.image, RITUAL_ARTWORK[appearance].asset.image);
      assert.equal(sample.frame.modernKind, 'ritual');
      assert.equal(sample.held, true);
      assert.equal(sample.canvasWidth, 384); assert.equal(sample.canvasHeight, 512);
      assertValidFrame(sample);
      const pose = RITUAL_ARTWORK[appearance].frames.find(frame => frame.id === expectedId)!;
      assert.deepEqual(sample.frame.hand, pose.hand);
      assert.deepEqual(sample.frame.handMask, pose.handMask);
    }
    const reduced = sampleCharacter(bell, at + 1, true, WITH_RITUALS);
    assert.equal(reduced.frame.sourceId, 'bell-contact'); assert.equal(reduced.held, true);
    assert.equal(offeringCandidates(roomFor(bell, at)).length, 0);

    for (const kind of ['lotus', 'bell'] as const) {
      const person = visitor(appearance, kind), marker = interactionTime(person.action!)!;
      const selected = sampleCharacter(person, marker - 1, false, WITH_RITUALS);
      const prop = selected.frame.propGeometry;
      assert.ok(prop);
      const native = ritualPropGeometry(appearance, kind);
      close(prop.height / selected.canvasHeight, native.height / native.canvasHeight);
      assert.equal(selected.canvasWidth, 384); assert.equal(selected.canvasHeight, 512);
      const fallback = sampleCharacter(person, marker - 1, false, NO_ARTWORK);
      assert.equal(fallback.canvasWidth, characterManifest(appearance).frameWidth);
      const old = { ...person, action: { ...person.action!, movement: { ...person.action!.movement!, version: 2 as const } } };
      assert.equal(sampleCharacter(old, marker - 1, false, WITH_RITUALS).frame.modernKind, undefined);
    }
  }
});

test('new lotus art transfers its held base exactly to its identity-specific receiver in both projections', () => {
  for (const appearance of APPEARANCES) for (let slot = 0; slot < 4; slot++) {
    const person = visitor(appearance, 'lotus', 12, slot), action = person.action!, at = interactionTime(action)!;
    const held = sampleCharacter(person, at - 1, false, WITH_RITUALS);
    assert.equal(held.frame.sourceId, 'lotus-place'); assert.equal(held.held, true);
    const hand = held.frame.hand, prop = held.frame.propGeometry;
    assert.ok(hand && prop);
    const base = { x: hand.x, y: hand.y + prop.height * (1 - prop.gripFraction) };
    const receiver = offeringReceiver('lotus', appearance);
    closePoint({ x: base.x, z: base.y }, { x: receiver.x, z: receiver.y });
    for (const layout of ['desktop', 'mobile'] as const) {
      const point = logicalAltar(slot), floor = projectFloor(point, layout), metrics = actorMetrics(point, layout);
      const target = stationAnchor(slot, layout, 'lotus', appearance, 3);
      close(floor.x + (base.x - 192) / 384 * metrics.canvasWidth, target.x);
      close(floor.y + (base.y - 468) / 512 * metrics.canvasHeight, target.y);
      close(offeringWorldHeight(slot, layout, 'lotus'), prop.height / 512 * metrics.canvasHeight);
    }
    assert.equal(sampleCharacter(person, at, false, WITH_RITUALS).held, false);
    assert.equal(visibleOfferings(offeringCandidates(roomFor(person, at)), at).length, 1);
  }
});

test('new placement metadata survives prediction, persistence and leaving for late observers', () => {
  for (const appearance of APPEARANCES) for (const rite of ['incense', 'lotus', 'petal'] as const) {
    let now = 1000;
    const room = new TempleRoom(() => now), guest = room.join('Metadata QA', appearance);
    room.action(guest.token, rite, `metadata-${appearance}-${rite}`);
    const pendingRoom = room.snapshot(), action = pendingRoom.people[0].action!;
    const predicted = offeringCandidates(pendingRoom);
    assert.equal(predicted.length, 1);
    assert.equal(predicted[0].artworkVersion, 3); assert.equal(predicted[0].appearance, appearance);
    assert.equal(visibleOfferings(predicted, now).length, 0);
    now = interactionTime(action)!; room.sweep();
    assert.deepEqual(room.snapshot().offerings, predicted);
    assert.deepEqual(offeringCandidates(room.snapshot()), predicted);
    room.leave(guest.token);
    const late = room.join('Late observer', 'woman');
    assert.deepEqual(offeringCandidates(late.room), predicted);
    assert.deepEqual(visibleOfferings(offeringCandidates(late.room), now), predicted);

    const legacy = visitor(appearance, rite, 0, 0, 2);
    const old = offeringCandidates(roomFor(legacy, interactionTime(legacy.action!)!))[0];
    assert.equal(old.artworkVersion, undefined); assert.equal(old.appearance, undefined);
  }
});
