# Brown-clothed elderly visitor gait sources

72 selected poses: eight headings, each with one neutral stand and eight walking phases. The built-in ImageGen tool produced 72 source PNGs; 71 are selected and one is retained as a draft. `rearRight/stand.png` is a byte-identical reuse of `../../variants-v1/granny/00-neutral.png`.

Headings: rear, rearRight, right, frontRight, front, frontLeft, left, rearLeft. Phase order: contact, loading, passing, swing, opposite-contact, opposite-loading, opposite-passing, opposite-swing.

Every selected PNG retains genuine RGBA transparency and its original fixed square source canvas. No source was cropped, recentered, mirrored, recolored or repainted. Shared `scripts/pose_canvas.py` supplies the 384x512 logical canvas and192,468 pivot. The144x192 files in this folder are inspection previews, not runtime exports.

`selected-sources.json` lists all72 selected project paths and SHA256 values. `generation.json` contains every actual tool output, exact prompt, input-reference path/hash, source dimensions and retained draft list. `generation-results.ndjson` is the save-time provenance journal. `selection.json` chooses the corrected rear-left06 sibling.

Full-source reinspection found rear-left06 repeating the far-right support silhouette of02. With the integration owner's approval, `rearLeft/06-opposite-passing-v2.png` now plants the near LEFT leg and bends the far RIGHT thigh. The original remains a draft. The same review corrected swapped rear-left neutral labels: RIGHT is far/image-right, LEFT is near/image-left. `rearLeft-role-revisions.json` preserves the previous lock, support and neutral metadata. The revised source, native heel grid and192/144 light/dark boards were reviewed before replacing the selection.

`review.json`, `visual-review.json`, the light/dark heading storyboards and eight-frame WebP loops document source review. The `-lod144` boards/loops inspect the integration target size. These artifacts do not claim browser playback, multiplayer validation or measured FPS.

`locked-anchors.json` freezes all neutral/contact/passing reference sources used for stop generation. `support-feet.json` contains16 primary `supportPoint` annotations; their machine-readable `landmark` matches `neutral-feet.json`'s per-foot `landmarks`. Use heel-to-heel or plantar-toe-pad-to-plantar-toe-pad coordinates. `supportHeel` is secondary history, with `supportHeelLandmark` describing its actual type. `contact-feet.json` retains four earlier heel-strike annotations and is not the stop reference.

Native-coordinate grids in `feet-review` are inspection crops only. They never replace or crop a production source. Occluded heels are explicitly identified; visible plantar points are used without inventing hidden anatomy.

From the repository root, rebuild inspection artifacts with:

```powershell
python artwork/animation-v3/variant-gaits-v1/granny/review_sources.py
python artwork/animation-v3/variant-gaits-v1/granny/review_sources.py --lod
python artwork/animation-v3/variant-gaits-v1/granny/finalize_sources.py
```

Do not replace a locked source silently. Keep a proposed correction under a versioned sibling filename and notify the integration owner before changing its selection.
