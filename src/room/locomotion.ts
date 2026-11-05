import { sampleRoute, type FloorPoint, type Route } from './motion.ts';
import { ARRIVAL_CLOSE_MS, WALK_STRIDE_METERS } from '../shared/movementSchedule.ts';

export type LocomotionStage = 'start' | 'cruise' | 'stop' | 'close';
export type Heading8 = 'rear' | 'rearRight' | 'right' | 'frontRight' |
  'front' | 'frontLeft' | 'left' | 'rearLeft';

export interface LocomotionSample {
  point: FloorPoint;
  /** Unit direction, anticipating bends on the existing measured route. */
  tangent: FloorPoint;
  heading: Heading8;
  distance: number;
  /** Normalized distance through the route, rather than elapsed-time fraction. */
  progress: number;
  stage: LocomotionStage;
  stageProgress: number;
  /** Present only in movement4: align the last stride with its authored supporting foot. */
  gaitPhase?: number;
  supportFoot?: 'right' | 'left';
}

const ACCELERATION_MS = 240;
const DECELERATION_MS = 360;
const LOOK_AHEAD_METERS = 0.22;
export const HEADING_ORDER: readonly Heading8[] = [
  'rear', 'rearRight', 'right', 'frontRight', 'front', 'frontLeft', 'left', 'rearLeft',
];

function unit(direction: FloorPoint): FloorPoint | null {
  if (!Number.isFinite(direction.x) || !Number.isFinite(direction.z)) return null;
  // Scale before hypot so very large/small, valid direction vectors retain their heading.
  const largest = Math.max(Math.abs(direction.x), Math.abs(direction.z));
  if (largest === 0) return null;
  const x = direction.x / largest, z = direction.z / largest;
  const length = Math.hypot(x, z);
  return { x: x / length, z: z / length };
}

/** Zero/non-finite vectors use a deterministic rear direction unless a valid fallback is supplied. */
export function normalizeDirection(direction: FloorPoint, fallback: FloorPoint = { x: 0, z: -1 }): FloorPoint {
  return unit(direction) ?? unit(fallback) ?? { x: 0, z: -1 };
}

/** z grows toward the door; rear is negative z and positive x is screen-right. */
export function headingForDirection(direction: FloorPoint, fallback: Heading8 = 'rear'): Heading8 {
  const normalized = unit(direction);
  if (!normalized) return fallback;
  const angle = Math.atan2(normalized.x, -normalized.z);
  const sector = Math.floor((angle + Math.PI / 8 + Math.PI * 2) / (Math.PI / 4)) % 8;
  return HEADING_ORDER[sector];
}

function atDistance(route: Route, distance: number): FloorPoint {
  if (distance <= 0 || route.length === 0) return { ...route.points[0] };
  if (distance >= route.length) return { ...route.points[route.points.length - 1] };
  return sampleRoute(route, distance / route.length).point;
}

function directionAt(route: Route, distance: number, point: FloorPoint): FloorPoint {
  if (route.length === 0) return { x: 0, z: -1 };
  const lookAhead = Math.min(LOOK_AHEAD_METERS, route.length / 4);
  const ahead = atDistance(route, Math.min(route.length, distance + lookAhead));
  const forward = unit({ x: ahead.x - point.x, z: ahead.z - point.z });
  if (forward) return forward;
  // At the exact endpoint, retain the final travel heading rather than snapping rear.
  const behind = atDistance(route, Math.max(0, distance - lookAhead));
  return normalizeDirection({ x: point.x - behind.x, z: point.z - behind.z });
}

/**
 * Sample an analytic velocity profile without accumulating RAF deltas.
 * A half-cosine ramps speed up/down. The integrated area is normalized to the measured
 * route length, so public movement duration, path geometry and interaction markers stay fixed.
 */
export function sampleLocomotion(route: Route, elapsedMs: number, durationMs: number): LocomotionSample {
  if (!route.points.length || !Number.isFinite(route.length) || route.length < 0) {
    throw new RangeError('Locomotion requires a finite, non-empty measured route.');
  }
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new RangeError('Locomotion duration must be finite and non-negative.');
  }
  let stage: LocomotionStage = 'stop', stageProgress = 1, progress = 1;
  if (durationMs > 0) {
    const time = Number.isNaN(elapsedMs) ? 0 : Math.max(0, Math.min(durationMs, elapsedMs));
    const scale = Math.min(1, durationMs / (ACCELERATION_MS + DECELERATION_MS));
    const acceleration = ACCELERATION_MS * scale, deceleration = DECELERATION_MS * scale;
    const cruise = Math.max(0, durationMs - acceleration - deceleration);
    const totalArea = acceleration / 2 + cruise + deceleration / 2;
    let area: number;
    if (time < acceleration) {
      stage = 'start'; stageProgress = time / acceleration;
      area = time / 2 - acceleration / (2 * Math.PI) * Math.sin(Math.PI * stageProgress);
    } else if (time < durationMs - deceleration) {
      stage = 'cruise'; stageProgress = (time - acceleration) / cruise;
      area = acceleration / 2 + time - acceleration;
    } else {
      stage = 'stop'; stageProgress = deceleration > 0 ? (time - (durationMs - deceleration)) / deceleration : 1;
      const stoppingTime = time - (durationMs - deceleration);
      area = acceleration / 2 + cruise + stoppingTime / 2 +
        deceleration / (2 * Math.PI) * Math.sin(Math.PI * stageProgress);
    }
    // Preserve exact public boundaries despite floating-point sine/integration rounding.
    progress = time <= 0 ? 0 : time >= durationMs ? 1 : Math.max(0, Math.min(1, area / totalArea));
    stageProgress = Math.max(0, Math.min(1, stageProgress));
    if (time >= durationMs) { stage = 'stop'; stageProgress = 1; }
  }
  const distance = progress * route.length;
  const point = atDistance(route, distance);
  const tangent = directionAt(route, distance, point);
  return { point, tangent, heading: headingForDirection(tangent), distance, progress, stage, stageProgress };
}

/** Movement4 reaches the endpoint first, then closes its feet without sliding the world root. */
export function sampleArrivalLocomotion(route: Route, elapsedMs: number, durationMs: number): LocomotionSample {
  if (!Number.isFinite(durationMs) || durationMs < ARRIVAL_CLOSE_MS) {
    throw new RangeError('Arrival movement requires the complete closing duration.');
  }
  const walkMs = durationMs - ARRIVAL_CLOSE_MS;
  const time = Number.isNaN(elapsedMs) ? 0 : Math.max(0, Math.min(durationMs, elapsedMs));
  // Passing poses (.25/.75) put the planted foot under the hip before the other foot closes.
  const targetCycles = Math.max(.25, Math.ceil((route.length/WALK_STRIDE_METERS-.25)*2-1e-9)/2+.25);
  const supportFoot = Math.round((targetCycles-.25)*2) % 2 === 0 ? 'right' : 'left';
  const sample = sampleLocomotion(route, Math.min(time, walkMs), walkMs);
  if (time >= walkMs) return {...sample, stage:'close', stageProgress:(time-walkMs)/ARRIVAL_CLOSE_MS,
    gaitPhase:targetCycles % 1, supportFoot};
  let cycles = sample.distance / WALK_STRIDE_METERS;
  if (sample.stage === 'stop') {
    const deceleration = DECELERATION_MS * Math.min(1, walkMs / (ACCELERATION_MS + DECELERATION_MS));
    const startCycles = sampleLocomotion(route, walkMs-deceleration, walkMs).distance / WALK_STRIDE_METERS;
    const progress = .5 - .5 * Math.cos(Math.PI * sample.stageProgress);
    cycles = startCycles + (targetCycles-startCycles) * progress;
  }
  return {...sample, gaitPhase:cycles % 1, supportFoot};
}
