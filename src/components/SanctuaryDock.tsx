import { Icon } from '../room/Icon';

interface SanctuaryDockProps {
  status: string;
  ritualWish: string;
  joined: boolean;
  canEnter: boolean;
  canAct: boolean;
  musicState: 'playing' | 'loading' | 'off';
  onEnter: () => void;
  onIncense: () => void;
  onBow: () => void;
  onOfferings: () => void;
  onBlessing: () => void;
  onAudio: () => void;
}

export function SanctuaryDock({
  status, ritualWish, joined, canEnter, canAct, musicState,
  onEnter, onIncense, onBow, onOfferings, onBlessing, onAudio,
}: SanctuaryDockProps) {
  return <section className="sanctuary-dock" aria-label="Thao tác trong chánh điện" data-joined={joined}>
    <div className="dock-status">
      <p className="room-hint" role="status" aria-live="polite">{status}</p>
      {ritualWish && <p className="ritual-wish" role="status">{ritualWish}</p>}
    </div>

    <div className="ritual-toolbar">
      {!joined
        ? <button className="ritual-button primary enter-button" aria-label="Vào an tọa" disabled={!canEnter} onClick={onEnter}>
          <span className="action-icon"><Icon name="lotus" /></span>
          <span>Vào an tọa</span>
          <Icon name="arrow" />
        </button>
        : <>
          <button className="ritual-button primary" disabled={!canAct} onClick={onIncense}>
            <span className="action-icon"><Icon name="incense" /></span><span>Thắp hương</span>
          </button>
          <button className="ritual-button" disabled={!canAct} onClick={onBow}>
            <span className="action-icon"><Icon name="bow" /></span>
            <span className="action-copy"><span>Lễ Phật</span><small>3 lạy</small></span>
          </button>
          <button className="ritual-button offering-open" disabled={!canAct} onClick={onOfferings}>
            <span className="action-icon"><Icon name="lotus" /></span><span>Dâng lễ</span>
          </button>
        </>}
      <button className="ritual-button" onClick={onBlessing}>
        <span className="action-icon"><Icon name="lotus" /></span><span>Lời chúc</span>
      </button>
      <button className={`ritual-button music-control ${musicState === 'playing' ? 'playing' : ''}`} onClick={onAudio}>
        <span className="action-icon"><Icon name="music" /></span>
        <span>{musicState === 'playing' ? 'Nhạc đang bật' : musicState === 'loading' ? 'Đang mở nhạc…' : 'Bật nhạc'}</span>
      </button>
    </div>

    <p className="dock-note">
      <span>Một chánh điện chung</span><i aria-hidden="true" />
      <span>Không cần tài khoản</span><i aria-hidden="true" />
      <span>Hoàn toàn miễn phí</span>
    </p>
  </section>;
}
