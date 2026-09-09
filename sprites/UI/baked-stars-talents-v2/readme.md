# Baked Stars and Talents V2

Created with the built-in ImageGen tool. The 17 selected PNG originals are copied without changing their pixels. `prompts.json` retains the exact prompts and `manifest.json` records source paths, dimensions and SHA-256 hashes.

The pack supplies 36 complete talent faces, baked names, 36 description and rank-effect cards, fixed labels/messages, and 250 complete Star Codex medallions across six rarities. Stellar Lance uses the current Cinder Core and punch-wave imagery. Existing gameplay and save identifiers remain unchanged.

`values/bakedCelestialFrames.js` selects original source rectangles. `values/bakedCelestialUi.js` owns frame keys and placement. Art fits proportionally; UI lettering and star portraits are capped at native pixel density. Live values occupy the reserved rank, cost, count and identity-detail areas.

The Codex keeps the existing 256-pixel identity portraits, with each star and its own light already baked together. New selector medallions need no additional light or idle-motion sprite. Subtle corner shading animates their light while position, size, rotation and opacity remain fixed. Reduced-motion preferences and `?starIdle=0` disable the motion.

The matching Codex foundation lives in `sprites/UI/baked-copy-v1/star-codex-v2.png`. Its prompt and source provenance are also recorded in `prompts.json`.

Runtime review, evidence and focused checks: `testing/2026-09-06-baked-copy/`.
