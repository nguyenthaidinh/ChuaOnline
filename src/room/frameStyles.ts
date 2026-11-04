import type { CSSProperties } from 'react';
import type { HandAnchor } from './animationManifest';
import type { ArtworkFrame } from './modernArtworkTypes';
import { roomAssets } from './layout';

export function frameBackground(frame:Pick<ArtworkFrame,'image'|'columns'|'rows'|'atlasCell'> & {rootOffset?:HandAnchor},flip=false,imageUrl?:string,width=384,height=512):CSSProperties {
  const offset=frame.rootOffset??{x:0,y:0};
  return {backgroundImage:`url('${imageUrl??roomAssets.frameImage(frame.image)}')`,
    backgroundSize:`${frame.columns*100}% ${frame.rows*100}%`,
    backgroundPosition:`${frame.atlasCell%frame.columns/Math.max(1,frame.columns-1)*100}% ${Math.floor(frame.atlasCell/frame.columns)/Math.max(1,frame.rows-1)*100}%`,
    transform:`translate(${offset.x/width*100}%,${offset.y/height*100}%) ${flip?'scaleX(-1)':''}`};
}
export function handClipPath(points:readonly HandAnchor[],width=384,height=512) {
  return `polygon(${points.map(point=>`${point.x/width*100}% ${point.y/height*100}%`).join(',')})`;
}
