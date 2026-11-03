import test from 'node:test';
import assert from 'node:assert/strict';
import { RitualTimeline } from '../src/services/ritualTimeline.ts';
import { TempleSession } from '../src/services/templeSession.ts';
import type { RitualCommand, RitualEvent } from '../src/types/experience.ts';

const command = (kind: 'bow' | 'incense' = 'bow'): RitualCommand => ({ id: 'ritual-1', actorId: 'visitor-1', kind, bowCount: 3 });
const session = () => { let id = 0; return new TempleSession(() => `session-${++id}`); };

test('three bows complete once, return home and stay finished across later frames', () => {
  const events: RitualEvent[] = [];
  const timeline = new RitualTimeline(command(), event => events.push(event));
  for (let i = 0; i < 1000; i++) timeline.advance(0.05);
  const progress = events.filter(event => event.type === 'progress');
  assert.deepEqual([...new Set(progress.map(event => event.phase))], ['moving', 'performing', 'returning']);
  assert.deepEqual([...new Set(progress.map(event => event.completedBows))], [0, 1, 2, 3]);
  assert.equal(events.filter(event => event.type === 'complete').length, 1);
  assert.deepEqual(timeline.advance(100), { phase: 'complete', travel: 0, bowWeight: 0, completedBows: 3, incenseLit: false });
});

test('incense completes with a lit burner and no implicit bows', () => {
  const events: RitualEvent[] = [];
  const timeline = new RitualTimeline(command('incense'), event => events.push(event), 2, 4);
  timeline.advance(2.1);
  assert.equal(events.at(-1)?.type, 'progress');
  const returning = timeline.advance(4);
  assert.equal(returning.phase, 'returning');
  assert.equal(returning.incenseLit, true);
  assert.equal(returning.completedBows, 0);
  timeline.advance(2);
  assert.equal(events.filter(event => event.type === 'complete').length, 1);
});

test('cancellation suppresses all late progress and completion callbacks', () => {
  const events: RitualEvent[] = [];
  const timeline = new RitualTimeline(command(), event => events.push(event));
  timeline.advance(1);
  timeline.cancel();
  const length = events.length;
  timeline.advance(100);
  assert.equal(events.length, length);
});

test('invalid timing and bow counts fail instead of producing an endless ritual', () => {
  assert.throws(() => new RitualTimeline({ ...command(), bowCount: 0 }, () => {}));
  assert.throws(() => new RitualTimeline(command(), () => {}).advance(Number.NaN));
});

test('rapid starts claim exactly one action with one stable actor', () => {
  const store = session();
  assert.equal(store.start('bow'), false, 'loading blocks actions');
  store.setSceneStatus('ready');
  const actorId = store.getSnapshot().actorId;
  assert.equal(Array.from({ length: 100 }, () => store.start('bow')).filter(Boolean).length, 1);
  assert.equal(store.getSnapshot().actorId, actorId);
  const active = store.getSnapshot().command!;
  const timeline = new RitualTimeline(active, store.report);
  timeline.advance(100);
  assert.equal(store.getSnapshot().phase, 'idle');
  assert.equal(store.getSnapshot().command, null);
  assert.equal(store.getSnapshot().completedBows, 3);
  assert.equal(store.start('incense'), true);
  assert.equal(store.getSnapshot().actorId, actorId);
  assert.notEqual(store.getSnapshot().command?.id, active.id);
  timeline.advance(100);
  assert.equal(store.getSnapshot().command?.kind, 'incense', 'late previous completion cannot finish a new action');
});

test('model/context failure releases busy state and allows a new 2D ritual', () => {
  const store = session();
  store.setSceneStatus('ready');
  store.start('bow');
  const old = store.getSnapshot().command!;
  store.setSceneStatus('fallback');
  assert.equal(store.getSnapshot().phase, 'error');
  assert.equal(store.getSnapshot().command, null);
  assert.equal(store.start('incense'), true);
  store.report({ type: 'complete', commandId: old.id, completedBows: 3, incenseLit: false });
  assert.equal(store.getSnapshot().command?.kind, 'incense');
  new RitualTimeline(store.getSnapshot().command!, store.report).advance(100);
  assert.equal(store.getSnapshot().phase, 'idle');
  assert.equal(store.getSnapshot().incenseLit, true);
});

test('watchdog/error callback releases actions; obsolete errors are ignored', () => {
  const store = session();
  store.setSceneStatus('ready');
  store.start('bow');
  const old = store.getSnapshot().command!;
  store.fail(old.id, 'timeout');
  assert.equal(store.getSnapshot().phase, 'error');
  assert.equal(store.start('bow'), true);
  store.fail(old.id, 'late-timeout');
  assert.notEqual(store.getSnapshot().message, 'late-timeout');
  assert.notEqual(store.getSnapshot().command, null);
});

test('separate visits have independent state and ignored foreign events', () => {
  const first = new TempleSession();
  const second = new TempleSession();
  assert.notEqual(first.getSnapshot().actorId, second.getSnapshot().actorId);
  first.setSceneStatus('ready'); second.setSceneStatus('ready');
  first.start('bow');
  assert.equal(second.getSnapshot().phase, 'idle');
  second.report({ type: 'complete', commandId: first.getSnapshot().command!.id, completedBows: 3, incenseLit: false });
  assert.equal(second.getSnapshot().completedBows, 0);
});
