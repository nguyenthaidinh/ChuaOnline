import { useEffect, useState } from 'react';
import { characterManifest, sampleClip } from '../room/animationManifest';
import { CLIP_MS, type ClipId } from '../shared/ritualSchedule';
import { roomAssets } from '../room/layout';
import { RigPreview, type RigClip } from './RigPreview';
import type { Appearance } from '../room/protocol';
import './animationLab.css';

const CLIPS: readonly [ClipId, string, RigClip][] = [
  ['walkRear', 'Đi về bàn thờ', 'walk'],
  ['walkFront', 'Đi trở về', 'walk'],
  ['sitDown', 'Ngồi xuống', 'kneelDown'],
  ['standUp', 'Đứng dậy', 'kneelDown'],
  ['bowDown', 'Hạ người lạy', 'kneel'],
  ['offerRaise', 'Nâng hương', 'incense'],
  ['offerPlace', 'Đặt hương vào lư', 'incense'],
  ['offerRelease', 'Rút tay', 'incense'],
];

export default function AnimationLab() {
  const [clip, setClip] = useState<ClipId>('walkRear');
  const [appearance, setAppearance] = useState<Appearance>('man');
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.25);
  const [angle, setAngle] = useState(180);
  const [guides, setGuides] = useState(true);
  const [background, setBackground] = useState('temple');
  const manifest = characterManifest(appearance);
  const frame = sampleClip(manifest, clip, progress * CLIP_MS[clip]);
  const rigClip = CLIPS.find(item => item[0] === clip)?.[2] ?? 'walk';

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      // A hidden tab pauses the authoring clock; production uses server time instead.
      if (!document.hidden && elapsed < 500) setProgress(value => (value + elapsed * speed / CLIP_MS[clip]) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, clip]);

  const step = (delta: number) => {
    setPlaying(false);
    setProgress(value => Math.max(0, Math.min(0.999, value + delta / 12)));
  };

  return <main className="animation-lab">
    <header><div><span className="lab-eyebrow">CHUAONLINE · XƯỞNG HOẠT ẢNH</span><h1>Kiểm chuyển động trước khi đưa vào chánh điện</h1><p>Chỉ có ở bản phát triển. Không kết nối hoặc điều khiển phòng chung.</p></div><a href="./">Về chánh điện ↗</a></header>
    <section className="lab-controls" aria-label="Điều khiển kiểm hoạt ảnh">
      <label>Động tác<select value={clip} onChange={event => { setClip(event.target.value as ClipId); setProgress(0); }}>{CLIPS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Sprite đối chiếu<select value={appearance} onChange={event => setAppearance(event.target.value as Appearance)}><option value="man">Nam áo lam</option><option value="woman">Nữ áo lam</option><option value="granny">Áo nâu</option></select></label>
      <label>Tốc độ<select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value="0.25">0,25× · xem chậm</option><option value="0.5">0,5×</option><option value="1">1× · tốc độ clip</option></select></label>
      <label>Góc rig<select value={angle} onChange={event => setAngle(Number(event.target.value))}><option value="180">Lưng thẳng</option><option value="135">Lưng chéo trái</option><option value="225">Lưng chéo phải</option><option value="0">Mặt trước</option><option value="45">Trước chéo trái</option><option value="315">Trước chéo phải</option></select></label>
      <label>Nền kiểm<select value={background} onChange={event => setBackground(event.target.value)}><option value="temple">Chánh điện</option><option value="light">Nền sáng</option><option value="dark">Nền tối</option></select></label>
      <label className="lab-check"><input type="checkbox" checked={guides} onChange={event => setGuides(event.target.checked)} />Hiện điểm gốc và bộ xương</label>
    </section>
    <section className={`lab-comparison lab-bg-${background}`} aria-label="So sánh nguồn hoạt ảnh">
      <article><h2>Sprite đang dùng</h2><div className="lab-stage" style={background === 'temple' ? { backgroundImage: `url('${roomAssets.hall.desktop}')` } : undefined}>
        <div className="lab-sprite" data-clip={clip} data-frame={frame.cell} style={{ backgroundImage: `url('${roomAssets.frameImage(frame.image)}')`, backgroundSize: `${frame.columns * 100}% ${frame.rows * 100}%`, backgroundPosition: `${frame.atlasCell % frame.columns / Math.max(1, frame.columns - 1) * 100}% ${Math.floor(frame.atlasCell / frame.columns) / Math.max(1, frame.rows - 1) * 100}%` }}>
          {guides && <><i className="lab-pivot" style={{ left: '50%', top: '91.40625%' }} title="Điểm gốc sàn" />{frame.hand && <i className="lab-hand" style={{ left: `${frame.hand.x / manifest.frameWidth * 100}%`, top: `${frame.hand.y / manifest.frameHeight * 100}%` }} title="Điểm nắm vật" />}</>}
        </div>
      </div><p className="lab-caption">Ô {frame.cell} · khung {frame.index + 1} · {Math.round(progress * CLIP_MS[clip])} / {CLIP_MS[clip]} ms</p></article>
      <article><h2>Thử rig từ nguồn có sẵn</h2><div className="lab-stage" style={background === 'temple' ? { backgroundImage: `url('${roomAssets.hall.desktop}')` } : undefined}><RigPreview clip={rigClip} progress={progress} angle={angle} guides={guides} /></div></article>
    </section>
    <section className="lab-transport" aria-label="Tua hoạt ảnh">
      <button onClick={() => step(-1)}>← Lùi một bước</button><button className="lab-play" aria-pressed={playing} onClick={() => setPlaying(value => !value)}>{playing ? 'Tạm dừng' : 'Phát vòng lặp'}</button><button onClick={() => step(1)}>Tiến một bước →</button>
      <label htmlFor="lab-progress">Tiến độ <output>{Math.round(progress * 100)}%</output><input id="lab-progress" type="range" min="0" max="0.999" step="0.001" value={progress} onChange={event => { setPlaying(false); setProgress(Number(event.target.value)); }} /></label>
    </section>
    <aside><strong>Điểm cần xem:</strong> chân trụ, tỷ lệ đầu/tay, vùng nách/áo khi quỳ, bàn tay nắm hương, điểm nối đầu/cuối. Hai cột dùng cùng phần trăm tiến độ; clip FBX và clip sprite có thời lượng gốc khác nhau. Bản rig chỉ là nguồn thử, chưa được thay vào website.</aside>
  </main>;
}
