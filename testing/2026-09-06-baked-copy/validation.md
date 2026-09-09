# Baked UI validation - 2026-09-06

The canonical checkout was served through the existing serve.py on port 8080. Browser review used the production game from game.html with jkd_e2e, cinematics=0 and full-review. The review controls were enabled only after the game reported savesBlocked: true. Progression visibility and Star collection fixtures were restricted to that session.

Passed focused contracts:
- baked-copy asset contract: 134 labels, 15 active PNGs; every active source hash matches its generated original; all atlas and caption frames remain inside their source images; live-string fallback and key fitting pass.
- 2026-08-31 UI alignment.
- 2026-08-03 Celestial tree UI.
- 2026-08-22 HUD quick-control hit areas.
- 2026-08-03 save-menu presentation.
- 2026-08-30 Star discovery state.
- 2026-09-03 campfire buffered interaction and evolution.
- 2026-09-04 Celestial apex passives (36 nodes).
- 2026-07-26 pause Settings layout.
- 2026-08-26 world-map mouse polish, including fitted baked-caption hover, disabled state and disposal.
- Scoped JavaScript syntax checks passed.

Browser proof:
- Main menu, save selection and baked New Expedition rendered. Enter without the required YES stayed in setup; typing YES and confirming entered gameplay. Card selection uses regions from the baked foundation so the earlier selection border cannot cross the descriptions.
- I inventory Star Codex: empty state rendered baked instructions without duplicate Phaser wording. The collected fixture showed 14 / 250 found, 15 collected and Glacier Blue x2. Page Down selected page 2 / 2; E moved to the empty Uncommon rarity. No runtime errors were reported. The final counter sits inside the central page plaque.
- Real Esc Talents rendered all 36 nodes and 57 connectors, no missing textures, and no legacy title/subtitle overlay. Its visible counters were level 1, 0 Talent Points and 0 Star Points.
- The production CelestialTalentTreeView fixture at level 5 verified a purchase changed Talent Points 3 to 2, then an upgrade changed Star Points 500 to 400 and rank 1 to 2. Fixed headings remained part of the foundation.
- Native 1920x1080 captures were visually reviewed for Pause, Star Codex empty/collected, Talents, Audio, Controls, campfire and merchant surfaces. Captions were tightened to lettering bounds after the initial review exposed tiny labels. The final Pause view has readable, consistent labels with live values. The final World Map also rendered its baked title, marker heading and footer controls with live location and discovery data.
- The actual I key closed and reopened inventory; two Tab presses reached Star Codex, and Escape returned to gameplay. M opened the World Map without errors.
- Existing configurable bindings stayed separate from the baked action names. No user audio or keybind settings were changed during the review.

Limits: no full repository test suite or broad performance benchmark was run. The older 2026-09-03 talent-points-node-ranks contract still expects the pre-existing 33-node tree; the current tree has 36 nodes, covered by the apex contract. The asset pack adds roughly 29 MiB compressed and 90 MiB decoded when all 15 textures are present; Star and Talents foundations retain feature-based loading.

## Proportion correction follow-up

Baked buttons, modal titles, main-menu buttons and Wiki/Menu/Map HUD plaques now fit within their layout bounds using the same horizontal and vertical scale. Live HUD key labels use the resulting artwork width, and interactive areas retain their existing dimensions. Main-menu keyboard selection follows the fitted artwork edge.

- Five focused contracts passed: baked-copy assets, HUD quick-control hit areas, save-menu presentation, pause Settings layout and UI alignment. The asset contract checks all 134 label frames against five differently shaped boxes (670 fits), including repeated resizing. Scoped JavaScript syntax checks also passed.
- The focused browser preview rendered 16 production UI images with zero unequal scales. Clicking a shared button updated the preview counter and selection state.
- The production game loaded through the review entrypoint. Its main menu used equal scales for all six baked button layers. A save-blocked gameplay session showed zero stretched visible images in Pause (21), gameplay HUD (3) and Audio Settings (23), with no reported runtime errors.
- Native 1920x1080 captures of Pause, the HUD and Audio Settings were visually inspected. Button lettering, the modal title, compact ON/OFF buttons and Wiki/Menu/Map plaques retain their authored proportions. The actual Resume Game button returned to gameplay when clicked. No audio or keybind preferences were changed.
