import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePreviewProgress, candidateFrameIndex, stepPreviewProgress } from '../src/dev/previewClock.ts';

test('starting at frame zero survives a negative first RAF delta and hidden-tab gaps', () => {
  assert.equal(advancePreviewProgress(0, -8, 1, 1200), 0);
  assert.equal(candidateFrameIndex(advancePreviewProgress(0, -8, 1, 1200), 12), 0);
  assert.equal(advancePreviewProgress(0.4, 2000, 1, 1200), 0.4);
  assert.ok(Math.abs(advancePreviewProgress(0.9, 240, 1, 1200) - 0.1) < 1e-9);
});

test('stepping visits every frame once without accumulated floating-point drift', () => {
  let progress = 0;
  const visited = [candidateFrameIndex(progress, 12)];
  for (let index = 1; index < 12; index++) {
    progress = stepPreviewProgress(progress, 1);
    visited.push(candidateFrameIndex(progress, 12));
  }
  assert.deepEqual(visited, Array.from({length:12}, (_, index) => index));
  assert.equal(stepPreviewProgress(0, -1), 0);
  assert.equal(candidateFrameIndex(stepPreviewProgress(progress, 1), 12), 11);
});

test('out-of-range and non-finite scrub progress never selects an absent atlas frame', () => {
  for (const progress of [-1, -0.001, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(candidateFrameIndex(progress, 12), 0);
  }
  assert.equal(candidateFrameIndex(0.5, 12), 6);
  assert.equal(candidateFrameIndex(0.999, 12), 11);
  assert.equal(candidateFrameIndex(1, 12), 11);
  assert.equal(candidateFrameIndex(2, 12), 11);
});
