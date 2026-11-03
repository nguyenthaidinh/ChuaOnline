import { lazy, Suspense, useMemo, useState } from 'react';
import { templeAssets } from '../config/templeAssets';
import type { ActorSpec } from '../three/templeScene';

const Temple3D = lazy(() => import('../three/Temple3D').then((module) => ({ default: module.Temple3D })));

export function ChanhDienStage({ name }: { name: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // One preview actor checks the retained walk/kneel animation pipeline.
  // Direct ritual commands and a finite bow sequence belong to stage 2.
  const specs = useMemo<ActorSpec[]>(() => [{
    key: 'session-preview', at: { x: 50, y: 84 }, mode: 'pray', enter: 'walk', label: { name },
  }], [name]);

  return (
    <section className="stage-panel" aria-label="Chánh điện">
      <div className="temple-stage">
        {!backgroundFailed && <img className="temple-background" src={templeAssets.background} alt="Chánh điện với tượng Phật ở chính giữa và lư hương phía trước" onError={() => setBackgroundFailed(true)} />}
        {backgroundFailed && <div className="missing-background font-temple">Nam Mô A Di Đà Phật</div>}
        <div className="stage-shade" />
        <div className="stage-caption font-temple">Nam Mô A Di Đà Phật</div>
        <Suspense fallback={null}>
          <Temple3D key={attempt} specs={specs} onReady={(ready) => setStatus(ready ? 'ready' : 'fallback')} />
        </Suspense>
        {status === 'fallback' && <div className="fallback-person" aria-label="Biểu tượng người tham gia"><span aria-hidden="true">🙏</span><small>{name}</small></div>}
      </div>
      <div className="scene-status" role="status">
        <span className={`status-dot ${status === 'ready' ? 'ready' : ''}`} aria-hidden="true" />
        <span>{status === 'loading' ? 'Đang chuẩn bị nhân vật…' : status === 'ready' ? 'Chánh điện đã sẵn sàng' : 'Đang dùng hình đại diện đơn giản. Bạn vẫn có thể nghe nhạc và thỉnh chuông.'}</span>
        {status === 'fallback' && <button type="button" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}>Thử lại 3D</button>}
      </div>
    </section>
  );
}
