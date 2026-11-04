import type { Appearance, OfferingKind } from './protocol.ts';
import type { ArtworkFrame } from './modernArtworkTypes.ts';
import type { ClipId } from './animationManifest.ts';
import { RITUAL_ARTWORK } from './ritualPoseGeometry.ts';
import { sampleIncenseClip } from './incenseAnimation.ts';
import { ritualSchedule, type RitualTimelineVersion } from '../shared/ritualSchedule.ts';

export const OFFERING_PROP = {
  lotus:{height:56.32,gripFraction:.70,rotationDeg:0},
  bell:{height:51.2,gripFraction:.85,rotationDeg:25},
} as const;

export function offeringReceiver(kind:'lotus'|'bell',appearance:Appearance='man') {
  const id=kind==='lotus'?'lotus-place':'bell-contact';
  const frame=RITUAL_ARTWORK[appearance].frames.find(frame=>frame.id===id);
  if(!frame)throw new Error(`Missing offering contact: ${appearance}/${id}`);
  const prop=OFFERING_PROP[kind];
  if(kind==='lotus')return {x:frame.hand.x,y:frame.hand.y+prop.height*(1-prop.gripFraction)};
  const radians=prop.rotationDeg*Math.PI/180;
  return {x:frame.hand.x+Math.sin(radians)*prop.height*prop.gripFraction,
    y:frame.hand.y-Math.cos(radians)*prop.height*prop.gripFraction};
}

/** The strike marker and the object-transfer marker have different tool ownership rules. */
export function sampleModernOffering(appearance:Appearance,kind:OfferingKind,clip:ClipId,time:number,
  version:RitualTimelineVersion,reduced=false):ArtworkFrame|null {
  if(kind!=='lotus'&&kind!=='bell')return null;
  if(!['offerRaise','offerHold','offerPlace','offerRelease','bellStrike'].includes(clip))return null;
  const schedule=ritualSchedule(version);
  if(clip==='offerRelease'&&(kind==='lotus'||time>schedule.clips.offerRelease*.4)){
    const sourceTime=time/schedule.clips.offerRelease*ritualSchedule(2).clips.offerRelease;
    return {...sampleIncenseClip('offerRelease',sourceTime,2,appearance),holdsOffering:false};
  }
  let id:string,angle:number=OFFERING_PROP[kind].rotationDeg;
  if(kind==='lotus')id=clip==='offerPlace'?'lotus-place':'lotus-chest';
  else if(reduced){id='bell-contact';angle=25;}
  else if(clip==='bellStrike'){
    const contact=schedule.contacts.bell;
    id=time<contact?'bell-ready':time<contact+220?'bell-contact':'bell-recoil';
    angle=time<contact?-10+35*Math.max(0,time)/contact:time<contact+220?25:5;
  }else{id=clip==='offerRelease'?'bell-recoil':'bell-ready';angle=clip==='offerRelease'?5:-10;}
  const {asset,frames}=RITUAL_ARTWORK[appearance],frame=frames.find(frame=>frame.id===id);
  if(!frame)throw new Error(`Missing ritual pose: ${appearance}/${id}`);
  return {cell:frame.cell,index:frame.cell,durationMs:schedule.clips[clip],sourceId:id,top:frame.top,
    hand:frame.hand,handMask:frame.handMask,modernKind:'ritual',facing:'rear',
    image:asset.image,columns:asset.columns,rows:asset.rows,atlasCell:frame.cell,
    propGeometry:{...OFFERING_PROP[kind],rotationDeg:angle}};
}
