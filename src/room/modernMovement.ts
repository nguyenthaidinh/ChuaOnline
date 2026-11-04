import type { ClipId } from './animationManifest.ts';
import type { FloorPoint } from './motion.ts';
import type { ArtworkFrame } from './modernArtworkTypes.ts';
import { MOVEMENT_ARTWORK, MOVEMENT_CLIPS, WALK_ARTWORK, WALK_GEOMETRY, MODERN_IDLE } from './modernMovementGeometry.ts';
import { ritualSchedule, type RitualTimelineVersion } from '../shared/ritualSchedule.ts';

/** Only the authored rear-right walk is eligible; other headings retain the existing source. */
export function sampleModernMovement(clip:ClipId,timeMs:number,distance:number,tangent:FloorPoint,version:RitualTimelineVersion=2):ArtworkFrame|null {
  if(clip==='seated')return {cell:MODERN_IDLE.index,index:0,durationMs:400,sourceId:MODERN_IDLE.id,top:MODERN_IDLE.top,
    image:MOVEMENT_ARTWORK.image,columns:MOVEMENT_ARTWORK.columns,rows:MOVEMENT_ARTWORK.rows,
    atlasCell:MODERN_IDLE.index,facing:'rear',modernKind:'movement'};
  if (clip === 'walkRear' && tangent.z < -0.015 && tangent.x >= -0.03) {
    const progress = Number.isFinite(distance) ? ((Math.max(0,distance)/0.95)%1) : 0;
    const cell = Math.min(WALK_GEOMETRY.length-1,Math.floor(progress*WALK_GEOMETRY.length));
    return { cell,index:cell,durationMs:100,sourceId:WALK_GEOMETRY[cell].id,top:WALK_GEOMETRY[cell].top,
      image:WALK_ARTWORK.image,columns:WALK_ARTWORK.columns,rows:WALK_ARTWORK.rows,atlasCell:cell,
      facing:'rear',modernKind:'movement' };
  }
  if (clip !== 'standUp' && clip !== 'sitDown') return null;
  const frames = MOVEMENT_CLIPS[clip];
  const time = Number.isFinite(timeMs) ? Math.max(0,timeMs)/ritualSchedule(version).clips[clip]*frames[frames.length-1].endMs : 0;
  const index = frames.findIndex(frame => time < frame.endMs);
  const frame = frames[index < 0 ? frames.length-1 : index];
  return { cell:frame.index,index:Math.max(0,index),durationMs:frame.endMs-frame.startMs,
    sourceId:frame.id,top:frame.top,rootOffset:frame.rootOffset,
    image:MOVEMENT_ARTWORK.image,columns:MOVEMENT_ARTWORK.columns,rows:MOVEMENT_ARTWORK.rows,
    atlasCell:frame.index,facing:'rear',modernKind:'movement' };
}
