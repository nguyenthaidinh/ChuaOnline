import type { SceneLayoutId } from '../config/sceneLayout';
import { logicalAltar, logicalSeat, type FloorPoint } from './motion.ts';
import { LAM_MANIFEST, sampleClip,characterManifest } from './animationManifest.ts';
import type {Appearance,OfferingKind,PlacedOffering} from './protocol.ts';
import {LAM_GEOMETRY} from './visualGeometry.ts';
import { incenseReceiver, incenseSource } from './incenseAnimation.ts';
import { INCENSE_PROP } from './incenseGeometry.ts';
import { offeringReceiver, OFFERING_PROP } from './offeringAnimation.ts';
import { petalEmissionPoint } from './ritualExtensionAnimation.ts';
import { ritualPropGeometry } from './ritualContacts.ts';
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
export function stationAnchor(slot:number,layout:SceneLayoutId,kind:OfferingKind='incense',appearance:Appearance='man',artworkVersion?:PlacedOffering['artworkVersion']) {
  const point=logicalAltar(slot),floor=projectFloor(point,layout),size=actorMetrics(point,layout);
  const frame=sampleClip(LAM_MANIFEST,'offerPlace',600);
  const hand=kind==='petal'||kind==='bell'?LAM_GEOMETRY[13].hand!:frame.hand!;
  const grip=kind==='petal'&&artworkVersion===4?petalEmissionPoint(appearance)
    :artworkVersion!==undefined&&artworkVersion>=3&&(kind==='lotus'||kind==='bell')?offeringReceiver(kind,appearance)
    :kind==='incense'?incenseReceiver():kind==='bell'?{x:hand.x+16,y:hand.y-40}:hand;
  return {x:floor.x+(grip.x-LAM_MANIFEST.groundPivot.x)/LAM_MANIFEST.frameWidth*size.canvasWidth,
    y:floor.y+(grip.y-LAM_MANIFEST.groundPivot.y)/LAM_MANIFEST.frameHeight*size.canvasHeight,floorY:floor.y};
}
/** A missing optional extension must release petals from the hand actually shown locally. */
export function petalEmissionAnchor(slot:number,layout:SceneLayoutId,appearance:Appearance,extensionReady:boolean) {
  if(extensionReady)return stationAnchor(slot,layout,'petal',appearance,4);
  const manifest=characterManifest(appearance),frame=sampleClip(manifest,'petalRelease',0);
  const hand=frame.hand;
  if(!hand)throw new Error(`Missing fallback petal hand: ${appearance}`);
  const prop=ritualPropGeometry(appearance,'petal'),floor=altarPoint(slot,layout),size=actorMetrics(logicalAltar(slot),layout);
  return {x:floor.x+(hand.x-manifest.groundPivot.x)/manifest.frameWidth*size.canvasWidth,
    y:floor.y+(hand.y+prop.height*(.5-prop.gripFraction)-manifest.groundPivot.y)/manifest.frameHeight*size.canvasHeight,
    floorY:floor.y};
}
export function offeringWorldHeight(slot:number,layout:SceneLayoutId,kind:'lotus'|'bell') {
  return OFFERING_PROP[kind].height/512*actorMetrics(logicalAltar(slot),layout).canvasHeight;
}
export function incenseSourceAnchor(slot:number,layout:SceneLayoutId) {
  const point=logicalAltar(slot),floor=projectFloor(point,layout),size=actorMetrics(point,layout),source=incenseSource();
  return {x:floor.x+(source.x-192)/384*size.canvasWidth,y:floor.y+(source.y-468)/512*size.canvasHeight};
}
export function incenseWorldSize(slot:number,layout:SceneLayoutId) {
  const size=actorMetrics(logicalAltar(slot),layout);
  return {height:INCENSE_PROP.height/512*size.canvasHeight,insertion:INCENSE_PROP.insertionDepth/512*size.canvasHeight,
    urnOffsetX:INCENSE_PROP.urnOffsetX/384*size.canvasWidth,
    cupWidth:INCENSE_PROP.sourceCupWidth/384*size.canvasWidth,cupHeight:INCENSE_PROP.sourceCupHeight/512*size.canvasHeight};
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
