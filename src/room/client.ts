import type { Appearance, JoinResult, RoomSnapshot } from './protocol';
export interface RoomView {
  room: RoomSnapshot; selfId: string | null; status: 'connecting' | 'online' | 'offline';
  pending: boolean; message: string; offset: number;
}

export class RoomClient {
  private state: RoomView = { room: { revision: 0, now: 0, capacity: 24, people: [] }, selfId: null, status: 'connecting', pending: false, message: '', offset: 0 };
  private listeners = new Set<() => void>();
  private events: EventSource | null = null;
  private token: string | null = null;
  private heartbeat: number | null = null;
  private disposed = false;
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<RoomView>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  private accept(room: RoomSnapshot) {
    if (room.revision < this.state.room.revision && this.state.status === 'online') return;
    const expired = this.state.selfId && !room.people.some(person => person.id === this.state.selfId);
    if (expired) this.token = null;
    this.update({ room, offset: room.now - Date.now(), status: 'online',
      ...(expired ? { selfId: null, message: 'Phiên an tọa đã kết thúc. Mời bạn vào lại.' } : {}) });
  }
  connect() {
    this.disposed = false;
    this.events = new EventSource(`${import.meta.env.BASE_URL}api/room/events`);
    this.events.addEventListener('room', event => {
      try { this.accept(JSON.parse((event as MessageEvent<string>).data) as RoomSnapshot); }
      catch { this.update({ status: 'offline', message: 'Chưa nhận được trạng thái phòng. Đang kết nối lại…' }); }
    });
    this.events.onerror = () => { if (!this.disposed) this.update({ status: 'offline' }); };
    this.heartbeat = window.setInterval(() => { if (this.token) void this.request('heartbeat', {}).then(room => this.accept(room as RoomSnapshot)).catch(() => {}); }, 20000);
    window.addEventListener('pagehide', this.pagehide);
  }
  private pagehide = () => { if (this.token) this.sendLeave(); };
  private sendLeave() {
    const token = this.token;
    this.token = null;
    void fetch(`${import.meta.env.BASE_URL}api/room/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}', keepalive: true }).catch(() => {});
  }
  disconnect() {
    this.disposed = true;
    this.events?.close(); this.events = null;
    if (this.heartbeat !== null) clearInterval(this.heartbeat);
    window.removeEventListener('pagehide', this.pagehide);
    if (this.token) this.sendLeave();
  }
  private async request(action: string, body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${import.meta.env.BASE_URL}api/room/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000),
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      if (response.status === 401) { this.token = null; this.update({ selfId: null }); }
      throw new Error(typeof data === 'object' && data && 'error' in data ? String(data.error) : 'Chưa kết nối được. Mời bạn thử lại.');
    }
    return data;
  }
  join = async (name: string, appearance: Appearance) => {
    if (this.state.pending || this.state.selfId || this.state.status !== 'online') return false;
    this.update({ pending: true, message: '' });
    try {
      const data = await this.request('join', { name, appearance }) as JoinResult;
      if (this.disposed) { this.token = data.token; this.sendLeave(); return false; }
      this.token = data.token;
      this.update({ selfId: data.selfId });
      this.accept(data.room);
      return true;
    } catch (error) { this.update({ message: error instanceof Error ? error.message : 'Chưa vào được chánh điện.' }); return false; }
    finally { this.update({ pending: false }); }
  };
  action = async (kind: 'bow' | 'incense') => {
    if (!this.token || this.state.pending || this.state.status !== 'online') return;
    this.update({ pending: true, message: '' });
    try { this.accept(await this.request('action', { kind, requestId: crypto.randomUUID() }) as RoomSnapshot); }
    catch (error) { this.update({ message: error instanceof Error ? error.message : 'Chưa thực hiện được nghi lễ.' }); }
    finally { this.update({ pending: false }); }
  };
  leave = async () => {
    if (!this.token || this.state.pending) return;
    this.update({ pending: true });
    try {
      const room = await this.request('leave', {}) as RoomSnapshot;
      this.token = null; this.update({ selfId: null, message: '' }); this.accept(room);
    } catch (error) { this.update({ message: error instanceof Error ? error.message : 'Chưa rời được chánh điện. Mời bạn thử lại.' }); }
    finally { this.update({ pending: false }); }
  };
}
