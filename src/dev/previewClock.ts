/** RAF's first timestamp can precede the click handler's performance.now(). */
export function advancePreviewProgress(progress: number, elapsedMs: number, speed: number, durationMs: number) {
  const current = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs >= 500) return current;
  if (!Number.isFinite(speed) || speed <= 0 || !Number.isFinite(durationMs) || durationMs <= 0) return current;
  return (current + elapsedMs * speed / durationMs) % 1;
}

export function candidateFrameIndex(progress: number, count: number) {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('An atlas must contain at least one frame.');
  const current = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return Math.min(count - 1, Math.floor(current * count));
}

export function stepPreviewProgress(progress: number, delta: number, count = 12) {
  const index = Math.max(0, Math.min(count - 1, candidateFrameIndex(progress, count) + delta));
  return index / count;
}
