import type { Appearance, RoomMember } from './protocol.ts';

export interface AmbientDevotee {
  readonly seat: number;
  readonly appearance: Appearance;
}

export const AMBIENT_DEVOTEE_TARGET = 12;

// Three rows on either side of the aisle. Keep the front row for visitors.
const SEATS = [6, 7, 8, 9, 12, 13, 14, 15, 18, 19, 20, 21] as const;
const APPEARANCES: readonly Appearance[] = ['man', 'woman', 'granny'];

/** Decorative occupants never enter the shared room or consume its capacity. */
export function ambientDevotees(people: readonly Pick<RoomMember, 'seat'>[]): AmbientDevotee[] {
  const needed = Math.max(0, AMBIENT_DEVOTEE_TARGET - people.length);
  const reserved = new Set(people.map(person => person.seat));
  return SEATS.filter(seat => !reserved.has(seat)).slice(0, needed).map(seat => ({
    seat,
    appearance: APPEARANCES[(seat + Math.floor(seat / 6)) % APPEARANCES.length],
  }));
}
