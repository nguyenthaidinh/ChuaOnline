/** Versioned movement timing; artwork never supplies authoritative durations. */
export type MovementVersion = 2 | 3 | 4;
export const ARRIVAL_CLOSE_MS = 420;
export const WALK_STRIDE_METERS = 0.95;
export const arrivalDurationMs = (version: MovementVersion = 2) => version === 4 ? ARRIVAL_CLOSE_MS : 0;
export const artworkVersionForMovement = (version?: MovementVersion): 3 | 4 | undefined =>
  version === 4 ? 4 : version === 3 ? 3 : undefined;
