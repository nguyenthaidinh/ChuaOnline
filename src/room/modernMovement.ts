import type { ClipId } from './animationManifest.ts';
import type { FloorPoint } from './motion.ts';
import type { ArtworkFrame, MovementGeometry } from './modernArtworkTypes.ts';
import { DIRECTIONAL_ARTWORK, DIRECTIONAL_WALKS } from './directionalMovementGeometry.ts';
import { headingForDirection, normalizeDirection, type Heading8, type LocomotionSample } from './locomotion.ts';
import { MOVEMENT_ARTWORK, MOVEMENT_CLIPS, WALK_ARTWORK, WALK_GEOMETRY, MODERN_IDLE } from './modernMovementGeometry.ts';
import { ritualSchedule, type RitualTimelineVersion } from '../shared/ritualSchedule.ts';
import type { Appearance } from './protocol.ts';
import { turnHeading } from './headingTurns.ts';
import { VARIANT_MOVEMENT } from './variantMovementGeometry.ts';
import { EXPANDED_DIRECTION_ARTWORK, EXPANDED_DIRECTION_WALKS, EXPANDED_DIRECTION_STANDS } from './expandedDirectionGeometry.ts';

type MovementStage = Pick<LocomotionSample, 'stage' | 'stageProgress' | 'heading'>;
export interface MovementArtworkQuery {
  appearance: Appearance;
  clip: ClipId;
  timeMs: number;
  distance: number;
  tangent: FloorPoint;
  version: RitualTimelineVersion;
  stage?: MovementStage;
  turn?: { from: Heading8; to: Heading8; progress: number };
  ready: {
    base: boolean;
    lateral: boolean;
    expanded?: boolean;
    variants?: Record<'woman' | 'granny', boolean>;
  };
}
type Atlas=Pick<ArtworkFrame,'image'|'columns'|'rows'>;
function sequenceFrame(frames:readonly MovementGeometry[],progress:number,atlas?:Atlas):ArtworkFrame {
  const time=(Number.isNaN(progress)?0:Math.max(0,Math.min(1,progress)))*frames[frames.length-1].endMs;
  const found=frames.findIndex(frame=>time<frame.endMs),index=found<0?frames.length-1:found;
  const frame=frames[index],asset=atlas??(frame.bank==='walk'?WALK_ARTWORK:MOVEMENT_ARTWORK);
  return {cell:frame.index,index,durationMs:frame.endMs-frame.startMs,sourceId:frame.id,
    top:frame.top,rootOffset:frame.rootOffset,image:asset.image,columns:asset.columns,rows:asset.rows,
    atlasCell:frame.index,facing:'rear',modernKind:'movement'};
}

// The final approach already faces the altar. Do not repeat the angled-to-rear turn.
const rearSitStart=MOVEMENT_CLIPS.sitDown.findIndex(frame=>frame.id==='02-stand-rear');
const rearSitOffset=MOVEMENT_CLIPS.sitDown[rearSitStart].startMs;
const rearSit=MOVEMENT_CLIPS.sitDown.slice(rearSitStart).map(frame=>({...frame,
  startMs:frame.startMs-rearSitOffset,endMs:frame.endMs-rearSitOffset}));

function neutralHeading(heading:Heading8,ready:MovementArtworkQuery['ready']):ArtworkFrame|null {
  if(heading==='rearRight')return ready.base?{...sequenceFrame(MOVEMENT_CLIPS.turn,0),heading}:null;
  if(!ready.expanded)return null;
  const frame=EXPANDED_DIRECTION_STANDS[heading];
  return {cell:frame.cell,index:0,durationMs:100,sourceId:frame.id,top:frame.top,
    image:EXPANDED_DIRECTION_ARTWORK.image,columns:EXPANDED_DIRECTION_ARTWORK.columns,rows:EXPANDED_DIRECTION_ARTWORK.rows,
    atlasCell:frame.cell,facing:heading.startsWith('front')?'front':'rear',heading,modernKind:'movement'};
}

function gaitFrame(frames:readonly {cell:number;id:string;top:number}[],atlas:Atlas,progress:number,heading:Heading8):ArtworkFrame {
  const index=Math.min(frames.length-1,Math.floor(progress*frames.length)),frame=frames[index];
  return {cell:frame.cell,index,durationMs:110,sourceId:frame.id,top:frame.top,image:atlas.image,columns:atlas.columns,rows:atlas.rows,
    atlasCell:frame.cell,facing:heading.startsWith('front')?'front':'rear',heading,modernKind:'movement'};
}

/** Authored directions use separate pixels. Legacy fallback retains its existing sources. */
export function sampleModernMovement(query:MovementArtworkQuery):ArtworkFrame|null {
  const {appearance,clip,timeMs,distance,tangent,version,stage,ready}=query;
  if(appearance!=='man'){
    if(!ready.variants?.[appearance])return null;
    const variant=VARIANT_MOVEMENT[appearance];
    if(clip==='seated')return {cell:variant.idle.index,index:0,durationMs:400,sourceId:variant.idle.id,
      top:variant.idle.top,image:variant.asset.image,columns:variant.asset.columns,rows:variant.asset.rows,
      atlasCell:variant.idle.index,facing:'rear',heading:'rear',modernKind:'movement'};
    if(clip==='stand')return sequenceFrame(variant.clips.sitDown,0,variant.asset);
    if(clip!=='standUp'&&clip!=='sitDown')return null;
    return sequenceFrame(variant.clips[clip],Number.isFinite(timeMs)?timeMs/ritualSchedule(version).clips[clip]:0,variant.asset);
  }
  if(query.turn&&version>=3)return neutralHeading(turnHeading(query.turn.from,query.turn.to,query.turn.progress),ready);
  if(clip==='seated'&&ready.base)return {cell:MODERN_IDLE.index,index:0,durationMs:400,sourceId:MODERN_IDLE.id,top:MODERN_IDLE.top,
    image:MOVEMENT_ARTWORK.image,columns:MOVEMENT_ARTWORK.columns,rows:MOVEMENT_ARTWORK.rows,
    atlasCell:MODERN_IDLE.index,facing:'rear',heading:'rear',modernKind:'movement'};
  if(clip==='stand'&&ready.base)return sequenceFrame(MOVEMENT_CLIPS.turn,0);
  if(clip==='standFront')return neutralHeading('front',ready);
  if(clip==='walkRear'||clip==='walkFront'){
    const direction=normalizeDirection(tangent),heading=headingForDirection(direction);
    const progress=Number.isFinite(distance)?(Math.max(0,distance)/0.95)%1:0;
    if(version>=3&&ready.expanded&&heading!=='rearRight'&&
      (stage?.stage==='start'&&stage.stageProgress<.3||stage?.stage==='stop'&&stage.stageProgress>.7)){
      const standing=neutralHeading(heading,ready);if(standing)return standing;
    }
    if(ready.lateral&&(heading==='left'||heading==='right'))return gaitFrame(DIRECTIONAL_WALKS[heading],DIRECTIONAL_ARTWORK,progress,heading);
    if(ready.expanded&&heading!=='rearRight'&&heading!=='left'&&heading!=='right'){
      return gaitFrame(EXPANDED_DIRECTION_WALKS[heading],EXPANDED_DIRECTION_ARTWORK,progress,heading);
    }
    if(!ready.base||direction.z>=-.25||direction.x<=.05)return null;
    if(stage?.stage==='start')return sequenceFrame(MOVEMENT_CLIPS.startWalk,stage.stageProgress);
    if(stage?.stage==='stop')return sequenceFrame(MOVEMENT_CLIPS.stopWalk,stage.stageProgress);
    const cell = Math.min(WALK_GEOMETRY.length-1,Math.floor(progress*WALK_GEOMETRY.length));
    return { cell,index:cell,durationMs:100,sourceId:WALK_GEOMETRY[cell].id,top:WALK_GEOMETRY[cell].top,
      image:WALK_ARTWORK.image,columns:WALK_ARTWORK.columns,rows:WALK_ARTWORK.rows,atlasCell:cell,
      facing:'rear',heading:'rearRight',modernKind:'movement' };
  }
  if (!ready.base||(clip !== 'standUp' && clip !== 'sitDown')) return null;
  return sequenceFrame(clip==='sitDown'&&ready.expanded&&version>=3?rearSit:MOVEMENT_CLIPS[clip],
    Number.isFinite(timeMs)?timeMs/ritualSchedule(version).clips[clip]:0);
}
