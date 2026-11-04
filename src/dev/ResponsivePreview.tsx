import { useState } from 'react';
import './responsivePreview.css';

const DEVICES = [
  {name:'360 × 800',width:360,height:800},
  {name:'390 × 844',width:390,height:844},
  {name:'768 × 1024',width:768,height:1024},
  {name:'1366 × 768',width:1366,height:768},
] as const;

function localTarget() {
  const supplied=new URLSearchParams(location.search).get('preview')??location.origin;
  const url=new URL(supplied,location.origin);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password){
    throw new Error('Khung kiểm chỉ mở bản web local bằng HTTP.');
  }
  url.pathname='/';url.search='';url.hash='';
  return url.href;
}

/** Changing the frame's dimensions resizes its real viewport without reloading its room client. */
export default function ResponsivePreview() {
  const [device,setDevice]=useState<(typeof DEVICES)[number]>(DEVICES[1]);
  const [scale,setScale]=useState(.65);
  const [target]=useState(()=>{try{return {url:localTarget(),error:''};}catch(error){return {url:'',error:error instanceof Error?error.message:'Địa chỉ không hợp lệ.'};}});
  return <main className="responsive-preview">
    <header><div><span>CHUAONLINE · KIỂM RESPONSIVE</span><h1>Kiểm khung hình và đổi bố cục giữa lễ</h1>
      <p>Iframe có viewport riêng. Đổi kích thước giữ nguyên phiên phòng và action đang chạy.</p></div>
      <a href="?animation-lab=incense">Xem tư thế dâng hương ↗</a></header>
    <nav aria-label="Kích thước khung kiểm">{DEVICES.map(item=><button key={item.name} aria-pressed={device.name===item.name} onClick={()=>setDevice(item)}>{item.name}</button>)}
      <label>Thu phóng bản xem<select value={scale} onChange={event=>setScale(Number(event.target.value))}><option value="0.65">65%</option><option value="1">100%</option></select></label>
    </nav>
    <p className="responsive-readout">Viewport yêu cầu: {device.width} × {device.height} · {target.url}</p>
    {target.error?<p role="alert">{target.error}</p>:<section className="responsive-stage" aria-label="Bản web đang kiểm">
      <div className="responsive-device" style={{width:device.width*scale,height:device.height*scale}}>
        <iframe title="Chánh điện trong khung kiểm" src={target.url} style={{width:device.width,height:device.height,transform:`scale(${scale})`}}/>
      </div>
    </section>}
    <p className="responsive-note">Thu phóng chỉ đổi kích thước hình xem. Cần đo viewport trong iframe khi kiểm; đây chưa phải kiểm cảm ứng hoặc hiệu năng điện thoại thật.</p>
  </main>;
}
