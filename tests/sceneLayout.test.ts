import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SCENE_LAYOUTS, layoutForWidth, ritualPosition, actorHeight, floorHorizonY } from '../src/config/sceneLayout.ts';
import { configureCamera, floorPointToWorld, worldPointToStage, scaleForActorHeight, projectedActorHeight } from '../src/three/sceneProjection.ts';
import { RitualTimeline } from '../src/services/ritualTimeline.ts';
import type { RitualEvent } from '../src/types/experience.ts';

test('floor anchors project to their configured screen points in desktop and portrait cameras', () => {
  const camera = new THREE.PerspectiveCamera();
  for (const width of [360, 390, 430, 1366, 1920]) {
    const layout = layoutForWidth(width);
    configureCamera(camera, layout, layout.aspectRatio);
    for (const point of [layout.points.home, layout.points.altar, { x: 32, y: 78 }]) {
      const world = floorPointToWorld(camera, point);
      assert.ok(Math.abs(world.y) < 1e-8);
      const projected = worldPointToStage(camera, world);
      assert.ok(Math.abs(projected.x - point.x) < 1e-7);
      assert.ok(Math.abs(projected.y - point.y) < 1e-7);
    }
  }
});

test('reflow recomputes world coordinates instead of reusing the previous aspect', () => {
  const camera = new THREE.PerspectiveCamera();
  const point = { x: 32, y: 78 };
  configureCamera(camera, SCENE_LAYOUTS.desktop, 16 / 9);
  const old = floorPointToWorld(camera, point);
  configureCamera(camera, SCENE_LAYOUTS.mobile, 9 / 16);
  const next = floorPointToWorld(camera, point);
  assert.ok(Math.abs(old.x - next.x) > 1);
  assert.ok(Math.abs(worldPointToStage(camera, next).x - point.x) < 1e-7);
  assert.ok(Math.abs(worldPointToStage(camera, old).x - point.x) > 10);
});

test('the draft floor horizon matches the actual Three.js camera', () => {
  const camera = new THREE.PerspectiveCamera();
  for (const layout of Object.values(SCENE_LAYOUTS)) {
    configureCamera(camera, layout, layout.aspectRatio);
    const horizon = worldPointToStage(camera, new THREE.Vector3(0, 0, -1e10));
    assert.ok(Math.abs(horizon.y - floorHorizonY(layout)) < 1e-6);
  }
});

test('standing character height matches the layout at both ends of the ritual path', () => {
  const camera = new THREE.PerspectiveCamera();
  for (const layout of Object.values(SCENE_LAYOUTS)) {
    configureCamera(camera, layout, layout.aspectRatio);
    for (const progress of [0, 1]) {
      const point = floorPointToWorld(camera, ritualPosition(layout, progress));
      const desired = actorHeight(layout, progress);
      const scale = scaleForActorHeight(camera, point, 0.46, desired);
      assert.ok(scale > 0 && scale < 32);
      assert.ok(Math.abs(projectedActorHeight(camera, point, 0.46 * scale) - desired) < 1e-5);
    }
  }
});

test('a layout switch preserves ritual time, progress and a single completion', () => {
  const events: RitualEvent[] = [];
  const ritual = new RitualTimeline({ id: 'resize-test', actorId: 'visitor', kind: 'bow', bowCount: 3 }, event => events.push(event));
  const camera = new THREE.PerspectiveCamera();
  const before = ritual.advance(3.1);
  for (const layout of [SCENE_LAYOUTS.desktop, SCENE_LAYOUTS.mobile, SCENE_LAYOUTS.desktop]) {
    configureCamera(camera, layout, layout.aspectRatio);
    const after = ritual.advance(0);
    assert.deepEqual(after, before);
    const screen = ritualPosition(layout, after.travel);
    const projected = worldPointToStage(camera, floorPointToWorld(camera, screen));
    assert.ok(Math.abs(projected.y - screen.y) < 1e-7);
  }
  ritual.advance(100);
  ritual.advance(100);
  assert.equal(events.filter(event => event.type === 'complete').length, 1);
  assert.equal(ritual.advance(0).completedBows, 3);
});
