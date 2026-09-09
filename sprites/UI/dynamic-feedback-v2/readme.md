# Dynamic Feedback V2

This pack replaces the old notification bitmap on Hardcore status and Level Up
feedback with two purpose-built shells. Both shells have an empty icon socket
and contain no text or symbol, allowing Phaser to align the current live icon
and copy without double-rendering a baked legacy crest.

`hardcore-oath-crest-alpha-v2.png` is a square, alpha-safe carrier for the
regenerated Hardcore crest. Its visible artwork keeps its natural aspect ratio,
so square Phaser icon sizing cannot squash it or expose a black rectangle.

`ai-tools/2026-08-31-build-dynamic-ui-shells-v2.py` performs alpha cleanup,
preserves decorative end caps, retargets only neutral center rails, and records
runtime dimensions and hashes in `manifest-v2.json`.
