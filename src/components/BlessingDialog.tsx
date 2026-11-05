import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BLESSINGS, BlessingDeck, blessingTitle, blessingAudio } from '../data/blessings';
import type { SoundEngine } from '../services/soundEngine';
import { Icon } from '../room/Icon';
import './blessing-discovery.css';

export interface BlessingDialogHandle {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

export const BlessingDialog = forwardRef<BlessingDialogHandle, { sound: SoundEngine }>(({ sound }, ref) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const [deck] = useState(() => new BlessingDeck());
  const [quote, setQuote] = useState(0);
  const [autoRead, setAutoRead] = useState(true);
  const [reading, setReading] = useState<'idle' | 'loading' | 'speaking' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const stop = () => {
    generation.current++;
    sound.stopNarration('blessing');
    setReading('idle');
  };

  const read = (index: number) => {
    const request = ++generation.current;
    setReading('loading');
    setMessage('');
    void sound.playNarration(`${import.meta.env.BASE_URL}${blessingAudio(index)}`, 'blessing', () => {
      if (request === generation.current) setReading('speaking');
    }).then(result => {
      if (request !== generation.current) return;
      setReading('idle');
      if (result === 'muted') setMessage('Âm lượng đang tắt. Bạn có thể chỉnh tại mục âm thanh.');
    }).catch(() => {
      if (request !== generation.current) return;
      setReading('error');
      setMessage('Chưa phát được giọng đọc. Bạn hãy thử nghe lại.');
    });
  };

  const next = () => {
    stop();
    const index = deck.next();
    setQuote(index);
    setMessage('');
    if (autoRead) read(index);
  };

  useImperativeHandle(ref, () => ({
    open: () => { dialog.current?.showModal(); next(); },
    close: () => dialog.current?.close(),
    isOpen: () => Boolean(dialog.current?.open),
  }));

  useEffect(() => {
    const hidden = () => {
      if (!document.hidden) return;
      generation.current++;
      sound.stopNarration('blessing');
      setReading('idle');
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      generation.current++;
      sound.stopNarration('blessing');
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [sound]);

  const active = reading === 'loading' || reading === 'speaking';
  return <dialog ref={dialog} className="temple-dialog blessing-dialog"
    aria-labelledby="blessing-title" onClose={stop} onCancel={stop}>
    <button className="dialog-close" aria-label="Đóng lời chúc" onClick={() => dialog.current?.close()}>
      <Icon name="close" />
    </button>
    <Icon name="lotus" />
    <span className="dialog-eyebrow">GỬI BẠN MỘT LỜI CHÚC</span>
    <h2 id="blessing-title">{blessingTitle(quote)}</h2>
    <p className="blessing-copy">{BLESSINGS[quote]}</p>
    <div className="blessing-voice">
      <button className="ritual-button" aria-pressed={active} onClick={() => active ? stop() : read(quote)}>
        <Icon name="music" />{active ? 'Dừng đọc' : 'Nghe lời chúc'}
      </button>
      <label>
        <input type="checkbox" checked={autoRead} onChange={event => {
          setAutoRead(event.target.checked);
          if (!event.target.checked) stop();
        }} />
        Tự đọc khi nhận lời chúc
      </label>
      <p className="voice-status" role="status">
        {reading === 'loading' ? 'Đang chuẩn bị giọng đọc…' : reading === 'speaking' ? 'Đang đọc lời chúc…' : message}
      </p>
    </div>
    <button className="another-blessing" onClick={next}>
      Nhận lời chúc khác <span aria-hidden="true">↻</span>
    </button>
    <aside className="blessing-discovery" aria-labelledby="blessing-discovery-title">
      <span className="blessing-discovery-brand">CÙNG SỐNG THUẬN</span>
      <h3 id="blessing-discovery-title">Một thẻ xăm, một điều để ngẫm</h3>
      <p>Khám phá Bách Xăm cùng những lời diễn giải để suy ngẫm. Còn có đọc và nghe mỗi ngày, lịch âm dương, phong thủy và góc An Nhiên của riêng bạn.</p>
      <a href="https://dailywisdom.itcctv-soft.com/#bach-xam" target="_blank" rel="noopener noreferrer" onClick={stop}>
        Khám phá Sống Thuận <Icon name="arrow" />
      </a>
    </aside>
  </dialog>;
});
