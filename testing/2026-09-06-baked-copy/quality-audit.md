# Baked UI quality audit - 2026-09-06

This pass reviews the active baked UI pack in the source game served by the checkout's canonical `serve.py`. The real game review uses an isolated session with save writes blocked. Source-art inspection, runtime image measurements, native-canvas screenshots, and focused contracts provide separate evidence.

## Coverage and changes

- 25 active PNG files, 136 registered fixed labels, and 16 shared icon badges. The active pack totals approximately 46.33 MiB compressed and 149.98 MiB decoded across its load groups; Star Codex and Talents retain feature loading.
- The bottom-left currency foundation now includes both the coin and star icons. Only balances remain live. The player panel includes DEPTH, MINE DMG and GP; the XP rail includes LEVEL and XP. The level-up panel includes its emblem and draws above merchant signs.
- Eighteen major headings have larger source sheets. Shared utility badges include their frames. Music, sound, Events and Export Save have complete authored button faces. Blank notification panels preserve their corners with Phaser nine-slice rendering.
- The Pause Current Run header includes its journal, heading and subtitle. All eight possible stat labels have complete row artwork. The existing feature gates select the applicable rows. A common displayed width aligns rows and their live values without stretching the source art.
- Existing baked Star Codex foundations and empty state, Talents foundation, expedition variants, shared buttons, navigation labels, settings captions and keybind action names were reinspected.
- Live balances, counters, XP fills, depth, GP, damage, selected-item information, prices, timers, configurable keys and other changing content retain their runtime behavior. Long HUD values scale uniformly into reserved wells. Pickaxe and event portrait swaps preserve aspect ratio. The Events launcher hides while other menus are open.

All shipped image files remain byte-for-byte copies of the selected ImageGen outputs. Phaser frame rectangles select source pixels. Rejected outputs with painted checkerboards or incorrect XP divisions are excluded. The audit does not claim that every responsive explanatory sentence in every feature view has been baked.

## Resolution and proportionality

Runtime measurements use logical 1280 x 720 with High density 1.5 and Ultra density 2. Pixel scale is displayed backing pixels per source pixel; a value at or below 1 avoids enlargement.

| Art | Source frame | Review result |
| --- | --- | --- |
| Currency foundation | 2006 x 360 | Uniform scale; Ultra pixel scale about 0.295 |
| Player foundation | 2015 x 552 | Uniform scale; Ultra pixel scale about 0.334 |
| XP rail | 2090 x 215 | Uniform scale; Ultra pixel scale about 0.482 |
| Level-up foundation | 2172 x 402 | Uniform scale; Ultra pixel scale about 0.571 |
| Pause Current Run header | 1362 x 268 | Uniform scale; Ultra pixel scale about 0.910 |
| Pause stat rows | 1363 x 78-81 | Common width, uniform source scale; below native at Ultra |
| Fixed caption frames | Varies by sheet | Source scale capped at 0.5 logical, hence at most 1 at Ultra |
| Star Codex | Existing authored frames | No enlarged baked images detected in the reviewed Ultra states |
| Talents full-screen foundation | 1672 x 941 | Uniform; about 1.496 at Ultra |
| Expedition foundations | 1536 x 1024 | About 1.35 at Ultra; source lettering visually readable |

The new HUD art, Pause stat art, captions and Star Codex remain within source resolution at Ultra. The older Talents and expedition full-screen foundations are still enlarged at Ultra. They were visually reviewed and remain readable, but this is not a claim of native 4K artwork throughout the game.

## Runtime review

The real review covers Pause, Star Codex empty and collected states, Talents, Settings, Campfire, Merchant, World Map and the HUD. The collected Codex fixture exercises 14 Common identities, pagination and a repeated identity. The Talents view reports 36 nodes and 57 connectors with no missing textures. World Map is opened through its real UI entry point.

Stress cases include money `987,654,321,012`, stars `999,999,999`, level 999, a large XP counter, XP at empty/half/full, a changed pickaxe, and an oversized level-up reward. Currency values fit within 72 logical pixels. All ten XP segments retain their changing fill behavior. Reward lines fit their wells and remain above world signs. The reviewed runtime reports no page errors or harness failure.

Evidence:

- [Runtime measurements](quality-runtime-states.json)
- [Pause at Ultra](quality-pause-ultra.png)
- [Star Codex at Ultra](quality-star-codex-ultra.png)
- [Talents at Ultra](quality-talents-ultra.png)
- [Settings at Ultra](quality-settings-ultra.png)
- [Level-up and HUD at Ultra](quality-level-up-ultra.png)
- [Source-art catalogue](quality-review.html)

## Validation and limits

Nine focused contracts pass: baked asset provenance/bounds/fitting, celestial currency, pickaxe theme, XP gathering polish, HUD hit areas, Pause/Settings layout, save-menu presentation, retention systems, and celestial action bar. [Full focused output](quality-tests.txt). Asset and Pause layout contracts were repeated after the final row-width adjustment, along with syntax validation of the changed Pause module.

All 25 active image hashes match their recorded generated sources. Syntax checks of the changed rendering modules and a scoped `git diff --check` pass. The layout work does not change progression, combo decay, saves or purchase behavior.

Two broader legacy contracts fail on assertions outside this UI pass: `2026-08-25-meaningful-level-progression-contract.mjs:241` expects audio volume 0.162 but receives 0; `2026-08-25-player-level-scale-audit-contract.mjs:29` expects seven upgrade level gates but receives an empty list. The related sound and progression data were not changed by this pass. Focused success is not a globally green repository claim.

Generation provenance: [pack notes](../../sprites/UI/baked-copy-v1/readme.md), [active manifest](../../sprites/UI/baked-copy-v1/manifest.json), [quality prompts](../../sprites/UI/baked-copy-v1/quality-prompts.json), [Pause panel prompt](../../sprites/UI/baked-copy-v1/pause-stats-prompt.json).
