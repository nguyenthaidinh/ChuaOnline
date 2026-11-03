import { useEffect, useRef, useState } from 'react';
import { WelcomePanel } from './components/WelcomePanel';
import { ChanhDienStage } from './components/ChanhDienStage';
import { soundEngine } from './services/soundEngine';

export default function App() {
  const [name, setName] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicPending, setMusicPending] = useState(false);
  const [volume, setVolume] = useState(18);
  const [audioError, setAudioError] = useState('');
  const musicBusy = useRef(false);

  useEffect(() => () => soundEngine.dispose(), []);

  const startMusic = async () => {
    if (musicBusy.current) return;
    musicBusy.current = true;
    setMusicPending(true);
    setAudioError('');
    try {
      setMusicPlaying(await soundEngine.startMusic());
    } catch {
      soundEngine.stopMusic();
      setMusicPlaying(false);
      setAudioError('Chưa phát được nhạc. Bạn có thể bấm “Bật nhạc” để thử lại.');
    } finally {
      musicBusy.current = false;
      setMusicPending(false);
    }
  };

  const leave = () => {
    soundEngine.dispose();
    setMusicPlaying(false);
    setAudioError('');
    setName(null);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand font-temple" href={import.meta.env.BASE_URL}><span className="brand-mark" aria-hidden="true">❋</span> Đi Chùa Online</a>
        <span className="header-note">Một khoảng lặng bình an</span>
      </header>
      <main>
        {name === null ? <WelcomePanel onStart={(displayName, music) => { setName(displayName); if (music) void startMusic(); }} /> : (
          <div className="experience-shell">
            <div className="experience-heading"><div><span className="eyebrow">CHÀO BẠN, {name}</span><h1 className="font-temple">Chánh điện</h1></div><button type="button" onClick={leave} disabled={musicPending}>Về trang đầu</button></div>
            <ChanhDienStage name={name} />
            <div className="sound-controls" aria-label="Âm thanh">
              <button type="button" onClick={() => { setAudioError(''); void soundEngine.ringBell().catch(() => setAudioError('Chưa phát được chuông. Bạn hãy thử bấm lại.')); }}>Thỉnh chuông</button>
              <button type="button" disabled={musicPending} aria-pressed={musicPlaying} onClick={() => { if (musicPlaying) { soundEngine.stopMusic(); setMusicPlaying(false); } else void startMusic(); }}>{musicPending ? 'Đang mở nhạc…' : musicPlaying ? 'Tắt nhạc' : 'Bật nhạc'}</button>
              <label htmlFor="volume">Âm lượng <input id="volume" type="range" min="0" max="100" value={volume} onChange={(event) => { const value = Number(event.target.value); setVolume(value); soundEngine.setVolume(value / 100); }} /><span>{volume}%</span></label>
            </div>
            {audioError && <p className="audio-error" role="alert">{audioError}</p>}
            <p className="preview-note">Bản thử nghiệm đầu tiên. Thao tác thắp hương và lễ Phật sẽ được bổ sung ở chặng tiếp theo.</p>
          </div>
        )}
      </main>
      <footer>Không gian thư giãn trực tuyến · Mỗi lần mở trang là một phiên riêng</footer>
    </div>
  );
}
