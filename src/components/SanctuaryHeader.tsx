import { Icon } from '../room/Icon';

interface SanctuaryHeaderProps {
  connected: boolean;
  onlineCount: number;
  ambientCount: number;
  fullscreen: boolean;
  joined: boolean;
  pending: boolean;
  onOpenGuests: () => void;
  onToggleFullscreen: () => void;
  onLeave: () => void;
}

export function SanctuaryHeader({
  connected, onlineCount, ambientCount, fullscreen, joined, pending,
  onOpenGuests, onToggleFullscreen, onLeave,
}: SanctuaryHeaderProps) {
  return <header className="sanctuary-header">
    <a className="temple-brand" href={import.meta.env.BASE_URL}>
      <span className="brand-emblem"><Icon name="lotus" /></span>
      <span className="brand-copy">
        <span className="brand-name">Đi Chùa Online</span>
        <span className="brand-tagline">MỘT KHOẢNG LẶNG CHO TÂM</span>
      </span>
    </a>

    <div className="header-right">
      <button className="presence-pill" onClick={onOpenGuests}
        aria-label={connected ? `${onlineCount} khách an tọa${ambientCount ? `, ${ambientCount} nhân vật mô phỏng` : ''}. Xem danh sách` : 'Đang kết nối chánh điện. Xem danh sách'}>
        <Icon name="people" />
        <span className="presence-copy">
          {connected
            ? <><b data-online-count>{onlineCount}</b><span className="presence-label">khách an tọa</span></>
            : <span>Đang kết nối…</span>}
        </span>
        {ambientCount > 0 && <span className="ambient-count">{ambientCount} mô phỏng</span>}
        <span className={`connection-dot ${connected ? 'connected' : ''}`} />
      </button>
      <button className="icon-button expand-control" aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
        title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} onClick={onToggleFullscreen}>
        <Icon name="expand" />
      </button>
      {joined && <button className="text-button leave-control" onClick={onLeave} disabled={pending} title="Rời điện">
        <span>Rời điện</span><Icon name="exit" />
      </button>}
    </div>
  </header>;
}
