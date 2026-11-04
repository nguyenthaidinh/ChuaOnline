import {interactionTime} from './ritual.ts';
import type {OfferingKind,RoomSnapshot} from './protocol.ts';

export const SHRINE_EFFECT_MS=6000;
export interface ShrineEffect {id:string;kind:OfferingKind;at:number}
/** Use the shared contact marker, including bell strikes which leave no placed object. */
export function shrineEffectCandidates(room:RoomSnapshot) {
  const effects=new Map<string,ShrineEffect>();
  for(const item of room.offerings)effects.set(item.actionId,{id:item.actionId,kind:item.kind,at:item.placedAt});
  for(const person of room.people) {
    const action=person.action;
    if(!action||action.kind==='bow')continue;
    const at=interactionTime(action);
    if(at!==null)effects.set(action.id,{id:action.id,kind:action.offering??'incense',at});
  }
  return [...effects.values()].filter(effect=>effect.at+SHRINE_EFFECT_MS>room.now).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}
