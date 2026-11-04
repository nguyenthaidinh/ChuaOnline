import type { Appearance } from './protocol.ts';
import { LAM_GEOMETRY } from './visualGeometry.ts';
import { VARIANT_GEOMETRY } from './variantGeometry.ts';
export type Facing = 'rear' | 'front';
export type ClipId = 'stand'|'standFront'|'walkRear'|'walkFront'|'sitDown'|'seated'|'standUp'|'kneelDown'|'kneeling'|'bowDown'|'bowHold'|'bowUp'|'rise'|'offerRaise'|'offerHold'|'offerPlace'|'offerRelease'|'petalRelease'|'bellStrike';
export interface HandAnchor { x:number; y:number }
export interface FrameSpec { cell:number; durationMs:number; hand?:HandAnchor; propLayer?:'behind-hand'|'in-front' }
export interface AnimationClip { frames:FrameSpec[]; loop:boolean; facing:Facing; markers?:Record<string,number>; stride?:number }
export interface CharacterManifest {
  image:string; frameWidth:number; frameHeight:number; columns:number; rows:number; frameCount:number;
  groundPivot:HandAnchor; standingHeight:number; clips:Record<ClipId,AnimationClip>;
  geometry:Record<number,{top:number;hand?:HandAnchor}>;
}
// Cell IDs are produced by scripts/pack-visual-assets.py. Every cell shares one fixed canvas.
const one=(cell:number,durationMs=400,hand?:HandAnchor):FrameSpec=>({cell,durationMs,hand,propLayer:hand?'behind-hand':'in-front'});
const clip=(frames:FrameSpec[],loop=false,facing:Facing='rear'):AnimationClip=>({frames,loop,facing});
export const LAM_MANIFEST:CharacterManifest={
  image:'assets/visual-v2/lam-atlas.webp',frameWidth:384,frameHeight:512,columns:6,rows:5,frameCount:30,
  groundPivot:{x:192,y:468},standingHeight:390,
  geometry:LAM_GEOMETRY,
  clips:{
    stand:clip([one(0)],true),
    standFront:clip([one(1)],true,'front'),
    walkRear:{...clip(Array.from({length:8},(_,i)=>one(14+i,110)),true),stride:0.95},
    walkFront:{...clip(Array.from({length:8},(_,i)=>one(22+i,110)),true,'front'),stride:0.95},
    sitDown:clip([one(0,120),one(2,220),one(3,240),one(4,280)]),
    seated:clip([one(4)],true),
    standUp:clip([one(4,100),one(3,220),one(2,240),one(0,200)]),
    kneelDown:clip([one(0,140),one(2,260),one(5,320)]),
    kneeling:clip([one(5)],true),
    bowDown:clip([one(5,160),one(6,260),one(7,360),one(8,260)]),
    bowHold:clip([one(8,380)]),
    bowUp:clip([one(8,160),one(7,260),one(6,300),one(5,300)]),
    rise:clip([one(5,200),one(2,300),one(0,260)]),
    offerRaise:clip([one(9,280,{x:237,y:257}),one(10,420,{x:244,y:177})]),
    offerHold:clip([one(10,650,{x:244,y:177})]),
    offerPlace:{...clip([one(11,500,{x:270,y:277}),one(12,350,{x:286,y:291})]),markers:{place:500}},
    offerRelease:clip([one(12,200,{x:286,y:291}),one(11,260,{x:270,y:277}),one(9,240,{x:237,y:257}),one(0,180)]),
    petalRelease:{...clip([one(11,350,{x:270,y:277}),one(13,700,{x:279,y:285})]),markers:{release:350}},
    bellStrike:{...clip([one(11,300,{x:270,y:277}),one(13,320,{x:279,y:285}),one(11,300,{x:270,y:277})]),markers:{strike:300}},
  }
};
export const clipDuration=(clip:AnimationClip)=>clip.frames.reduce((sum,frame)=>sum+frame.durationMs,0);
export function sampleClip(manifest:CharacterManifest,id:ClipId,timeMs:number,distance?:number) {
  const clip=manifest.clips[id],duration=clipDuration(clip);
  let time=distance!==undefined&&clip.stride ? ((distance/clip.stride)%1)*duration : clip.loop ? Math.max(0,timeMs)%duration : Math.min(Math.max(0,timeMs),duration-0.001);
  let index=0;
  while(index<clip.frames.length-1&&time>=clip.frames[index].durationMs) {time-=clip.frames[index].durationMs;index++;}
  const frame=clip.frames[index];
  return {...frame,hand:manifest.geometry[frame.cell]?.hand??frame.hand,index,facing:clip.facing,top:manifest.geometry[frame.cell]?.top??70};
}
function variant(skin:'woman'|'granny'):CharacterManifest {
  const geometry=Object.fromEntries(Object.entries(LAM_GEOMETRY).map(([cell,value])=>[cell,{top:VARIANT_GEOMETRY[skin][Number(cell)].top,...(value.hand?{hand:{x:value.hand.x/2,y:value.hand.y/2}}:{})}]));
  return {...LAM_MANIFEST,image:`assets/visual-v2/${skin}-atlas.webp`,frameWidth:192,frameHeight:256,standingHeight:195,groundPivot:{x:96,y:234},geometry};
}
const CHARACTERS:Record<Appearance,CharacterManifest>={man:LAM_MANIFEST,woman:variant('woman'),granny:variant('granny')};
export function characterManifest(appearance:Appearance):CharacterManifest { return CHARACTERS[appearance]; }
