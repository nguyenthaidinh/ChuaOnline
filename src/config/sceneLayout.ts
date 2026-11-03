export type SceneLayoutId = 'desktop' | 'mobile';
export interface StagePoint { x: number; y: number }
export interface SceneLayout {
  id: SceneLayoutId;
  aspectRatio: number;
  points: { home: StagePoint; altar: StagePoint; burner: StagePoint; halo: StagePoint };
  actor: { height: number; altarScale: number };
  haloWidth: number;
  cushionWidth: number;
  camera: { fov: number; position: readonly [number, number, number]; target: readonly [number, number, number] };
}

export const DESKTOP_BREAKPOINT = 768;
export const SCENE_LAYOUTS: Record<SceneLayoutId, SceneLayout> = {
  desktop: {
    id: 'desktop', aspectRatio: 16 / 9,
    points: { home: { x: 50, y: 89 }, altar: { x: 50, y: 75 }, burner: { x: 50, y: 61 }, halo: { x: 50, y: 26 } },
    actor: { height: 18, altarScale: 0.82 }, haloWidth: 15, cushionWidth: 8,
    camera: { fov: 32, position: [0, 6, 14], target: [0, 0, -16] },
  },
  mobile: {
    id: 'mobile', aspectRatio: 9 / 16,
    points: { home: { x: 50, y: 89 }, altar: { x: 50, y: 75 }, burner: { x: 50, y: 61 }, halo: { x: 50, y: 26 } },
    actor: { height: 13, altarScale: 0.82 }, haloWidth: 45, cushionWidth: 24,
    camera: { fov: 32, position: [0, 6, 14], target: [0, 0, -16] },
  },
};

export function layoutForWidth(width: number): SceneLayout {
  return SCENE_LAYOUTS[width >= DESKTOP_BREAKPOINT ? 'desktop' : 'mobile'];
}

export function ritualPosition(layout: SceneLayout, progress: number): StagePoint {
  const t = Math.max(0, Math.min(1, progress));
  return {
    x: layout.points.home.x + (layout.points.altar.x - layout.points.home.x) * t,
    y: layout.points.home.y + (layout.points.altar.y - layout.points.home.y) * t,
  };
}

export function actorHeight(layout: SceneLayout, progress: number) {
  return layout.actor.height * (1 - (1 - layout.actor.altarScale) * Math.max(0, Math.min(1, progress)));
}

// Screen horizon of the same camera used by Three.js; used by the SVG floor grid.
export function floorHorizonY(layout: SceneLayout) {
  const { position, target, fov } = layout.camera;
  const horizontal = Math.hypot(position[0] - target[0], position[2] - target[2]);
  return 50 - 50 * (position[1] - target[1]) / horizontal / Math.tan(fov * Math.PI / 360);
}
