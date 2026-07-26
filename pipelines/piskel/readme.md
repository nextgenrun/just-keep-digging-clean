# Piskel Pipelines

Repository-owned builders that convert editable `.piskel` sources into
runtime sprite assets.

The Arc Core review builder round-trips every image through a Piskel document,
checks fixed-canvas anchors and alpha bounds, then writes hashed runtime PNGs
and the Phaser `.sprite.json` pack. Presentation remains a clean in-engine
canvas; this pipeline does not generate or ship visible HTML/HUD framing.
