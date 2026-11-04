# Authored lateral walks for the male visitor

This source group adds true screen-left and screen-right walking headings for the
existing man in blue-grey ao lam. Each heading is rendered independently from the same
identity reference; the opposite heading is not a mirrored image. It does not provide
new female/brown-clothed walks or certify all eight movement headings.

Built-in `image_gen` produces one transparent full-body pose per call. `generation.json`
records every prompt, reference and intended output. Each direction first establishes
a contact pose, then uses that direction's contact as the camera/identity/root reference
for seven additional phases: load, pass, swing and the opposite anatomical step.

20 PNG outputs were retained: 16 selected poses and four superseded drafts. Source review
found an incorrect opposite-step arm swing; the affected loading/contact/swing poses were
regenerated from the corrected opposite contact. `refinement-generation.json` records those
four prompts and `selection.json` records the exact sources compiled into the atlas.

```powershell
python scripts/pack-directional-movement.py
```

The packer uses the same fixed canvas, scale and ground pivot as the approved studies:
384×512 logical pixels and pivot (192,468). It does not alpha-crop/recenter individual
poses, mirror the character, interpolate body images, or generate anatomy. Missing,
opaque-background and clipped inputs stop the build.

Outputs include a 1536×2048 master atlas, light/dark review boards and two source-loop
WebP previews (8 poses ×120 ms =960 ms). Those loops are atlas previews, not browser
recordings or FPS measurements. The web texture is half-resolution (768×1024,
192×256 cells), with a content-hashed immutable filename under `public/assets/animation-v3`.
The new texture's decoded pixel footprint is 3 MiB; this is not a browser memory measurement.

Selected output: `directional-walk-7e5dc65f63fd.webp`, 157,036 compressed bytes. All selected
masters are 1254×1254 RGBA; the inspected logical head-top range is 70–71 px across 16 poses.
Light/dark boards show the complete body and feet without canvas clipping. The two loop
files contain 8 frames each. Foot locking on every route has not been measured by these
source checks. `tests/directionalMovement.test.ts` passes 2 checks tying separate direction
cells to real PNG hashes and verifying the actual WebP dimensions/content hash.

`src/room/directionalMovementGeometry.ts` exports `DIRECTIONAL_ARTWORK` and
`DIRECTIONAL_WALKS.left/right`, each an array of `{cell,id,top}`. Cells0–7 are left and
cells8–15 are right. All metadata is in logical384×512 units, independent of texture LOD.
The renderer must select the real heading and avoid mirroring these new direction assets.

Manual source review and integration results are reported with the parent implementation.
New front/rear diagonals, transition links and physical device performance remain separate
acceptance work; this group alone is not a complete movement or release sign-off.
