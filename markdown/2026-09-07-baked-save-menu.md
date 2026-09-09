# Baked Save Slots - 2026-09-07

The Save Slots screen now renders complete ImageGen cards. The journal, frame, SLOT label, NEW SAVE/CONTINUE nameplate and occupied-card stat labels are in the same original bitmap. Fixed instructions and keyboard hints are authored plaques. The duplicate subtitle and separate E/I button hints are removed; the baked footer contains those shortcuts.

Only slot numbers, save dates, mode/life state, statistics and the build identifier remain live. Stat values share right-aligned column edges inside the frame; very large values use compact English notation matching the UI language (for example 987.7B). No save-store, import/export, deletion, keyboard binding or launch behavior was changed.

## Artwork

Built-in ImageGen mode. Original PNGs and the exact prompt set:

- [Cards](../sprites/UI/save-menu-baked-v2/save-cards-original.png)
- [Instructions](../sprites/UI/save-menu-baked-v2/save-copy-original.png)
- [Prompts](../sprites/UI/save-menu-baked-v2/prompts.json)
- [Source dimensions and hashes](../sprites/UI/save-menu-baked-v2/manifest.json)

Both original atlases are 1536 x 1024 RGB. The generator supplied a checkerboard gutter, including on a rejected transparency edit. Runtime frame clips follow the measured silhouette and exclude that gutter. The original pixels remain untouched: there is no generated canvas text, alpha conversion or stretched artwork. Card source density is over 2.4 pixels per logical pixel; instructions have at least 2.0. All image scales are uniform.

The two atlases join the existing menu preload/release owner. WorldLoad releases all eleven menu textures and StartMenu preloads them on return. The existing saveMenuArt=0 rollback remains available.

## Validation

Passed:
- node testing/2026-08-03-save-menu-presentation-contract.mjs
- node testing/2026-08-13-save-vault-start-regression-contract.mjs
- node testing/2026-07-27-manual-save-transfer-ui-contract.mjs
- Syntax checks for the modified scene and view.

Real browser review at Ultra quality:
- Empty and occupied cards, selected frames and bottom instructions are legible, with clean frame edges.
- Casual and Hardcore fixtures include 987,654,321,012 money, long depths, stars and tile totals. Every live value fits its reserved well.
- New Save + Enter opens New Expedition; Escape returns without creating a save.
- Ended Hardcore + Enter stays in the menu with the baked warning.
- Restored original save data, selected Continue and entered PlayScene with save writes blocked by E2E. No runtime errors.
- Normal menu live text consists only of slot/date/state/stat/build values; the fixed card copy and keyboard hints are images.

[Native Ultra preview](../testing/2026-09-06-baked-copy/save-menu-baked-final.png) | [Large values and Hardcore](../testing/2026-09-06-baked-copy/save-menu-baked-stress.png) | [Runtime evidence](../testing/2026-09-06-baked-copy/save-menu-baked-runtime.json)

Local fixtures live in testing/2026-09-06-baked-copy/save-menu-review.js and change only the menu's in-memory display data. They never write to save storage.
