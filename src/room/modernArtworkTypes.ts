import type { FrameSpec, Facing, HandAnchor } from './animationManifest.ts';
import type { Heading8, LocomotionSample } from './locomotion.ts';
import type { Appearance } from './protocol.ts';

export type MovementStage = Pick<LocomotionSample,'stage'|'stageProgress'|'heading'|'gaitPhase'|'supportFoot'>;
export interface MovementReadiness {
  base:boolean; lateral:boolean; expanded?:boolean;
  variants?:Record<'woman'|'granny',boolean>;
  gaits?:Record<'woman'|'granny',boolean>;
  closes?:Record<Appearance,boolean>;
}

export interface ArtworkFrame extends FrameSpec {
  index:number; facing:Facing; top:number; image:string;
  columns:number; rows:number; atlasCell:number;
  heading?:Heading8;
}

export interface IncenseGeometry {
  id:string; top:number; grip?:HandAnchor; leftHand?:HandAnchor; rightHand?:HandAnchor;
  handMask?:HandAnchor[]; holdsIncense:boolean;
}

export interface MovementGeometry {
  id:string; index:number; startMs:number; endMs:number;
  rootOffset:HandAnchor; top:number;
  bank?:'transition'|'walk';
}
