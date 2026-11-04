import type { SceneLayoutId } from '../config/sceneLayout';
import { logicalAltar, logicalSeat, type FloorPoint } from './motion.ts';
import { LAM_MANIFEST, sampleClip,characterManifest } from './animationManifest.ts';
import type {Appearance,OfferingKind} from './protocol.ts';
import {LAM_GEOMETRY} from './visualGeometry.ts';
export interface RoomPoint {x:number;y:number}
export function projectFloor(point:FloorPoint,layout:SceneLayoutId):RoomPoint {
  const mobile=layout==='mobile';
  return {x:50+point.x*((mobile?6.7:4.3)+point.z*(mobile?0.7:0.55)),y:(mobile?57:64)+point.z*(mobile?4.8:3.9)};
}
export function actorMetrics(point:FloorPoint,layout:SceneLayoutId) {
  const height=(layout==='mobile'?8.7:10.4)+point.z*(layout==='mobile'?0.3:0.55);
  const canvasHeight=height*LAM_MANIFEST.frameHeight/LAM_MANIFEST.standingHeight;
  return {height,canvasHeight,canvasWidth:canvasHeight*(layout==='mobile'?16/9:9/16)*LAM_MANIFEST.frameWidth/LAM_MANIFEST.frameHeight};
}
export const seatPoint=(seat:number,layout:SceneLayoutId)=>projectFloor(logicalSeat(seat),layout);
export const altarPoint=(slot:number,layout:SceneLayoutId)=>projectFloor(logicalAltar(slot),layout);
export function stationAnchor(slot:number,layout:SceneLayoutId,kind:OfferingKind='incense') {
  const point=logicalAltar(slot),floor=projectFloor(point,layout),size=actorMetrics(point,layout);
  const frame=sampleClip(LAM_MANIFEST,'offerPlace',600);
  const hand=kind==='petal'||kind==='bell'?LAM_GEOMETRY[13].hand!:frame.hand!;
  const grip=kind==='bell'?{x:hand.x+16,y:hand.y-40}:hand;
  return {x:floor.x+(grip.x-LAM_MANIFEST.groundPivot.x)/LAM_MANIFEST.frameWidth*size.canvasWidth,
    y:floor.y+(grip.y-LAM_MANIFEST.groundPivot.y)/LAM_MANIFEST.frameHeight*size.canvasHeight,floorY:floor.y};
}
const base=()=>import.meta.env?.BASE_URL??'/';
export const roomAssets={
  hall:{desktop:`${base()}assets/visual-v2/hall-desktop.webp`,mobile:`${base()}assets/visual-v2/hall-mobile.webp`},
  sprite:(appearance:string)=>`${base()}assets/visual-v2/${appearance==='man'?'lam':appearance}-preview.webp`,
  atlas:(appearance:Appearance='man')=>`${base()}${characterManifest(appearance).image}`,
  frameImage:(image:string)=>`${base()}${image}`,
  effect:(kind:string)=>`${base()}assets/visual-v2/${kind}.webp`,
};
export function essentialAssets(layout:SceneLayoutId) {
  return [roomAssets.hall[layout],...(['man','woman','granny'] as const).flatMap(skin=>[roomAssets.atlas(skin),roomAssets.frameImage(characterManifest(skin).poseAssets.seatedRear.image)]),roomAssets.effect('cushion'),...['incense','lotus','bell','petal','mallet','urn','flower-station','bell-station'].map(roomAssets.effect)];
}
