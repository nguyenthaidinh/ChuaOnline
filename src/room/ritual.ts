import { CLIP_MS, BOW_CYCLE_MS, TRANSITION_TIMELINE_VERSION, offeringClips, performanceDuration, ritualSchedule, type ClipId, type RitualTimelineVersion } from '../shared/ritualSchedule.ts';
import { actionMovement, entryRoute, logicalSeat, routeDurationMs, ritualRoute, sampleRoute, type FloorPoint } from './motion.ts';
import type { SharedAction, OfferingKind, EntryVersion } from './protocol.ts';
import { sampleLocomotion, sampleArrivalLocomotion, type LocomotionSample } from './locomotion.ts';
import { ARRIVAL_CLOSE_MS } from '../shared/movementSchedule.ts';

const duration=(id:ClipId)=>CLIP_MS[id];
export const SIT_MS=duration('sitDown');
export const STAND_MS=duration('standUp');
export const SETTLE_MS=duration('kneelDown');
export const ENTRY_WALK_MS=routeDurationMs(entryRoute(0));
export const ENTRY_DURATION_MS=ENTRY_WALK_MS+SIT_MS;
export const entryAnimationVersion=(version?:EntryVersion):RitualTimelineVersion=>version===4||version===5?TRANSITION_TIMELINE_VERSION:1;
export const entryDurationMs=(seat:number,version?:EntryVersion)=>routeDurationMs(entryRoute(seat))+
  (version===5?ARRIVAL_CLOSE_MS:0)+ritualSchedule(entryAnimationVersion(version)).clips.sitDown;
export type SharedPhase='standing'|'moving'|'settling'|'performing'|'rising'|'returning'|'seating'|'complete';
export interface SharedPose {
  phase:SharedPhase; travel:number; clip:ClipId; clipTime:number; point:FloorPoint;
  tangent:FloorPoint; distance:number; completedBows:number; offeringProgress:number|null;
  interactionAt:number|null; propInHand:boolean;
  locomotion?:Pick<LocomotionSample,'heading'|'stage'|'stageProgress'|'gaitPhase'|'supportFoot'>;
}
type Movement=ReturnType<typeof actionMovement>;
const BOW_CYCLE=BOW_CYCLE_MS;
export const performanceMs=performanceDuration;
export function sharedRitualDurationMs(kind:'bow'|'incense',movement:Movement=actionMovement(0,0,kind==='bow'),offering:OfferingKind='incense',version:RitualTimelineVersion=1) {
  const schedule=ritualSchedule(version),clips=schedule.clips;
  return clips.standUp+movement.outboundMs+(kind==='bow'?clips.kneelDown:0)+performanceMs(kind,offering,version)+(kind==='bow'?clips.rise:schedule.returnTurnMs)+movement.returnMs+clips.sitDown;
}
export function interactionTime(action:Pick<SharedAction,'startedAt'|'kind'|'offering'|'movement'|'timelineVersion'>) {
  if(action.kind==='bow') return null;
  const offering=action.offering??'incense';
  const schedule=ritualSchedule(action.timelineVersion);
  return action.startedAt+schedule.clips.standUp+(action.movement??actionMovement(0,0)).outboundMs+schedule.clips.offerRaise+schedule.clips.offerHold+schedule.contacts[offering];
}
export function sampleEntry(joinedAt:number,now:number,seat=0,version?:EntryVersion) {
  const route=entryRoute(seat),walkMs=routeDurationMs(route)+(version===5?ARRIVAL_CLOSE_MS:0),elapsed=Math.max(0,now-joinedAt);
  const sitMs=ritualSchedule(entryAnimationVersion(version)).clips.sitDown;
  if(elapsed<walkMs) {
    if(version===3||version===4||version===5){const sampled=version===5?sampleArrivalLocomotion(route,elapsed,walkMs):sampleLocomotion(route,elapsed,walkMs);return {phase:'entering' as const,clip:'walkRear' as ClipId,clipTime:elapsed,...sampled,locomotion:sampled,travel:1-sampled.progress};}
    return {phase:'entering' as const,clip:'walkRear' as ClipId,clipTime:elapsed,...sampleRoute(route,elapsed/walkMs),travel:1-elapsed/walkMs};
  }
  if(elapsed<walkMs+sitMs) return {phase:'seating' as const,clip:'sitDown' as ClipId,clipTime:elapsed-walkMs,point:logicalSeat(seat),tangent:{x:0,z:-1},distance:route.length,travel:0};
  return {phase:'idle' as const,clip:'seated' as ClipId,clipTime:0,point:logicalSeat(seat),tangent:{x:0,z:-1},distance:0,travel:0};
}
export function sampleSharedRitual(action:SharedAction,now:number):SharedPose {
  const schedule=ritualSchedule(action.timelineVersion);
  const duration=(id:ClipId)=>schedule.clips[id];
  const movement=action.movement??actionMovement(0,action.slot,action.kind==='bow'),home=logicalSeat(movement.seat);
  const out=ritualRoute(movement.seat,action.slot,false,action.kind==='bow'),back=ritualRoute(movement.seat,action.slot,true,action.kind==='bow'),altar=out.points.at(-1)!;
  const interactionAt=interactionTime(action);
  const base={travel:0,point:home,tangent:{x:0,z:-1},distance:0,completedBows:0,offeringProgress:null,interactionAt,propInHand:false};
  let t=Math.max(0,now-action.startedAt);
  if(t<duration('standUp')) return {...base,phase:'standing',clip:'standUp',clipTime:t}; t-=duration('standUp');
  if(t<movement.outboundMs) {
    if(movement.version===3||movement.version===4){const sampled=movement.version===4?sampleArrivalLocomotion(out,t,movement.outboundMs):sampleLocomotion(out,t,movement.outboundMs);return {...base,...sampled,locomotion:sampled,phase:'moving',clip:'walkRear',clipTime:t,travel:sampled.progress};}
    return {...base,phase:'moving',clip:'walkRear',clipTime:t,travel:t/movement.outboundMs,...sampleRoute(out,t/movement.outboundMs)};
  } t-=movement.outboundMs;
  if(action.kind==='bow') {
    if(t<SETTLE_MS) return {...base,point:altar,travel:1,phase:'settling',clip:'kneelDown',clipTime:t}; t-=SETTLE_MS;
  }
  const perform=performanceMs(action.kind,action.offering,action.timelineVersion);
  if(t<perform) {
    if(action.kind==='bow') {
      const completedBows=Math.floor(t/BOW_CYCLE);let cycle=t%BOW_CYCLE;
      for(const clip of ['bowDown','bowHold','bowUp'] as ClipId[]) { if(cycle<duration(clip)) return {...base,point:altar,travel:1,phase:'performing',clip,clipTime:cycle,completedBows};cycle-=duration(clip); }
    } else {
      let local=t;
      for(const clip of offeringClips(action.offering??'incense')) { if(local<duration(clip)) return {...base,point:altar,travel:1,phase:'performing',clip,clipTime:local,offeringProgress:t/perform,propInHand:movement.version>=3&&action.offering==='bell'||now<(interactionAt??0)};local-=duration(clip); }
    }
  }
  t-=perform;
  const completedBows=action.kind==='bow'?3:0;
  const riseMs=action.kind==='bow'?duration('rise'):schedule.returnTurnMs;
  if(t<riseMs) return {...base,point:altar,travel:1,completedBows,phase:'rising',clip:action.kind==='bow'?'rise':'stand',clipTime:t};t-=riseMs;
  if(t<movement.returnMs) {
    if(movement.version===3||movement.version===4){const sampled=movement.version===4?sampleArrivalLocomotion(back,t,movement.returnMs):sampleLocomotion(back,t,movement.returnMs);return {...base,...sampled,locomotion:sampled,completedBows,phase:'returning',clip:'walkFront',clipTime:t,travel:1-sampled.progress};}
    return {...base,completedBows,phase:'returning',clip:'walkFront',clipTime:t,travel:1-t/movement.returnMs,...sampleRoute(back,t/movement.returnMs)};
  }t-=movement.returnMs;
  if(t<duration('sitDown')) return {...base,completedBows,phase:'seating',clip:'sitDown',clipTime:t};
  return {...base,completedBows,phase:'complete',clip:'seated',clipTime:0};
}
