import { characterManifest, sampleScheduledClip, type ClipId } from './animationManifest.ts';
import { logicalAltar, logicalSeat, ritualRoute, sampleRoute } from './motion.ts';
import { headingForDirection, normalizeDirection } from './locomotion.ts';
import { entryAnimationVersion, sampleEntry, sampleSharedRitual } from './ritual.ts';
import { incenseOwnership, isIncenseClip, sampleIncenseClip, sampleStaticIncense } from './incenseAnimation.ts';
import { sampleModernMovement, type MovementArtworkQuery } from './modernMovement.ts';
import { ritualSchedule } from '../shared/ritualSchedule.ts';
import { sampleModernOffering } from './offeringAnimation.ts';
import type { ArtworkFrame } from './modernArtworkTypes.ts';
import type { Appearance, RoomMember } from './protocol.ts';

export interface ArtworkAvailability {
  movement:boolean;
  directions:boolean;
  expandedDirections?:boolean;
  variantMovement?:Record<'woman'|'granny',boolean>;
  incense:Record<Appearance,boolean>;
  rituals?:Record<Appearance,boolean>;
}
export const FALLBACK_ARTWORK:ArtworkAvailability = {
  movement:false, directions:false, incense:{man:false,woman:false,granny:false},
};

/** Pure reconstruction from a shared timestamp; the renderer never advances an action itself. */
export function sampleCharacter(person:RoomMember, now:number, reduced=false, assets=FALLBACK_ARTWORK) {
  const manifest=characterManifest(person.appearance);
  const entry=sampleEntry(person.joinedAt,now,person.seat,person.entryVersion);
  const entering=entry.phase!=='idle';
  const pose=!entering&&person.action?sampleSharedRitual(person.action,now):null;
  const active=entering||Boolean(pose&&pose.phase!=='complete');
  const tangent=normalizeDirection(pose?.tangent??entry.tangent);
  const heading=headingForDirection(tangent);
  const locomotion=pose?.locomotion??('locomotion' in entry?entry.locomotion:undefined);
  let point=pose?.point??entry.point;
  let clip:ClipId=pose?.clip??entry.clip;
  const walking=clip==='walkRear'||clip==='walkFront';
  if(walking)clip=tangent.z>0.08?'walkFront':tangent.z<-.08?'walkRear':clip;
  const facing=manifest.clips[clip].facing;
  if(reduced){
    if(entering||pose?.phase==='returning')point=logicalSeat(person.seat);
    else if(pose&&['moving','settling','performing','rising'].includes(pose.phase))point=logicalAltar(person.action!.slot,person.action!.kind==='bow');
    if(walking)clip=facing==='front'?'standFront':'stand';
    if(pose?.phase==='performing'&&person.action?.kind==='bow')clip='kneeling';
  }
  const version=entering?entryAnimationVersion(person.entryVersion):person.action?.timelineVersion??1;
  const time=reduced?0:pose?.clipTime??entry.clipTime;
  const distance=pose?.distance??entry.distance;
  let turn:MovementArtworkQuery['turn'];
  if(!reduced&&person.appearance==='man'&&assets.expandedDirections&&pose&&person.action&&version>=3){
    const action=person.action,seat=action.movement?.seat??person.seat;
    const schedule=ritualSchedule(version);
    if(pose.phase==='standing'&&pose.clipTime>=schedule.clips.standUp-380){
      const route=ritualRoute(seat,action.slot,false,action.kind==='bow');
      turn={from:'rear',to:headingForDirection(sampleRoute(route,0).tangent),
        progress:(pose.clipTime-schedule.clips.standUp+380)/380};
    }else if(pose.phase==='rising'){
      const duration=action.kind==='bow'?schedule.clips.rise:schedule.returnTurnMs;
      const window=action.kind==='bow'?Math.min(260,duration):duration;
      if(pose.clipTime>=duration-window){
        const route=ritualRoute(seat,action.slot,true,action.kind==='bow');
        turn={from:'rearRight',to:headingForDirection(sampleRoute(route,0).tangent),
          progress:(pose.clipTime-duration+window)/window};
      }
    }
  }
  let authored:ArtworkFrame|null=null;
  if(person.action?.movement?.version===3&&assets.rituals?.[person.appearance]&&assets.incense[person.appearance]&&person.action.offering&&person.action.offering!=='incense'){
    authored=sampleModernOffering(person.appearance,person.action.offering,clip,time,version,reduced);
  }
  if(!authored&&assets.incense[person.appearance]&&person.action&&
    (person.action.timelineVersion===2||person.action.timelineVersion===4)&&
    (person.action.offering??'incense')==='incense'&&isIncenseClip(clip)){
    authored=reduced?sampleStaticIncense(incenseOwnership(person.action,now),person.appearance)
      :sampleIncenseClip(clip,time,person.action.timelineVersion,person.appearance);
  }else if(!authored&&
    (person.action?.timelineVersion===2||person.action?.timelineVersion===4||person.action?.movement?.version===3||!pose||pose.phase==='complete')){
    authored=sampleModernMovement({appearance:person.appearance,clip,timeMs:time,distance,tangent,version,stage:locomotion,turn,
      ready:{base:assets.movement,lateral:assets.directions,expanded:assets.expandedDirections,variants:assets.variantMovement}});
  }
  const frame=authored??sampleScheduledClip(manifest,clip,time,!reduced&&walking?distance:undefined,version);
  const flip=!authored&&walking&&(facing==='rear'?tangent.x<-.08:tangent.x>.08);
  const canvasWidth=authored?384:manifest.frameWidth,canvasHeight=authored?512:manifest.frameHeight;
  const held=Boolean(pose?.propInHand&&frame.hand&&frame.holdsOffering!==false&&(frame.modernKind!=='incense'||frame.holdsIncense));
  return {frame,point,clip,flip,heading:authored?.heading??heading,locomotion,entering,active,held,canvasWidth,canvasHeight,
    phase:entering?entry.phase:pose?.phase??'idle',
    completedBows:pose?.completedBows??(person.completed?.kind==='bow'?3:0)};
}
