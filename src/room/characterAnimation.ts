import { characterManifest, sampleScheduledClip, type ClipId } from './animationManifest.ts';
import { logicalAltar, logicalSeat } from './motion.ts';
import { headingForDirection, normalizeDirection } from './locomotion.ts';
import { sampleEntry, sampleSharedRitual } from './ritual.ts';
import { incenseOwnership, isIncenseClip, sampleIncenseClip, sampleStaticIncense } from './incenseAnimation.ts';
import { sampleModernMovement } from './modernMovement.ts';
import { sampleModernOffering } from './offeringAnimation.ts';
import type { ArtworkFrame } from './modernArtworkTypes.ts';
import type { Appearance, RoomMember } from './protocol.ts';

export interface ArtworkAvailability {
  movement:boolean;
  directions:boolean;
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
  const version=entering?1:person.action?.timelineVersion??1;
  const time=reduced?0:pose?.clipTime??entry.clipTime;
  const distance=pose?.distance??entry.distance;
  let authored:ArtworkFrame|null=null;
  if(person.action?.movement?.version===3&&assets.rituals?.[person.appearance]&&assets.incense[person.appearance]&&person.action.offering&&person.action.offering!=='incense'){
    authored=sampleModernOffering(person.appearance,person.action.offering,clip,time,version,reduced);
  }
  if(!authored&&assets.incense[person.appearance]&&person.action?.timelineVersion===2&&isIncenseClip(clip)){
    authored=reduced?sampleStaticIncense(incenseOwnership(person.action,now),person.appearance)
      :sampleIncenseClip(clip,time,2,person.appearance);
  }else if(!authored&&person.appearance==='man'&&assets.movement&&
    (person.action?.timelineVersion===2||person.action?.movement?.version===3||!pose||pose.phase==='complete')){
    authored=sampleModernMovement(clip,time,distance,tangent,version,locomotion,assets.directions);
  }
  const frame=authored??sampleScheduledClip(manifest,clip,time,!reduced&&walking?distance:undefined,version);
  const flip=!authored&&walking&&(facing==='rear'?tangent.x<-.08:tangent.x>.08);
  const canvasWidth=authored?384:manifest.frameWidth,canvasHeight=authored?512:manifest.frameHeight;
  const held=Boolean(pose?.propInHand&&frame.hand&&frame.holdsOffering!==false&&(frame.modernKind!=='incense'||frame.holdsIncense));
  return {frame,point,clip,flip,heading,locomotion,entering,active,held,canvasWidth,canvasHeight,
    phase:entering?entry.phase:pose?.phase??'idle',
    completedBows:pose?.completedBows??(person.completed?.kind==='bow'?3:0)};
}
