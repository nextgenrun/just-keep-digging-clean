# Baked interface copy

Fixed lettering is authored in the PNG artwork with the built-in image_gen tool. The 25 active PNGs remain byte-for-byte identical to their generated originals. No canvas text, runtime rasterization, or pixel cleanup is used to manufacture labels.

`manifest.json` lists active texture keys, load groups, sizes and hashes; `prompts.json` records the initial generation prompts and references; `quality-prompts.json` records the subsequent quality pass and selected outputs. `source-frames.json` retains original source paths, dimensions and hashes, including superseded review variants. Only manifest assets are loaded.

`values/bakedUiArt.js` owns the 136 fixed label mappings and source rectangles. `systems/visual/bakedUiArt.js` selects Phaser frames from the existing source pixels. Full button plaques include their lettering; caption frames serve fixed headings. Buttons, modal titles and HUD plaques fit within their layout bounds using equal horizontal and vertical scaling, so resizing never stretches the baked lettering. Dynamic strings fall back to live text.

Coverage includes the I-key Star Codex foundations and empty state; Esc Celestial Talents foundation and branch headings; expedition rules and both difficulty variants; shared menu buttons, modal titles, tabs, setting captions and keybind action names; pause, save selection, inventory navigation, shop/map headings; HUD Wiki/Menu/World Map plaques and the world campfire prompt. Star and Talents foundations retain their existing feature loading.

Mutable counts, balances, prices, timers, ranks, selected-item details, progression messages, confirmation input and configurable key bindings remain live. Existing interaction targets and fallback text APIs are preserved.

The source pack uses about 46 MiB compressed and 150 MiB decoded across all 25 active textures. Star and Talents foundations are loaded on demand. Focused validation and browser review are recorded in `testing/2026-09-06-baked-copy/`.

The quality pass replaces the bottom-left currency panel with an integrated coin-and-star foundation, bakes DEPTH/MINE DMG/GP into the player panel, and bakes LEVEL/XP into the XP rail. The reward banner includes its emerald emblem, and its changing reward text draws above world merchant signs. Eighteen major headings use three larger source sheets. Sixteen shared utility icons include their frames; audio controls and the Events / Export Save buttons have complete authored faces.

Live balances, depth, GP, damage and XP counters fit their reserved wells. Pickaxe and event portrait changes retain aspect ratio. Empty message panels use Phaser nine-slice rendering to preserve corners while resizing the unlettered interior. The notification row is spaced below the taller player panel. Caption sampling is capped at native source density for Ultra (2x).

Run `node testing/2026-09-06-baked-copy/refresh-manifest.mjs` after changing the active pack. `package-quality.py` verifies all active PNG hashes without modifying pixels; its explicit `--restore-originals` option copies the recorded original files again. The final review is recorded in `testing/2026-09-06-baked-copy/quality-audit.md`.

The Pause Current Run header (including its journal and subtitle) and all eight possible stat rows are complete baked artwork in `pause-stats-v2.png`. Rows are selected according to the existing feature gates; their changing values fit the empty right-hand wells. `pause-stats-prompt.json` records this final panel generation.
