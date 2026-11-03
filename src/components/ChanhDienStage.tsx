import { lazy, Suspense, useState } from 'react';
import { templeAssets } from '../config/templeAssets';
import type { SceneLayout } from '../config/sceneLayout';
import { TempleFallback } from './TempleFallback';
import type { RitualCommand, RitualEvent, SceneStatus } from '../types/experience';

const Temple3D = lazy(() => import('../three/Temple3D').then(module => ({ default: module.Temple3D })));

export function ChanhDienStage({ name, command, layout, sceneStatus, incenseLit, onEvent, onSceneStatus }: {
  name: string;
  command: RitualCommand | null;
  layout: SceneLayout;
  sceneStatus: SceneStatus;
  incenseLit: boolean;
  onEvent: (event: RitualEvent) => void;
  onSceneStatus: (status: SceneStatus) => void;
}) {
  const [failedBackground, setFailedBackground] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const background = templeAssets.backgrounds[layout.id];
  return <section className="stage-panel" aria-label="Chánh điện">
    <div className="temple-stage" data-layout={layout.id} style={{ aspectRatio: layout.aspectRatio }}>
      {failedBackground !== background && <img key={background} className="temple-background" src={background}
        alt="Chánh điện với tượng Phật ở chính giữa, lư hương và lối đi trên sàn" onError={() => setFailedBackground(background)} />}
      {failedBackground === background && <div className="missing-background font-temple">Nam Mô A Di Đà Phật</div>}
      <div className="stage-shade" />
      <div className="temple-halo" aria-hidden="true" style={{ left: `${layout.points.halo.x}%`, top: `${layout.points.halo.y}%`, width: `${layout.haloWidth}%` }} />
      {(['home', 'altar'] as const).map(point => <div key={point} className="temple-cushion" aria-hidden="true"
        data-anchor={point} style={{ left: `${layout.points[point].x}%`, top: `${layout.points[point].y}%`, width: `${layout.cushionWidth}%` }} />)}
      <div className="stage-caption font-temple">Nam Mô A Di Đà Phật</div>
      {incenseLit && <div className="incense-smoke" style={{ left: `${layout.points.burner.x}%`, top: `${layout.points.burner.y}%` }} aria-label="Hương đã thắp"><i /><i /><i /></div>}
      {sceneStatus !== 'fallback' && <Suspense fallback={null}>
        <Temple3D key={attempt} name={name} command={command} layout={layout} onEvent={onEvent}
          onReady={ready => onSceneStatus(ready ? 'ready' : 'fallback')} />
      </Suspense>}
      {sceneStatus === 'fallback' && <TempleFallback name={name} command={command} layout={layout} onEvent={onEvent} />}
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
