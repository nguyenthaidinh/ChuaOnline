import type { FrameSpec, Facing, HandAnchor } from './animationManifest.ts';

export interface ArtworkFrame extends FrameSpec {
  index:number; facing:Facing; top:number; image:string;
  columns:number; rows:number; atlasCell:number;
}

export interface IncenseGeometry {
  id:string; top:number; grip?:HandAnchor; leftHand?:HandAnchor; rightHand?:HandAnchor;
  handMask?:HandAnchor[]; holdsIncense:boolean;
}

export interface MovementGeometry {
  id:string; index:number; startMs:number; endMs:number;
  rootOffset:HandAnchor; top:number;
}
