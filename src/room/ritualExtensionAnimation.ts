import type { Appearance } from './protocol.ts';
import type { ArtworkFrame } from './modernArtworkTypes.ts';
import type { ClipId } from './animationManifest.ts';
import { BOW_EXTENSION_CLIPS, PETAL_EXTENSION_CLIPS, RITUAL_EXTENSION } from './bowPetalGeometry.ts';
import { ritualSchedule, type RitualTimelineVersion } from '../shared/ritualSchedule.ts';

export const PETAL_PROP = { height:38.4, gripFraction:.85, rotationDeg:0 } as const;
type Step = {id:string;durationMs:number};
const duration = (steps:readonly Step[]) => steps.reduce((sum,step)=>sum+step.durationMs,0);

/** Retiming preserves the public release marker, independently of image-frame durations. */
function sourceTime(steps:readonly Step[],clip:ClipId,time:number,version:RitualTimelineVersion) {
  const schedule=ritualSchedule(version),total=duration(steps);
  const bounded=Number.isFinite(time)?Math.max(0,Math.min(schedule.clips[clip],time)):0;
  if(clip!=='petalRelease')return bounded/schedule.clips[clip]*total;
  const releaseIndex=steps.findIndex(step=>step.id==='19-petal-release');
  if(releaseIndex<0)throw new Error('Missing petal release pose.');
  const marker=duration(steps.slice(0,releaseIndex)),contact=schedule.contacts.petal;
  return bounded<contact?bounded/contact*marker
    :marker+(bounded-contact)/(schedule.clips[clip]-contact)*(total-marker);
}

export function petalEmissionPoint(appearance:Appearance) {
  const hand=RITUAL_EXTENSION[appearance].frames['19-petal-release'].hand;
  if(!hand)throw new Error(`Missing petal release hand: ${appearance}`);
  return {x:hand.x,y:hand.y+PETAL_PROP.height*(.5-PETAL_PROP.gripFraction)};
}

/** Only movement-v4 actions opt into these poses. Historical actions keep their sources. */
export function sampleRitualExtension(appearance:Appearance,kind:'bow'|'petal',clip:ClipId,time:number,
  version:RitualTimelineVersion,reduced=false,released=false):ArtworkFrame|null {
  const clips:Partial<Record<ClipId,readonly Step[]>>=kind==='bow'?BOW_EXTENSION_CLIPS:PETAL_EXTENSION_CLIPS;
  const steps=clips[clip];
  if(!steps)return null;
  const scheduled=ritualSchedule(version).clips[clip];
  let index=0;
  let id:string;
  if(reduced)id=kind==='bow'?'04-prayer':released?'19-petal-release':'18-petal-pre-release';
  else {
    let remaining=Math.min(sourceTime(steps,clip,time,version),duration(steps)-.001);
    while(index<steps.length-1&&remaining>=steps[index].durationMs){remaining-=steps[index].durationMs;index++;}
    id=steps[index].id;
  }
  const {asset,frames}=RITUAL_EXTENSION[appearance],pose=frames[id];
  if(!pose)throw new Error(`Missing ritual extension: ${appearance}/${id}`);
  return {cell:pose.cell,index,durationMs:scheduled,sourceId:id,top:pose.top,
    image:asset.image,columns:asset.columns,rows:asset.rows,atlasCell:pose.cell,
    facing:'rear',heading:'rearRight',modernKind:'ritual',rootOffset:pose.rootOffset,
    hand:pose.hand,handMask:pose.handMask,holdsOffering:pose.holdsOffering,
    ...(kind==='petal'?{propGeometry:PETAL_PROP}:{})};
}
