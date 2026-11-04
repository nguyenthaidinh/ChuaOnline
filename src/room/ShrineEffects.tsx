import {useEffect,useRef} from 'react';
import type {RoomSnapshot} from './protocol';
import {roomAssets} from './layout';
import {subscribeSceneAnimation} from './sceneAnimation';
import {SHRINE_EFFECT_MS,shrineEffectCandidates,type ShrineEffect} from './shrineTimeline';

function ShrineGift({effect,offset,reduced}:{effect:ShrineEffect;offset:number;reduced:boolean}) {
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>subscribeSceneAnimation(now=>{
    if(!root.current)return false;
    const age=now+offset-effect.at,visible=age>=0&&age<SHRINE_EFFECT_MS;
    root.current.dataset.visible=String(visible);
    root.current.style.display=visible?'block':'none';
    if(visible) {
      const progress=age/SHRINE_EFFECT_MS;
      root.current.style.opacity=String(Math.min(1,age/180,(SHRINE_EFFECT_MS-age)/1000));
      root.current.style.setProperty('--rise',`${reduced?0:-progress*24}px`);
      root.current.style.setProperty('--bloom',String(reduced?1:.84+.16*Math.min(1,age/500)));
      for(const [i,petal] of Array.from(root.current.querySelectorAll<HTMLElement>('.shrine-petals img')).entries()) {
        const p=(progress+i/12)%1;
        petal.style.transform=reduced?'none':`translate(${Math.sin(i*7+p*3)*45}px,${p*105}px) rotate(${i*31+p*90}deg)`;
        petal.style.opacity=String(reduced ? .5 : Math.sin(p*Math.PI)*.8);
      }
    }
    return age<SHRINE_EFFECT_MS;
  }),[effect.id,effect.at,offset,reduced]);
  return <div ref={root} className={`shrine-gift shrine-${effect.kind}`} data-shrine-action={effect.id} data-kind={effect.kind}>
    <div className="shrine-glow"/>
    {effect.kind!=='petal'&&<img className="shrine-gift-image" src={roomAssets.effect(effect.kind)} alt=""/>}
    {effect.kind==='bell'&&<><i className="shrine-ring"/><i className="shrine-ring second"/></>}
    {effect.kind==='incense'&&<div className="shrine-smoke"><i/><i/><i/></div>}
    {(effect.kind==='lotus'||effect.kind==='petal')&&<div className="shrine-petals">{Array.from({length:12},(_,i)=><img key={i} src={roomAssets.effect('petal')} alt=""/>)}</div>}
  </div>;
}
export function ShrineEffects({room,offset,reduced}:{room:RoomSnapshot;offset:number;reduced:boolean}) {
  return <div className="shrine-effects" aria-hidden="true">{shrineEffectCandidates(room).map(effect=><ShrineGift key={effect.id} effect={effect} offset={offset} reduced={reduced}/>)}</div>;
}
