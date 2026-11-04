import { ritualSchedule, type RitualTimelineVersion } from '../shared/ritualSchedule.ts';
import type { ClipId, HandAnchor } from './animationManifest.ts';
import { INCENSE_ARTWORK, INCENSE_GEOMETRY, INCENSE_PROP } from './incenseGeometry.ts';
import type { ArtworkFrame } from './modernArtworkTypes.ts';
import type { SharedAction } from './protocol.ts';
import { actionMovement } from './motion.ts';
import { interactionTime } from './ritual.ts';

export type IncenseClipId = 'offerRaise' | 'offerHold' | 'offerPlace' | 'offerRelease';
interface Key { id:string; durationMs:number }
const key = (id:string, durationMs:number):Key => ({ id, durationMs });
export const INCENSE_CLIPS:Record<IncenseClipId, readonly Key[]> = {
  offerRaise:[key('00-neutral',100),key('01-reach',140),key('02-grasp',140),key('19-pickup-lift',140),key('03-chest',170),key('20-mid-lift',210),key('04-lift',180),key('05-forehead',270)],
  offerHold:[key('06-bow-start',250),key('07-bow-hold',600),key('08-bow-return',250)],
  offerPlace:[key('10-extend',230),key('09-lower',230),key('11-near-burner',270),key('12-contact-closed',270),key('13-release',120),key('14-open',140),key('15-withdraw',140)],
  offerRelease:[key('16-return',200),key('17-palms',250),key('21-prayer-lower',180),key('18-rest',180),key('22-arms-lower',170),key('00-neutral',170)],
};
const indices = new Map(INCENSE_GEOMETRY.map((frame,index) => [frame.id,index]));
const clipDuration=(keys:readonly Key[])=>keys.reduce((sum,key)=>sum+key.durationMs,0);
const releaseOffset=(keys:readonly Key[])=>keys.slice(0,keys.findIndex(key=>key.id==='13-release')).reduce((sum,key)=>sum+key.durationMs,0);

export function isIncenseClip(clip:ClipId):clip is IncenseClipId {
  return clip === 'offerRaise' || clip === 'offerHold' || clip === 'offerPlace' || clip === 'offerRelease';
}

/** Fit old and new shared clocks to the same source, preserving the release marker. */
export function sampleIncenseClip(clip:IncenseClipId, timeMs:number, version:RitualTimelineVersion=2):ArtworkFrame {
  const schedule = ritualSchedule(version);
  const keys = INCENSE_CLIPS[clip];
  const visualDuration=clipDuration(keys);
  const visualContact=clip==='offerPlace'?releaseOffset(keys):0;
  const time = Number.isFinite(timeMs) ? Math.max(0,Math.min(schedule.clips[clip],timeMs)) : 0;
  let visualTime = visualDuration===schedule.clips[clip]?time:time/schedule.clips[clip]*visualDuration;
  if (clip === 'offerPlace') {
    visualTime = time < schedule.contacts.incense
      ? time / schedule.contacts.incense * visualContact
      : visualContact + (time-schedule.contacts.incense) /
        (schedule.clips[clip]-schedule.contacts.incense) * (visualDuration-visualContact);
  }
  let index = 0;
  while (index < keys.length-1 && visualTime >= keys[index].durationMs-1e-7) {
    visualTime -= keys[index].durationMs; index++;
  }
  const cell = indices.get(keys[index].id);
  if (cell === undefined) throw new Error(`Missing incense pose: ${keys[index].id}`);
  const frame = INCENSE_GEOMETRY[cell];
  return { cell,index,durationMs:keys[index].durationMs,sourceId:frame.id,top:frame.top,
    image:INCENSE_ARTWORK.image,columns:INCENSE_ARTWORK.columns,rows:INCENSE_ARTWORK.rows,atlasCell:cell,
    facing:'rear',hand:frame.grip,handMask:frame.handMask,holdsIncense:frame.holdsIncense,
    propLayer:'behind-hand',modernKind:'incense' };
}

export function incensePickupMs(version:RitualTimelineVersion=2) {
  const pickupIndex=INCENSE_CLIPS.offerRaise.findIndex(frame=>frame.id==='02-grasp');
  const pickup=INCENSE_CLIPS.offerRaise.slice(0,pickupIndex).reduce((sum,frame)=>sum+frame.durationMs,0);
  return pickup / clipDuration(INCENSE_CLIPS.offerRaise) * ritualSchedule(version).clips.offerRaise;
}

export function incenseKeyTimes(version:RitualTimelineVersion=2) {
  const schedule=ritualSchedule(version),times:number[]=[];
  let start=0;
  for(const clip of Object.keys(INCENSE_CLIPS) as IncenseClipId[]) {
    const keys=INCENSE_CLIPS[clip],duration=clipDuration(keys),contact=clip==='offerPlace'?releaseOffset(keys):0;
    let local=0;
    for(const key of keys) {
      const mapped=duration===schedule.clips[clip]&&(clip!=='offerPlace'||contact===schedule.contacts.incense)?local:clip==='offerPlace'
        ?local<contact?local/contact*schedule.contacts.incense
          :schedule.contacts.incense+(local-contact)/(duration-contact)*(schedule.clips[clip]-schedule.contacts.incense)
        :local/duration*schedule.clips[clip];
      times.push(start+mapped);local+=key.durationMs;
    }
    start+=schedule.clips[clip];
  }
  return [...times,start];
}

export function sampleStaticIncense(owner:'none'|'source'|'hand'|'urn'):ArtworkFrame {
  if(owner==='hand')return sampleIncenseClip('offerHold',0,2);
  if(owner==='urn')return sampleIncenseClip('offerRelease',200,2);
  return sampleIncenseClip('offerRaise',0,2);
}

export function incenseAcquisitionTime(action:SharedAction) {
  const schedule=ritualSchedule(action.timelineVersion);
  return action.startedAt+schedule.clips.standUp+(action.movement??actionMovement(0,action.slot)).outboundMs
    +incensePickupMs(action.timelineVersion);
}

export function incenseOwnership(action:SharedAction,now:number):'none'|'source'|'hand'|'urn' {
  if(now<action.startedAt)return 'none';
  if(now<incenseAcquisitionTime(action))return 'source';
  return now<(interactionTime(action)??Infinity)?'hand':'urn';
}

export function incenseBase(grip:HandAnchor):HandAnchor {
  return { x:grip.x, y:grip.y + INCENSE_PROP.height*(1-INCENSE_PROP.gripFraction) };
}

export function incenseReceiver():HandAnchor {
  const contact = INCENSE_GEOMETRY.find(frame => frame.id === '12-contact-closed')?.grip;
  if (!contact) throw new Error('Missing incense insertion contact.');
  const base = incenseBase(contact);
  return { x:base.x,y:base.y-INCENSE_PROP.insertionDepth };
}

export function incenseSource():HandAnchor {
  const grip = INCENSE_GEOMETRY.find(frame => frame.id === '02-grasp')?.grip;
  if (!grip) throw new Error('Missing incense acquisition contact.');
  return incenseBase(grip);
}
