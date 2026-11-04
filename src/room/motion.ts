/** Floor coordinates are shared by every viewport. z grows toward the door. */
export interface FloorPoint { x: number; z: number }
export interface Route { points: FloorPoint[]; cumulative: number[]; length: number }
export const WALK_SPEED = 1.45;
export const DOOR: FloorPoint = { x: 0, z: 8.2 };
export function logicalSeat(seat: number): FloorPoint {
  return { x: [-2.8, 2.8, -1.8, 1.8, -0.9, 0.9][seat % 6], z: 3.1 + Math.floor(seat / 6) * 1.08 };
}
export function logicalAltar(slot: number,bow=false): FloorPoint { return { x: [-2.25,-0.75,0.75,2.25][slot]-(bow ? 0.3 : 0), z: bow?2.25:1.6 }; }
const lerp = (a: FloorPoint, b: FloorPoint, t: number): FloorPoint => ({ x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t });
const distance = (a: FloorPoint,b: FloorPoint) => Math.hypot(b.x-a.x,b.z-a.z);
/** Round each corner, then measure the resulting curve rather than assigning time to segments. */
export function makeRoute(waypoints: FloorPoint[]): Route {
  const points: FloorPoint[] = [waypoints[0]];
  for(let i=1;i<waypoints.length-1;i++) {
    const [before,corner,after]=[waypoints[i-1],waypoints[i],waypoints[i+1]];
    const radius=Math.min(0.32,distance(before,corner)*0.35,distance(corner,after)*0.35);
    const entry=lerp(corner,before,radius/(distance(corner,before)||1));
    const exit=lerp(corner,after,radius/(distance(corner,after)||1));
    points.push(entry);
    for(let step=1;step<=8;step++) { const t=step/8; points.push(lerp(lerp(entry,corner,t),lerp(corner,exit,t),t)); }
  }
  points.push(waypoints.at(-1)!);
  const cumulative=[0];
  for(let i=1;i<points.length;i++) cumulative.push(cumulative[i-1]+distance(points[i-1],points[i]));
  return {points,cumulative,length:cumulative.at(-1)!};
}
export function sampleRoute(route: Route, progress: number) {
  const traveled=Math.max(0,Math.min(1,progress))*route.length;
  let index=route.cumulative.findIndex((value,i)=>i>0&&value>=traveled);
  if(index<1) index=route.points.length-1;
  const a=route.points[index-1],b=route.points[index];
  const point=lerp(a,b,(traveled-route.cumulative[index-1])/(route.cumulative[index]-route.cumulative[index-1]||1));
  return {point,tangent:{x:b.x-a.x,z:b.z-a.z},distance:traveled};
}
const entryCache=new Map<number,Route>(), ritualCache=new Map<string,Route>();
export function entryRoute(seat: number) {
  if(!entryCache.has(seat)) { const home=logicalSeat(seat); entryCache.set(seat,makeRoute([DOOR,{x:0,z:home.z+0.5},{x:home.x,z:home.z+0.5},home])); }
  return entryCache.get(seat)!;
}
export function ritualRoute(seat: number,slot: number,returning=false,bow=false) {
  const key=`${seat}:${slot}:${returning}:${bow}`;
  if(!ritualCache.has(key)) {
    const home=logicalSeat(seat),altar=logicalAltar(slot,bow);
    // Each ritual station has a separate approach. Opposite directions use opposite sides.
    const lane=altar.x+(returning?0.22:-0.22);
    const points=[home,{x:home.x,z:home.z+0.38},{x:lane,z:home.z+0.38},{x:lane,z:altar.z+0.55},altar];
    ritualCache.set(key,makeRoute(returning?points.reverse():points));
  }
  return ritualCache.get(key)!;
}
export const routeDurationMs=(route: Route)=>Math.round(route.length/WALK_SPEED*1000);
export function actionMovement(seat: number,slot: number,bow=false) {
  return {seat,outboundMs:routeDurationMs(ritualRoute(seat,slot,false,bow)),returnMs:routeDurationMs(ritualRoute(seat,slot,true,bow)),version:2 as const};
}
