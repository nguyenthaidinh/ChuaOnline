# Native hand contacts for the existing ritual artwork

These annotations were reviewed separately on the actual `visual-v2` web atlases for
the man, woman and older visitor in brown. They correct the previous assumption that
female and brown-clothed hand locations equal the man's coordinates divided by two.

`annotations.json` records native atlas pixels, canvas dimensions and the SHA-256 of
the exact image reviewed. `review.png` shows the hand anchors and foreground contours;
green marks the prop attachment, magenta/blue mark anatomical left/right hand samples.
The compiler checks atlas hashes, grid sizes, coordinate bounds and nearby opaque pixels.
It does not detect anatomy or rescale another appearance's coordinates.

```powershell
python scripts/pack-ritual-contacts.py
node --experimental-strip-types --test tests/ritualContacts.test.ts
```

Runtime helpers are in `src/room/ritualContacts.ts`. `ritualContact(appearance, cell)`
returns native `hand`, `leftHand`, `rightHand`, `handMask`, `gripType` and `activeHands`.
`ritualPropGeometry` supplies native prop height, canvas dimensions, grip fraction and
rotation; it keeps existing world-size proportions. This metadata does not change
the shared action clock or make new artwork.

Coverage is legacy cells 9–13 (chest, raised, supporting palms, placing and release).
Cell 13 has an open releasing hand: its contact can locate an effect but does not certify
a closed mallet grip. The authored v3 incense sequence has separate metadata. New poses
and browser checks of the renderer are still needed for a complete visual upgrade.

No texture was edited or regenerated for this contact pass. Foreground hand masks reuse
the exact hand pixels from the same atlas, with the prop drawn between the body and hand layer.
