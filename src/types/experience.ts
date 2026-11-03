export type RitualKind = 'incense' | 'bow';
export type ActionPhase = 'idle' | 'moving' | 'performing' | 'returning' | 'error';
export type SceneStatus = 'loading' | 'ready' | 'fallback';

export interface RitualCommand {
  id: string;
  actorId: string;
  kind: RitualKind;
  bowCount: number;
}

export type RitualEvent =
  | { type: 'progress'; commandId: string; phase: 'moving' | 'performing' | 'returning'; completedBows: number; incenseLit: boolean }
  | { type: 'complete'; commandId: string; completedBows: number; incenseLit: boolean }
  | { type: 'error'; commandId: string; message: string };

export interface TempleSessionState {
  actorId: string;
  command: RitualCommand | null;
  phase: ActionPhase;
  sceneStatus: SceneStatus;
  completedBows: number;
  incenseLit: boolean;
  message: string;
}
