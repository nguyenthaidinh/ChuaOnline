import { useEffect, useState } from 'react';
import { essentialAssets } from './layout';
import type { SceneLayoutId } from '../config/sceneLayout';
import { INCENSE_ARTWORK } from './incenseGeometry';
import { MOVEMENT_ARTWORK, WALK_ARTWORK } from './modernMovementGeometry';
import { INCENSE_VARIANTS } from './variantIncenseGeometry';
import { DIRECTIONAL_ARTWORK } from './directionalMovementGeometry';
import { FALLBACK_ARTWORK, type ArtworkAvailability } from './characterAnimation';
import type { Appearance } from './protocol';
import { RITUAL_ARTWORK } from './ritualPoseGeometry';
const decoded=new Map<string,Promise<void>>();
export function decodeImage(url:string) {
  if(!decoded.has(url)) decoded.set(url,new Promise<void>((resolve,reject)=>{
    const image=new Image();
    const timer=setTimeout(()=>{image.src='';decoded.delete(url);reject(new Error(url));},20000);
    image.onload=()=>{void image.decode().then(()=>{clearTimeout(timer);resolve();}).catch(()=>{clearTimeout(timer);decoded.delete(url);reject(new Error(url));});};
    image.onerror=()=>{clearTimeout(timer);decoded.delete(url);reject(new Error(url));};
    image.src=url;
  }));
  return decoded.get(url)!;
}
export function useSceneAssets(layout:SceneLayoutId) {
  const [attempt,setAttempt]=useState(0),[result,setResult]=useState<{layout:string;status:'loading'|'ready'|'error'}>({layout,status:'loading'});
  useEffect(()=>{let live=true;setResult({layout,status:'loading'});
    void Promise.all(essentialAssets(layout).map(decodeImage)).then(()=>{if(live)setResult({layout,status:'ready'});}).catch(()=>{if(live)setResult({layout,status:'error'});});
    return()=>{live=false;};
  },[layout,attempt]);
  return {status:result.layout===layout?result.status:'loading',retry:()=>setAttempt(n=>n+1)};
}

/** Optional artwork cannot block entry or leave a shared action busy after a load failure. */
export function useModernIncenseAssets() {
  const [ready,setReady]=useState<ArtworkAvailability>(FALLBACK_ARTWORK);
  useEffect(()=>{
    let live=true;
    const base=import.meta.env.BASE_URL;
    void Promise.all([MOVEMENT_ARTWORK,WALK_ARTWORK].map(asset=>decodeImage(base+asset.image)))
      .then(()=>{if(live)setReady(current=>({...current,movement:true}));}).catch(()=>{/* Keep fallback. */});
    void decodeImage(base+DIRECTIONAL_ARTWORK.image)
      .then(()=>{if(live)setReady(current=>({...current,directions:true}));}).catch(()=>{/* Independent direction fallback. */});
    const incense={man:INCENSE_ARTWORK,woman:INCENSE_VARIANTS.woman.asset,granny:INCENSE_VARIANTS.granny.asset};
    for(const appearance of Object.keys(incense) as Appearance[]){
      void decodeImage(base+incense[appearance].image).then(()=>{
        if(live)setReady(current=>({...current,incense:{...current.incense,[appearance]:true}}));
      }).catch(()=>{/* One failed identity does not disable another identity's artwork. */});
      void decodeImage(base+RITUAL_ARTWORK[appearance].asset.image).then(()=>{
        if(live)setReady(current=>({...current,rituals:{man:false,woman:false,granny:false,...current.rituals,[appearance]:true}}));
      }).catch(()=>{/* Keep the original poses for this identity. */});
    }
    return()=>{live=false;};
  },[]);
  return ready;
}
