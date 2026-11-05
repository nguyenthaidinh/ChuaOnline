import {MAX_OFFERINGS,offeringLifetime,type RoomSnapshot} from './protocol.ts';
import {interactionTime} from './ritual.ts';
import {artworkVersionForMovement} from '../shared/movementSchedule.ts';
/** Reconstruct the pending half-second before SSE arrives using the same server action/marker. */
export function offeringCandidates(room:RoomSnapshot) {
 const items=new Map(room.offerings.map(item=>[item.id,item]));
 for(const person of room.people) {
  const action=person.action;if(!action||action.kind==='bow'||action.offering==='bell')continue;
  const placedAt=interactionTime(action)!;const id=`${action.id}:placed`,kind=action.offering??'incense';
  if(!items.has(id))items.set(id,{id,actionId:action.id,kind,slot:action.slot,placedAt,expiresAt:placedAt+offeringLifetime(kind),
   ...(artworkVersionForMovement(action.movement?.version)?{artworkVersion:artworkVersionForMovement(action.movement?.version),appearance:person.appearance}:{})});
 }
 return [...items.values()].sort((a,b)=>a.placedAt-b.placedAt||a.id.localeCompare(b.id));
}
/** Future markers must neither evict an existing gift early nor briefly exceed the server cap. */
export function visibleOfferings(items:ReturnType<typeof offeringCandidates>,now:number) {
 let visible:typeof items=[];
 for(const item of items) {
  if(item.placedAt>now||item.expiresAt<=now)continue;
  const same=visible.filter(old=>old.slot===item.slot&&old.kind===item.kind);
  const keep=item.kind==='incense'?2:0;
  const remove=new Set(same.slice(0,Math.max(0,same.length-keep)).map(old=>old.id));
  visible=visible.filter(old=>!remove.has(old.id));visible.push(item);visible=visible.slice(-MAX_OFFERINGS);
 }
 return visible;
}
