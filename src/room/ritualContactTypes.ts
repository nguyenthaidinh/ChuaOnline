import type { HandAnchor } from './animationManifest.ts';

export interface RitualContact {
  hand: HandAnchor;
  leftHand: HandAnchor;
  rightHand: HandAnchor;
  handMask: HandAnchor[];
  gripType: 'prayer' | 'support' | 'pinch' | 'release';
  activeHands: 'both' | 'right';
}

export interface RitualContactAtlas {
  atlas: string;
  sha256: string;
  canvasWidth: number;
  canvasHeight: number;
  frames: Record<number, RitualContact>;
}
