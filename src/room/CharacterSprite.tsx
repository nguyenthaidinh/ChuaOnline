import { updateStyles, updateData } from './domUpdates';
import { useEffect,useRef,useState } from 'react';
import { characterManifest } from './animationManifest';
import { actorMetrics,projectFloor,roomAssets } from './layout';
import { subscribeSceneAnimation } from './sceneAnimation';
import type { RoomMember } from './protocol';
import type { SceneLayoutId } from '../config/sceneLayout';
import { sampleCharacter, FALLBACK_ARTWORK, type ArtworkAvailability } from './characterAnimation';
import { INCENSE_PROP } from './incenseGeometry';
import { frameTransform, handClipPath } from './frameStyles';
import { ritualPropGeometry } from './ritualContacts';
import { decodedImage } from './imageLoader';
import { SpritePainter } from './spritePainter';
export function CharacterSprite({person,self,layout,offset,reduced,artwork=FALLBACK_ARTWORK}:{person:RoomMember;self:boolean;layout:SceneLayoutId;offset:number;reduced:boolean;artwork?:ArtworkAvailability}) {
 const root=useRef<HTMLButtonElement>(null),art=useRef<HTMLCanvasElement>(null),prop=useRef<HTMLImageElement>(null),label=useRef<HTMLSpanElement>(null),shadow=useRef<HTMLDivElement>(null);
 const handLayer=useRef<HTMLCanvasElement>(null);
 const [painter]=useState(()=>new SpritePainter());
 const [handPainter]=useState(()=>new SpritePainter());
 const state=useRef({person,layout,offset,reduced,artwork});state.current={person,layout,offset,reduced,artwork};
 useEffect(()=>subscribeSceneAnimation(localNow=>{
  const {person,layout,offset,reduced,artwork}=state.current;
  if(!root.current||!art.current||!prop.current||!label.current||!shadow.current||!handLayer.current) return false;
  const manifest=characterManifest(person.appearance);
  const sample=sampleCharacter(person,localNow+offset,reduced,artwork);
  const {frame,point,flip,clip,held,canvasWidth,canvasHeight}=sample;
  const projected=projectFloor(point,layout),size=actorMetrics(point,layout);
  updateStyles(root.current,{left:`${projected.x}%`,top:`${projected.y}%`,height:`${size.canvasHeight}%`,aspectRatio:`${manifest.frameWidth}/${manifest.frameHeight}`,transform:`translate(-${manifest.groundPivot.x/manifest.frameWidth*100}%,-${manifest.groundPivot.y/manifest.frameHeight*100}%)`,zIndex:String(Math.round(projected.y*100))});
  const rootOffset=frame.rootOffset??{x:0,y:0};
  const source=decodedImage(roomAssets.frameImage(frame.image));
  const transform=frameTransform(frame.rootOffset,flip,canvasWidth,canvasHeight);
  if(!painter.paint(art.current,source,frame,canvasWidth,canvasHeight))return true;
  updateStyles(art.current,{transform:transform});
  updateData(art.current,{
   image:frame.image,
   sourceWidth:String(source && ('naturalWidth' in source ? source.naturalWidth : source.width)),
   sourceHeight:String(source && ('naturalHeight' in source ? source.naturalHeight : source.height)),
  });
  updateData(root.current, {
   phase:sample.phase, clip, frame:String(frame.cell), facing:frame.facing,
   heading:sample.heading, movementStage:sample.locomotion?.stage??'',
   supportFoot:sample.locomotion?.supportFoot??'',
   movementVersion:String(person.action?.movement?.version??person.entryVersion??2),
   actionId:person.action?.id??'', timelineVersion:String(person.action?.timelineVersion??1),
   pose:frame.pose??'', source:frame.sourceId??'', artwork:frame.modernKind??'legacy',
   bows:String(sample.completedBows), held:String(held),
  });
  updateStyles(label.current,{top:`${(frame.top+rootOffset.y)/canvasHeight*100}%`});
  updateStyles(shadow.current,{left:`${manifest.groundPivot.x/manifest.frameWidth*100}%`});updateStyles(shadow.current,{top:`${manifest.groundPivot.y/manifest.frameHeight*100}%`});
  const offering=person.action?.offering??'incense';
  updateStyles(prop.current,{display:held?'block':'none'});
  updateStyles(handLayer.current,{display:held&&frame.handMask?'block':'none'});
  if(held&&frame.handMask){
   handPainter.paint(handLayer.current,source,frame,canvasWidth,canvasHeight);
   updateStyles(handLayer.current,{transform:transform});
   updateStyles(handLayer.current,{clipPath:handClipPath(frame.handMask,canvasWidth,canvasHeight)});
  }
  if(held&&frame.hand) {
   const geometry=frame.propGeometry??(frame.modernKind==='incense'?{height:INCENSE_PROP.height,gripFraction:INCENSE_PROP.gripFraction,rotationDeg:0}:ritualPropGeometry(person.appearance,offering));
   const grip=geometry.gripFraction*100;
   updateStyles(prop.current,{height:`${geometry.height/canvasHeight*100}%`,rotate:'none',transformOrigin:`50% ${grip}%`,transform:`translate(-50%,-${grip}%) rotate(${geometry.rotationDeg}deg)`,zIndex:'2'});
   const propUrl=roomAssets.effect(offering==='bell'?'mallet':offering);
   if(prop.current.getAttribute('src')!==propUrl)prop.current.src=propUrl;
   updateStyles(prop.current,{left:`${(flip?canvasWidth-frame.hand.x:frame.hand.x)/canvasWidth*100}%`});updateStyles(prop.current,{top:`${frame.hand.y/canvasHeight*100}%`});updateData(prop.current,{kind:offering});
  }
  return sample.active;
 }),[person.action?.id,person.joinedAt,person.completed?.at,person.appearance,self,layout,reduced,artwork]);
 return <button ref={root} className={`room-actor ${self?'is-self':''}`} aria-label={`${person.name}${self?' · Bạn':''}`} title={person.name} data-person-id={person.id}>
  <div ref={shadow} className="actor-shadow"/><canvas ref={art} className="actor-sprite" aria-hidden="true"/><img ref={prop} className="held-prop" alt=""/><canvas ref={handLayer} className="actor-sprite actor-hand-occlusion" aria-hidden="true"/>
  <span ref={label} className="actor-label">{person.name}{self&&<i> · Bạn</i>}</span>
 </button>;
}
