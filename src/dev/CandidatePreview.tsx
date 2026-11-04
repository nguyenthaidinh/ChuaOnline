import { actorMetrics, projectFloor, roomAssets } from '../room/layout';
import { useSceneLayout } from '../hooks/useSceneLayout';
import { candidateFrameIndex } from './previewClock';
import { useStudyAtlas, WALK_STUDY_ROOT } from './useStudyAtlas';
import { studyImageUrl, studyBackground } from './studyAtlas';

/** Reads authoring assets outside public/. Unreviewed artwork never enters dist/. */
export function CandidatePreview({ progress, guides, floorStudy = false }: { progress: number; guides: boolean; floorStudy?: boolean }) {
  const layout = useSceneLayout();
  const { atlas, error, retry } = useStudyAtlas(WALK_STUDY_ROOT);

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
        backgroundImage: `url('${studyImageUrl(WALK_STUDY_ROOT, atlas)}')`,
        ...studyBackground(atlas, index),
      }} />}
      <p>Phòng thử ngoại tuyến · 0,95 m/chu kỳ · lặp lại sẽ trở về điểm đầu</p>
    </div>;
  }
  return <>
    {atlas ? <div className="lab-sprite" data-candidate-frame={atlas.frames[index].id} style={{
      backgroundImage: `url('${studyImageUrl(WALK_STUDY_ROOT, atlas)}')`,
      ...studyBackground(atlas, index),
      aspectRatio: `${atlas.width}/${atlas.height}`,
    }}>
      {guides && <i className="lab-pivot" style={{ left: '50%', top: '91.40625%' }} title="Điểm gốc sàn" />}
    </div> : <div className="lab-candidate-loading" role="status">{error || 'Đang tải atlas thử…'}</div>}
    <p className="lab-caption">{atlas ? `${atlas.frames[index].id} · ${atlas.frames[index].phase} · ${atlas.frames.length}/12 khung · ${atlas.status==='draft'?'chưa đủ chu kỳ':'đang kiểm nghiệm chuyển động'}` : 'Nguồn key pose mới'}</p>
    <button onClick={retry}>Tải lại bản thử</button>
  </>;
}
