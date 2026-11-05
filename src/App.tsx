import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRoom } from './room/useRoom';
import { RoomScene } from './room/RoomScene';
import { roomAssets } from './room/layout';
import { OFFERING_LABELS, type Appearance, type OfferingKind } from './room/protocol';
import { entryDurationMs, sampleEntry, sampleSharedRitual } from './room/ritual';
import { useSceneAssets } from './room/useSceneAssets';
import { useReducedMotion } from './room/useReducedMotion';
import { InteractionCueGate } from './room/interactionCue';
import { MUSIC_TRACKS, type MusicTrackId } from './config/templeAssets';
import { useSceneLayout } from './hooks/useSceneLayout';
import { SoundEngine } from './services/soundEngine';
import { RITUAL_WISHES } from './data/blessingCatalog';
import { BlessingDialog, type BlessingDialogHandle } from './components/BlessingDialog';
import { SanctuaryHeader } from './components/SanctuaryHeader';
import { SanctuaryDock } from './components/SanctuaryDock';
import { ambientDevotees } from './room/ambientDevotees';
import { Icon } from './room/Icon';

export default function App() {
  const room = useRoom();
  const ambient = useMemo(() => ambientDevotees(room.room.people), [room.room.people]);
  const layout = useSceneLayout();
  const assets = useSceneAssets(layout.id);
  const systemReducedMotion=useReducedMotion();
  const [motionPreference,setMotionPreference]=useState<boolean|null>(null);
  const reducedMotion=motionPreference??systemReducedMotion;
  const self = room.room.people.find(person => person.id === room.selfId);
  const gate = useRef<HTMLDialogElement>(null);
  const audio = useRef<HTMLDialogElement>(null);
  const blessing = useRef<BlessingDialogHandle>(null);
  const guests = useRef<HTMLDialogElement>(null);
  const offerings = useRef<HTMLDialogElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const musicPlayer = useRef<HTMLAudioElement>(null);
  const [soundEngine] = useState(() => new SoundEngine({createAudio:()=>musicPlayer.current!}));
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState<Appearance>('man');
  const [music, setMusic] = useState(false);
  const [joinMusic, setJoinMusic] = useState(true);
  const [musicPending, setMusicPending] = useState(false);
  const [track, setTrack] = useState<MusicTrackId>('bamboo');
  const musicBusy = useRef(false);
  const [volume, setVolume] = useState(40);
  const [soundMessage, setSoundMessage] = useState('');
  const [ritualSounds, setRitualSounds] = useState(true);
  const [ritualWish, setRitualWish] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const activeUntil = self?.action?.endsAt ?? (self ? self.joinedAt + entryDurationMs(self.seat,self.entryVersion) : 0);
  useEffect(() => {
    if (activeUntil <= Date.now() + room.offset) return;
    const timer = window.setInterval(() => { setClock(Date.now()); if (Date.now() + room.offset >= activeUntil) clearInterval(timer); }, 100);
    return () => clearInterval(timer);
  }, [activeUntil, room.offset]);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => { document.removeEventListener('fullscreenchange', update); soundEngine.dispose(); };
  }, [soundEngine]);
  const now = Math.max(clock, Date.now()) + room.offset;
  const entering = Boolean(self && sampleEntry(self.joinedAt, now, self.seat, self.entryVersion).phase !== 'idle');
  const frame = self?.action ? sampleSharedRitual(self.action, now) : null;
  const busy = entering || Boolean(frame && frame.phase !== 'complete');
  const finished = frame?.phase === 'complete' ? self?.action : self?.completed;
  const connected = room.status === 'online';
  const status = !connected ? 'Đang kết nối lại với chánh điện…'
    : entering ? 'Bạn đang đi vào chánh điện và an tọa…'
    : frame?.phase === 'standing' ? 'Bạn đang đứng dậy để tiến lên làm lễ…'
    : frame?.phase === 'moving' ? 'Bạn đang tiến lên chánh điện…'
    : frame?.phase === 'settling' ? 'Bạn đang quỳ xuống lễ Phật…'
    : frame?.phase === 'performing' ? self?.action?.kind === 'bow' ? `Đang lễ Phật · ${frame.completedBows}/3 lạy hoàn tất` : `${OFFERING_LABELS[self?.action?.offering ?? 'incense']} · Gửi một tâm lành.`
    : frame?.phase === 'rising' ? 'Nghi lễ đã hoàn tất. Bạn đang đứng dậy…'
    : frame?.phase === 'returning' ? 'Nghi lễ đã hoàn tất. Bạn đang trở về chỗ.'
    : frame?.phase === 'seating' ? 'Bạn đang an tọa lại trên bồ đoàn…'
    : finished?.kind === 'bow' ? 'Đã lễ Phật đủ 3 lạy. Nguyện thân tâm an lạc.'
    : self ? 'Bạn đang an tọa cùng mọi người. Thở chậm, để tâm được an.' : 'Thở nhẹ. Tâm an. Mời bạn vào an tọa.';
  const join = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (joinMusic && !music && assets.status==='ready') void toggleMusic();
    if (assets.status==='ready' && await room.join(name.trim().slice(0,32), appearance)) gate.current?.close();
  };
  const toggleMusic = async () => {
    if (musicBusy.current) return;
    if (music) { soundEngine.stopMusic(); setMusic(false); return; }
    musicBusy.current = true; setMusicPending(true); setSoundMessage('');
    try { setMusic(await soundEngine.startMusic(track)); }
    catch { setSoundMessage('Chưa phát được nhạc. Bạn hãy thử bật lại.'); }
    finally { musicBusy.current = false; setMusicPending(false); }
  };
  const changeTrack = async (id: MusicTrackId) => {
    if (musicBusy.current) return;
    setTrack(id);
    if (!music) return;
    musicBusy.current = true; setMusicPending(true); setSoundMessage('');
    try { setMusic(await soundEngine.startMusic(id)); }
    catch { setMusic(false); setSoundMessage('Chưa mở được bài nhạc này. Bạn hãy thử lại.'); }
    finally { musicBusy.current = false; setMusicPending(false); }
  };
  const cueGate = useRef(new InteractionCueGate(true));
  useEffect(() => {
    if (!cueGate.current.poll(self?.action, now, !document.hidden)) return;
    const kind = self!.action!.kind === 'bow' ? 'bow' : self!.action!.offering ?? 'incense';
    setRitualWish(RITUAL_WISHES[kind]);
    if (!ritualSounds || blessing.current?.isOpen() || soundEngine.narrationActive) return;
    void (kind === 'bell' ? soundEngine.ringBell(true) : soundEngine.playOfferingTone()).catch(() => {});
    void soundEngine.playNarration(`${import.meta.env.BASE_URL}assets/audio/rituals/${kind}.mp3`, 'ritual')
      .catch(() => setSoundMessage('Chưa phát được lời nguyện. Bạn vẫn có thể tiếp tục làm lễ.'));
  }, [frame?.interactionAt, now, self?.action?.id, self?.action?.offering, ritualSounds, soundEngine]);
  useEffect(() => {
    if (!ritualWish) return;
    const timer = setTimeout(() => setRitualWish(''), 6000);
    return () => clearTimeout(timer);
  }, [ritualWish]);
  useEffect(() => {
    const hidden = () => {
      if (!document.hidden) return;
      cueGate.current.discard(self?.action);
      soundEngine.stopNarration('ritual');
    };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, [self?.action, soundEngine]);
  useEffect(() => {
    if (self) return;
    setRitualWish('');
    soundEngine.stopNarration('ritual');
  }, [self?.id, soundEngine]);
  const offer = async (kind: OfferingKind | 'bow') => {
    if (ritualSounds) void soundEngine.unlock().catch(() => {});
    if (await room.action(kind)) offerings.current?.close();
  };
  const expand = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await shell.current?.requestFullscreen(); }
    catch { setSoundMessage('Trình duyệt chưa mở được toàn màn hình.'); }
  };
  const close = (dialog: HTMLDialogElement | null) => dialog?.close();
  const openAudio = () => { audio.current?.showModal(); if(!music)void toggleMusic(); };
  return <div ref={shell} className="sanctuary-app" data-room-status={room.status} data-self-id={room.selfId ?? ''}>
    <audio ref={musicPlayer} hidden preload="none" onPlaying={()=>setMusic(true)} onPause={()=>setMusic(false)} onError={()=>{setMusic(false);setSoundMessage('Chưa tải được bài nhạc. Bạn hãy thử bài khác.');}} />
    <SanctuaryHeader connected={connected} onlineCount={room.room.people.length} ambientCount={ambient.length}
      fullscreen={fullscreen} joined={Boolean(self)} pending={room.pending}
      onOpenGuests={() => guests.current?.showModal()}
      onToggleFullscreen={() => void expand()} onLeave={() => void room.leave()} />
    <main className="sanctuary-main">
      <section className="sanctuary-frame" aria-label="Chánh điện" data-layout={layout.id}>
        {assets.status==='ready'&&<RoomScene room={room.room} selfId={room.selfId} layout={layout.id} offset={room.offset} reduced={reducedMotion} ambient={ambient} warmAppearance={appearance} />}
        {assets.status!=='ready'&&<div className="scene-loading" role="status"><Icon name="lotus"/><p>{assets.status==='error'?'Chưa tải được hình ảnh chánh điện.':'Đang chuẩn bị chánh điện…'}</p>{assets.status==='error'&&<button className="ritual-button" onClick={assets.retry}>Tải lại hình ảnh</button>}</div>}
        <div className="scene-heading"><span className="scene-eyebrow">NAM MÔ A DI ĐÀ PHẬT</span><h1>Chánh điện bình an</h1></div>
        {self && <div className="self-badge"><span className="connection-dot connected" />{self.name}<span> · {entering ? 'Bạn đang vào điện' : busy ? 'Bạn đang làm lễ' : 'Bạn đang an tọa'}</span></div>}
        {!connected && <div className="connection-notice" role="status">Chưa kết nối được phòng chung. Đang thử lại…</div>}
      </section>
      <SanctuaryDock status={room.message || status} ritualWish={ritualWish} joined={Boolean(self)}
        canEnter={connected && !room.pending && assets.status === 'ready'}
        canAct={connected && !busy && !room.pending}
        musicState={music ? 'playing' : musicPending ? 'loading' : 'off'}
        onEnter={() => gate.current?.showModal()} onIncense={() => void offer('incense')}
        onBow={() => void offer('bow')} onOfferings={() => offerings.current?.showModal()}
        onBlessing={() => blessing.current?.open()} onAudio={openAudio} />
    </main>
    <dialog ref={gate} className="temple-dialog gate-dialog" aria-labelledby="gate-title">
      <button className="dialog-close" aria-label="Đóng biểu mẫu" onClick={() => close(gate.current)}><Icon name="close" /></button>
      <span className="dialog-eyebrow">MỘT NIỆM BÌNH AN</span><h2 id="gate-title">Mời bạn an tọa</h2><p className="dialog-description">Cùng mọi người ghé chánh điện,<br />dành một khoảng lặng cho mình.</p>
      <form onSubmit={event => void join(event)}>
        <label htmlFor="visitor-name">Tên hoặc pháp danh <span>· không bắt buộc</span></label>
        <input id="visitor-name" autoComplete="off" maxLength={32} placeholder="Ví dụ: An Nhiên" value={name} onChange={event=>setName(event.target.value)} />
        <fieldset><legend>Chọn y phục</legend><div className="appearance-options">{([['man','Nam áo lam'],['woman','Nữ áo lam'],['granny','Áo nâu']] as const).map(([skin,label])=><button key={skin} type="button" aria-pressed={appearance===skin} onClick={()=>setAppearance(skin)}><img src={roomAssets.sprite(skin)} alt="" /><span>{label}</span></button>)}</div></fieldset>
        <label className="motion-preference join-music"><input type="checkbox" checked={joinMusic} onChange={event=>setJoinMusic(event.target.checked)}/>Bật nhạc thiền khi vào chánh điện</label>
        {room.message && <p className="form-message" role="alert">{room.message}</p>}
        <button className="ritual-button primary join-submit" disabled={room.pending || !connected || assets.status!=='ready'} type="submit">{room.pending?'Đang tìm chỗ an tọa…':'Vào chánh điện'} <span aria-hidden="true">→</span></button>
        <small className="privacy-note">Tên và nhân vật của bạn sẽ xuất hiện trong phòng chung.</small>
      </form>
    </dialog>
    <dialog ref={offerings} className="temple-dialog offering-dialog" aria-labelledby="offering-title"><button className="dialog-close" aria-label="Đóng dâng lễ" onClick={() => close(offerings.current)}><Icon name="close" /></button><span className="dialog-eyebrow">MỘT TÂM LÀNH GỬI ĐẾN</span><h2 id="offering-title">Dâng một lễ lành</h2><p className="dialog-description">Bạn sẽ tiến lên làm lễ. Mọi người trong chánh điện cùng nhìn thấy.</p><div className="offering-options">{(['incense','lotus','petal','bell'] as const).map(kind => <button type="button" key={kind} disabled={!connected || busy || room.pending} onClick={() => void offer(kind)}><img src={roomAssets.effect(kind)} alt="" /><span>{OFFERING_LABELS[kind]}</span></button>)}</div>{room.message && <p className="form-message" role="alert">{room.message}</p>}<p className="privacy-note">Lễ vật mô phỏng, hoàn toàn miễn phí · Không thanh toán</p></dialog>
    <dialog ref={audio} className="temple-dialog audio-dialog" aria-labelledby="audio-title"><button className="dialog-close" aria-label="Đóng âm thanh" onClick={()=>close(audio.current)}><Icon name="close" /></button><span className="dialog-eyebrow">LẮNG LẠI MỘT CHÚT</span><h2 id="audio-title">Âm thanh chánh điện</h2><p className="dialog-description">Âm thanh chỉ phát trên thiết bị của bạn.</p><label htmlFor="music-track">Bài nhạc</label><select id="music-track" value={track} disabled={musicPending} onChange={event => void changeTrack(event.target.value as MusicTrackId)}>{MUSIC_TRACKS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="audio-actions"><button className="ritual-button primary" disabled={musicPending} aria-pressed={music} onClick={()=>void toggleMusic()}><Icon name="music" />{musicPending?'Đang mở nhạc…':music?'Tắt nhạc':'Bật nhạc'}</button><button className="ritual-button" onClick={()=>{setSoundMessage('');void soundEngine.ringBell().catch(()=>setSoundMessage('Chưa phát được chuông. Bạn hãy thử lại.'));}}><Icon name="bell" />Thỉnh chuông</button><button className="ritual-button" onClick={() => void soundEngine.playMok().catch(() => setSoundMessage('Chưa phát được tiếng mõ.'))}>Gõ mõ</button></div><button className="next-track" disabled={musicPending} onClick={() => { const index = MUSIC_TRACKS.findIndex(item => item.id === track); void changeTrack(MUSIC_TRACKS[(index+1)%MUSIC_TRACKS.length].id); }}>Bài tiếp theo →</button><label className="volume-label" htmlFor="room-volume">Âm lượng <output>{volume}%</output></label><input id="room-volume" type="range" min="0" max="100" value={volume} onChange={event=>{const value=Number(event.target.value);setVolume(value);soundEngine.setVolume(value/100);}} /><label className="motion-preference"><input type="checkbox" checked={ritualSounds} onChange={event=>{setRitualSounds(event.target.checked);if(!event.target.checked){cueGate.current.discard(self?.action);soundEngine.stopNarration('ritual');}}}/>Âm thanh và lời nguyện khi làm lễ</label><label className="motion-preference"><input type="checkbox" checked={reducedMotion} onChange={event=>setMotionPreference(event.target.checked)}/>Giảm chuyển động</label><small className="motion-description">Hiển thị tư thế chính và giảm hiệu ứng trong cảnh.</small>{soundMessage&&<p className="form-message" role="alert">{soundMessage}</p>}</dialog>
    <BlessingDialog ref={blessing} sound={soundEngine}/>
    <dialog ref={guests} className="temple-dialog guest-dialog" aria-labelledby="guests-title">
      <button className="dialog-close" aria-label="Đóng danh sách" onClick={() => close(guests.current)}><Icon name="close" /></button>
      <span className="dialog-eyebrow">CÙNG HIỆN DIỆN</span>
      <h2 id="guests-title">Khách đang an tọa</h2>
      {ambient.length > 0 && <p className="dialog-description">Có thêm {ambient.length} nhân vật mô phỏng an tọa trong chánh điện.</p>}
      {room.room.people.length === 0
        ? <p className="dialog-description">Chưa có khách an tọa. Mời bạn vào chánh điện.</p>
        : <ul className="guest-list">{room.room.people.map(person => <li key={person.id}>
          <img src={roomAssets.sprite(person.appearance)} alt="" />
          <span>{person.name}{person.id === room.selfId && <small> · Bạn</small>}</span>
          <i>{person.action ? 'Đang làm lễ' : 'An tọa'}</i>
        </li>)}</ul>}
    </dialog>
  </div>;
}
