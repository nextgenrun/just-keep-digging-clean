# Tile HP alignment and next visual priorities

Date: 2026-09-06

## Alignment fix

The newer player HUD moved the GP value down, while TargetTileHudView retained
the earlier absolute x/y layout. In the real game, the HP text center was at
y=72 and GP was at y=83.5: an 11.5-logical-pixel mismatch.

HUDSystem now exposes the current GP value bounds. TargetTileHudView anchors
its numeric row to those bounds, including after HUD rebinding and resizing.
Its horizontal position derives from the current player-core layout. The
approved frame has additional internal vertical padding for both lines.
The existing mining target, tile health, art, and gameplay remain authoritative.

Changed sources:
- systems/visual/TargetTileHudView.js
- systems/visual/HUDSystem.js
- values/gameplayPresentation.js
- testing/2026-09-05-most-seen-wiring-contract.mjs

## Verification

- Actual game through the active checkout's serve.py on port 8196.
- Isolated browser with save writes blocked.
- HP and GP centers both measured y=83.5 at browser sizes 1280x720, 800x450,
  1600x1000, and 1920x1080.
- Both text lines retained at least 8 logical pixels of frame padding.
- Real mouse mining changed HP 88/88 to HP 80/88 with alignment retained.
- ANCIENT RELIC CACHE fit inside the same plate.
- Pause hid target HP.
- Presentation and mouse-mining contracts passed; changed source syntax checked.
- Runtime validation captured no page errors.

Evidence is in visual-approval-previews/2026-09-06-hp-alignment-and-next-visuals:
03-hp-before.png, 05-hp-after.png, 06-mining-hp-fixed-1080.png,
07-hp-long-label.png, and hp-alignment-verification.json.

## Next visual priorities

Exposure is inferred from the gameplay loop and current runtime, not analytics.
These are recommendations; only the HP alignment fix was implemented here.

1. Mine walls, ore, and dug edges.
   The terrain occupies most of the mining view. Broad painted roots and rock
   patterns compete with the small playable face; isolated stone/ore patches
   can read as pasted-on pieces. Add coherent material scale, embedded veins,
   exposed cross-sections, and carefully authored broken rims at dug boundaries.
   Keep collision, dig reach, and lighting visibility rules unchanged.
   Review narrow tunnels and irregular actual excavation, not only the staged
   rectangular chamber used to make the alignment checkpoint reproducible.
   Existing owners include the scenic terrain mask, terrain variation,
   ground structure, underground detail, and ground damage layers.

2. Player silhouette and local lighting.
   The small grey miner has weak separation from the dense cave palette.
   Match the miner to the local torch/world light with restrained edge light
   and material response while preserving the approved body and animation.
   The recently corrected physical contact shadow and cave tint should remain
   the foundation. A generic always-on glow would weaken the game's atmosphere.

3. Impact-to-reward readability.
   The game already has staged fractures, contact effects, fragments, and loot
   flights. Improve how those existing pieces read as one event: a clear
   contact, material-specific fracture growth, a legible final break, then a
   clean pickup and HUD arrival. Give valuable finds stronger emphasis than
   ordinary dirt, and avoid filling every hit with extra particles.

Start with terrain and player readability together at shallow, middle, and deep
checkpoints. Inventory/shop redesigns can follow after the continuous mining
view has a consistent visual language.
