# Compact passing corrections for movement v4

This folder contains 16 real male passing poses: eight physical headings, each with
the right or left leg supporting the body. The other knee is flexed and its foot
is clearly airborne; these are compact passing poses, not long contact strides.
They supplement the existing walk banks for movement v4. Root owns compilation
into the48-cell male close bank and all runtime integration.

`selection.json` picks the corrected `rearRight/right-v2.png` and
`rearRight/left-v2.png`. Their predecessors are retained as drafts. The corrected profile `right/left-v3.png` also replaces a repeated foreground-straight pilot; the final near-right leg bends in front of the straight far-left support, free foot behind the calf on image-left. The original
rearRight female02/06 references repeated the far-left support; the final female
02-v2/06-v4 pair provides genuinely opposite near/far thigh occlusion. The male
rearRight convention is RIGHT=near/image-right and LEFT=far/image-left. A different
arm swing alone was not accepted as evidence that the legs had changed roles.

`support-feet.json` contains16 native points measured on the selected male PNGs,
SHA locked and `reviewed:true`. `reference-feet.json` contains the16 own male
neutral landmarks and remains unchanged. Where the heel is occluded, both poses
use the visible plantar forefoot/toe pad. Heel and toe points are not mixed.
The largest correction on either logical axis is17.179px on the384×512 canvas,
well below the45px cap. These approximately2nativepixel manual measurements are
not optical foot tracking.

All19 generated PNGs retain true RGBA transparency and original1254×1254 size.
The16 selected images and3 retained drafts have full prompt/reference hash
provenance in `generation.json`, `rearRight-refinement-generation.json`, `profile-support-correction-generation.json` and
`handoff.json`. The final left-v2 source also records its actual builtin save path.
Only the built-in ImageGen tool was used; there were no API/CLI calls or mirrors.

Reviewed evidence includes source boards, full native lateral/rearLeft and corrected
rearRight images, `support-contact-review.jpg` with all16 marked support points,
and144×192 per-cell WebP95 roundtrip boards on light and dark backgrounds.
`qa-lod.webp` and `decoded-144-*.png` are QA artifacts, not public runtime textures.
Root must review the final compiled48-cell WebP and browser sequence too.

Repeat metadata/preview verification from the checkout root:

```powershell
python artwork/animation-v3/stop-closes-v1/man/passing-v2/review-contacts.py
python artwork/animation-v3/stop-closes-v1/man/passing-v2/handoff-assets.py
```

The contact reviewer only retains approval when selected source SHA, point and
landmark are unchanged. New or changed measurements require visual approval.
