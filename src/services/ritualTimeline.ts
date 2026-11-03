import type { RitualCommand, RitualEvent } from '../types/experience.ts';
import { BOW_SECONDS, BOW_PAUSE_SECONDS } from '../config/ritual.ts';

export interface RitualFrame {
  phase: 'moving' | 'performing' | 'returning' | 'complete';
  travel: number;
  bowWeight: number;
  completedBows: number;
  incenseLit: boolean;
}

// Both renderers consume the same finite sequence. No animation clip can restart it.
export class RitualTimeline {
  private elapsed = 0;
  private cancelled = false;
  private emitted = '';
  private readonly command: RitualCommand;
  private readonly notify: (event: RitualEvent) => void;
  readonly walkSeconds: number;
  readonly performSeconds: number;
  readonly duration: number;

  constructor(command: RitualCommand, notify: (event: RitualEvent) => void, walkSeconds = 1.8, incenseSeconds = 4) {
    if (!Number.isInteger(command.bowCount) || command.bowCount < 1 || command.bowCount > 9) throw new Error('invalid-bow-count');
    this.command = command;
    this.notify = notify;
    this.walkSeconds = Math.max(0.5, Math.min(6, walkSeconds));
    this.performSeconds = command.kind === 'bow'
      ? command.bowCount * (BOW_SECONDS + BOW_PAUSE_SECONDS) - BOW_PAUSE_SECONDS
      : Math.max(2, Math.min(12, incenseSeconds));
    this.duration = this.walkSeconds * 2 + this.performSeconds;
  }

  cancel() { this.cancelled = true; }

  advance(delta: number): RitualFrame {
    if (!Number.isFinite(delta) || delta < 0) throw new Error('invalid-frame-time');
    if (!this.cancelled) this.elapsed = Math.min(this.duration, this.elapsed + delta);
    const frame = this.sampleAt(this.elapsed);
    const { phase, completedBows, incenseLit } = frame;
    const signature = `${phase}:${completedBows}:${incenseLit}`;
    if (!this.cancelled && signature !== this.emitted) {
      this.emitted = signature;
      this.notify(phase === 'complete'
        ? { type: 'complete', commandId: this.command.id, completedBows, incenseLit }
        : { type: 'progress', commandId: this.command.id, phase, completedBows, incenseLit });
    }
    return frame;
  }

  // Absolute server time lets late joiners and reconnecting clients see the same pose.
  sampleAt(seconds: number): RitualFrame {
    const t = Math.max(0, Math.min(this.duration, seconds));
    const performTime = Math.max(0, Math.min(this.performSeconds, t - this.walkSeconds));
    const phase = t >= this.duration ? 'complete' : t < this.walkSeconds ? 'moving'
      : t < this.walkSeconds + this.performSeconds ? 'performing' : 'returning';
    const completedBows = this.command.kind === 'bow'
      ? Math.min(this.command.bowCount, Math.floor((performTime + BOW_PAUSE_SECONDS + 1e-8) / (BOW_SECONDS + BOW_PAUSE_SECONDS))) : 0;
    const bowTime = performTime % (BOW_SECONDS + BOW_PAUSE_SECONDS);
    let bowWeight = 0;
    if (this.command.kind === 'bow' && phase === 'performing') {
      if (bowTime < 0.9) bowWeight = 0.5 - 0.5 * Math.cos(Math.PI * bowTime / 0.9);
      else if (bowTime < 1.6) bowWeight = 1;
      else if (bowTime < BOW_SECONDS) bowWeight = 0.5 + 0.5 * Math.cos(Math.PI * (bowTime - 1.6));
    }
    const incenseLit = this.command.kind === 'incense' && (phase === 'returning' || phase === 'complete');
    const frame: RitualFrame = {
      phase, completedBows, incenseLit, bowWeight,
      travel: phase === 'moving' ? t / this.walkSeconds : phase === 'performing' ? 1
        : phase === 'returning' ? 1 - (t - this.walkSeconds - this.performSeconds) / this.walkSeconds : 0,
    };
    return frame;
  }
}
