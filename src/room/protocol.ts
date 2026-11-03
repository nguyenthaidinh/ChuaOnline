import type { RitualCommand } from '../types/experience.ts';
export type Appearance = 'man' | 'woman' | 'granny';
export interface SharedAction extends RitualCommand { startedAt: number; endsAt: number; slot: number }
export interface RoomMember {
  id: string; name: string; appearance: Appearance; seat: number; joinedAt: number;
  action: SharedAction | null;
  completed: { kind: 'incense' | 'bow'; at: number } | null;
}
export interface RoomSnapshot { revision: number; now: number; capacity: number; people: RoomMember[] }
export interface JoinResult { token: string; selfId: string; room: RoomSnapshot }
export const ROOM_CAPACITY = 24;
export const WALK_SECONDS = 1.8;
export const INCENSE_SECONDS = 4;
export const PRESENCE_TIMEOUT_MS = 90000;
