/** Public choreography contract. Never derive server time from artwork metadata. */
export const RITUAL_TIMELINE_VERSION = 1 as const;
export const INCENSE_TIMELINE_VERSION = 2 as const;
export const TRANSITION_TIMELINE_VERSION = 3 as const;
export const INCENSE_TRANSITION_TIMELINE_VERSION = 4 as const;
export type RitualTimelineVersion = typeof RITUAL_TIMELINE_VERSION | typeof INCENSE_TIMELINE_VERSION | typeof TRANSITION_TIMELINE_VERSION | typeof INCENSE_TRANSITION_TIMELINE_VERSION;

export const CLIP_MS = {
  stand: 400,
  standFront: 400,
  walkRear: 880,
  walkFront: 880,
  sitDown: 860,
  seated: 400,
  standUp: 760,
  kneelDown: 720,
  kneeling: 400,
  bowDown: 1040,
  bowHold: 380,
  bowUp: 1020,
  rise: 760,
  offerRaise: 700,
  offerHold: 650,
  offerPlace: 850,
  offerRelease: 880,
  petalRelease: 1050,
  bellStrike: 920,
} as const;

export type ClipId = keyof typeof CLIP_MS;
export type OfferingSequenceKind = 'incense' | 'lotus' | 'petal' | 'bell';

export const CONTACT_MS = { incense: 500, lotus: 500, petal: 350, bell: 300 } as const;

/** Incense performance introduced in v2; v4 retains it and lengthens the return pivot. */
const INCENSE_CLIP_MS = {
  ...CLIP_MS, standUp: 1160, sitDown: 1500,
  offerRaise: 1350, offerHold: 1100, offerPlace: 1400, offerRelease: 1150,
} as const;
const INCENSE_CONTACT_MS = { ...CONTACT_MS, incense: 1000 } as const;
// Other new rituals keep their existing contact choreography while allowing a full stand/sit transition.
const TRANSITION_CLIP_MS = { ...CLIP_MS, standUp:1160, sitDown:1500 } as const;

export function assertTimelineVersion(version: number = RITUAL_TIMELINE_VERSION): void {
  if (version !== RITUAL_TIMELINE_VERSION && version !== INCENSE_TIMELINE_VERSION && version !== TRANSITION_TIMELINE_VERSION && version !== INCENSE_TRANSITION_TIMELINE_VERSION) {
    throw new Error(`Unsupported ritual timeline version: ${version}`);
  }
}

export function ritualSchedule(version: number = RITUAL_TIMELINE_VERSION) {
  assertTimelineVersion(version);
  if(version===TRANSITION_TIMELINE_VERSION)return {clips:TRANSITION_CLIP_MS,contacts:CONTACT_MS,returnTurnMs:380};
  if(version===INCENSE_TRANSITION_TIMELINE_VERSION)return {clips:INCENSE_CLIP_MS,contacts:INCENSE_CONTACT_MS,returnTurnMs:380};
  return version === INCENSE_TIMELINE_VERSION
    ? { clips: INCENSE_CLIP_MS, contacts: INCENSE_CONTACT_MS,returnTurnMs:160 }
    : { clips: CLIP_MS, contacts: CONTACT_MS,returnTurnMs:160 };
}

export function offeringClips(kind: OfferingSequenceKind): readonly ClipId[] {
  const contactClip = kind === 'bell' ? 'bellStrike' : kind === 'petal' ? 'petalRelease' : 'offerPlace';
  return ['offerRaise', 'offerHold', contactClip, 'offerRelease'];
}

export const BOW_CYCLE_MS = CLIP_MS.bowDown + CLIP_MS.bowHold + CLIP_MS.bowUp;

export function performanceDuration(kind: 'bow' | 'incense', offering: OfferingSequenceKind = 'incense', version: number = RITUAL_TIMELINE_VERSION) {
  const schedule = ritualSchedule(version);
  return kind === 'bow' ? BOW_CYCLE_MS * 3 : offeringClips(offering).reduce((sum, id) => sum + schedule.clips[id], 0);
}
