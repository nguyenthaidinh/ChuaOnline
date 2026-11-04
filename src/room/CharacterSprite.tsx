import { useEffect,useRef } from 'react';
import { characterManifest } from './animationManifest';
import { actorMetrics,projectFloor,roomAssets } from './layout';
import { subscribeSceneAnimation } from './sceneAnimation';
import type { RoomMember } from './protocol';
import type { SceneLayoutId } from '../config/sceneLayout';
import { sampleCharacter, FALLBACK_ARTWORK, type ArtworkAvailability } from './characterAnimation';
import { INCENSE_PROP } from './incenseGeometry';
import { frameBackground, handClipPath } from './frameStyles';
import { ritualPropGeometry } from './ritualContacts';
export function CharacterSprite({person,self,layout,offset,reduced,artwork=FALLBACK_ARTWORK}:{person:RoomMember;self:boolean;layout:SceneLayoutId;offset:number;reduced:boolean;artwork?:ArtworkAvailability}) {
 const root=useRef<HTMLButtonElement>(null),art=useRef<HTMLDivElement>(null),prop=useRef<HTMLImageElement>(null),label=useRef<HTMLSpanElement>(null),shadow=useRef<HTMLDivElement>(null);
 const handLayer=useRef<HTMLDivElement>(null);
 const state=useRef({person,layout,offset,reduced,artwork});state.current={person,layout,offset,reduced,artwork};
 useEffect(()=>subscribeSceneAnimation(localNow=>{
  const {person,layout,offset,reduced,artwork}=state.current;
  if(!root.current||!art.current||!prop.current||!label.current||!shadow.current||!handLayer.current) return false;
  const manifest=characterManifest(person.appearance);
  const sample=sampleCharacter(person,localNow+offset,reduced,artwork);
  const {frame,point,flip,clip,held,canvasWidth,canvasHeight}=sample;
  const projected=projectFloor(point,layout),size=actorMetrics(point,layout);
  Object.assign(root.current.style,{left:`${projected.x}%`,top:`${projected.y}%`,height:`${size.canvasHeight}%`,aspectRatio:`${manifest.frameWidth}/${manifest.frameHeight}`,transform:`translate(-${manifest.groundPivot.x/manifest.frameWidth*100}%,-${manifest.groundPivot.y/manifest.frameHeight*100}%)`,zIndex:String(Math.round(projected.y*100))});
  const rootOffset=frame.rootOffset??{x:0,y:0};
  const imageStyle=frameBackground(frame,flip,undefined,canvasWidth,canvasHeight);
  Object.assign(art.current.style,imageStyle);
  root.current.dataset.phase=sample.phase;root.current.dataset.clip=clip;root.current.dataset.frame=String(frame.cell);root.current.dataset.facing=frame.facing;
  root.current.dataset.heading=sample.heading;root.current.dataset.movementStage=sample.locomotion?.stage??'';
  root.current.dataset.movementVersion=String(person.action?.movement?.version??person.entryVersion??2);
  root.current.dataset.actionId=person.action?.id??'';
  root.current.dataset.timelineVersion=String(person.action?.timelineVersion??1);
  root.current.dataset.pose=frame.pose??'';
  root.current.dataset.source=frame.sourceId??'';root.current.dataset.artwork=frame.modernKind??'legacy';
  root.current.dataset.bows=String(sample.completedBows);
  label.current.style.top=`${(frame.top+rootOffset.y)/canvasHeight*100}%`;label.current.dataset.active=String(self);
  shadow.current.style.left=`${manifest.groundPivot.x/manifest.frameWidth*100}%`;shadow.current.style.top=`${manifest.groundPivot.y/manifest.frameHeight*100}%`;
  const offering=person.action?.offering??'incense';
  prop.current.style.display=held?'block':'none';
  root.current.dataset.held=String(held);
  handLayer.current.style.display=held&&frame.handMask?'block':'none';
  if(held&&frame.handMask)Object.assign(handLayer.current.style,{...imageStyle,clipPath:handClipPath(frame.handMask,canvasWidth,canvasHeight)});
  if(held&&frame.hand) {
   const geometry=frame.propGeometry??(frame.modernKind==='incense'?{height:INCENSE_PROP.height,gripFraction:INCENSE_PROP.gripFraction,rotationDeg:0}:ritualPropGeometry(person.appearance,offering));
   const grip=geometry.gripFraction*100;
   Object.assign(prop.current.style,{height:`${geometry.height/canvasHeight*100}%`,rotate:'none',transformOrigin:`50% ${grip}%`,transform:`translate(-50%,-${grip}%) rotate(${geometry.rotationDeg}deg)`,zIndex:'2'});
   prop.current.src=roomAssets.effect(offering==='bell'?'mallet':offering);
   prop.current.style.left=`${(flip?canvasWidth-frame.hand.x:frame.hand.x)/canvasWidth*100}%`;prop.current.style.top=`${frame.hand.y/canvasHeight*100}%`;prop.current.dataset.kind=offering;
  }
  return sample.active;
 }),[person.action?.id,person.joinedAt,person.completed?.at,person.appearance,self,layout,reduced,artwork]);
 return <button ref={root} className={`room-actor ${self?'is-self':''}`} aria-label={`${person.name}${self?' · Bạn':''}`} title={person.name} data-person-id={person.id}>
  <div ref={shadow} className="actor-shadow"/><div ref={art} className="actor-sprite"/><img ref={prop} className="held-prop" alt=""/><div ref={handLayer} className="actor-sprite actor-hand-occlusion"/>
  <span ref={label} className="actor-label">{person.name}{self&&<i> · Bạn</i>}</span>
 </button>;
}
