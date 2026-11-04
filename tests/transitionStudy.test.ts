import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStudyAtlas, type StudyAtlas } from '../src/dev/studyAtlas.ts';
import { advanceStudyTime, compileStudySequence, sampleStudySequence, stepStudyTime, transitionDefinition, type StudyBank } from '../src/dev/transitionTimeline.ts';

function fixtures(): Record<StudyBank, StudyAtlas> {
  const all = transitionDefinition('sequence');
  const atlas = (bank: StudyBank): StudyAtlas => {
    const ids = [...new Set(all.filter(step => step.bank === bank).map(step => step.frameId))];
    return {
      status: 'complete-unreviewed', image: 'test.webp', imageHash: '0'.repeat(64),
      width: 384, height: 512, columns: 4, rows: Math.ceil(ids.length / 4), durationMs: 1200,
      frames: ids.map(id => ({ id, phase: id })),
    };
  };
  return { walk: atlas('walk'), transition: atlas('transition') };
}

test('a complete sequence holds the seated endpoint and never teleports back on completion', () => {
  const sequence = compileStudySequence(transitionDefinition('sequence'), fixtures());
  assert.equal(sampleStudySequence(sequence, 0).frameId, '10-seated-rear');
  const end = sampleStudySequence(sequence, sequence.durationMs);
  assert.equal(end.frameId, '10-seated-rear');
  assert.equal(end.complete, true);
  assert.ok(end.travel > 1);
  assert.deepEqual(sampleStudySequence(sequence, sequence.durationMs + 60000), end);
  assert.equal(advanceStudyTime(sequence.durationMs - 20, 100, 1, sequence.durationMs), sequence.durationMs);
  assert.equal(advanceStudyTime(0, -8, 1, sequence.durationMs), 0);
});

test('every boundary selects the next pose while world travel stays continuous', () => {
  const sequence = compileStudySequence(transitionDefinition('sequence'), fixtures());
  for (let index = 0; index < sequence.steps.length - 1; index++) {
    const step = sequence.steps[index];
    assert.equal(sampleStudySequence(sequence, step.endMs - 0.001).frameId, step.frameId);
    const next = sampleStudySequence(sequence, step.endMs);
    assert.equal(next.frameId, sequence.steps[index + 1].frameId);
    assert.equal(next.travel, step.travelEnd);
    assert.equal(stepStudyTime(sequence, step.startMs, 1), step.endMs);
    assert.equal(stepStudyTime(sequence, step.endMs, -1), step.startMs);
  }
});

test('missing source poses and invalid durations fail before a sequence can render', () => {
  const atlases = fixtures();
  atlases.transition.frames = [];
  assert.throws(() => compileStudySequence(transitionDefinition('sequence'), atlases), /Đang chờ tư thế/);
  const first = transitionDefinition('sitDown')[0];
  assert.throws(() => compileStudySequence([{ ...first, durationMs: 0 }], fixtures()), /Thời lượng/);
});

test('study atlas validation rejects stale dimensions, duplicate IDs and unsafe URLs', () => {
  const valid = fixtures().transition;
  assert.deepEqual(parseStudyAtlas(valid), valid);
  assert.throws(() => parseStudyAtlas({ ...valid, width: 512 }), /384×512/);
  assert.throws(() => parseStudyAtlas({ ...valid, image: '../other.webp' }), /Đường dẫn/);
  assert.throws(() => parseStudyAtlas({ ...valid, imageHash: '' }), /phiên bản/);
  assert.throws(() => parseStudyAtlas({ ...valid, frames: [valid.frames[0], valid.frames[0]] }), /bị trùng/);
});
