import type { Appearance } from './protocol.ts';
import type { Heading8 } from './locomotion.ts';
import type { ArtworkFrame, MovementReadiness, MovementStage } from './modernArtworkTypes.ts';
import { MOVEMENT_ARTWORK, MOVEMENT_CLIPS, WALK_ARTWORK, WALK_GEOMETRY } from './modernMovementGeometry.ts';
import { DIRECTIONAL_ARTWORK, DIRECTIONAL_WALKS } from './directionalMovementGeometry.ts';
import { EXPANDED_DIRECTION_ARTWORK, EXPANDED_DIRECTION_STANDS, EXPANDED_DIRECTION_WALKS } from './expandedDirectionGeometry.ts';
import { VARIANT_MOVEMENT } from './variantMovementGeometry.ts';
import { VARIANT_GAITS } from './variantGaitGeometry.ts';
import { STOP_CLOSES } from './stopCloseGeometry.ts';
import { ARRIVAL_CLOSE_MS } from '../shared/movementSchedule.ts';
import { turnHeading } from './headingTurns.ts';

type Atlas=Pick<ArtworkFrame,'image'|'columns'|'rows'>;
interface Glyph {cell:number;id:string;top:number;rootOffset?:{x:number;y:number}}
function frame(glyph:Glyph,atlas:Atlas,heading:Heading8,index=0):ArtworkFrame {
  return {cell:glyph.cell,index,sourceId:glyph.id,top:glyph.top,durationMs:100,
    rootOffset:glyph.rootOffset,image:atlas.image,columns:atlas.columns,rows:atlas.rows,
    atlasCell:glyph.cell,heading,facing:heading.startsWith('front')?'front':'rear',modernKind:'movement'};
}
const phaseIndex=(phase:number,count:number)=>Math.min(count-1,Math.floor((Number.isFinite(phase)?((phase%1)+1)%1:0)*count));

/** Each physical heading resolves to its own pixels; no authored view is mirrored. */
export function directionalNeutral(appearance:Appearance,heading:Heading8,ready:MovementReadiness):ArtworkFrame|null {
  if(appearance!=='man'){
    if(ready.gaits?.[appearance])return frame(VARIANT_GAITS[appearance].stands[heading],VARIANT_GAITS[appearance].asset,heading);
    if(heading==='rearRight'&&ready.variants?.[appearance]){
      const bank=VARIANT_MOVEMENT[appearance],neutral=bank.clips.sitDown[0];
      return frame({cell:neutral.index,id:neutral.id,top:neutral.top},bank.asset,heading);
    }
    return null;
  }
  if(heading==='rearRight'){
    if(!ready.base)return null;
    const neutral=MOVEMENT_CLIPS.turn[0];
    return frame({cell:neutral.index,id:neutral.id,top:neutral.top},MOVEMENT_ARTWORK,heading);
  }
  return ready.expanded?frame(EXPANDED_DIRECTION_STANDS[heading],EXPANDED_DIRECTION_ARTWORK,heading):null;
}

export function directionalGait(appearance:Appearance,heading:Heading8,phase:number,ready:MovementReadiness):ArtworkFrame|null {
  if(appearance!=='man'){
    if(!ready.gaits?.[appearance])return null;
    const bank=VARIANT_GAITS[appearance],poses=bank.walks[heading],index=phaseIndex(phase,poses.length);
    return frame(poses[index],bank.asset,heading,index);
  }
  if(heading==='rearRight'){
    if(!ready.base)return null;
    const index=phaseIndex(phase,WALK_GEOMETRY.length),pose=WALK_GEOMETRY[index];
    return frame({cell:index,id:pose.id,top:pose.top},WALK_ARTWORK,heading,index);
  }
  if(heading==='left'||heading==='right'){
    if(!ready.lateral)return null;
    const poses=DIRECTIONAL_WALKS[heading],index=phaseIndex(phase,poses.length);
    return frame(poses[index],DIRECTIONAL_ARTWORK,heading,index);
  }
  if(!ready.expanded)return null;
  const poses=EXPANDED_DIRECTION_WALKS[heading],index=phaseIndex(phase,poses.length);
  return frame(poses[index],EXPANDED_DIRECTION_ARTWORK,heading,index);
}

/** Bring the last support into the final neutral footprint before the root stops moving. */
export function arrivalGaitFrame(appearance:Appearance,heading:Heading8,phase:number,stage:MovementStage|undefined,
  ready:MovementReadiness):ArtworkFrame|null {
  let gait=directionalGait(appearance,heading,phase,ready);
  if(gait&&appearance==='man'&&stage?.gaitPhase!==undefined&&ready.closes?.man){
    const count=heading==='rearRight'?12:8,index=phaseIndex(phase,count);
    const support=index===count/4?'right':index===count*3/4?'left':null;
    if(support){
      const passing=STOP_CLOSES.man.headings[heading][support].passing;
      if(passing)gait={...frame(passing,STOP_CLOSES.man.asset,heading,index),rootOffset:undefined};
    }
  }
  if(!gait||stage?.stage!=='stop'||!stage.supportFoot||!ready.closes?.[appearance])return gait;
  const offset=STOP_CLOSES[appearance].headings[heading][stage.supportFoot].entryOffset;
  const progress=Math.max(0,Math.min(1,stage.stageProgress));
  const weight=.5-.5*Math.cos(Math.PI*progress);
  return {...gait,rootOffset:{x:offset.x*weight,y:offset.y*weight}};
}

/** The public420ms interval is independent of texture timing and optional-image failures. */
export function closingFrame(appearance:Appearance,heading:Heading8,stage:MovementStage,
  ready:MovementReadiness,faceAfter?:Heading8):ArtworkFrame|null {
  const neutral=directionalNeutral(appearance,heading,ready);
  if(!ready.closes?.[appearance]||!stage.supportFoot)return neutral;
  const sequence=STOP_CLOSES[appearance].headings[heading][stage.supportFoot];
  const passing=sequence.passing?frame(sequence.passing,STOP_CLOSES[appearance].asset,heading)
    :directionalGait(appearance,heading,stage.supportFoot==='right'?.25:.75,ready);
  if(!passing||!neutral)return neutral;
  const time=Math.max(0,Math.min(1,stage.stageProgress))*ARRIVAL_CLOSE_MS;
  if(time<60)return {...passing,rootOffset:sequence.entryOffset};
  if(time<170)return frame(sequence.frames[0],STOP_CLOSES[appearance].asset,heading);
  if(time<300)return frame(sequence.frames[1],STOP_CLOSES[appearance].asset,heading);
  return faceAfter?directionalNeutral(appearance,turnHeading(heading,faceAfter,(time-300)/120),ready)??neutral:neutral;
}
