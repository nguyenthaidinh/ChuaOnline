import type {ArtworkAvailability} from './characterAnimation';
import {useEffect,useRef} from 'react';
import type {Appearance,RoomSnapshot,PlacedOffering,OfferingKind,SharedAction} from './protocol';
import type {SceneLayoutId} from '../config/sceneLayout';
import {roomAssets,stationAnchor,petalEmissionAnchor,altarPoint,incenseSourceAnchor,incenseWorldSize,offeringWorldHeight} from './layout';
import {interactionTime} from './ritual';
import {subscribeSceneAnimation} from './sceneAnimation';
import {offeringCandidates,visibleOfferingIds,nextOfferingDraw} from './placedOfferings';
import {incenseAcquisitionTime} from './incenseAnimation';
import {IncenseSourceCup} from './IncenseSourceCup';
import {INCENSE_PROP} from './incenseGeometry';
import {artworkVersionForMovement} from '../shared/movementSchedule';
function Station({slot,kind,action,layout,offset,reduced,modernReady,appearance,artworkVersion}:{slot:number;kind:OfferingKind;action?:SharedAction;layout:SceneLayoutId;offset:number;reduced:boolean;modernReady:boolean;appearance:Appearance;artworkVersion?:PlacedOffering['artworkVersion']}) {
 const bell=useRef<HTMLImageElement>(null);
 const source=useRef<HTMLImageElement>(null);
 const anchor=stationAnchor(slot,layout,kind,appearance,artworkVersion),floor=altarPoint(slot,layout);
 const pivot=kind==='lotus'?0.06:kind==='bell'?0.17:0.10;
 const height=(anchor.floorY-anchor.y)/(0.98-pivot);
 const image=kind==='lotus'?'flower-station':kind==='bell'?'bell-station':'urn';
 const sourcePoint=incenseSourceAnchor(slot,layout),sourceSize=incenseWorldSize(slot,layout);
 const style={left:`${anchor.x+(kind==='incense'?sourceSize.urnOffsetX:0)}%`,top:`${anchor.y}%`,height:`${height}%`,transform:`translate(-50%,-${pivot*100}%)`};
 useEffect(()=>{
  if(!source.current)return;
  source.current.style.display='none';
  if(!modernReady||kind!=='incense'||!action||(action.timelineVersion!==2&&action.timelineVersion!==4))return;
  const pickup=incenseAcquisitionTime(action);
  return subscribeSceneAnimation(now=>{if(!source.current)return false;const time=now+offset;
   source.current.style.display=time>=action.startedAt&&time<pickup?'block':'none';
   source.current.dataset.available=String(time>=action.startedAt&&time<pickup);return time<pickup;
  });
 },[action?.id,modernReady,kind,offset]);
 useEffect(()=>{
  if(kind!=='bell'||!action||!bell.current)return;
  const at=interactionTime(action)!;
  return subscribeSceneAnimation(now=>{const age=now+offset-at;if(!bell.current)return false;
   bell.current.style.rotate=!reduced&&age>=0&&age<650?`${Math.sin(age/33)*2*(1-age/650)}deg`:'0deg';
   bell.current.dataset.struck=String(age>=0);return age<650;
  });
 },[kind,action?.id,layout,offset,reduced]);
 return <><img className="offering-station station-back" src={roomAssets.effect(image)} alt="" style={{...style,zIndex:Math.round(floor.y*100)-2,...(kind==='bell'?{clipPath:'inset(27% 0 0 0)'}:{})}}/>
 <img ref={source} className="incense-source" src={roomAssets.effect('incense')} data-source-slot={slot} alt="" style={{left:`${sourcePoint.x}%`,top:`${sourcePoint.y}%`,height:`${sourceSize.height}%`,zIndex:Math.round(floor.y*100)+3}}/>
 {modernReady&&kind==='incense'&&<IncenseSourceCup style={{left:`${sourcePoint.x}%`,top:`${sourcePoint.y-sourceSize.insertion}%`,width:`${sourceSize.cupWidth}%`,height:`${sourceSize.cupHeight}%`,zIndex:Math.round(floor.y*100)+4}}/>}
 <img ref={kind==='bell'?bell:undefined} className={`offering-station station-front station-${kind}`} src={roomAssets.effect(image)} alt="" style={{...style,zIndex:Math.round(floor.y*100)+4,clipPath:kind==='bell'?'inset(0 0 73% 0)':kind==='lotus'?'inset(6% 0 0 0)':INCENSE_PROP.urnFrontClip}}/>
 </>;
}
function ResultVisual({item,candidates,layout,offset,reduced,extensionReady}:{item:PlacedOffering;candidates:PlacedOffering[];layout:SceneLayoutId;offset:number;reduced:boolean;extensionReady:boolean}) {
 const root=useRef<HTMLDivElement>(null),wisps=useRef<HTMLDivElement>(null),petals=useRef<HTMLDivElement>(null);
 const sceneHeight=useRef(500);
 useEffect(()=>{
  const scene=root.current?.parentElement;
  if(!scene)return;
  sceneHeight.current=scene.getBoundingClientRect().height;
  const observer=new ResizeObserver(entries=>{sceneHeight.current=entries[0].contentRect.height;});
  observer.observe(scene);
  return()=>observer.disconnect();
 },[]);
 const current=useRef({item,candidates,layout,offset,reduced,extensionReady});current.current={item,candidates,layout,offset,reduced,extensionReady};
 useEffect(()=>subscribeSceneAnimation(localNow=>{
  const{item,candidates,layout,offset,reduced,extensionReady}=current.current;
  if(!root.current||!wisps.current||!petals.current)return false;
  const now=localNow+offset,age=now-item.placedAt;
  const anchor=item.kind==='petal'&&item.artworkVersion===4
    ?petalEmissionAnchor(item.slot,layout,item.appearance??'man',extensionReady)
    :stationAnchor(item.slot,layout,item.kind,item.appearance,item.artworkVersion);
  const floor=altarPoint(item.slot,layout);
  const visible=visibleOfferingIds(candidates,now).has(item.id);
  root.current.style.display=visible?'block':'none';
  root.current.dataset.placed=String(visible);
  const incense=incenseWorldSize(item.slot,layout);
  root.current.style.left=`${anchor.x}%`;root.current.style.top=`${anchor.y+(item.kind==='incense'?incense.insertion:0)}%`;root.current.style.zIndex=String(Math.round(floor.y*100)+3);
  const authoredLotus=item.kind==='lotus'&&item.artworkVersion!==undefined&&item.artworkVersion>=3;
  root.current.style.height=item.kind==='incense'?`${incense.height}%`:authoredLotus?`${offeringWorldHeight(item.slot,layout,'lotus')}%`:'';
  root.current.style.transform=authoredLotus?'translate(-50%,-100%)':'';
  const pileAngle=(Array.from(item.id).reduce((sum,char)=>sum+char.charCodeAt(0),0)%3-1)*4;
  root.current.style.setProperty('--incense-turn',`${pileAngle*(reduced?1:Math.min(1,Math.max(0,age)/250))}deg`);
  root.current.style.opacity=String(Math.min(1,(item.expiresAt-now)/1200));
  wisps.current.style.display=reduced||item.kind!=='incense'?'none':'block';
  for(const[w,child]of Array.from(wisps.current.children).entries()) {
   const element=child as HTMLElement;const p=((Math.max(0,age)/2800+w/3)%1);
   element.style.transform=`translate(${Math.sin(p*5+w)*4}px,${-p*25}px) scale(${0.5+p})`;element.style.opacity=String((1-p)*0.18);
  }
  for(const[i,child]of Array.from(petals.current.children).entries()) {
   const element=child as HTMLElement;const p=Math.min(1,Math.max(0,(age-i*70)/1700));
   const fall=(floor.y-anchor.y)/100*sceneHeight.current;
   element.style.display=reduced?'none':'block';
   if(item.artworkVersion===4){
    element.style.opacity=age<i*70?'0':'.8';
    element.style.transform=`translate(-50%,-50%) translate(${(i-3.5)*5*p+Math.sin(p*Math.PI)*Math.sin(i*2)*3}px,${p*p*fall-Math.sin(p*Math.PI)*4}px) rotate(${i*42+p*70}deg)`;
   }else element.style.transform=`translate(${(i-3.5)*3*p}px,${p*p*fall}px) rotate(${i*42+p*35}deg)`;
  }
  const next=nextOfferingDraw(item,candidates,now,reduced);
  return typeof next==='number'?next-offset:next;
 }),[item.id,layout,reduced,candidates,offset,extensionReady]);
 return <div ref={root} className={`placed-offering placed-${item.kind}`} data-artwork-version={item.artworkVersion} data-offering-id={item.id} data-action-id={item.actionId} data-effect={item.kind}>
  {item.kind!=='petal'&&<img className="placed-object" src={roomAssets.effect(item.kind)} alt=""/>}
  <div ref={wisps} className="incense-smoke">{[0,1,2].map(i=><i key={i}/>)}</div>
  <div ref={petals} className="released-petals">{item.kind==='petal'&&Array.from({length:8},(_,i)=><img key={i} src={roomAssets.effect('petal')} alt=""/>)}</div>
 </div>;
}
export function OfferingLayer({room,layout,offset,reduced,incenseReady,ritualExtensionReady,actionArtwork}:{room:RoomSnapshot;layout:SceneLayoutId;offset:number;reduced:boolean;incenseReady:Record<Appearance,boolean>;ritualExtensionReady?:Record<Appearance,boolean>;actionArtwork?:(id:string)=>ArtworkAvailability}) {
 const results=offeringCandidates(room);
 return <div className="offering-layer" aria-hidden="true">{[0,1,2,3].map(slot=>{const person=room.people.find(p=>p.action?.slot===slot);const action=person?.action??undefined;const previous=room.offerings.filter(item=>item.slot===slot&&item.kind!=='petal').at(-1);const kind=action?.offering&&action.offering!=='petal'?action.offering:previous?.kind??'incense';const appearance=person?.appearance??previous?.appearance??'man';const artworkVersion=action?artworkVersionForMovement(action.movement?.version):previous?.artworkVersion;return <Station key={slot} slot={slot} kind={kind} action={action} layout={layout} offset={offset} reduced={reduced} appearance={appearance} artworkVersion={artworkVersion} modernReady={action?(actionArtwork?.(action.id).incense[appearance]??incenseReady[appearance]):incenseReady[appearance]}/>;})}
 {results.map(item=><ResultVisual key={item.id} item={item} candidates={results} layout={layout} offset={offset} reduced={reduced} extensionReady={(actionArtwork?.(item.actionId).ritualExtension??ritualExtensionReady)?.[item.appearance??'man']??false}/>)}</div>;
}
