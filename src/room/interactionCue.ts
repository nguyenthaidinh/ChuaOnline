import { interactionTime, performanceMs } from './ritual.ts';
import type { SharedAction } from './protocol.ts';
import { ritualSchedule } from '../shared/ritualSchedule.ts';
import { actionMovement } from './motion.ts';
/** Cues are transient. A hidden tab or a late snapshot never replays an old strike. */
export class InteractionCueGate {
  private seen = new Set<string>();
  private allRituals: boolean;

  constructor(allRituals = false) { this.allRituals = allRituals; }

  discard(action: SharedAction | null | undefined) {
    if (action) this.remember(action.id);
  }

  private remember(id: string) {
    this.seen.add(id);
    if (this.seen.size > 64) this.seen.delete(this.seen.values().next().value!);
  }

  poll(action: SharedAction | null | undefined, now: number, visible: boolean) {
    if (!action || (!this.allRituals && action.offering !== 'bell') || this.seen.has(action.id)) return false;
    const clips = ritualSchedule(action.timelineVersion).clips;
    // Bowing has no gift release: say the wish after the third bow, as the actor rises.
    const at = action.kind === 'bow'
      ? action.startedAt + clips.standUp + (action.movement ?? actionMovement(0, action.slot, true)).outboundMs
        + clips.kneelDown + performanceMs('bow', undefined, action.timelineVersion)
      : interactionTime(action);
    if (at === null || now < at) return false;
    this.remember(action.id);
    return visible && now - at <= 350;
  }
}
