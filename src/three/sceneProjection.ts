import * as THREE from 'three';
import type { SceneLayout, StagePoint } from '../config/sceneLayout.ts';

export function configureCamera(camera: THREE.PerspectiveCamera, layout: SceneLayout, aspect: number) {
  camera.fov = layout.camera.fov;
  camera.aspect = aspect;
  camera.position.set(...layout.camera.position);
  camera.lookAt(...layout.camera.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

export function floorPointToWorld(camera: THREE.PerspectiveCamera, point: StagePoint) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(point.x / 50 - 1, 1 - point.y / 50), camera);
  const result = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  if (!result) throw new Error('Scene anchor does not intersect the floor');
  return result;
}

export function worldPointToStage(camera: THREE.PerspectiveCamera, point: THREE.Vector3): StagePoint {
  const projected = point.clone().project(camera);
  return { x: (projected.x + 1) * 50, y: (1 - projected.y) * 50 };
}

export function projectedActorHeight(camera: THREE.PerspectiveCamera, floor: THREE.Vector3, height: number) {
  const feet = worldPointToStage(camera, floor);
  const head = worldPointToStage(camera, floor.clone().add(new THREE.Vector3(0, height, 0)));
  return feet.y - head.y;
}

export function scaleForActorHeight(camera: THREE.PerspectiveCamera, floor: THREE.Vector3, normalizedHeight: number, percent: number) {
  let low = 0, high = 32;
  for (let i = 0; i < 28; i++) {
    const scale = (low + high) / 2;
    if (projectedActorHeight(camera, floor, normalizedHeight * scale) < percent) low = scale;
    else high = scale;
  }
  return (low + high) / 2;
}
