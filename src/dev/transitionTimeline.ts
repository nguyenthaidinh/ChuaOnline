import type { StudyAtlas } from './studyAtlas.ts';

export type StudyBank = 'walk' | 'transition';
export type TransitionClipId = 'sequence' | 'sitDown' | 'standUp' | 'startWalk' | 'stopWalk' | 'turn';

export interface StudyStep {
  bank: StudyBank;
  frameId: string;
  durationMs: number;
  phase: string;
  travelEnd: number;
  rightFootReference?: string;
}

export interface CompiledStudyStep extends StudyStep {
  index: number;
  startMs: number;
  endMs: number;
  travelStart: number;
  rootOffset: { x: number; y: number };
}

export interface StudySequence {
  steps: CompiledStudyStep[];
  durationMs: number;
}

const pose = (frameId: string, durationMs: number, phase: string): StudyStep =>
  ({ bank: 'transition', frameId, durationMs, phase, travelEnd: 0 });
const plantedPose = (frameId: string, durationMs: number, phase: string): StudyStep =>
  ({ ...pose(frameId, durationMs, phase), rightFootReference: '14-rise-support' });

const turn = [
  pose('00-stand-angled', 80, 'Đứng vững'),
  pose('17-turn-first', 40, 'Dồn trọng lượng để quay'),
  pose('18-turn-second', 40, 'Bước xoay nhỏ'),
  pose('01-turn-mid', 60, 'Quay về bàn thờ'),
  pose('19-turn-fourth', 40, 'Chuyển chân trụ'),
  pose('20-turn-fifth', 40, 'Đặt chân theo hướng bàn thờ'),
  pose('02-stand-rear', 80, 'Hướng nhìn tượng Phật'),
];

const sitDown = [
  ...turn,
  pose('03-weight-shift', 100, 'Chuyển trọng lượng'),
  pose('04-knee-bend', 100, 'Khuỵu gối'),
  pose('05-lower-knees', 100, 'Hạ gối'),
  pose('06-kneeling', 140, 'Ổn định khi quỳ'),
  pose('07-tuck-legs', 120, 'Thu chân'),
  pose('08-half-seated', 120, 'Hạ thân xuống bồ đoàn'),
  pose('09-seated-settle', 120, 'Ổn định tư thế'),
  pose('10-seated-rear', 320, 'An tọa nhìn tượng Phật'),
];

const standUp = [
  pose('10-seated-rear', 120, 'An tọa'),
  pose('21-rise-lean', 80, 'Nghiêng thân, đặt tay chống'),
  plantedPose('14-rise-support', 100, 'Chống tay chuyển trọng lượng'),
  plantedPose('22-rise-weight', 100, 'Nâng hông trên chân trụ'),
  plantedPose('15-rise-half-kneel', 100, 'Đặt chân làm điểm tựa'),
  plantedPose('23-rise-extend', 80, 'Rời gối, thu chân về'),
  plantedPose('16-rise-crouch', 100, 'Đẩy thân đứng lên'),
  pose('02-stand-rear', 100, 'Đứng vững'),
  pose('20-turn-fifth', 50, 'Chuẩn bị quay theo hướng đi'),
  pose('19-turn-fourth', 50, 'Chuyển trọng lượng khi quay'),
  pose('01-turn-mid', 50, 'Quay theo hướng đi'),
  pose('18-turn-second', 50, 'Bước xoay theo đường đi'),
  pose('17-turn-first', 50, 'Ổn định hướng bước'),
  pose('00-stand-angled', 130, 'Sẵn sàng di chuyển'),
];

const startWalk: StudyStep[] = [
  pose('00-stand-angled', 160, 'Đứng vững'),
  { ...pose('11-step-ready', 140, 'Dồn trọng lượng, nhấc gót'), travelEnd: 0.02 },
  { bank: 'walk', frameId: '03-passing', durationMs: 100, phase: 'Bước đầu', travelEnd: 0.05 },
  { bank: 'walk', frameId: '04-late-passing', durationMs: 100, phase: 'Đưa chân tới', travelEnd: 0.10 },
  { bank: 'walk', frameId: '05-reaching', durationMs: 100, phase: 'Đón bước', travelEnd: 0.14 },
  { bank: 'walk', frameId: '06-opposite-contact', durationMs: 120, phase: 'Tiếp đất', travelEnd: 0.18 },
];

const walkingIds = ['07-opposite-loading', '08-opposite-support', '09-opposite-passing',
  '10-opposite-late-passing', '11-opposite-reaching', '00-contact', '01-loading',
  '02-support', '03-passing', '04-late-passing', '05-reaching', '06-opposite-contact'];
const cruise: StudyStep[] = walkingIds.map((frameId, index) => ({
  bank: 'walk', frameId, durationMs: 100, phase: 'Đi bộ', travelEnd: 0.95 * (index + 1) / 12,
}));

const stopWalk: StudyStep[] = [
  { bank: 'walk', frameId: '06-opposite-contact', durationMs: 100, phase: 'Chuẩn bị dừng', travelEnd: 0 },
  { bank: 'walk', frameId: '07-opposite-loading', durationMs: 110, phase: 'Nhận bước', travelEnd: 0.06 },
  { bank: 'walk', frameId: '08-opposite-support', durationMs: 110, phase: 'Giảm tốc', travelEnd: 0.11 },
  { bank: 'walk', frameId: '09-opposite-passing', durationMs: 120, phase: 'Thu ngắn bước', travelEnd: 0.145 },
  { ...pose('12-stop-close', 120, 'Đặt chân cạnh chân trụ'), travelEnd: 0.17 },
  { ...pose('13-stop-settle', 140, 'Ổn định trọng lượng'), travelEnd: 0.18 },
  { ...pose('00-stand-angled', 200, 'Đứng yên'), travelEnd: 0.18 },
];

/** Each group owns local travel. Concatenation preserves its final world position. */
function concatenate(groups: readonly (readonly StudyStep[])[]): StudyStep[] {
  const result: StudyStep[] = [];
  let travel = 0;
  for (const group of groups) {
    for (const step of group) result.push({ ...step, travelEnd: travel + step.travelEnd });
    travel += group.at(-1)?.travelEnd ?? 0;
  }
  return result;
}

export function transitionDefinition(id: TransitionClipId): readonly StudyStep[] {
  if (id === 'sitDown') return sitDown;
  if (id === 'standUp') return standUp;
  if (id === 'startWalk') return startWalk;
  if (id === 'stopWalk') return stopWalk;
  if (id === 'turn') return turn;
  return concatenate([standUp, startWalk, cruise, stopWalk, sitDown]);
}

export function compileStudySequence(steps: readonly StudyStep[], atlases: Record<StudyBank, StudyAtlas>): StudySequence {
  if (!steps.length) throw new Error('Chuỗi chưa có tư thế.');
  let startMs = 0;
  let travel = 0;
  const compiled = steps.map(step => {
    if (!Number.isSafeInteger(step.durationMs) || step.durationMs <= 0) throw new Error('Thời lượng khung không hợp lệ.');
    if (!Number.isFinite(step.travelEnd) || step.travelEnd < travel) throw new Error('Đường đi bị lùi ngoài dự kiến.');
    const index = atlases[step.bank].frames.findIndex(frame => frame.id === step.frameId);
    if (index < 0) throw new Error(`Đang chờ tư thế: ${step.frameId}`);
    const rootOffset = { x: 0, y: 0 };
    if (step.rightFootReference) {
      const target = atlases[step.bank].frames.find(frame => frame.id === step.rightFootReference)?.rightFoot;
      const contact = atlases[step.bank].frames[index].rightFoot;
      if (!target || !contact) throw new Error(`Thiếu điểm chân trụ: ${step.frameId}`);
      rootOffset.x = target.x - contact.x;
      rootOffset.y = target.y - contact.y;
    }
    const compiledStep = { ...step, index, startMs, endMs: startMs + step.durationMs, travelStart: travel, rootOffset };
    startMs = compiledStep.endMs;
    travel = step.travelEnd;
    return compiledStep;
  });
  return { steps: compiled, durationMs: startMs };
}

export function sampleStudySequence(sequence: StudySequence, timeMs: number) {
  const time = Number.isFinite(timeMs) ? Math.max(0, Math.min(sequence.durationMs, timeMs)) : 0;
  const stepIndex = Math.max(0, sequence.steps.findIndex(step => time < step.endMs));
  const complete = time >= sequence.durationMs;
  const step = complete ? sequence.steps[sequence.steps.length - 1] : sequence.steps[stepIndex];
  const progress = Math.max(0, Math.min(1, (time - step.startMs) / step.durationMs));
  return { ...step, timeMs: time, complete, travel: step.travelStart + (step.travelEnd - step.travelStart) * progress };
}

export function stepStudyTime(sequence: StudySequence, timeMs: number, direction: -1 | 1) {
  const time = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0;
  if (direction === 1) return sequence.steps.find(step => step.startMs > time + 0.001)?.startMs ?? sequence.durationMs;
  for (let index = sequence.steps.length - 1; index >= 0; index--) {
    if (sequence.steps[index].startMs < time - 0.001) return sequence.steps[index].startMs;
  }
  return 0;
}

export function advanceStudyTime(timeMs: number, elapsedMs: number, speed: number, durationMs: number) {
  const time = Number.isFinite(timeMs) ? Math.max(0, Math.min(durationMs, timeMs)) : 0;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs >= 500) return time;
  if (!Number.isFinite(speed) || speed <= 0) return time;
  return Math.min(durationMs, time + elapsedMs * speed);
}
