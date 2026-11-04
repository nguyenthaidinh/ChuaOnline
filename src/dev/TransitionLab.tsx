import { useEffect, useMemo, useRef, useState } from 'react';
import { roomAssets, actorMetrics, projectFloor } from '../room/layout';
import { useSceneLayout } from '../hooks/useSceneLayout';
import { studyBackground, studyImageUrl } from './studyAtlas';
import { useStudyAtlas, WALK_STUDY_ROOT, TRANSITION_STUDY_ROOT } from './useStudyAtlas';
import { advanceStudyTime, compileStudySequence, sampleStudySequence, stepStudyTime, transitionDefinition, type TransitionClipId } from './transitionTimeline';
import './animationLab.css';

const CLIPS: readonly [TransitionClipId, string][] = [
  ['sequence', 'Ghép đứng dậy → đi → dừng → ngồi'],
  ['standUp', 'Đứng dậy có điểm tựa'],
  ['startWalk', 'Bắt đầu bước'],
  ['stopWalk', 'Giảm tốc và dừng'],
  ['sitDown', 'Quay và ngồi nhìn tượng Phật'],
];

export default function TransitionLab() {
  const walk = useStudyAtlas(WALK_STUDY_ROOT);
  const transition = useStudyAtlas(TRANSITION_STUDY_ROOT);
  const layout = useSceneLayout();
  const [clipId, setClipId] = useState<TransitionClipId>('sequence');
  const [timeMs, setTimeMs] = useState(0);
  const timeRef = useRef(0);
  timeRef.current = timeMs;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.25);
  const [guides, setGuides] = useState(true);
  const [background, setBackground] = useState('light');
  const compiled = useMemo(() => {
    if (!walk.atlas || !transition.atlas) return { sequence: null, error: '' };
    try {
      return { sequence: compileStudySequence(transitionDefinition(clipId), { walk: walk.atlas, transition: transition.atlas }), error: '' };
    } catch (reason) {
      return { sequence: null, error: reason instanceof Error ? reason.message : 'Chưa ghép được chuỗi.' };
    }
  }, [clipId, walk.atlas, transition.atlas]);
  const sequence = compiled.sequence;

  useEffect(() => {
    if (!playing || !sequence) return;
    let raf = 0;
    let previous = performance.now();
    const tick = (timestamp: number) => {
      const elapsed = timestamp - previous;
      previous = timestamp;
      if (!document.hidden) {
        const next = advanceStudyTime(timeRef.current, elapsed, speed, sequence.durationMs);
        timeRef.current = next;
        setTimeMs(next);
        if (next >= sequence.durationMs) { setPlaying(false); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, sequence]);

  const sample = sequence ? sampleStudySequence(sequence, timeMs) : null;
  const atlas = sample?.bank === 'walk' ? walk.atlas : transition.atlas;
  const root = sample?.bank === 'walk' ? WALK_STUDY_ROOT : TRANSITION_STUDY_ROOT;
  const backgroundStyle = atlas && sample ? { backgroundImage: `url('${studyImageUrl(root, atlas)}')`, ...studyBackground(atlas, sample.index) } : {};
  const travel = sample?.travel ?? 0;
  const point = { x: -1.8 + travel / Math.SQRT2, z: 5 - travel / Math.SQRT2 };
  const projected = projectFloor(point, layout.id);
  const metrics = actorMetrics(point, layout.id);
  const seatDistances = clipId === 'sequence' ? [0, sequence?.steps[sequence.steps.length - 1]?.travelEnd ?? 0]
    : clipId === 'standUp' || clipId === 'sitDown' ? [0] : [];
  const error = walk.error || transition.error || compiled.error;
  const seek = (time: number) => { setPlaying(false); timeRef.current = time; setTimeMs(time); };
  const play = () => {
    if (!sequence) return;
    if (timeMs >= sequence.durationMs) { timeRef.current = 0; setTimeMs(0); }
    setPlaying(value => !value);
  };
  const retry = () => { seek(0); walk.retry(); transition.retry(); };

  return <main className="animation-lab transition-lab">
    <header><div><span className="lab-eyebrow">CHUAONLINE · NỐI CHUYỂN ĐỘNG</span><h1>Từ an tọa đến bước đi và trở lại</h1><p>Phòng thử ngoại tuyến · nguồn nam áo lam · chưa điều khiển phòng chung.</p></div><a href="?animation-lab">Xem chu kỳ đi ↗</a></header>
    <section className="lab-controls" aria-label="Điều khiển chuỗi chuyển tiếp">
      <label>Chuỗi kiểm<select value={clipId} onChange={event => { setClipId(event.target.value as TransitionClipId); seek(0); }}>{CLIPS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label>Tốc độ<select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value="0.25">0,25× · xem chậm</option><option value="0.5">0,5×</option><option value="1">1× · nhịp nguồn thử</option></select></label>
      <label>Nền kiểm<select value={background} onChange={event => setBackground(event.target.value)}><option value="light">Nền sáng</option><option value="dark">Nền tối</option><option value="temple">Chánh điện</option></select></label>
      <label className="lab-check"><input type="checkbox" checked={guides} onChange={event => setGuides(event.target.checked)} />Hiện điểm gốc sàn</label>
      <button onClick={retry}>Tải lại nguồn thử</button>
    </section>
    {!sequence && <p className="lab-load-status" role="status">{error || 'Đang tải hai bộ nguồn và ghép chuỗi…'}</p>}
    <section className={`lab-comparison lab-bg-${background}`} aria-label="Kiểm chuỗi ở hai kích thước">
      <article><h2>Tư thế phóng lớn</h2><div className="lab-stage" style={background === 'temple' ? { backgroundImage: `url('${roomAssets.hall.desktop}')` } : undefined}>
        {sample && atlas && <div className="lab-sprite" data-transition-frame={sample.frameId} data-transition-phase={sample.phase} style={backgroundStyle}>
          {guides && <i className="lab-pivot" style={{ left: '50%', top: '91.40625%' }} title="Điểm gốc sàn" />}
        </div>}
        <p className="lab-caption">{sample ? `${sample.phase} · ${sample.frameId}` : 'Đang chờ nguồn'}</p>
      </div></article>
      <article><h2>Trên sàn chánh điện</h2><div className="lab-walk-room" data-layout={layout.id} style={{ backgroundImage: `url('${roomAssets.hall[layout.id]}')` }}>
        {sequence && seatDistances.map((distance, index) => {
          const seat = { x: -1.8 + distance / Math.SQRT2, z: 5 - distance / Math.SQRT2 };
          const position = projectFloor(seat, layout.id);
          return <img key={index} className="fixed-cushion" src={roomAssets.effect('cushion')} alt="" style={{ left: `${position.x}%`, top: `${position.y}%`, height: `${actorMetrics(seat, layout.id).height * 0.25}%` }} />;
        })}
        {sample && atlas && <div className="lab-floor-sprite" data-transition-floor={sample.frameId} style={{ ...backgroundStyle, left: `${projected.x}%`, top: `${projected.y}%`, height: `${metrics.canvasHeight}%` }} />}
        <p>Phòng thử · kết thúc sẽ giữ tư thế cuối</p>
      </div></article>
    </section>
    <section className="lab-transport" aria-label="Tua chuỗi chuyển tiếp">
      <button disabled={!sequence} onClick={() => sequence && seek(stepStudyTime(sequence, timeMs, -1))}>← Tư thế trước</button>
      <button className="lab-play" disabled={!sequence} aria-pressed={playing} onClick={play}>{playing ? 'Tạm dừng' : sample?.complete ? 'Chạy lại chuỗi' : 'Phát chuỗi'}</button>
      <button disabled={!sequence} onClick={() => sequence && seek(stepStudyTime(sequence, timeMs, 1))}>Tư thế tiếp →</button>
      <label htmlFor="transition-time">Thời gian <output>{(timeMs / 1000).toFixed(2)} / {((sequence?.durationMs ?? 0) / 1000).toFixed(2)} s</output><input id="transition-time" type="range" min="0" max={sequence?.durationMs ?? 1} step="1" value={timeMs} disabled={!sequence} onChange={event => seek(Number(event.target.value))} /></label>
    </section>
    <aside>Kiểm tay chống đỡ khi đứng dậy, chân trụ lúc bắt đầu/dừng, hướng đầu khi quay và tỷ lệ đầu trong tư thế ngồi. Chuỗi đứng dậy có ảnh riêng, không đảo ngược video ngồi. Thời gian này dùng để duyệt nguồn, chưa đổi lịch nghi lễ của server.</aside>
  </main>;
}
