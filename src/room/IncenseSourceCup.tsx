import type { CSSProperties } from 'react';

/** A small bronze holder on the existing wooden stand, empty after acquisition. */
export function IncenseSourceCup({style}:{style:CSSProperties}) {
  return <div className="incense-source-cup" aria-hidden="true" style={style}><i/></div>;
}
