import type { ClipId } from './animationManifest.ts';
import type { FloorPoint } from './motion.ts';
import type { ArtworkFrame, MovementGeometry, MovementStage, MovementReadiness } from './modernArtworkTypes.ts';
import { headingForDirection, normalizeDirection, type Heading8 } from './locomotion.ts';
import { MOVEMENT_ARTWORK, MOVEMENT_CLIPS, WALK_ARTWORK, MODERN_IDLE } from './modernMovementGeometry.ts';
import { ritualSchedule, type RitualTimelineVersion } from '../shared/ritualSchedule.ts';
import type { Appearance } from './protocol.ts';
import { turnHeading } from './headingTurns.ts';
import { VARIANT_MOVEMENT } from './variantMovementGeometry.ts';
import { arrivalGaitFrame, closingFrame, directionalGait, directionalNeutral } from './directionalArtwork.ts';
import { WALK_STRIDE_METERS } from '../shared/movementSchedule.ts';

export interface MovementArtworkQuery {
  appearance: Appearance;
  clip: ClipId;
  timeMs: number;
  distance: number;
  tangent: FloorPoint;
  version: RitualTimelineVersion;
  stage?: MovementStage;
  turn?: { from: Heading8; to: Heading8; progress: number };
  closeFacing?:Heading8;
  ready: MovementReadiness;
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
function rearFacingSit(sequence:readonly MovementGeometry[]) {
  const start=sequence.findIndex(frame=>frame.id==='02-stand-rear');
  if(start<0)throw new Error('Missing rear-facing sit endpoint.');
  const offset=sequence[start].startMs;
  return sequence.slice(start).map(frame=>({...frame,startMs:frame.startMs-offset,endMs:frame.endMs-offset}));
}
const REAR_SIT:Record<Appearance,readonly MovementGeometry[]>={man:rearFacingSit(MOVEMENT_CLIPS.sitDown),
  woman:rearFacingSit(VARIANT_MOVEMENT.woman.clips.sitDown),granny:rearFacingSit(VARIANT_MOVEMENT.granny.clips.sitDown)};

/** Authored directions use separate pixels. Legacy fallback retains its existing sources. */
export function sampleModernMovement(query:MovementArtworkQuery):ArtworkFrame|null {
  const {appearance,clip,timeMs,distance,tangent,version,stage,ready}=query;
  if(query.turn&&version>=3)return directionalNeutral(appearance,turnHeading(query.turn.from,query.turn.to,query.turn.progress),ready);
  if(clip==='walkRear'||clip==='walkFront'){
    const direction=normalizeDirection(tangent),heading=headingForDirection(direction);
    const progress=stage?.gaitPhase??(Number.isFinite(distance)?(Math.max(0,distance)/WALK_STRIDE_METERS)%1:0);
    if(stage?.stage==='close')return closingFrame(appearance,heading,stage,ready,query.closeFacing);
    if(version>=3&&stage?.stage==='start'&&stage.stageProgress<.3&&
      (appearance!=='man'||heading!=='rearRight'||stage.gaitPhase!==undefined)){
      const neutral=directionalNeutral(appearance,heading,ready);if(neutral)return neutral;
    }
    if(version>=3&&stage?.stage==='stop'&&stage.gaitPhase===undefined&&stage.stageProgress>.7&&heading!=='rearRight'){
      const neutral=directionalNeutral(appearance,heading,ready);if(neutral)return neutral;
    }
    if(appearance==='man'&&heading==='rearRight'&&ready.base&&stage?.gaitPhase===undefined){
      if(stage?.stage==='start')return sequenceFrame(MOVEMENT_CLIPS.startWalk,stage.stageProgress);
      if(stage?.stage==='stop')return sequenceFrame(MOVEMENT_CLIPS.stopWalk,stage.stageProgress);
    }
    const gait=arrivalGaitFrame(appearance,heading,progress,stage,ready);if(gait)return gait;
    // Retain the old angled fallback when its neighboring heading bank is unavailable.
    if(appearance!=='man'||!ready.base||direction.z>=-.25||direction.x<=.05)return null;
    if(stage?.stage==='start'&&stage.gaitPhase===undefined)return sequenceFrame(MOVEMENT_CLIPS.startWalk,stage.stageProgress);
    if(stage?.stage==='stop'&&stage.gaitPhase===undefined)return sequenceFrame(MOVEMENT_CLIPS.stopWalk,stage.stageProgress);
    return directionalGait('man','rearRight',progress,ready);
  }
  if(clip==='standFront')return directionalNeutral(appearance,'front',ready);
  if(appearance!=='man'){
    if(!ready.variants?.[appearance])return null;
    const variant=VARIANT_MOVEMENT[appearance];
    if(clip==='seated')return {cell:variant.idle.index,index:0,durationMs:400,sourceId:variant.idle.id,
      top:variant.idle.top,image:variant.asset.image,columns:variant.asset.columns,rows:variant.asset.rows,
      atlasCell:variant.idle.index,facing:'rear',heading:'rear',modernKind:'movement'};
    if(clip==='stand')return sequenceFrame(variant.clips.sitDown,0,variant.asset);
    if(clip!=='standUp'&&clip!=='sitDown')return null;
    const sequence=clip==='sitDown'&&ready.gaits?.[appearance]&&version>=3?REAR_SIT[appearance]:variant.clips[clip];
    return sequenceFrame(sequence,Number.isFinite(timeMs)?timeMs/ritualSchedule(version).clips[clip]:0,variant.asset);
  }
  if(clip==='seated'&&ready.base)return {cell:MODERN_IDLE.index,index:0,durationMs:400,sourceId:MODERN_IDLE.id,top:MODERN_IDLE.top,
    image:MOVEMENT_ARTWORK.image,columns:MOVEMENT_ARTWORK.columns,rows:MOVEMENT_ARTWORK.rows,
    atlasCell:MODERN_IDLE.index,facing:'rear',heading:'rear',modernKind:'movement'};
  if(clip==='stand'&&ready.base)return sequenceFrame(MOVEMENT_CLIPS.turn,0);
  if (!ready.base||(clip !== 'standUp' && clip !== 'sitDown')) return null;
  return sequenceFrame(clip==='sitDown'&&ready.expanded&&version>=3?REAR_SIT.man:MOVEMENT_CLIPS[clip],
    Number.isFinite(timeMs)?timeMs/ritualSchedule(version).clips[clip]:0);
}
