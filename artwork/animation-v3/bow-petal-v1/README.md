# Bow and petal source artwork

This bank adds real kneeling, prostration, recovery, rise and empty-hand petal
gestures for the man, woman and elderly woman. It uses the existing elevated
rear-right camera and the existing neutral source for each identity. The renderer
keeps the petal separate from the painted body.

## Source and selection

Each identity has 24 selected cells: its original neutral plus 23 newly generated
poses. `sequences.json` is the source inventory and timeline. `selection.json`
selects versioned refinements; the first outputs and intermediate drafts remain
in the same identity folder. Generation manifests preserve the exact built-in
ImageGen prompts and reference selections. `provenance.json`, produced after the
source review, binds each generated output and reference to its SHA-256.

The reviewed bank retains 87 built-in outputs: 69 new selected poses and 18
retained drafts, plus three byte-for-byte neutral reuses. Four asset tests pass.

Browser QA superseded the initial floor-pose review: the earlier 07/08/09 sources
kept the head and open hands too high. Nine selected siblings now place palms
down on the forward floor plane, fold the head below the hips for prostration,
and lift the head only slightly before pushing up. Native grids, toe contacts,
originals, rejected extra drafts and exact generation records remain in
`floor-contact-revisions.json` and `floor-contact-refinement-generation.json`.
`floor-contact-review.py` reproduces own-source contact candidates; acceptance
is a separate explicit review step. The head marker is a visible lower
silhouette, not an inferred hidden forehead coordinate.

The man's neutral is the exact `transitions-v1/00-stand-angled.png`; the other two
neutrals are their exact `variants-v1/<identity>/00-neutral.png` files. Neutral
images are reused byte for byte. A lowered body is not enlarged to fill its cell.
There is no floor, shadow, cushion, offering or smoke baked into these poses.

The bow uses distinct lift-head, push-up and kneel-return poses. Recovery reuses
the new hands-on-floor preparation for 120 ms between the low head-lift and fully
extended-arm push-up, with the latter shortened to 140 ms; bowUp remains 1020 ms.
This single intermediate does not reverse the whole lowering sequence.
Rising includes
hand support, a half-kneel, a bent-knee weight transfer and an airborne closing
foot. Petal recovery includes a separate low-arms pose before neutral. Neither
recovery is produced by reversing its whole lowering clip.

The posture reference is the author's guidance by Pháp sư Đạo Chứng, hosted by
the Vietnam Buddhist Sangha portal:
[Lễ Phật: Cách lễ, thái độ khôi phục thân tâm](https://phatgiao.org.vn/le-phat-cach-le-thai-do-khoi-phuc-than-tam-d56811.html).
Only the description of respectful prostration and ritual variation informed the
poses; no medical claims from that page are used here.

## Timing and runtime boundary

| Clip | Duration |
| --- | ---: |
| kneelDown | 720 ms |
| kneeling | 400 ms |
| bowDown | 1040 ms |
| bowHold | 380 ms |
| bowUp | 1020 ms |
| rise | 760 ms |
| offerRaise | 700 ms |
| offerHold | 650 ms |
| petalRelease | 1050 ms |
| offerRelease | 880 ms |

The last closed cup is `18-petal-pre-release`. The first open release is
`19-petal-release`, starting at exactly 350 ms in `petalRelease`. Both use the
same measured grip point within their own identity. Only poses 15 through 18
hold the separate petal. The server clock remains independent of artwork.

Bow cycles return to the same upright prayer pose. `rise` reaches neutral at
500 ms and leaves 260 ms for the existing standing return-pivot window. Runtime
integration decides how that turn takes priority over the neutral tail.

## Geometry and contact review

`annotations.json` records native-pixel grips, hand masks and visible support
contours, locked to the selected image SHA. Seven hand poses are measured
separately for every identity. Hand masks use that image's own skin contour in a
reviewed hand-only region with a small native-pixel margin; they are never copied
from the male mask. Release follows the upper, screen-right hand in this camera.

The support annotations describe the visible toe/sole contact contour, not a
complete biomechanical foot solver. Kneeling poses share their own kneel-rest
toe reference. Supported rise poses share their own right-sole reference. The
final closing-foot pose uses the planted left sole and its own neutral reference.
The variant rise landmarks use the viewed posterior sole curve: selecting the
lowest row alone can instead pick the middle of the sole when the heel slopes.
The source must be corrected if it needs more than 20 logical pixels of root
compensation. The compiler rejects moved contact points that clip the body.

`hand-calibration.jpg` and `foot-calibration.jpg` show native-coordinate grids.
`hand-review.jpg` and `contact-review.jpg` show accepted points and masks. The
optional `contact-candidates.json` is diagnostic proposal data; the SHA-locked
`annotations.json` is the accepted source of truth.

## Build and inspect

```powershell
python scripts/pack-bow-petal.py --hands-review woman
python scripts/pack-bow-petal.py --contacts-review woman
python scripts/pack-bow-petal.py --review woman
python scripts/pack-bow-petal.py
node --experimental-strip-types --test tests/bowPetalAssets.test.ts
```

Review commands do not write runtime placeholder frames. The full compiler
requires every selected source and own annotation, then writes
`src/room/bowPetalGeometry.ts`, three content-addressed public WebP atlases and
per-identity `review.json` audits. It uses the shared fixed-canvas normalizer:
384×512 logical cells with ground pivot (192,468). Source canvases remain full
size and keep their unused transparent margins.

Full masters are 1536×3072. The 192×256 per-cell previews stay in this source
folder. Public textures use 144×192 cells in a 4×6 atlas (576×1152), retaining the
same logical geometry. The three public textures total 7.59375 MiB of decoded
RGBA pixels; this is a pixel estimate, not a measured browser-memory result.

Each full build creates light/dark source contact sheets, per-clip storyboards
and WebP timing loops, plus `production-192-*.png` and `production-144-*.png`
made by decoding the actual WebPs. Inspect both sizes on both backgrounds before
accepting a new selection. Source artwork and standalone loops do not replace
the integrated multi-user browser review.

Final content-addressed textures: `man-bow-petal-c85f849040c5.webp` (120500 bytes),
`woman-bow-petal-7b082d2b1f1e.webp` (119240 bytes), and
`granny-bow-petal-5e556b724f6c.webp` (119686 bytes). `visual-review.json` records
the source/decoded review boundary and reproducible validation commands.
