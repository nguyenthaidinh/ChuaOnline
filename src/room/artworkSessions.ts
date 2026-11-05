import type { ArtworkAvailability } from './characterAnimation.ts';
import type { RoomMember } from './protocol.ts';
import { entryDurationMs } from './ritual.ts';

/** One immutable readiness snapshot per entry/action, shared by actor and props. */
export class ArtworkSessions {
  private locked = new Map<string, ArtworkAvailability>();
  forPerson(person: RoomMember, now: number, available: ArtworkAvailability) {
    const key = person.action?.id ?? (now < person.joinedAt + entryDurationMs(person.seat, person.entryVersion)
      ? `entry:${person.id}:${person.joinedAt}` : null);
    if (!key || available.baseActors?.[person.appearance] === false) return available;
    const previous = this.locked.get(key);
    if (previous) return previous;
    this.locked.set(key, available);
    return available;
  }
  forAction(id: string, fallback: ArtworkAvailability) { return this.locked.get(id) ?? fallback; }
  retain(keys: Set<string>) {
    for (const key of this.locked.keys()) if (!keys.has(key)) this.locked.delete(key);
  }
}
