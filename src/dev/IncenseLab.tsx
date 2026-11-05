import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSceneLayout } from '../hooks/useSceneLayout';
import { frameBackground, handClipPath } from '../room/frameStyles';
import { incenseOwnership, incenseReceiver, incenseSource, isIncenseClip, sampleIncenseClip, incenseKeyTimes } from '../room/incenseAnimation';
import { INCENSE_PROP } from '../room/incenseGeometry';
import { actorMetrics, projectFloor, roomAssets, stationAnchor, altarPoint, incenseSourceAnchor, incenseWorldSize } from '../room/layout';
import { sampleCharacter } from '../room/characterAnimation';
import type { ArtworkFrame } from '../room/modernArtworkTypes';
import { actionMovement, logicalSeat } from '../room/motion';
import type { Appearance, OfferingKind, SharedAction } from '../room/protocol';
import { interactionTime, sampleSharedRitual, sharedRitualDurationMs } from '../room/ritual';
import { ritualSchedule } from '../shared/ritualSchedule';
import { advanceStudyTime } from './transitionTimeline';
import { IncenseSourceCup } from '../room/IncenseSourceCup';
import { studyImageUrl } from './studyAtlas';
import { useCharacterArtwork } from '../room/useSceneAssets';
import { ritualPropGeometry } from '../room/ritualContacts';
import { INCENSE_STUDY_ROOT, useStudyAtlas } from './useStudyAtlas';
import './animationLab.css';
import './incenseLab.css';

const KEY_TIMES=incenseKeyTimes(2);
const propStyle = (x:number,y:number,height=INCENSE_PROP.height,grip=1):CSSProperties => ({
  left:`${x/384*100}%`,top:`${y/512*100}%`,height:`${height/512*100}%`,
  transform:`translate(-50%,-${grip*100}%)`,
});

function SpriteLayers({frame,held,masterImage,flip=false,kind='incense',appearance='man',width=384,height=512}:{frame:ArtworkFrame;held:boolean;masterImage?:string;flip?:boolean;kind?:OfferingKind;appearance?:Appearance;width?:number;height?:number}) {
  const background=frameBackground(frame,flip,masterImage,width,height);
  const prop=frame.propGeometry??(frame.modernKind==='incense'?INCENSE_PROP:ritualPropGeometry(appearance,kind));
  return <>
    <div className="incense-frame-body" data-study-frame={frame.sourceId??String(frame.cell)} style={background}/>
    {held&&frame.hand&&<img className="incense-frame-prop" data-study-held="true" src={roomAssets.effect(kind==='bell'?'mallet':kind)} alt="" style={{left:`${frame.hand.x/width*100}%`,top:`${frame.hand.y/height*100}%`,height:`${prop.height/height*100}%`,transform:`translate(-50%,-${prop.gripFraction*100}%) rotate(${'rotationDeg' in prop?prop.rotationDeg:0}deg)`,transformOrigin:`50% ${prop.gripFraction*100}%`}}/>}
    {held&&frame.handMask&&<div className="incense-frame-hand" style={{...background,clipPath:handClipPath(frame.handMask,width,height)}}/>}
  </>;
}

function Closeup({frame,owner,masterImage,guides}:{frame:ArtworkFrame;owner:ReturnType<typeof incenseOwnership>;masterImage?:string;guides:boolean}) {
  const receiver=incenseReceiver(),source=incenseSource();
  const height=(468-receiver.y)/0.88;
  const urn:CSSProperties={left:`${(receiver.x+INCENSE_PROP.urnOffsetX)/384*100}%`,top:`${receiver.y/512*100}%`,height:`${height/512*100}%`,transform:'translate(-50%,-10%)'};
  return <div className="incense-detail" data-study-owner={owner}><div className="incense-coordinate-plane">
    <img className="incense-detail-urn back" src={roomAssets.effect('urn')} alt="" style={urn}/>
    <SpriteLayers frame={frame} held={owner==='hand'&&Boolean(frame.holdsIncense)} masterImage={masterImage}/>
    {owner==='source'&&<img className="incense-detail-object" data-study-object="source" src={roomAssets.effect('incense')} alt="Hương chờ nhận" style={propStyle(source.x,source.y)}/>}
    {owner==='urn'&&<img className="incense-detail-object" data-study-object="urn" src={roomAssets.effect('incense')} alt="Hương đã đặt" style={propStyle(receiver.x,receiver.y+INCENSE_PROP.insertionDepth)}/>}
    <IncenseSourceCup style={{left:`${source.x/384*100}%`,top:`${(source.y-INCENSE_PROP.insertionDepth)/512*100}%`,width:`${INCENSE_PROP.sourceCupWidth/384*100}%`,height:`${INCENSE_PROP.sourceCupHeight/512*100}%`,zIndex:4}}/>
    <img className="incense-detail-urn front" src={roomAssets.effect('urn')} alt="" style={{...urn,clipPath:INCENSE_PROP.urnFrontClip}}/>
    {guides&&<>
      <i className="lab-pivot" title="Điểm nhận của lư" style={{left:`${receiver.x/384*100}%`,top:`${receiver.y/512*100}%`}}/>
      {frame.hand&&<i className="lab-hand" title="Điểm nắm" style={{left:`${frame.hand.x/384*100}%`,top:`${frame.hand.y/512*100}%`}}/>}
    </>}
  </div></div>;
}

export default function IncenseLab() {
  const layout=useSceneLayout();
  const master=useStudyAtlas(INCENSE_STUDY_ROOT);
  const [seat,setSeat]=useState(0),[slot,setSlot]=useState(0);
  const [appearance,setAppearance]=useState<Appearance>('man');
  const [rite,setRite]=useState<OfferingKind|'bow'>('incense');
  const artwork=useCharacterArtwork([appearance]);
  const [mode,setMode]=useState<'performance'|'ritual'>('performance');
  const [time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(0.25);
  const [guides,setGuides]=useState(true);
  const clock=useRef(0);clock.current=time;
  const action=useMemo<SharedAction>(()=>{
    const movement=actionMovement(seat,slot,rite==='bow',4),version=rite==='incense'?4:3;
    const kind=rite==='bow'?'bow':'incense',offering=rite==='bow'?undefined:rite;
    return {id:'offline-ritual-study',actorId:'offline-study',kind,offering,bowCount:3,
      slot,startedAt:0,timelineVersion:version,movement,endsAt:sharedRitualDurationMs(kind,movement,offering,version)};
  },[seat,slot,rite]);
  const schedule=ritualSchedule(action.timelineVersion);
  const start=schedule.clips.standUp+action.movement!.outboundMs;
  const duration=mode==='performance'?5000:action.endsAt;
  const now=mode==='performance'?start+Math.min(time,4999.999):time;
  const pose=sampleSharedRitual(action,now);
  const detailPose=sampleSharedRitual(action,Math.max(start,Math.min(start+4999.999,now)));
  const detailFrame=sampleIncenseClip(isIncenseClip(detailPose.clip)?detailPose.clip:'offerRaise',detailPose.clipTime,2,appearance);
  const scene=sampleCharacter({id:'offline-study',name:'Study',appearance,seat,joinedAt:-100000,action,completed:null},now,false,artwork);
  const frame=scene.frame;
  const owner=incenseOwnership(action,now);
  const held=scene.held;
  const projected=projectFloor(scene.point,layout.id),metrics=actorMetrics(scene.point,layout.id);
  const receiver=stationAnchor(slot,layout.id,'incense'),floor=altarPoint(slot,layout.id);
  const source=incenseSourceAnchor(slot,layout.id),size=incenseWorldSize(slot,layout.id);
  const urnStyle:CSSProperties={left:`${receiver.x+size.urnOffsetX}%`,top:`${receiver.y}%`,height:`${(receiver.floorY-receiver.y)/0.88}%`,transform:'translate(-50%,-10%)'};
  const marker=interactionTime(action);
  const displayedMarker=marker===null?undefined:marker-(mode==='performance'?start:0);
  const seek=(value:number)=>{setPlaying(false);clock.current=Math.max(0,Math.min(duration,value));setTime(clock.current);};
  const reset=()=>seek(0);
  const step=(direction:-1|1)=>{
    if(mode==='ritual'){seek(time+direction*100);return;}
    const times=direction===1?KEY_TIMES:[...KEY_TIMES].reverse();
    seek(times.find(value=>direction===1?value>time+0.001:value<time-0.001)??(direction===1?duration:0));
  };
  useEffect(()=>{
    if(!playing)return;
    let id=0,previous=performance.now();
    const tick=(timestamp:number)=>{
      const delta=timestamp-previous;previous=timestamp;
      if(!document.hidden){clock.current=advanceStudyTime(clock.current,delta,speed,duration);setTime(clock.current);
        if(clock.current>=duration){setPlaying(false);return;}}
      id=requestAnimationFrame(tick);
    };
    id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id);
  },[playing,speed,duration]);
  const masterImage=appearance==='man'&&master.atlas?studyImageUrl(INCENSE_STUDY_ROOT,master.atlas):undefined;
  const seatFloor=projectFloor(logicalSeat(seat),layout.id);
  return <main className="animation-lab incense-lab">
    <header><div><span className="lab-eyebrow">CHUAONLINE · CHUYỂN ĐỘNG VÀ NGHI LỄ</span><h1>Kiểm bước đi, khép chân và làm lễ</h1><p>Phòng thử ngoại tuyến · cùng lịch và bộ dựng hình với chánh điện · không gọi API phòng.</p></div><a href="?animation-lab=transitions">Xem nguồn đứng–ngồi ↗</a></header>
    <section className="lab-controls" aria-label="Điều khiển kiểm dâng hương">
      <label>Y phục<select value={appearance} onChange={event=>{setAppearance(event.target.value as Appearance);reset();}}><option value="man">Nam áo lam</option><option value="woman">Nữ áo lam</option><option value="granny">Áo nâu</option></select></label>
      <label>Nghi lễ<select value={rite} onChange={event=>{setRite(event.target.value as typeof rite);setMode('ritual');reset();}}><option value="incense">Dâng hương</option><option value="lotus">Dâng hoa sen</option><option value="petal">Rải cánh sen</option><option value="bell">Thỉnh chuông</option><option value="bow">Lạy ba lạy</option></select></label>
      <label>Đoạn kiểm<select value={mode} onChange={event=>{setMode(event.target.value as typeof mode);reset();}}><option value="performance" disabled={rite!=='incense'}>Đoạn tại lư · 5 giây</option><option value="ritual">Đứng dậy → làm lễ → về chỗ</option></select></label>
      <label>Ghế xuất phát<select value={seat} onChange={event=>{setSeat(Number(event.target.value));reset();}}>{[0,5,12,23].map(id=><option key={id} value={id}>Ghế {id+1}</option>)}</select></label>
      <label>Trạm dâng<select value={slot} onChange={event=>{setSlot(Number(event.target.value));reset();}}>{[0,1,2,3].map(id=><option key={id} value={id}>Trạm {id+1}</option>)}</select></label>
      <label>Tốc độ<select value={speed} onChange={event=>setSpeed(Number(event.target.value))}><option value="0.25">0,25×</option><option value="0.5">0,5×</option><option value="1">1×</option></select></label>
      <label className="lab-check"><input type="checkbox" checked={guides} onChange={event=>setGuides(event.target.checked)}/>Hiện điểm nắm và điểm nhận</label>
      <button onClick={()=>{reset();master.retry();}}>Tải lại nguồn</button>
    </section>
    {master.error&&<p role="status">{master.error} Đang xem texture web thay cho master.</p>}
    <section className="lab-comparison">
      <article><h2>{mode==='performance'?'Phóng lớn tay và lư':'Tư thế đang hiển thị'}</h2>{mode==='performance'?<Closeup frame={detailFrame} owner={owner} masterImage={masterImage} guides={guides}/>:<div className="incense-detail"><div className="incense-coordinate-plane"><SpriteLayers frame={frame} held={held} flip={scene.flip} kind={rite==='bow'?'incense':rite} appearance={appearance} width={scene.canvasWidth} height={scene.canvasHeight}/></div></div>}<p className="incense-readout" data-study-time={time.toFixed(3)} data-study-source={frame.sourceId} data-study-stage={scene.locomotion?.stage} data-study-support={scene.locomotion?.supportFoot}>{mode==='performance'?detailFrame.sourceId:frame.sourceId??pose.clip} · {scene.locomotion?.stage??pose.phase} · {scene.completedBows}/3 lạy</p></article>
      <article><h2>Trên sàn chánh điện</h2><div className="lab-walk-room" data-layout={layout.id} style={{backgroundImage:`url('${roomAssets.hall[layout.id]}')`}}>
        <img className="fixed-cushion" src={roomAssets.effect('cushion')} alt="" style={{left:`${seatFloor.x}%`,top:`${seatFloor.y}%`,height:`${actorMetrics(logicalSeat(seat),layout.id).height*0.25}%`}}/>
        {rite==='incense'&&<img className="offering-station" src={roomAssets.effect('urn')} alt="" style={{...urnStyle,zIndex:Math.round(floor.y*100)-2}}/>}
        <div className="lab-floor-sprite" data-study-phase={pose.phase} style={{left:`${projected.x}%`,top:`${projected.y}%`,height:`${metrics.canvasHeight}%`,zIndex:Math.round(projected.y*100)}}><SpriteLayers frame={frame} held={held} flip={scene.flip} kind={rite==='bow'?'incense':rite} appearance={appearance} width={scene.canvasWidth} height={scene.canvasHeight}/></div>
        {rite==='incense'&&<>{owner==='source'&&<img className="incense-source study-visible" src={roomAssets.effect('incense')} alt="" style={{left:`${source.x}%`,top:`${source.y}%`,height:`${size.height}%`,zIndex:Math.round(floor.y*100)+3}}/>}
        {owner==='urn'&&<img className="incense-source study-visible" data-study-placed="true" src={roomAssets.effect('incense')} alt="" style={{left:`${receiver.x}%`,top:`${receiver.y+size.insertion}%`,height:`${size.height}%`,zIndex:Math.round(floor.y*100)+3}}/>}
        <IncenseSourceCup style={{left:`${source.x}%`,top:`${source.y-size.insertion}%`,width:`${size.cupWidth}%`,height:`${size.cupHeight}%`,zIndex:Math.round(floor.y*100)+4}}/>
        <img className="offering-station" src={roomAssets.effect('urn')} alt="" style={{...urnStyle,zIndex:Math.round(floor.y*100)+4,clipPath:INCENSE_PROP.urnFrontClip}}/></>}
      </div><p className="incense-readout">{pose.phase} · {frame.sourceId??pose.clip} · bước {action.movement?.version}</p></article>
    </section>
    <section className="lab-transport" aria-label="Tua dâng hương">
      <button onClick={()=>step(-1)}>← Mốc trước</button>
      <button className="lab-play" aria-pressed={playing} onClick={()=>{if(time>=duration){clock.current=0;setTime(0);}setPlaying(value=>!value);}}>{playing?'Tạm dừng':time>=duration?'Chạy lại chuỗi':'Phát chuỗi'}</button>
      <button onClick={()=>step(1)}>Mốc tiếp →</button>
      <label htmlFor="incense-time">Thời gian <output>{(time/1000).toFixed(3)} / {(duration/1000).toFixed(3)} s</output><input id="incense-time" type="range" min="0" max={duration} step="1" value={time} onChange={event=>seek(Number(event.target.value))}/></label>
      <label>Thời điểm (ms)<input type="number" min="0" max={duration} step="1" value={Math.round(time)} onChange={event=>seek(Number(event.target.value))}/></label>
    </section>
    <div className="incense-marker-buttons"><button onClick={()=>seek(start-(mode==='performance'?start:0)-420)}>Bắt đầu khép chân</button><button onClick={()=>seek(start-(mode==='performance'?start:0))}>Bắt đầu nghi lễ</button>{displayedMarker!==undefined&&<><button onClick={()=>seek(displayedMarker-1)}>Trước đặt 1 ms</button><button onClick={()=>seek(displayedMarker)}>Đúng mốc đặt</button><button onClick={()=>seek(displayedMarker+1)}>Sau đặt 1 ms</button></>}</div>
    <aside>Ba y phục dùng ảnh riêng. Mốc đặt và chu kỳ ba lạy lấy từ lịch chung; tua tới một thời điểm luôn dựng lại cùng tư thế. Kiểm hiệu ứng trên bàn thờ trong phòng chung.</aside>
  </main>;
}
