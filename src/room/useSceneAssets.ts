import { useEffect, useState } from 'react';
import { essentialAssets } from './layout';
import type { SceneLayoutId } from '../config/sceneLayout';
import { INCENSE_ARTWORK } from './incenseGeometry';
import { MOVEMENT_ARTWORK, WALK_ARTWORK } from './modernMovementGeometry';
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
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    let live=true;
    const base=import.meta.env.BASE_URL;
    void Promise.all([INCENSE_ARTWORK,MOVEMENT_ARTWORK,WALK_ARTWORK].map(asset=>decodeImage(base+asset.image)))
      .then(()=>{if(live)setReady(true);}).catch(()=>{if(live)setReady(false);});
    return()=>{live=false;};
  },[]);
  return ready;
}
