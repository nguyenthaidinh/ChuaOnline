import test from 'node:test';
import assert from 'node:assert/strict';
import { entryRoute, makeRoute, ritualRoute, routeDurationMs, sampleRoute, type FloorPoint } from '../src/room/motion.ts';
import { headingForDirection, normalizeDirection, sampleLocomotion, type Heading8 } from '../src/room/locomotion.ts';

const close = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test('all entry/outbound/return routes preserve exact endpoints, distance and late-client sampling', () => {
  const routes = [];
  for (let seat = 0; seat < 24; seat++) {
    routes.push(entryRoute(seat));
    for (let slot = 0; slot < 4; slot++) for (const returning of [false, true]) for (const bow of [false, true]) {
      routes.push(ritualRoute(seat, slot, returning, bow));
    }
  }
  assert.equal(routes.length, 408);
  for (const route of routes) {
    const pointsBefore = structuredClone(route.points), duration = routeDurationMs(route);
    const beginning = sampleLocomotion(route, 0, duration);
    const end = sampleLocomotion(route, duration, duration);
    assert.deepEqual(beginning.point, route.points[0]);
    assert.deepEqual(end.point, route.points[route.points.length - 1]);
    assert.equal(beginning.distance, 0); assert.equal(beginning.progress, 0);
    assert.equal(end.distance, route.length); assert.equal(end.progress, 1);
    assert.equal(end.stage, 'stop'); assert.equal(end.stageProgress, 1);
    assert.deepEqual(sampleLocomotion(route, duration + 1000, duration), end);
    let previous = -1;
    for (let step = 0; step <= 100; step++) {
      const time = duration * step / 100, sample = sampleLocomotion(route, time, duration);
      assert.ok(sample.distance >= previous);
      previous = sample.distance;
      close(Math.hypot(sample.tangent.x, sample.tangent.z), 1);
      assert.ok(sample.stageProgress >= 0 && sample.stageProgress <= 1);
      // A fresh client receives only route and timestamps; no previous callback is needed.
      assert.deepEqual(sampleLocomotion(structuredClone(route), time, duration), sample);
      if (step > 0 && step < 100) {
        const expected = sampleRoute(route, sample.progress).point;
        close(sample.point.x, expected.x); close(sample.point.z, expected.z);
      }
    }
    assert.deepEqual(route.points, pointsBefore);
  }
});

test('integrated ramps accelerate and decelerate without changing public completion time', () => {
  const route = makeRoute([{ x: 0, z: 0 }, { x: 10, z: 0 }]);
  const duration = 3000, at = (time: number) => sampleLocomotion(route, time, duration);
  const stepDistance = (time: number) => at(time + 1).distance - at(time).distance;
  assert.equal(at(0).stage, 'start');
  assert.equal(at(240).stage, 'cruise');
  assert.equal(at(2640).stage, 'stop');
  assert.ok(stepDistance(0) < stepDistance(100));
  assert.ok(stepDistance(100) < stepDistance(239));
  close(stepDistance(240), stepDistance(1500));
  assert.ok(stepDistance(2700) > stepDistance(2900));
  assert.ok(stepDistance(2900) > stepDistance(2999));
  assert.ok(at(1).distance > 0); assert.ok(at(duration - 1).distance < route.length);
  assert.equal(at(duration).distance, route.length);
  // Position and speed remain continuous across both stage boundaries.
  for (const boundary of [240, 2640]) {
    assert.ok(at(boundary + 0.001).distance - at(boundary - 0.001).distance < 0.00001);
    close(stepDistance(boundary - 1), stepDistance(boundary), 1e-6);
  }
});

test('short routes scale both ramps together and handle zero duration and degenerate paths', () => {
  const route = makeRoute([{ x: 3, z: 4 }, { x: 3.01, z: 4 }]);
  const duration = 100;
  assert.equal(sampleLocomotion(route, 39, duration).stage, 'start');
  assert.equal(sampleLocomotion(route, 40, duration).stage, 'stop');
  assert.equal(sampleLocomotion(route, duration, duration).progress, 1);
  assert.deepEqual(sampleLocomotion(route, 0, 0).point, route.points[route.points.length - 1]);
  const still = makeRoute([{ x: 2, z: 3 }, { x: 2, z: 3 }]);
  for (const time of [0, 10, 100]) {
    const sample = sampleLocomotion(still, time, 100);
    assert.deepEqual(sample.point, { x: 2, z: 3 });
    assert.equal(sample.distance, 0);
    assert.equal(sample.heading, 'rear');
  }
  assert.deepEqual(sampleLocomotion(route, NaN, duration), sampleLocomotion(route, 0, duration));
  assert.deepEqual(sampleLocomotion(route, -Infinity, duration), sampleLocomotion(route, 0, duration));
  assert.deepEqual(sampleLocomotion(route, Infinity, duration), sampleLocomotion(route, duration, duration));
  assert.throws(() => sampleLocomotion(route, 0, -1), /duration/);
  assert.throws(() => sampleLocomotion(route, 0, Infinity), /duration/);
  assert.throws(() => sampleLocomotion({ points: [], cumulative: [], length: 0 }, 0, 100), /route/);
});

test('heading classification depends on direction rather than segment-vector magnitude', () => {
  const directions: Array<[FloorPoint, Heading8]> = [
    [{ x: 0, z: -1 }, 'rear'], [{ x: 1, z: -1 }, 'rearRight'],
    [{ x: 1, z: 0 }, 'right'], [{ x: 1, z: 1 }, 'frontRight'],
    [{ x: 0, z: 1 }, 'front'], [{ x: -1, z: 1 }, 'frontLeft'],
    [{ x: -1, z: 0 }, 'left'], [{ x: -1, z: -1 }, 'rearLeft'],
  ];
  for (const [direction, heading] of directions) for (const scale of [1e-250, 0.001, 1, 1e100, 1e300]) {
    const vector = { x: direction.x * scale, z: direction.z * scale };
    assert.equal(headingForDirection(vector), heading);
    close(Math.hypot(...Object.values(normalizeDirection(vector))), 1);
  }
  assert.equal(headingForDirection({ x: 0, z: 0 }), 'rear');
  assert.equal(headingForDirection({ x: 0, z: 0 }, 'frontLeft'), 'frontLeft');
  assert.deepEqual(normalizeDirection({ x: 0, z: 0 }), { x: 0, z: -1 });
  assert.deepEqual(normalizeDirection({ x: Infinity, z: 1 }), { x: 0, z: -1 });
});

test('look-ahead turns toward a bend before crossing it and retains the final heading', () => {
  const route = makeRoute([{ x: 0, z: 0 }, { x: 0, z: -2 }, { x: 2, z: -2 }]);
  const duration = 4000;
  const samples = Array.from({ length: 401 }, (_, i) => sampleLocomotion(route, duration * i / 400, duration));
  const anticipating = samples.find(sample => sample.point.z > -1.7 && sample.tangent.x > 0.005);
  assert.ok(anticipating, 'direction should anticipate the rounded bend');
  assert.ok(anticipating.tangent.z < 0);
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i-1].tangent, b = samples[i].tangent;
    assert.ok(a.x * b.x + a.z * b.z > 0.99, 'heading should change smoothly through this bend');
  }
  assert.equal(samples[samples.length - 1].heading, 'right');
});
