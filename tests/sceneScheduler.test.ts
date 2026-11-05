import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeSceneAnimation } from '../src/room/sceneAnimation.ts';

test('scene scheduler sleeps static drawings, wakes deadlines, and cleans up on unsubscribe', () => {
  const original = {
    window: globalThis.window, document: globalThis.document,
    request: globalThis.requestAnimationFrame, cancel: globalThis.cancelAnimationFrame,
    clear: globalThis.clearTimeout, now: Date.now,
  };
  let now = 1000, id = 0, calls = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const timers = new Map<number, () => void>();
  const handlers = new Map<string, () => void>();
  const doc = { hidden: false, querySelector: () => null,
    addEventListener: (name: string, handler: () => void) => handlers.set(name, handler),
    removeEventListener: (name: string) => handlers.delete(name) };
  Object.assign(globalThis, {
    document: doc,
    window: { setTimeout: (callback: () => void) => { const key = ++id; timers.set(key, callback); return key; } },
    clearTimeout: (key: number) => timers.delete(key),
    requestAnimationFrame: (callback: FrameRequestCallback) => { const key = ++id; frames.set(key, callback); return key; },
    cancelAnimationFrame: (key: number) => frames.delete(key),
  });
  Date.now = () => now;
  let unsubscribe: (() => void) | undefined;
  try {
    unsubscribe = subscribeSceneAnimation(time => { calls++; return time < 2000 ? 2000 : false; });
    assert.equal(calls, 1);
    assert.equal(frames.size, 0);
    assert.equal(timers.size, 1);
    now = 2000;
    const timer = [...timers.values()][0]; timers.clear(); timer();
    const frame = [...frames.values()][0]; frames.clear(); frame(100);
    assert.equal(calls, 2);
    assert.equal(frames.size, 0);
    assert.equal(timers.size, 0);
    doc.hidden = true; handlers.get('visibilitychange')!();
    assert.equal(calls, 2);
    doc.hidden = false; handlers.get('visibilitychange')!();
    assert.equal(calls, 3);
    unsubscribe(); unsubscribe = undefined;
    assert.equal(handlers.size, 0);
    assert.equal(frames.size + timers.size, 0);
  } finally {
    unsubscribe?.(); Date.now = original.now;
    Object.assign(globalThis, { window: original.window, document: original.document,
      requestAnimationFrame: original.request, cancelAnimationFrame: original.cancel, clearTimeout: original.clear });
  }
});
