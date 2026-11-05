import { useRef } from 'react';
import { Icon } from '../room/Icon';
import './song-thuan-promo.css';

export function SongThuanPromo() {
  const dialog = useRef<HTMLDialogElement>(null);

  return <>
    <button className="song-thuan-trigger" onClick={() => dialog.current?.showModal()}
      aria-haspopup="dialog" aria-controls="song-thuan-dialog">
      <span className="song-thuan-trigger-copy"><strong>Sống Thuận</strong><small>Phong thủy · Tu dưỡng mỗi ngày</small></span>
      <Icon name="arrow" />
    </button>
    <dialog ref={dialog} id="song-thuan-dialog" className="temple-dialog song-thuan-dialog" aria-labelledby="song-thuan-title"
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="song-thuan-content">
        <button className="dialog-close" aria-label="Đóng giới thiệu Sống Thuận" onClick={() => dialog.current?.close()}><Icon name="close" /></button>
        <span className="dialog-eyebrow">GIEO BÌNH AN MỖI NGÀY</span>
        <h2 id="song-thuan-title">Sống Thuận</h2>
        <p className="song-thuan-tagline">Thuận thời · Gia định · Bình an</p>
        <p className="dialog-description">Một người bạn đồng hành để tu dưỡng bản thân, tìm hiểu phong thủy và chăm chút đời sống mỗi ngày.</p>
        <ul className="song-thuan-features">
          <li><strong>Tu dưỡng mỗi ngày</strong><span>Đọc và nghe những bài diễn giải, câu chuyện để lắng lại và suy ngẫm.</span></li>
          <li><strong>Thuận Thời</strong><span>Khám phá lịch âm dương, 24 tiết khí và sắp xếp kế hoạch cá nhân.</span></li>
          <li><strong>An Cư · Ngũ Hành</strong><span>Tìm hiểu hướng nhà, la bàn, Bát Trạch và ý nghĩa văn hóa của màu sắc, con số.</span></li>
        </ul>
        <a className="song-thuan-cta" href="https://dailywisdom.itcctv-soft.com/" target="_blank" rel="noopener noreferrer">
          Khám phá Sống Thuận <Icon name="arrow" />
        </a>
        <p className="song-thuan-note">Có ứng dụng Android</p>
      </div>
    </dialog>
  </>;
}
