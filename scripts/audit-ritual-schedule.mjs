import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { sampleSharedRitual, sharedRitualDurationMs, interactionTime } from '../src/room/ritual.ts';
import { actionMovement } from '../src/room/motion.ts';

// Captures behavior, not artwork. The pre-refactor digest was recorded at 628098d.
const expected = 'e90ca77813e0d75ec60a7f6c7630555920330a7c4b58d593cba949729d53d9d4';
const samples = [];
for (let seat = 0; seat < 24; seat++) {
  for (let slot = 0; slot < 4; slot++) {
    for (const kind of ['bow', 'incense', 'lotus', 'petal', 'bell']) {
      const movement = actionMovement(seat, slot, kind === 'bow');
      const ritualKind = kind === 'bow' ? 'bow' : 'incense';
      const offering = kind === 'bow' ? 'incense' : kind;
      const action = {
        id: 'audit', actorId: 'audit', kind: ritualKind,
        offering: kind === 'bow' ? undefined : kind, bowCount: 3, slot,
        startedAt: 1000,
        endsAt: 1000 + sharedRitualDurationMs(ritualKind, movement, offering), movement,
      };
      const poses = [];
      for (let now = 0; now <= action.endsAt + 1000; now += 37) poses.push(sampleSharedRitual(action, now));
      samples.push({ seat, slot, kind, endsAt: action.endsAt, mark: interactionTime(action), poses });
    }
  }
}
const hash = createHash('sha256').update(JSON.stringify(samples)).digest('hex');
const result = {
  baseline: '628098d', expected, actual: hash, matches: hash === expected,
  actions: samples.length, poses: samples.reduce((sum, sample) => sum + sample.poses.length, 0),
};
if (hash !== expected) throw new Error(`Ritual behavior changed: ${JSON.stringify(result)}`);
writeFileSync('docs/animation-v3/timeline-equivalence.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
