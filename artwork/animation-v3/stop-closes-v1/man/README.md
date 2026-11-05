# Male final closing steps

This folder contains32 selected new gather/close poses: eight physical headings,
right/left support foot, and two stages each. The16 compact passing sources are
in `passing-v2/`. Root packs these48 poses into the male closing bank. The neutral
comes from the matching existing male directional bank and is reused exactly.

All32 contacts in `support-contacts.json` were measured on their own selected male
PNG, verified against visible foot pixels and marked source grids, and approved.
Foot labels follow actual near/far thigh occlusion and the selected passing pose.
Where the heel is hidden, the matching own neutral and moving frame both use a
visible plantar forefoot/toe-pad landmark. No male/female coordinate copying,
mirrored headings, inferred hidden heels or heel-to-toe subtraction is used.

Six explicit refinements replace observed support-role/closing errors:

- `rearRight/right-gather-v3.png`: near/image-right heel planted.
- `rearRight/left-close-v5.png`: both soles flat; far/image-left heel available.
- `right/left-gather-v6.png`: bent foreground near-right leg remains airborne
  behind the planted calf, with a straight background far-left support leg.
- `right/left-close-v4.png`: both soles flat at their own profile depth.
- `rearLeft/left-gather-v4.png`: near-left support, free far-right foot gathering.
- `left/left-close-v3.png`: near-left heel planted, far-right foot closing.

`selection.json` records exact selected siblings. The earlier repeated-support,
portrait and other superseded versions remain as drafts. `handoff.json` records
32 selected poses,60 generated closing outputs,28 retained drafts, exact prompt
hashes and verified reference hashes. The final own-source edits use the built-in
ImageGen tool; API/CLI generation and image mirroring were not used.

The left/left-close source is1246×1262. `canvas-overrides.json` explicitly approves
its SHA and uniform centered virtual1262square export. Source pixels and native
annotations stay unchanged. There is no stretching. Wider portrait drafts remain
rejected. Every other selected closing source is1254×1254 RGBA.

Largest correction on either logical axis:20.2107px on the384×512 canvas, below
the45px cap; all pinned bounds stay inside the canvas. Native contact precision
is approximately2pixels, not optical tracking. The source pin fixes the planted
landmark, not every point on the sole throughout the full walking cycle.

`closing-contact-review-1/2.jpg` mark all32 native contacts.
`closing-sequence-1/2-light/dark.png` show16 own passing→gather→close→neutral
sequences at144×192 after WebP95 encode/decode with their foot pins applied.
Labels60/110/130/120 are the public420ms closing interval. These are QA images,
not runtime textures or browser/FPS evidence. Root verifies the final compiled
48-cell atlas and browser choreography.

Rebuild QA without mutating source images:

```powershell
python artwork/animation-v3/stop-closes-v1/man/review-closes.py
python artwork/animation-v3/stop-closes-v1/man/preview-closes.py
python artwork/animation-v3/stop-closes-v1/man/finish-handoff.py
```

Changed source hashes or measured points lose review approval and require a new
visual check. The final preview/handoff scripts preserve source and selection.
