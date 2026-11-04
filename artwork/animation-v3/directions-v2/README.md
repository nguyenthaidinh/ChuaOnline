# Five additional walking headings for the male visitor

This group adds straight rear, rear-left, front-left, straight front and front-right
walking headings for the existing male visitor, plus seven neutral standing direction views.
There are 40 gait poses and 7 separate standing poses. Each heading uses its own rendered pixels;
no direction is produced by mirroring, crossfading or warping another character image.
The lateral v1 sources and original rear-right walk remain separate and unchanged.

Generation uses the built-in `image_gen` tool, one transparent full-body pose per call.
The workflow first reviews right-contact and opposite left-contact anchors for each heading,
then derives the remaining loading, passing and swing phases from the appropriate contact.
This keeps anatomical arm/leg roles readable instead of repeating one stride for both steps.

- `generation.json`: initial rear, rear-left and front contacts, with original references.
- `diagonal-generation.json`: front diagonals based on the reviewed new front identity.
- `opposite-generation.json`: opposite-contact anchors.
- `phase-generation.json`: six intervening gait phases per heading.
- `stand-generation.json`: seven new neutral views with both feet grounded and arms at rest.
- `refinement-generation.json` and `selection.json`: corrected poses and exact selected sources.
- `gait-refinement-generation.json`: corrections for wrong pre-contact leg roles, rear-left heading
  drift and a non-square output. Rejected originals are retained, with selected replacements recorded.

```powershell
python scripts/pack-directional-expansion.py
```

The packer uses the shared fixed 384×512 logical canvas, scale and ground pivot (192,468).
It rejects missing/opaque-background/clipped inputs and never alpha-recenters each frame.
Selections are resolved inside this source group and must use PNG filenames and known pose keys.
The master atlas is 1536×6144; the production texture has 192×256 cells in a 4×12 grid,
768×3072 overall, 47 occupied cells and one unused cell. Its decoded RGBA pixel footprint is 9 MiB,
not a browser memory measurement. The row count is calculated from selected frames.
Content-hashed production filenames prevent stale-cache artwork after rebuilding.

`src/room/expandedDirectionGeometry.ts` exports `EXPANDED_DIRECTION_ARTWORK` and
`EXPANDED_DIRECTION_WALKS`, keyed by rear/rearLeft/frontLeft/front/frontRight. Each key has
eight `{cell,id,top}` entries in logical canvas units. The renderer must select the actual
heading and leave the independently authored image unflipped.

`EXPANDED_DIRECTION_STANDS` adds rear/rearLeft/frontLeft/front/frontRight/left/right neutral
views at cells 40–46. They use both planted feet and resting arms, not a held walking stride.
The existing rear-right neutral is reused from transitions-v1 and is not regenerated. Lateral
standing references come from lateral-v1 contacts, while their new PNGs stay in this v2 folder.

Per-heading and combined light/dark boards permit source inspection. Eight-frame loops
use 120 ms per pose (960 ms total); these are source previews, not browser recordings or FPS
measurements. Runtime browser checks and foot-lock measurements remain separate acceptance
steps. This source group does not add female/brown-clothed walking headings.

## Selected output and source review

56 built-in ImageGen outputs are retained: 47 selected sources and 9 superseded drafts.
All selected masters are actual 1254×1254 RGBA. Logical head-top bounds range from 67–74 px;
this checks canvas consistency and does not automatically verify identity or foot locking.
The web asset is `expanded-directions-3de46c2a6c6e.webp`, 419,774 compressed bytes.
`review.json` records every selected source/hash/bounds and the full master/production SHA-256.

The following originals stay in the folder for comparison; `selection.json` chooses their v2 siblings:

| Superseded source | Observed correction |
| --- | --- |
| rear/00-contact.png | Contralateral arm swing |
| rearLeft/04-opposite-contact.png | Opposite-step arm roles |
| rear/03-swing.png | Extended leading leg before contact, rather than knee curl |
| rear/07-opposite-swing.png | Extended leading leg before contact, rather than knee curl |
| rear/06-opposite-passing.png | Tool returned 1133×1388; regenerated on the fixed square canvas |
| rearLeft/02-passing.png | Preserve rear-left head/body orientation |
| rearLeft/06-opposite-passing.png | Preserve rear-left head/body orientation |
| rearLeft/03-swing.png | Preserve the opposite step and arm roles |
| front/03-swing.png | Preserve left-leg-leading pre-contact and counter-swing |

The decoded final WebP was also checked at 192×256 per cell on light/dark backgrounds:
`stands-web-light.png`, `stands-web-dark.png` and `walks-web-dark.png`. No obvious neon contour
was seen at that web size. Magnified native PNGs still contain some saturated boundary pixels;
alpha-channel presence alone is not clean-edge certification. `edge-review.json` retains this
limitation and per-cell RGB diagnostics. Those heuristic counts can include normal warm skin/rim
light and are not a proof that all edges are clean. Master pixels are retained without color-keying,
erosion, cropping or warping to hide the issue.

`tests/expandedDirections.test.ts` passes three checks tying the 47 distinct cells to real PNG
hashes/native dimensions, verifying both real WebP dimension/hash pairs and calculated row capacity,
and checking selected references remain inside the expected image group. Compiler guard probes also
rejected path traversal, a non-PNG suffix and an absolute PNG outside this group.
