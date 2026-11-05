# Brown visitor stop-pose source QA

The integration owner generated four raw poses per heading: right-gather, right-close, left-gather and left-close. All32 selected poses now have reviewed support points in `support-contacts.json`; `handoff.json` locks their paths and SHA256 values. Four versioned replacements are selected, with their four raw originals retained as drafts:36 native stop sources total.

Each point is measured on the selected PNG in native coordinates. `supportFoot` is visually checked from the planted leg. `landmark` must match the corresponding foot in `variant-gaits-v1/granny/neutral-feet.json`: heel-to-heel or plantar-toe-pad-to-plantar-toe-pad. Hidden heels are not inferred. `sourceSha256`, the native grid, the review note and the neutral SHA identify the evidence.

`qa_contacts.py` validates the current selected PNG and grid hash, then rejects pin offsets over45 logical pixels. It does not choose a point automatically or relax the bound. Grids are inspection crops only. Sequence boards show passing, gather, close and neutral at144x192 without runtime offsets.

Raw PNGs stay unchanged. A failed source is refined through the built-in ImageGen tool into a versioned sibling, recorded in `refinement-generation.json`, and selected explicitly through `selection.json`. An empty selection means raw sources remain selected. Raw generation provenance belongs to the integration owner.

The left-profile right-support gather/close siblings bring the free foot inward to the neutral stance. Rear-left left-support gather/close siblings correct repeated far-right support and keep the near left heel close to its own neutral footprint. The associated gait06 and swapped neutral R/L labels were corrected with root approval; see `../../variant-gaits-v1/granny/rearLeft-role-revisions.json`. Exact prompts and actual built-in output paths are also retained in the rear-left refinement manifests/results. All eight144x192 light/dark source sequences and native support grids have been inspected. Maximum measured pin length is33.85 logical pixels, below45; source QA does not establish browser performance.

Browser playback, timing, clipping and movement behavior are verified by the integration owner. These local artifacts document source QA and visible support landmarks.
