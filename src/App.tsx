import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRoom } from './room/useRoom';
import { RoomScene } from './room/RoomScene';
import { roomAssets } from './room/layout';
import { WALK_SECONDS, INCENSE_SECONDS, type Appearance } from './room/protocol';
import { RitualTimeline } from './services/ritualTimeline';
import { useSceneLayout } from './hooks/useSceneLayout';
import { soundEngine } from './services/soundEngine';
import { BLESSINGS } from './data/blessings';
import { Icon } from './room/Icon';

export default function App() {
  const room = useRoom();
  const layout = useSceneLayout();
  const self = room.room.people.find(person => person.id === room.selfId);
  const gate = useRef<HTMLDialogElement>(null);
  const audio = useRef<HTMLDialogElement>(null);
  const blessing = useRef<HTMLDialogElement>(null);
  const guests = useRef<HTMLDialogElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState<Appearance>('man');
  const [music, setMusic] = useState(false);
  const [musicPending, setMusicPending] = useState(false);
  const musicBusy = useRef(false);
  const [volume, setVolume] = useState(18);
  const [soundMessage, setSoundMessage] = useState('');
  const [quote, setQuote] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!self?.action) return;
    const timer = window.setInterval(() => setClock(Date.now()), 150);
    return () => clearInterval(timer);
  }, [self?.action?.id]);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => { document.removeEventListener('fullscreenchange', update); soundEngine.dispose(); };
  }, []);
  const frame = self?.action ? new RitualTimeline(self.action, () => {}, WALK_SECONDS, INCENSE_SECONDS)
    .sampleAt(((Math.max(clock, Date.now())) + room.offset - self.action.startedAt) / 1000) : null;
  const busy = Boolean(frame && frame.phase !== 'complete');
  const connected = room.status === 'online';
  const status = !connected ? 'Đang kết nối lại với chánh điện…'
    : frame?.phase === 'moving' ? 'Bạn đang tiến lên chánh điện…'
    : frame?.phase === 'performing' ? self?.action?.kind === 'bow' ? `Đang lễ Phật · ${frame.completedBows}/3 lạy hoàn tất` : 'Một nén hương, gửi một tâm lành.'
    : frame?.phase === 'returning' ? 'Nghi lễ đã hoàn tất. Bạn đang trở về chỗ.'
    : self?.completed ? self.completed.kind === 'bow' ? 'Đã lễ Phật đủ 3 lạy. Nguyện thân tâm an lạc.' : 'Đã thắp hương. Nguyện một ngày bình an.'
    : self ? 'Bạn đang an tọa cùng mọi người. Thở chậm, để tâm được an.' : 'Thở nhẹ. Tâm an. Mời bạn vào an tọa.';
  const join = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await room.join(name.trim().slice(0,32), appearance)) gate.current?.close();
  };
  const toggleMusic = async () => {
    if (musicBusy.current) return;
    if (music) { soundEngine.stopMusic(); setMusic(false); return; }
    musicBusy.current = true; setMusicPending(true); setSoundMessage('');
    try { setMusic(await soundEngine.startMusic()); }
    catch { setSoundMessage('Chưa phát được nhạc. Bạn hãy thử bật lại.'); }
    finally { musicBusy.current = false; setMusicPending(false); }
  };
  const expand = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await shell.current?.requestFullscreen(); }
    catch { setSoundMessage('Trình duyệt chưa mở được toàn màn hình.'); }
  };
  const close = (dialog: HTMLDialogElement | null) => dialog?.close();
  return <div ref={shell} className="sanctuary-app" data-room-status={room.status} data-self-id={room.selfId ?? ''}>
    <header className="sanctuary-header">
      <a className="temple-brand" href={import.meta.env.BASE_URL}><Icon name="lotus" /><span>Đi Chùa Online<small>MỘT KHOẢNG LẶNG CHO TÂM</small></span></a>
      <div className="header-right"><button className="presence-pill" onClick={() => guests.current?.showModal()}><span className={`connection-dot ${connected?'connected':''}`} />{connected ? <><b data-online-count>{room.room.people.length}</b> đang an tọa</> : 'Đang kết nối…'}</button>
      <button className="icon-button expand-control" aria-label={fullscreen?'Thoát toàn màn hình':'Toàn màn hình'} onClick={() => void expand()}><Icon name="expand" /></button>
      {self && <button className="text-button leave-control" onClick={() => void room.leave()} disabled={room.pending}>Rời điện <Icon name="exit" /></button>}</div>
    </header>
    <main className="sanctuary-main">
      <section className="sanctuary-frame" aria-label="Chánh điện" data-layout={layout.id}>
        <RoomScene people={room.room.people} selfId={room.selfId} layout={layout.id} offset={room.offset} />
        <div className="scene-heading"><span className="scene-eyebrow">NAM MÔ A DI ĐÀ PHẬT</span><h1>Chánh điện bình an</h1></div>
        {self && <div className="self-badge"><span className="connection-dot connected" />{self.name}<span> · Bạn đang an tọa</span></div>}
        {!connected && <div className="connection-notice" role="status">Chưa kết nối được phòng chung. Đang thử lại…</div>}
      </section>
      <section className="sanctuary-dock" aria-label="Thao tác trong chánh điện">
        <p className="room-hint" role="status" aria-live="polite">{room.message || status}</p>
        <div className="ritual-toolbar">
          {!self ? <button className="ritual-button primary enter-button" disabled={!connected || room.pending} onClick={() => gate.current?.showModal()}><Icon name="lotus" />Vào an tọa<span aria-hidden="true">→</span></button> : <>
            <button className="ritual-button primary" disabled={!connected || busy || room.pending} onClick={() => void room.action('incense')}><Icon name="incense" /><span>Thắp hương</span></button>
            <button className="ritual-button" disabled={!connected || busy || room.pending} onClick={() => void room.action('bow')}><Icon name="bow" /><span>Lễ Phật <small>3 lạy</small></span></button>
          </>}
          <button className="ritual-button" onClick={() => {setQuote(previous=>(previous+1+Math.floor(Math.random()*(BLESSINGS.length-1)))%BLESSINGS.length); blessing.current?.showModal();}}><Icon name="lotus" /><span>Lời chúc</span></button>
          <button className={`ritual-button music-control ${music?'playing':''}`} onClick={() => audio.current?.showModal()}><Icon name="music" /><span>{music?'Nhạc đang bật':'Âm thanh'}</span></button>
        </div>
        <span className="dock-note">Một chánh điện chung · Không cần tài khoản · Không thanh toán</span>
      </section>
    </main>
    <dialog ref={gate} className="temple-dialog gate-dialog" aria-labelledby="gate-title">
      <button className="dialog-close" aria-label="Đóng biểu mẫu" onClick={() => close(gate.current)}><Icon name="close" /></button>
      <span className="dialog-eyebrow">MỘT NIỆM BÌNH AN</span><h2 id="gate-title">Mời bạn an tọa</h2><p className="dialog-description">Cùng mọi người ghé chánh điện,<br />dành một khoảng lặng cho mình.</p>
      <form onSubmit={event => void join(event)}>
        <label htmlFor="visitor-name">Tên hoặc pháp danh <span>· không bắt buộc</span></label>
        <input id="visitor-name" autoComplete="off" maxLength={32} placeholder="Ví dụ: An Nhiên" value={name} onChange={event=>setName(event.target.value)} />
        <fieldset><legend>Chọn y phục</legend><div className="appearance-options">{([['man','Nam áo lam'],['woman','Nữ áo lam'],['granny','Áo nâu']] as const).map(([skin,label])=><button key={skin} type="button" aria-pressed={appearance===skin} onClick={()=>setAppearance(skin)}><img src={roomAssets.sprite(skin)} alt="" /><span>{label}</span></button>)}</div></fieldset>
        {room.message && <p className="form-message" role="alert">{room.message}</p>}
        <button className="ritual-button primary join-submit" disabled={room.pending || !connected} type="submit">{room.pending?'Đang tìm chỗ an tọa…':'Vào chánh điện'} <span aria-hidden="true">→</span></button>
        <small className="privacy-note">Tên và nhân vật của bạn sẽ xuất hiện trong phòng chung.</small>
      </form>
    </dialog>
    <dialog ref={audio} className="temple-dialog audio-dialog" aria-labelledby="audio-title"><button className="dialog-close" aria-label="Đóng âm thanh" onClick={()=>close(audio.current)}><Icon name="close" /></button><span className="dialog-eyebrow">LẮNG LẠI MỘT CHÚT</span><h2 id="audio-title">Âm thanh chánh điện</h2><p className="dialog-description">Âm thanh chỉ phát trên thiết bị của bạn.</p><div className="audio-actions"><button className="ritual-button primary" disabled={musicPending} aria-pressed={music} onClick={()=>void toggleMusic()}><Icon name="music" />{musicPending?'Đang mở nhạc…':music?'Tắt nhạc':'Bật nhạc'}</button><button className="ritual-button" onClick={()=>{setSoundMessage('');void soundEngine.ringBell().catch(()=>setSoundMessage('Chưa phát được chuông. Bạn hãy thử lại.'));}}><Icon name="bell" />Thỉnh chuông</button></div><label className="volume-label" htmlFor="room-volume">Âm lượng <output>{volume}%</output></label><input id="room-volume" type="range" min="0" max="100" value={volume} onChange={event=>{const value=Number(event.target.value);setVolume(value);soundEngine.setVolume(value/100);}} />{soundMessage&&<p className="form-message" role="alert">{soundMessage}</p>}</dialog>
    <dialog ref={blessing} className="temple-dialog blessing-dialog" aria-labelledby="blessing-title"><button className="dialog-close" aria-label="Đóng lời chúc" onClick={()=>close(blessing.current)}><Icon name="close" /></button><Icon name="lotus" /><span className="dialog-eyebrow">GỬI BẠN MỘT LỜI CHÚC</span><h2 id="blessing-title">Nguyện một ngày bình an</h2><p className="blessing-copy">{BLESSINGS[quote]}</p></dialog>
    <dialog ref={guests} className="temple-dialog guest-dialog" aria-labelledby="guests-title"><button className="dialog-close" aria-label="Đóng danh sách" onClick={()=>close(guests.current)}><Icon name="close" /></button><span className="dialog-eyebrow">CÙNG HIỆN DIỆN</span><h2 id="guests-title">Đang an tọa</h2>{room.room.people.length===0?<p className="dialog-description">Chánh điện đang yên tĩnh. Mời bạn là người đầu tiên an tọa.</p>:<ul className="guest-list">{room.room.people.map(person=><li key={person.id}><img src={roomAssets.sprite(person.appearance)} alt=""/><span>{person.name}{person.id===room.selfId&&<small> · Bạn</small>}</span><i>{person.action?'Đang làm lễ':'An tọa'}</i></li>)}</ul>}</dialog>
  </div>;
}
