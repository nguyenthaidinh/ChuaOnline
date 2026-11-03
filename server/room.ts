import { randomBytes, randomUUID } from 'node:crypto';
import { RitualTimeline } from '../src/services/ritualTimeline.ts';
import { ROOM_CAPACITY, WALK_SECONDS, INCENSE_SECONDS, PRESENCE_TIMEOUT_MS, type Appearance, type RoomMember, type RoomSnapshot } from '../src/room/protocol.ts';
import type { RitualCommand } from '../src/types/experience.ts';

export class RoomError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
interface Guest { person: RoomMember; seenAt: number; requests: Set<string> }

export class TempleRoom {
  private guests = new Map<string, Guest>();
  private revision = 0;
  private listeners = new Set<() => void>();
  private now: () => number;
  constructor(now: () => number = Date.now) { this.now = now; }
  subscribe = (callback: () => void) => { this.listeners.add(callback); return () => { this.listeners.delete(callback); }; };
  private changed() { this.revision++; this.listeners.forEach(callback => callback()); }
  snapshot(): RoomSnapshot {
    return { revision: this.revision, now: this.now(), capacity: ROOM_CAPACITY,
      people: [...this.guests.values()].map(({ person }) => ({ ...person, action: person.action ? { ...person.action } : null })) };
  }
  join(nameInput: unknown, appearanceInput: unknown) {
    this.sweep();
    if (typeof nameInput !== 'string' || nameInput.length > 32) throw new RoomError(400, 'Tên hiển thị tối đa 32 ký tự.');
    if (appearanceInput !== 'man' && appearanceInput !== 'woman' && appearanceInput !== 'granny') throw new RoomError(400, 'Y phục chưa hợp lệ.');
    if (this.guests.size >= ROOM_CAPACITY) throw new RoomError(409, 'Chánh điện đã đủ chỗ. Mời bạn quay lại sau một chút.');
    const taken = new Set([...this.guests.values()].map(guest => guest.person.seat));
    let seat = 0;
    while (taken.has(seat)) seat++;
    const token = randomBytes(32).toString('hex');
    const person: RoomMember = { id: randomUUID(), name: nameInput.replace(/[\u0000-\u001f\u007f]/g, '').trim() || 'Khách',
      appearance: appearanceInput as Appearance, seat, joinedAt: this.now(), action: null, completed: null };
    this.guests.set(token, { person, seenAt: this.now(), requests: new Set() });
    this.changed();
    return { token, selfId: person.id, room: this.snapshot() };
  }
  private guest(token: string) {
    const guest = this.guests.get(token);
    if (!guest) throw new RoomError(401, 'Phiên an tọa đã hết hạn. Mời bạn vào lại.');
    return guest;
  }
  heartbeat(token: string) { this.sweep(); this.guest(token).seenAt = this.now(); return this.snapshot(); }
  action(token: string, kind: unknown, requestId: unknown) {
    this.sweep();
    const guest = this.guest(token);
    if (kind !== 'bow' && kind !== 'incense') throw new RoomError(400, 'Nghi lễ chưa hợp lệ.');
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(requestId)) throw new RoomError(400, 'Mã thao tác chưa hợp lệ.');
    if (guest.requests.has(requestId)) return this.snapshot();
    if (guest.person.action) throw new RoomError(409, 'Bạn đang thực hiện nghi lễ. Vui lòng đợi nhân vật trở về chỗ.');
    const occupied = new Set([...this.guests.values()].flatMap(item => item.person.action ? [item.person.action.slot] : []));
    const slot = [0, 1, 2, 3].find(index => !occupied.has(index));
    if (slot === undefined) throw new RoomError(409, 'Khu vực làm lễ đang có người. Mời bạn thử lại sau một chút.');
    const command: RitualCommand = { id: randomUUID(), actorId: guest.person.id, kind, bowCount: 3 };
    const duration = new RitualTimeline(command, () => {}, WALK_SECONDS, INCENSE_SECONDS).duration * 1000;
    guest.person.action = { ...command, startedAt: this.now(), endsAt: this.now() + duration, slot };
    guest.requests.add(requestId);
    if (guest.requests.size > 100) guest.requests.delete(guest.requests.values().next().value!);
    guest.seenAt = this.now();
    this.changed();
    return this.snapshot();
  }
  leave(token: string) { if (this.guests.delete(token)) this.changed(); return this.snapshot(); }
  sweep() {
    let changed = false;
    for (const [token, guest] of this.guests) {
      if (this.now() - guest.seenAt >= PRESENCE_TIMEOUT_MS) { this.guests.delete(token); changed = true; continue; }
      if (guest.person.action && guest.person.action.endsAt <= this.now()) {
        guest.person.completed = { kind: guest.person.action.kind, at: guest.person.action.endsAt };
        guest.person.action = null;
        changed = true;
      }
    }
    if (changed) this.changed();
  }
}
