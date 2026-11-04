import { interactionTime } from './ritual.ts';
import type { SharedAction } from './protocol.ts';
/** Cues are transient. A hidden tab or a late snapshot never replays an old strike. */
export class InteractionCueGate {
  private seen=new Set<string>();
  poll(action:SharedAction|null|undefined,now:number,visible:boolean) {
    if(!action||action.offering!=='bell'||this.seen.has(action.id))return false;
    const at=interactionTime(action);
    if(at===null||now<at)return false;
    this.seen.add(action.id);
    if(this.seen.size>64)this.seen.delete(this.seen.values().next().value!);
    return visible&&now-at<=350;
  }
}
