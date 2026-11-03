import { useState, type ReactNode } from 'react';
import { useTempleSession } from '../hooks/useTempleSession';
import { BLESSINGS } from '../data/blessings';
import { ChanhDienStage } from './ChanhDienStage';
import { ExperienceActions } from './ExperienceActions';

export function TempleExperience({ name, onLeave, leaveDisabled, children }: {
  name: string; onLeave: () => void; leaveDisabled: boolean; children: ReactNode;
}) {
  const session = useTempleSession();
  const [blessing, setBlessing] = useState<number | null>(null);
  return <div className="experience-shell" data-session-id={session.actorId} data-phase={session.phase}
    data-command-id={session.command?.id ?? ''} data-completed-bows={session.completedBows}>
    <div className="experience-heading"><div><span className="eyebrow">CHÀO BẠN, {name}</span><h1 className="font-temple">Chánh điện</h1></div>
      <button type="button" onClick={onLeave} disabled={leaveDisabled}>Về trang đầu</button></div>
    <ChanhDienStage name={name} command={session.command} sceneStatus={session.sceneStatus} incenseLit={session.incenseLit}
      onEvent={session.report} onSceneStatus={session.setSceneStatus} />
    <ExperienceActions disabled={session.sceneStatus === 'loading' || Boolean(session.command)} busy={Boolean(session.command)}
      onAction={session.start} onBlessing={() => setBlessing(previous => {
        const offset = 1 + Math.floor(Math.random() * (BLESSINGS.length - 1));
        return previous === null ? Math.floor(Math.random() * BLESSINGS.length) : (previous + offset) % BLESSINGS.length;
      })} />
    <p className={`ritual-message ${session.phase === 'error' ? 'ritual-error' : ''}`} role="status" aria-live="polite">{session.message}</p>
    {children}
    {blessing !== null && <aside className="blessing-panel" aria-label="Lời chúc bình an">
      <div><span className="eyebrow">GỬI BẠN MỘT LỜI CHÚC</span><button type="button" onClick={() => setBlessing(null)} aria-label="Đóng lời chúc">×</button></div>
      <p className="font-temple" role="status">{BLESSINGS[blessing]}</p>
    </aside>}
  </div>;
}
