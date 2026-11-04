export interface StudyFrame {
  id: string;
  phase: string;
  rightFoot?: { x: number; y: number };
}

export interface StudyAtlas {
  status: 'draft' | 'complete-unreviewed' | 'compiled';
  image: string;
  imageHash: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
  durationMs: number;
  frames: StudyFrame[];
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Manifest không hợp lệ.');
  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown, name: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Manifest thiếu ${name}.`);
  }
  return value;
}

/** All studies use the same 384×512 world canvas and (192,468) floor origin. */
export function parseStudyAtlas(value: unknown): StudyAtlas {
  const data = record(value);
  if (data.status !== 'draft' && data.status !== 'complete-unreviewed' && data.status !== 'compiled') throw new Error('Trạng thái bản thử không hợp lệ.');
  if (typeof data.image !== 'string' || !/^[a-z0-9-]+\.webp$/.test(data.image)) throw new Error('Đường dẫn atlas không hợp lệ.');
  if (typeof data.imageHash !== 'string' || !/^[a-f0-9]{64}$/.test(data.imageHash)) throw new Error('Manifest thiếu phiên bản nội dung ảnh.');
  const width = positiveInteger(data.width, 'width');
  const height = positiveInteger(data.height, 'height');
  if (width !== 384 || height !== 512) throw new Error('Canvas bản thử phải là 384×512.');
  const columns = positiveInteger(data.columns, 'columns');
  const rows = positiveInteger(data.rows, 'rows');
  const durationMs = positiveInteger(data.durationMs, 'durationMs');
  if (!Array.isArray(data.frames) || !data.frames.length) throw new Error('Danh sách khung không hợp lệ.');
  const frames = (data.frames as unknown[]).map(value => {
    const frame = record(value);
    if (typeof frame.id !== 'string' || !frame.id || typeof frame.phase !== 'string') throw new Error('Khung thiếu ID hoặc tên tư thế.');
    let rightFoot: StudyFrame['rightFoot'];
    if (frame.rightFoot !== undefined) {
      const point = record(frame.rightFoot);
      if (typeof point.x !== 'number' || !Number.isFinite(point.x) || point.x < 0 || point.x > width
        || typeof point.y !== 'number' || !Number.isFinite(point.y) || point.y < 0 || point.y > height) {
        throw new Error('Điểm chân ngoài canvas bản thử.');
      }
      rightFoot = { x: point.x, y: point.y };
    }
    return { id: frame.id, phase: frame.phase, ...(rightFoot ? { rightFoot } : {}) };
  });
  if (frames.length > columns * rows) throw new Error('Atlas không đủ ô cho số khung.');
  if (new Set(frames.map(frame => frame.id)).size !== frames.length) throw new Error('Atlas có ID khung bị trùng.');
  return { status: data.status, image: data.image, imageHash: data.imageHash, width, height, columns, rows, durationMs, frames };
}

export function studyImageUrl(root: string, atlas: StudyAtlas) {
  return `${root}${atlas.image}?v=${atlas.imageHash}`;
}

export function studyBackground(atlas: StudyAtlas, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= atlas.frames.length) throw new Error('Chỉ số khung ngoài atlas.');
  return {
    backgroundSize: `${atlas.columns * 100}% ${atlas.rows * 100}%`,
    backgroundPosition: `${index % atlas.columns / Math.max(1, atlas.columns - 1) * 100}% ${Math.floor(index / atlas.columns) / Math.max(1, atlas.rows - 1) * 100}%`,
  };
}
