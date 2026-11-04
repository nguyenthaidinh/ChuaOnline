import test from 'node:test';
import assert from 'node:assert/strict';
import { LAM_MANIFEST, sampleScheduledClip } from '../src/room/animationManifest.ts';
import { sampleSharedRitual, interactionTime, sharedRitualDurationMs } from '../src/room/ritual.ts';
import { actionMovement } from '../src/room/motion.ts';
import { assertTimelineVersion } from '../src/shared/ritualSchedule.ts';
import { TempleRoom } from '../server/room.ts';
import type { SharedAction } from '../src/room/protocol.ts';

test('changing visual frame duration cannot move a shared contact or completion time', () => {
  const movement = actionMovement(23, 2);
  const action: SharedAction = {
    id: 'version-test', actorId: 'actor', kind: 'incense', offering: 'incense', bowCount: 3,
    slot: 2, startedAt: 1000, endsAt: 1000 + sharedRitualDurationMs('incense', movement), movement,
  };
  const marker = interactionTime(action)!;
  const before = sampleSharedRitual(action, marker);
  const original = LAM_MANIFEST.clips.offerPlace.frames[0].durationMs;
  try {
    LAM_MANIFEST.clips.offerPlace.frames[0].durationMs = original * 4;
    assert.equal(interactionTime(action), marker);
    assert.equal(1000 + sharedRitualDurationMs('incense', movement), action.endsAt);
    assert.deepEqual(sampleSharedRitual(action, marker), before);
    assert.equal(sampleSharedRitual(action, marker - 1).propInHand, true);
    assert.equal(before.propInHand, false);
  } finally {
    LAM_MANIFEST.clips.offerPlace.frames[0].durationMs = original;
  }
});

test('new actions identify schedule v1 and remain compatible with legacy snapshots', () => {
  const room = new TempleRoom(() => 1000);
  const guest = room.join('Schedule QA', 'man');
  room.action(guest.token, 'incense', 'schedule-version-test');
  const action = room.snapshot().people[0].action!;
  assert.equal(action.timelineVersion, 1);
  const legacy = { ...action, timelineVersion: undefined };
  assert.deepEqual(sampleSharedRitual(action, 5000), sampleSharedRitual(legacy, 5000));
  assert.throws(() => assertTimelineVersion(2), /Unsupported ritual timeline/);
});

test('new artwork with a different duration still reaches its release pose at server contact', () => {
  const manifest = structuredClone(LAM_MANIFEST);
  manifest.clips.offerPlace.frames = [
    { cell: 11, durationMs: 200 },
    { cell: 12, durationMs: 1000 },
  ];
  manifest.clips.offerPlace.markers = { place: 200 };
  assert.equal(sampleScheduledClip(manifest, 'offerPlace', 499).cell, 11);
  assert.equal(sampleScheduledClip(manifest, 'offerPlace', 500).cell, 12);
  assert.equal(sampleScheduledClip(manifest, 'offerPlace', 849).cell, 12);
});
