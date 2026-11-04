import { HEADING_ORDER, type Heading8 } from './locomotion.ts';

/** Traverse authored 45-degree views. A half turn always takes the same left-hand route. */
export function turnHeading(from:Heading8,to:Heading8,progress:number):Heading8 {
  const start=HEADING_ORDER.indexOf(from),end=HEADING_ORDER.indexOf(to);
  const delta=(end-start+12)%8-4;
  const t=Number.isNaN(progress)?0:Math.max(0,Math.min(1,progress));
  const step=Math.round(Math.abs(delta)*t)*Math.sign(delta);
  return HEADING_ORDER[(start+step+8)%8];
}
