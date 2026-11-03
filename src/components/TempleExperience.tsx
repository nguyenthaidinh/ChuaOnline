import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTempleSession } from '../hooks/useTempleSession';
import { BLESSINGS } from '../data/blessings';
import { ChanhDienStage } from './ChanhDienStage';
import { ExperienceActions } from './ExperienceActions';
import { useSceneLayout } from '../hooks/useSceneLayout';

export function TempleExperience({ name, onLeave, leaveDisabled, children }: {
  name: string; onLeave: () => void; leaveDisabled: boolean; children: ReactNode;
}) {
  const session = useTempleSession();
  const layout = useSceneLayout();
  const root = useRef<HTMLDivElement>(null);
  const blessingDialog = useRef<HTMLDialogElement>(null);
  const [blessing, setBlessing] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  useEffect(() => {
    if (blessing !== null && !blessingDialog.current?.open) blessingDialog.current?.showModal();
    if (blessing === null) blessingDialog.current?.close();
  }, [blessing]);
  const toggleFullscreen = async () => {
    setFullscreenError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setFullscreenError('Trình duyệt này chưa hỗ trợ toàn màn hình. Bạn vẫn có thể dùng chánh điện bình thường.');
    } catch { setFullscreenError('Chưa mở được toàn màn hình. Bạn có thể thử lại.'); }
  };
  return <div ref={root} className="experience-shell" data-layout={layout.id} data-session-id={session.actorId} data-phase={session.phase}
    data-command-id={session.command?.id ?? ''} data-completed-bows={session.completedBows}>
    <div className="experience-heading"><div><span className="eyebrow">CHÀO BẠN, {name}</span><h1 className="font-temple">Chánh điện</h1></div>
      <div className="view-controls"><button type="button" onClick={() => void toggleFullscreen()} aria-pressed={fullscreen}>{fullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</button>
      <button type="button" onClick={onLeave} disabled={leaveDisabled}>Về trang đầu</button></div></div>
    {fullscreenError && <p className="audio-error" role="alert">{fullscreenError}</p>}
    <ChanhDienStage name={name} command={session.command} layout={layout} sceneStatus={session.sceneStatus} incenseLit={session.incenseLit}
      onEvent={session.report} onSceneStatus={session.setSceneStatus} />
    <div className="experience-controls">
    <ExperienceActions disabled={session.sceneStatus === 'loading' || Boolean(session.command)} busy={Boolean(session.command)}
      onAction={session.start} onBlessing={() => setBlessing(previous => {
        const offset = 1 + Math.floor(Math.random() * (BLESSINGS.length - 1));
        return previous === null ? Math.floor(Math.random() * BLESSINGS.length) : (previous + offset) % BLESSINGS.length;
      })} />
    {children}
    </div>
    <p className={`ritual-message ${session.phase === 'error' ? 'ritual-error' : ''}`} role="status" aria-live="polite">{session.message}</p>
    <dialog ref={blessingDialog} className="blessing-panel" aria-labelledby="blessing-title" onClose={() => setBlessing(null)}>
      <div><h2 id="blessing-title" className="eyebrow">GỬI BẠN MỘT LỜI CHÚC</h2><button type="button" onClick={() => setBlessing(null)} aria-label="Đóng lời chúc">×</button></div>
      <p className="font-temple">{blessing === null ? '' : BLESSINGS[blessing]}</p>
    </dialog>
  </div>;
}
