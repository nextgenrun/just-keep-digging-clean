# Piskel Pipelines

Repository-owned builders that convert editable `.piskel` sources into
runtime sprite assets.

The Arc Core production builder round-trips ten gameplay images and one
sandbox background through two Piskel documents, checks zero-drift
fixed-center anchors and role order, then writes hashed runtime PNGs and
`values/arcCoreVisuals.sprite.json`. It rejects the archived random tile/HUD
roles by omission. Presentation remains in-engine image art; this pipeline
does not generate or ship visible HTML/HUD framing.

`2026-07-26-build-npc-idle-piskel-package.py` round-trips all 48 merchant
states through six editable Piskel documents, applies one uniform scale,
locks the lower-body root and foot baseline, writes v10 runtime WebPs, and
generates per-merchant alignment overlays and drift reports.
