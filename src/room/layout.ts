import type { SceneLayoutId } from '../config/sceneLayout';
export interface RoomPoint { x: number; y: number }
export function seatPoint(seat: number, layout: SceneLayoutId): RoomPoint {
  if (layout === 'desktop') {
    const columns = [35, 65, 25, 75, 15, 85, 43, 57];
    return { x: columns[seat % 8], y: 79 + Math.floor(seat / 8) * 7.6 };
  }
  return { x: [37, 63, 18, 82][seat % 4], y: 70 + Math.floor(seat / 4) * 4.8 };
}
export function altarPoint(slot: number, layout: SceneLayoutId): RoomPoint {
  return { x: (layout === 'desktop' ? [39, 46.3, 53.7, 61] : [22, 41, 59, 78])[slot], y: layout === 'desktop' ? 76 : 64 };
}
export function visitorPosition(seat: RoomPoint, altar: RoomPoint, travel: number): RoomPoint {
  if (travel < 0.3) return { x: seat.x + (50 - seat.x) * travel / 0.3, y: seat.y };
  const t = (travel - 0.3) / 0.7;
  return { x: 50 + (altar.x - 50) * t, y: seat.y + (altar.y - seat.y) * t };
}
export const roomAssets = {
  hall: { desktop: `${import.meta.env.BASE_URL}assets/tanphat/hall-desktop.webp`, mobile: `${import.meta.env.BASE_URL}assets/tanphat/hall.jpg` },
  sprite: (appearance: string) => `${import.meta.env.BASE_URL}assets/tanphat/c_${appearance}.png`,
  walk: (appearance: string) => `${import.meta.env.BASE_URL}assets/tanphat/anim_${appearance}.png`,
  incense: `${import.meta.env.BASE_URL}assets/tanphat/fx_incense.png`,
};
