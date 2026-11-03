import { lazy, Suspense, useState } from 'react';
import { templeAssets } from '../config/templeAssets';
import { RITUAL_POINTS } from '../config/ritual';
import { TempleFallback } from './TempleFallback';
import type { RitualCommand, RitualEvent, SceneStatus } from '../types/experience';

const Temple3D = lazy(() => import('../three/Temple3D').then(module => ({ default: module.Temple3D })));

export function ChanhDienStage({ name, command, sceneStatus, incenseLit, onEvent, onSceneStatus }: {
  name: string;
  command: RitualCommand | null;
  sceneStatus: SceneStatus;
  incenseLit: boolean;
  onEvent: (event: RitualEvent) => void;
  onSceneStatus: (status: SceneStatus) => void;
}) {
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <section className="stage-panel" aria-label="Chánh điện">
    <div className="temple-stage">
      {!backgroundFailed && <img className="temple-background" src={templeAssets.background}
        alt="Chánh điện với tượng Phật ở chính giữa và lư hương phía trước" onError={() => setBackgroundFailed(true)} />}
      {backgroundFailed && <div className="missing-background font-temple">Nam Mô A Di Đà Phật</div>}
      <div className="stage-shade" />
      <div className="stage-caption font-temple">Nam Mô A Di Đà Phật</div>
      {incenseLit && <div className="incense-smoke" style={{ left: `${RITUAL_POINTS.burner.x}%`, top: `${RITUAL_POINTS.burner.y}%` }} aria-label="Hương đã thắp"><i /><i /><i /></div>}
      {sceneStatus !== 'fallback' && <Suspense fallback={null}>
        <Temple3D key={attempt} name={name} command={command} onEvent={onEvent}
          onReady={ready => onSceneStatus(ready ? 'ready' : 'fallback')} />
      </Suspense>}
      {sceneStatus === 'fallback' && <TempleFallback name={name} command={command} onEvent={onEvent} />}
      {sceneStatus === 'loading' && <span className="scene-loading">Đang chuẩn bị nhân vật…</span>}
    </div>
    <div className="scene-status">
      <span className={`status-dot ${sceneStatus === 'ready' ? 'ready' : ''}`} aria-hidden="true" />
      <span>{sceneStatus === 'loading' ? 'Đang tải cảnh' : sceneStatus === 'ready' ? 'Chánh điện đã sẵn sàng' : 'Chế độ 2D · Nghi lễ và âm thanh vẫn dùng được'}</span>
      {sceneStatus === 'fallback' && <button type="button" disabled={Boolean(command)} onClick={() => {
        onSceneStatus('loading'); setAttempt(value => value + 1);
      }}>Thử lại 3D</button>}
    </div>
  </section>;
}
