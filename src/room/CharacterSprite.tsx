import { useEffect,useRef } from 'react';
import { characterManifest,sampleScheduledClip,type ClipId } from './animationManifest';
import { actorMetrics,projectFloor,roomAssets } from './layout';
import { logicalSeat,logicalAltar } from './motion';
import { sampleEntry,sampleSharedRitual } from './ritual';
import { subscribeSceneAnimation } from './sceneAnimation';
import type { RoomMember } from './protocol';
import type { SceneLayoutId } from '../config/sceneLayout';
import { isIncenseClip, sampleIncenseClip, sampleStaticIncense, incenseOwnership } from './incenseAnimation';
import { sampleModernMovement } from './modernMovement';
import { INCENSE_PROP } from './incenseGeometry';
import { frameBackground, handClipPath } from './frameStyles';
import type {ArtworkFrame} from './modernArtworkTypes';
export function CharacterSprite({person,self,layout,offset,reduced,modernReady=false}:{person:RoomMember;self:boolean;layout:SceneLayoutId;offset:number;reduced:boolean;modernReady?:boolean}) {
 const root=useRef<HTMLButtonElement>(null),art=useRef<HTMLDivElement>(null),prop=useRef<HTMLImageElement>(null),label=useRef<HTMLSpanElement>(null),shadow=useRef<HTMLDivElement>(null);
 const handLayer=useRef<HTMLDivElement>(null);
 const state=useRef({person,layout,offset,reduced,modernReady});state.current={person,layout,offset,reduced,modernReady};
 useEffect(()=>subscribeSceneAnimation(localNow=>{
  const {person,layout,offset,reduced,modernReady}=state.current;
  if(!root.current||!art.current||!prop.current||!label.current||!shadow.current||!handLayer.current) return false;
  const now=localNow+offset,manifest=characterManifest(person.appearance),entry=sampleEntry(person.joinedAt,now,person.seat);
  const entering=entry.phase!=='idle',pose=!entering&&person.action?sampleSharedRitual(person.action,now):null;
  const active=entering||Boolean(pose&&pose.phase!=='complete');
  let point=pose?.point??entry.point;
  let clip:ClipId=pose?.clip??entry.clip;
  const tangent=pose?.tangent??entry.tangent;
  const walking=clip==='walkRear'||clip==='walkFront';
  if(walking) clip=tangent.z>0.015?'walkFront':tangent.z<-.015?'walkRear':clip;
  const facing=manifest.clips[clip].facing;
  const flip=walking&&(facing==='rear'?tangent.x<-.03:tangent.x>.03);
  if(reduced) {
   if(entering||pose?.phase==='returning')point=logicalSeat(person.seat);
   else if(pose&&['moving','settling','performing','rising'].includes(pose.phase))point=logicalAltar(person.action!.slot,person.action!.kind==='bow');
   if(walking)clip=facing==='front'?'standFront':'stand';
   if(pose?.phase==='performing'&&person.action?.kind==='bow')clip='kneeling';
  }
  const modern=modernReady&&person.appearance==='man';
  const animationVersion=entering?1:person.action?.timelineVersion??1;
  const time=reduced?0:pose?.clipTime??entry.clipTime;
  const modernMovement=person.action?.timelineVersion===2||!pose||pose.phase==='complete';
  let modernFrame:ArtworkFrame|null=null;
  if(modern) {
   if(person.action?.timelineVersion===2&&isIncenseClip(clip)) {
    modernFrame=reduced?sampleStaticIncense(incenseOwnership(person.action,now)):sampleIncenseClip(clip,time,2);
   } else if(modernMovement) {
    modernFrame=sampleModernMovement(clip,time,pose?.distance??entry.distance,tangent,animationVersion);
   }
  }
  const frame=modernFrame??sampleScheduledClip(manifest,clip,time,!reduced&&walking?(pose?.distance??entry.distance):undefined,animationVersion);
  const projected=projectFloor(point,layout),size=actorMetrics(point,layout);
  Object.assign(root.current.style,{left:`${projected.x}%`,top:`${projected.y}%`,height:`${size.canvasHeight}%`,aspectRatio:`${manifest.frameWidth}/${manifest.frameHeight}`,transform:`translate(-${manifest.groundPivot.x/manifest.frameWidth*100}%,-${manifest.groundPivot.y/manifest.frameHeight*100}%)`,zIndex:String(Math.round(projected.y*100))});
  const rootOffset=frame.rootOffset??{x:0,y:0};
  const imageStyle=frameBackground(frame,flip);
  Object.assign(art.current.style,imageStyle);
  root.current.dataset.phase=entering?entry.phase:pose?.phase??'idle';root.current.dataset.clip=clip;root.current.dataset.frame=String(frame.cell);root.current.dataset.facing=frame.facing;
  root.current.dataset.actionId=person.action?.id??'';
  root.current.dataset.timelineVersion=String(person.action?.timelineVersion??1);
  root.current.dataset.pose=frame.pose??'';
  root.current.dataset.source=frame.sourceId??'';root.current.dataset.artwork=frame.modernKind??'legacy';
  root.current.dataset.bows=String(pose?.completedBows??(person.completed?.kind==='bow'?3:0));
  label.current.style.top=`${(frame.top+rootOffset.y)/manifest.frameHeight*100}%`;label.current.dataset.active=String(self||active);
  shadow.current.style.left=`${manifest.groundPivot.x/manifest.frameWidth*100}%`;shadow.current.style.top=`${manifest.groundPivot.y/manifest.frameHeight*100}%`;
  const offering=person.action?.offering??'incense';
  const held=Boolean(pose?.propInHand&&frame.hand&&(frame.modernKind!=='incense'||frame.holdsIncense));
  prop.current.style.display=held?'block':'none';
  root.current.dataset.held=String(held);
  handLayer.current.style.display=held&&frame.handMask?'block':'none';
  if(held&&frame.handMask)Object.assign(handLayer.current.style,{...imageStyle,clipPath:handClipPath(frame.handMask)});
  prop.current.style.height=frame.modernKind==='incense'?`${INCENSE_PROP.height/512*100}%`:'';
  prop.current.style.transform=frame.modernKind==='incense'?`translate(-50%,-${INCENSE_PROP.gripFraction*100}%)`:'';
  if(held&&frame.hand) {
   prop.current.style.zIndex=frame.modernKind==='incense'?'2':frame.propLayer==='behind-hand'?'0':'2';
   prop.current.src=roomAssets.effect(offering==='bell'?'mallet':offering);
   prop.current.style.left=`${(flip?manifest.frameWidth-frame.hand.x:frame.hand.x)/manifest.frameWidth*100}%`;prop.current.style.top=`${frame.hand.y/manifest.frameHeight*100}%`;prop.current.dataset.kind=offering;
  }
  return active;
 }),[person.action?.id,person.joinedAt,person.completed?.at,person.appearance,self,layout,reduced,modernReady]);
 return <button ref={root} className={`room-actor ${self?'is-self':''}`} aria-label={`${person.name}${self?' · Bạn':''}`} title={person.name} data-person-id={person.id}>
  <div ref={shadow} className="actor-shadow"/><div ref={art} className="actor-sprite"/><img ref={prop} className="held-prop" alt=""/><div ref={handLayer} className="actor-sprite actor-hand-occlusion"/>
  <span ref={label} className="actor-label">{person.name}{self&&<i> · Bạn</i>}</span>
 </button>;
}
