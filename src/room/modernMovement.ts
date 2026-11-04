import type { ClipId } from './animationManifest.ts';
import type { FloorPoint } from './motion.ts';
import type { ArtworkFrame, MovementGeometry } from './modernArtworkTypes.ts';
import { DIRECTIONAL_ARTWORK, DIRECTIONAL_WALKS } from './directionalMovementGeometry.ts';
import { headingForDirection, normalizeDirection, type LocomotionSample } from './locomotion.ts';
import { MOVEMENT_ARTWORK, MOVEMENT_CLIPS, WALK_ARTWORK, WALK_GEOMETRY, MODERN_IDLE } from './modernMovementGeometry.ts';
import { ritualSchedule, type RitualTimelineVersion } from '../shared/ritualSchedule.ts';

type MovementStage=Pick<LocomotionSample,'stage'|'stageProgress'|'heading'>;
function sequenceFrame(frames:readonly MovementGeometry[],progress:number):ArtworkFrame {
  const time=Math.max(0,Math.min(1,progress))*frames[frames.length-1].endMs;
  const found=frames.findIndex(frame=>time<frame.endMs),index=found<0?frames.length-1:found;
  const frame=frames[index],asset=frame.bank==='walk'?WALK_ARTWORK:MOVEMENT_ARTWORK;
  return {cell:frame.index,index,durationMs:frame.endMs-frame.startMs,sourceId:frame.id,
    top:frame.top,rootOffset:frame.rootOffset,image:asset.image,columns:asset.columns,rows:asset.rows,
    atlasCell:frame.index,facing:'rear',modernKind:'movement'};
}

/** Authored directions use separate pixels. Legacy fallback retains its existing sources. */
export function sampleModernMovement(clip:ClipId,timeMs:number,distance:number,tangent:FloorPoint,
  version:RitualTimelineVersion=2,stage?:MovementStage,directionsReady=false):ArtworkFrame|null {
  if(clip==='seated')return {cell:MODERN_IDLE.index,index:0,durationMs:400,sourceId:MODERN_IDLE.id,top:MODERN_IDLE.top,
    image:MOVEMENT_ARTWORK.image,columns:MOVEMENT_ARTWORK.columns,rows:MOVEMENT_ARTWORK.rows,
    atlasCell:MODERN_IDLE.index,facing:'rear',modernKind:'movement'};
  if(clip==='stand')return sequenceFrame(MOVEMENT_CLIPS.turn,0);
  if(clip==='walkRear'||clip==='walkFront'){
    const direction=normalizeDirection(tangent),heading=headingForDirection(direction);
    const progress=Number.isFinite(distance)?(Math.max(0,distance)/0.95)%1:0;
    if(directionsReady&&(heading==='left'||heading==='right')){
      const frames=DIRECTIONAL_WALKS[heading],index=Math.min(frames.length-1,Math.floor(progress*frames.length));
      const frame=frames[index];
      return {cell:frame.cell,index,durationMs:110,sourceId:frame.id,top:frame.top,
        image:DIRECTIONAL_ARTWORK.image,columns:DIRECTIONAL_ARTWORK.columns,rows:DIRECTIONAL_ARTWORK.rows,
        atlasCell:frame.cell,facing:'rear',modernKind:'movement'};
    }
    if(direction.z>=-.25||direction.x<=.05)return null;
    if(stage?.stage==='start')return sequenceFrame(MOVEMENT_CLIPS.startWalk,stage.stageProgress);
    if(stage?.stage==='stop')return sequenceFrame(MOVEMENT_CLIPS.stopWalk,stage.stageProgress);
    const cell = Math.min(WALK_GEOMETRY.length-1,Math.floor(progress*WALK_GEOMETRY.length));
    return { cell,index:cell,durationMs:100,sourceId:WALK_GEOMETRY[cell].id,top:WALK_GEOMETRY[cell].top,
      image:WALK_ARTWORK.image,columns:WALK_ARTWORK.columns,rows:WALK_ARTWORK.rows,atlasCell:cell,
      facing:'rear',modernKind:'movement' };
  }
  if (clip !== 'standUp' && clip !== 'sitDown') return null;
  return sequenceFrame(MOVEMENT_CLIPS[clip],Number.isFinite(timeMs)?timeMs/ritualSchedule(version).clips[clip]:0);
}
