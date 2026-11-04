/** Public choreography contract. Never derive server time from artwork metadata. */
export const RITUAL_TIMELINE_VERSION = 1 as const;
export type RitualTimelineVersion = typeof RITUAL_TIMELINE_VERSION;

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

export function assertTimelineVersion(version: number = RITUAL_TIMELINE_VERSION): void {
  if (version !== RITUAL_TIMELINE_VERSION) {
    throw new Error(`Unsupported ritual timeline version: ${version}`);
  }
}

export function offeringClips(kind: OfferingSequenceKind): readonly ClipId[] {
  const contactClip = kind === 'bell' ? 'bellStrike' : kind === 'petal' ? 'petalRelease' : 'offerPlace';
  return ['offerRaise', 'offerHold', contactClip, 'offerRelease'];
}

export const BOW_CYCLE_MS = CLIP_MS.bowDown + CLIP_MS.bowHold + CLIP_MS.bowUp;

export function performanceDuration(kind: 'bow' | 'incense', offering: OfferingSequenceKind = 'incense') {
  return kind === 'bow' ? BOW_CYCLE_MS * 3 : offeringClips(offering).reduce((sum, id) => sum + CLIP_MS[id], 0);
}
