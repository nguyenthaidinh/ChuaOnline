import { RitualTimeline } from '../services/ritualTimeline.ts';
import { WALK_SECONDS, INCENSE_SECONDS, type SharedAction, type Appearance } from './protocol.ts';

export const ENTRY_WALK_MS = 2400;
export const SIT_MS = 880;
export const ENTRY_DURATION_MS = ENTRY_WALK_MS + SIT_MS;
export const STAND_MS = 660;
export const SETTLE_MS = 660;
export const SPRITES: Record<Appearance, { width: number; height: number; seatedHeight: number }> = {
  man: { width: 212, height: 300, seatedHeight: 210 },
  woman: { width: 212, height: 300, seatedHeight: 220 },
  granny: { width: 195, height: 300, seatedHeight: 222 },
};
export type SharedPhase = 'standing' | 'moving' | 'settling' | 'performing' | 'rising' | 'returning' | 'seating' | 'complete';
export interface SharedPose {
  phase: SharedPhase;
  travel: number;
  spriteFrame: number | null;
  bowWeight: number;
  completedBows: number;
  offeringProgress: number | null;
}
const SAMPLERS = {
  bow: new RitualTimeline({ id: 'pose', actorId: 'pose', kind: 'bow', bowCount: 3 }, () => {}, WALK_SECONDS, INCENSE_SECONDS),
  incense: new RitualTimeline({ id: 'pose', actorId: 'pose', kind: 'incense', bowCount: 3 }, () => {}, WALK_SECONDS, INCENSE_SECONDS),
};
const durationOfPerformance = (kind: 'bow' | 'incense') => SAMPLERS[kind].performSeconds * 1000;
export function sharedRitualDurationMs(kind: 'bow' | 'incense') {
  return STAND_MS + WALK_SECONDS * 2000 + (kind === 'bow' ? SETTLE_MS : 0)
    + durationOfPerformance(kind) + STAND_MS + SIT_MS;
}
export function sampleEntry(joinedAt: number, now: number) {
  const elapsed = Math.max(0, now - joinedAt);
  return elapsed < ENTRY_WALK_MS
    ? { phase: 'entering' as const, travel: 1 - elapsed / ENTRY_WALK_MS, spriteFrame: Math.floor(elapsed / 150) % 4 }
    : elapsed < ENTRY_DURATION_MS
      ? { phase: 'seating' as const, travel: 0, spriteFrame: 4 + Math.min(3, Math.floor((elapsed - ENTRY_WALK_MS) / (SIT_MS / 4))) }
      : { phase: 'idle' as const, travel: 0, spriteFrame: null };
}
export function sampleSharedRitual(action: SharedAction, now: number): SharedPose {
  let t = Math.max(0, now - action.startedAt);
  const base = { travel: 0, spriteFrame: null, bowWeight: 0, completedBows: 0, offeringProgress: null };
  if (t < STAND_MS) return { ...base, phase: 'standing', spriteFrame: 7 - Math.min(3, Math.floor(t / (STAND_MS / 4))) };
  t -= STAND_MS;
  const walkMs = WALK_SECONDS * 1000;
  if (t < walkMs) return { ...base, phase: 'moving', travel: t / walkMs, spriteFrame: Math.floor(t / 150) % 4 };
  t -= walkMs;
  if (action.kind === 'bow') {
    if (t < SETTLE_MS) return { ...base, phase: 'settling', travel: 1, spriteFrame: 4 + Math.min(3, Math.floor(t / (SETTLE_MS / 4))) };
    t -= SETTLE_MS;
  }
  const performMs = durationOfPerformance(action.kind);
  if (t < performMs) {
    const bow = SAMPLERS[action.kind].sampleAt(WALK_SECONDS + t / 1000);
    return { ...base, phase: 'performing', travel: 1, spriteFrame: action.kind === 'bow' ? null : 4,
      bowWeight: action.kind === 'bow' ? bow.bowWeight : Math.sin(t / performMs * Math.PI * 2) * 0.08,
      completedBows: bow.completedBows, offeringProgress: action.kind === 'incense' ? t / performMs : null };
  }
  t -= performMs;
  const completedBows = action.kind === 'bow' ? 3 : 0;
  if (t < STAND_MS) return { ...base, phase: 'rising', travel: 1, completedBows,
    spriteFrame: action.kind === 'bow' ? 7 - Math.min(3, Math.floor(t / (STAND_MS / 4))) : 4 };
  t -= STAND_MS;
  if (t < walkMs) return { ...base, phase: 'returning', completedBows, travel: 1 - t / walkMs, spriteFrame: Math.floor(t / 150) % 4 };
  t -= walkMs;
  if (t < SIT_MS) return { ...base, phase: 'seating', completedBows, spriteFrame: 4 + Math.min(3, Math.floor(t / (SIT_MS / 4))) };
  return { ...base, phase: 'complete', completedBows };
}
