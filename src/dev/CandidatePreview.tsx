import { useEffect, useState } from 'react';
import { actorMetrics, projectFloor, roomAssets } from '../room/layout';
import { useSceneLayout } from '../hooks/useSceneLayout';
import { candidateFrameIndex } from './previewClock';

interface CandidateFrame {
  id: string;
  phase: string;
}

interface CandidateAtlas {
  status: 'draft' | 'complete-unreviewed';
  image: string;
  imageHash: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
  durationMs: number;
  frames: CandidateFrame[];
}

function parseAtlas(value: unknown): CandidateAtlas {
  if (!value || typeof value !== 'object') throw new Error('Manifest không hợp lệ.');
  const data = value as Record<string, unknown>;
  if (data.status !== 'draft' && data.status !== 'complete-unreviewed') {
    throw new Error('Trạng thái bản thử không hợp lệ.');
  }
  for (const key of ['width', 'height', 'columns', 'rows', 'durationMs']) {
    if (typeof data[key] !== 'number' || !Number.isSafeInteger(data[key]) || data[key] <= 0) {
      throw new Error(`Manifest thiếu ${key}.`);
    }
  }
  if (typeof data.image !== 'string' || !/^[a-z0-9-]+\.webp$/.test(data.image)) {
    throw new Error('Đường dẫn atlas không hợp lệ.');
  }
  if (typeof data.imageHash !== 'string' || !/^[a-f0-9]{64}$/.test(data.imageHash)) {
    throw new Error('Manifest thiếu phiên bản nội dung ảnh.');
  }
  if (!Array.isArray(data.frames) || !data.frames.length || data.frames.some(frame =>
    !frame || typeof frame.id !== 'string' || typeof frame.phase !== 'string')) {
    throw new Error('Danh sách khung không hợp lệ.');
  }
  if (data.frames.length > Number(data.columns) * Number(data.rows)) {
    throw new Error('Atlas không đủ ô cho số khung.');
  }
  if (new Set(data.frames.map(frame => frame.id)).size !== data.frames.length) {
    throw new Error('Atlas có ID khung bị trùng.');
  }
  return data as unknown as CandidateAtlas;
}

const CANDIDATE_ROOT = '/artwork/animation-v3/walk-v1/';

/** Reads authoring assets outside public/. Unreviewed artwork never enters dist/. */
export function CandidatePreview({ progress, guides, floorStudy = false }: { progress: number; guides: boolean; floorStudy?: boolean }) {
  const layout = useSceneLayout();
  const [atlas, setAtlas] = useState<CandidateAtlas | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    const timeout = window.setTimeout(() => {
      abort.abort();
      setError('Tải bản thử quá lâu. Kiểm tra máy chủ rồi tải lại.');
    }, 15000);
    setAtlas(null);
    setError('');
    void (async () => {
      const response = await fetch(`${CANDIDATE_ROOT}review.json`, { signal: abort.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Chưa có bản atlas thử. Hãy xuất tài nguyên rồi tải lại bản thử.');
      const manifest = parseAtlas(await response.json());
      const image = new Image();
      image.src = `${CANDIDATE_ROOT}${manifest.image}?v=${manifest.imageHash}`;
      await image.decode();
      if (image.naturalWidth !== manifest.width * manifest.columns || image.naturalHeight !== manifest.height * manifest.rows) {
        throw new Error('Kích thước ảnh thật không khớp manifest.');
      }
      if (!abort.signal.aborted) setAtlas(manifest);
    })().catch(reason => {
      if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không đọc được atlas thử.');
    }).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); abort.abort(); };
  }, [attempt]);

  const index = atlas ? candidateFrameIndex(progress, atlas.frames.length) : 0;
  // Match the current 0.95 m gait stride; the authoring clock plays a cycle in 1.2 s.
  const axisDistance = 0.95 / Math.SQRT2;
  const point = { x: -1.5 + progress * axisDistance, z: 4.6 - progress * axisDistance };
  const projected = projectFloor(point, layout.id);
  const metrics = actorMetrics(point, layout.id);
  if (floorStudy) {
    return <div className="lab-walk-room" data-layout={layout.id} style={{ backgroundImage: `url('${roomAssets.hall[layout.id]}')` }} aria-label="Đi thử một chu kỳ trên sàn chánh điện">
      {atlas && <div className="lab-floor-sprite" data-floor-frame={atlas.frames[index].id} style={{
        left: `${projected.x}%`, top: `${projected.y}%`, height: `${metrics.canvasHeight}%`,
        backgroundImage: `url('${CANDIDATE_ROOT}${atlas.image}?v=${atlas.imageHash}')`,
        backgroundSize: `${atlas.columns * 100}% ${atlas.rows * 100}%`,
        backgroundPosition: `${index % atlas.columns / Math.max(1, atlas.columns - 1) * 100}% ${Math.floor(index / atlas.columns) / Math.max(1, atlas.rows - 1) * 100}%`,
      }} />}
      <p>Phòng thử ngoại tuyến · 0,95 m/chu kỳ · lặp lại sẽ trở về điểm đầu</p>
    </div>;
  }
  return <>
    {atlas ? <div className="lab-sprite" data-candidate-frame={atlas.frames[index].id} style={{
      backgroundImage: `url('${CANDIDATE_ROOT}${atlas.image}?v=${atlas.imageHash}')`,
      backgroundSize: `${atlas.columns * 100}% ${atlas.rows * 100}%`,
      backgroundPosition: `${index % atlas.columns / Math.max(1, atlas.columns - 1) * 100}% ${Math.floor(index / atlas.columns) / Math.max(1, atlas.rows - 1) * 100}%`,
      aspectRatio: `${atlas.width}/${atlas.height}`,
    }}>
      {guides && <i className="lab-pivot" style={{ left: '50%', top: '91.40625%' }} title="Điểm gốc sàn" />}
    </div> : <div className="lab-candidate-loading" role="status">{error || 'Đang tải atlas thử…'}</div>}
    <p className="lab-caption">{atlas ? `${atlas.frames[index].id} · ${atlas.frames[index].phase} · ${atlas.frames.length}/12 khung · ${atlas.status==='draft'?'chưa đủ chu kỳ':'đang kiểm nghiệm chuyển động'}` : 'Nguồn key pose mới'}</p>
    <button onClick={() => setAttempt(value => value + 1)}>Tải lại bản thử</button>
  </>;
}
