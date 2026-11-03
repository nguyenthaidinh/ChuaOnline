import { BOW_COUNT } from '../config/ritual.ts';
import type { RitualEvent, RitualKind, SceneStatus, TempleSessionState } from '../types/experience.ts';

// One store per mounted experience, no persistence or cross-tab transport.
export class TempleSession {
  private state: TempleSessionState;
  private listeners = new Set<() => void>();
  private readonly nextId: () => string;

  constructor(nextId: () => string = () => crypto.randomUUID()) {
    this.nextId = nextId;
    this.state = { actorId: nextId(), command: null, phase: 'idle', sceneStatus: 'loading', completedBows: 0, incenseLit: false, message: 'Đang chuẩn bị chánh điện…' };
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<TempleSessionState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  setSceneStatus = (sceneStatus: SceneStatus) => {
    if (sceneStatus === this.state.sceneStatus) return;
    if (this.state.command) {
      this.update({ sceneStatus, command: null, phase: 'error', message: 'Nghi lễ đã dừng vì cảnh bị gián đoạn. Bạn có thể thực hiện lại.' });
    } else this.update({ sceneStatus, message: sceneStatus === 'loading' ? 'Đang chuẩn bị chánh điện…'
      : sceneStatus === 'fallback' ? 'Đang dùng hình đại diện 2D. Bạn vẫn có thể thực hiện nghi lễ.' : 'Chánh điện đã sẵn sàng. Mời bạn chọn một nghi lễ.' });
  };

  start = (kind: RitualKind) => {
    // Check and claim synchronously, before React renders a disabled button.
    if (this.state.command || this.state.sceneStatus === 'loading') return false;
    const command = { id: this.nextId(), actorId: this.state.actorId, kind, bowCount: BOW_COUNT };
    this.update({ command, phase: 'moving', completedBows: 0,
      message: kind === 'incense' ? 'Đang đi lên thắp hương…' : 'Đang đi lên lễ Phật…' });
    return true;
  };

  report = (event: RitualEvent) => {
    if (event.commandId !== this.state.command?.id) return;
    if (event.type === 'error') {
      this.update({ command: null, phase: 'error', message: event.message });
      return;
    }
    const command = this.state.command;
    if (event.type === 'complete') {
      this.update({ command: null, phase: 'idle', completedBows: event.completedBows,
        incenseLit: this.state.incenseLit || event.incenseLit,
        message: command.kind === 'bow' ? `Đã lễ Phật đủ ${command.bowCount} lạy và trở về chỗ. Chúc bạn thân tâm an lạc.`
          : 'Đã thắp hương và trở về chỗ. Nguyện bạn có một ngày bình an.' });
    } else this.update({ phase: event.phase, completedBows: event.completedBows,
      incenseLit: this.state.incenseLit || event.incenseLit,
      message: event.phase === 'moving' ? 'Đang đi lên chánh điện…' : event.phase === 'returning' ? 'Đang trở về chỗ…'
        : command.kind === 'bow' ? `Đang lễ Phật · ${event.completedBows}/${command.bowCount} lạy hoàn tất` : 'Đang thành tâm thắp hương…' });
  };

  fail = (commandId: string, message: string) => this.report({ type: 'error', commandId, message });
}
