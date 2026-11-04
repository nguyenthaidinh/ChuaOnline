import type { Appearance, OfferingKind } from './protocol.ts';
import { RITUAL_CONTACT_GEOMETRY } from './ritualContactGeometry.ts';
import type { RitualContact } from './ritualContactTypes.ts';

/** Native atlas coordinates. Missing/non-ritual cells deliberately have no contact. */
export function ritualContact(appearance: Appearance, cell: number): RitualContact | undefined {
  return RITUAL_CONTACT_GEOMETRY[appearance].frames[cell];
}

const PROP_FRACTIONS: Record<OfferingKind, { height: number; gripFraction: number; rotationDeg: number }> = {
  incense: { height: 0.17, gripFraction: 0.8, rotationDeg: 0 },
  lotus: { height: 0.11, gripFraction: 0.7, rotationDeg: 0 },
  petal: { height: 0.04, gripFraction: 0.85, rotationDeg: 0 },
  bell: { height: 0.10, gripFraction: 0.85, rotationDeg: -25 },
};

/** Prop dimensions use the selected appearance's native canvas, not a male anchor scaled in half. */
export function ritualPropGeometry(appearance: Appearance, kind: OfferingKind) {
  const atlas = RITUAL_CONTACT_GEOMETRY[appearance];
  const geometry = PROP_FRACTIONS[kind];
  return { height: geometry.height * atlas.canvasHeight, gripFraction: geometry.gripFraction,
    rotationDeg: geometry.rotationDeg, canvasWidth: atlas.canvasWidth, canvasHeight: atlas.canvasHeight };
}
