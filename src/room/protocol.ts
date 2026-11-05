import type { RitualCommand } from '../types/experience.ts';
import type { RitualTimelineVersion } from '../shared/ritualSchedule.ts';
import type { MovementVersion } from '../shared/movementSchedule.ts';
export type Appearance = 'man' | 'woman' | 'granny';
/** v4 adds the full sit; v5 also closes the last step at the fixed seat. */
export type EntryVersion = 3 | 4 | 5;
export type OfferingKind = 'incense' | 'lotus' | 'petal' | 'bell';
export type RoomActionKind = 'bow' | OfferingKind;
export function isOfferingKind(value: unknown): value is OfferingKind {
  return value === 'incense' || value === 'lotus' || value === 'petal' || value === 'bell';
}
export const OFFERING_LABELS: Record<OfferingKind, string> = {
  incense: 'Dâng hương', lotus: 'Dâng hoa sen', petal: 'Rải cánh sen', bell: 'Thỉnh chuông',
};
export interface SharedAction extends RitualCommand { startedAt: number; endsAt: number; slot: number; offering?: OfferingKind;
  timelineVersion?: RitualTimelineVersion;
  movement?: { seat:number; outboundMs:number; returnMs:number; version:MovementVersion } }
export interface PlacedOffering { id:string; actionId:string; kind:OfferingKind; slot:number; placedAt:number; expiresAt:number;
  artworkVersion?:3|4;appearance?:Appearance }
export interface RoomMember {
  id: string; name: string; appearance: Appearance; seat: number; joinedAt: number;
  entryVersion?: EntryVersion;
  action: SharedAction | null;
  completed: { kind: 'incense' | 'bow'; at: number; offering?: OfferingKind } | null;
}
export interface RoomSnapshot { revision: number; now: number; capacity: number; people: RoomMember[]; offerings:PlacedOffering[] }
export interface JoinResult { token: string; selfId: string; room: RoomSnapshot }
export const ROOM_CAPACITY = 24;
export const WALK_SECONDS = 1.8;
export const INCENSE_SECONDS = 4;
export const PRESENCE_TIMEOUT_MS = 90000;
export const MAX_OFFERINGS=12;
export const OFFERING_TTL_MS=60000;
export const offeringLifetime=(kind:OfferingKind)=>kind==='bell'?0:kind==='petal'?8000:OFFERING_TTL_MS;
