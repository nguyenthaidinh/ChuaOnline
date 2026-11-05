import type { Appearance, RoomMember } from './protocol.ts';

export interface AmbientDevotee {
  readonly seat: number;
  readonly appearance: Appearance;
  readonly name: string;
}

export interface AmbientCrowd {
  readonly target: number;
  readonly people: readonly AmbientDevotee[];
}

export const AMBIENT_DEVOTEE_MIN = 8;
export const AMBIENT_DEVOTEE_MAX = 12;

// Fill complete horizontal rows, keeping the front row available for visitors.
const SEATS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;
const APPEARANCES: readonly Appearance[] = ['man', 'woman', 'granny'];
const NAMES: Record<Appearance, readonly string[]> = {
  man: ['Minh Tâm', 'Thiện An', 'Quang Minh', 'Phước Đức', 'Tuệ Minh', 'Minh Tuệ', 'Hải An', 'Đức Hòa', 'Thanh Sơn', 'Văn Thiện', 'Tâm Minh', 'Phước Hòa'],
  woman: ['An Nhiên', 'Diệu An', 'Ngọc Lan', 'Lan Anh', 'Diệu Liên', 'Thanh Hà', 'Hải Yến', 'Phương Thảo', 'Bảo Ngọc', 'Diệu Hoa', 'Hoài An', 'Mai Phương'],
  granny: ['Từ Tâm', 'Diệu Tâm', 'Thiện Duyên', 'Phước An', 'Thanh Tịnh', 'Diệu Hạnh', 'Tuệ An', 'Tâm Thiện', 'Minh Hạnh', 'Diệu Hiền', 'Thiện Hòa', 'Ngọc Mai'],
};

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Pick once per page visit, rather than on room updates or animation frames. */
export function createAmbientCrowd(random: () => number = Math.random): AmbientCrowd {
  const target = AMBIENT_DEVOTEE_MIN + Math.floor(random() * (AMBIENT_DEVOTEE_MAX - AMBIENT_DEVOTEE_MIN + 1));
  const names = { man: shuffle(NAMES.man, random), woman: shuffle(NAMES.woman, random), granny: shuffle(NAMES.granny, random) };
  const used: Record<Appearance, number> = { man: 0, woman: 0, granny: 0 };
  return {
    target,
    people: SEATS.map(seat => {
      const appearance = APPEARANCES[(seat + Math.floor(seat / 6)) % APPEARANCES.length];
      return { seat, appearance, name: names[appearance][used[appearance]++] };
    }),
  };
}

/** Decorative occupants never enter the shared room or consume its capacity. */
export function ambientDevotees(people: readonly Pick<RoomMember, 'seat'>[], crowd: AmbientCrowd): readonly AmbientDevotee[] {
  const needed = Math.max(0, crowd.target - people.length);
  const reserved = new Set(people.map(person => person.seat));
  return crowd.people.filter(person => !reserved.has(person.seat)).slice(0, needed);
}
