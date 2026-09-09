# Ability upgrade icons

ImageGen-authored Quick Slash, Thunder Strike and Gem Fly Speed icons.
Source artwork matches the painted bronze/steel material style of the existing
pickaxe family. Runtime wiring and verification are recorded below.

## Runtime integration

`values/abilityUpgradeIconArt.js` owns versioned paths and semantic fallbacks.
`values/uiIcons.js` maps Quick Slash, Thunder Strike and Gem Fly Speed to the
three dedicated textures. `BootScene.js` preloads them. The shared
`UiIconRenderer.js` retains each prior speed/power atlas symbol when a texture
is unavailable. Both shop list and detail panel use the existing upgrade
resolver. Other speed/power upgrades keep their original identities.

The 256 px runtime PNGs are packed by
`ai-tools/2026-09-09-pack-ability-upgrade-icons.py`, using the established
resource-icon size preset and the ability review settings under `values/`.
`readability-review.png` shows the exact runtime files at 34, 56 and 96 px.
All three runtime PNGs have verified alpha range 0-255 and zero detected green
spill. Hashes and source bounds are recorded in `manifest.json`.

Quickslash and Thunder Strike came from ImageGen with real alpha. Flight was
corrected through ImageGen onto green, then extracted with the installed
ImageGen chroma helper (border key, soft matte 12/220, despill).

## ImageGen provenance

Task: 01a08594-0e6f-7a73-89e7-ae5804bf1cbb
- Quickslash: exec-51b56ee3-8e70-48e5-b4d7-5ad57148450d.png
- Thunder Strike: exec-3291733d-0e75-42ac-8c7b-3e6eb1e29350.png
- Flight selected chroma source: exec-1dc24e21-7e40-427b-aa34-4b05e412c728.png

Reference: sprites/UI/pickaxe-icons-v1/bronze-pickaxe-v1.png.
Prompts requested grounded painted silver/bronze materials, strong small-size
silhouettes, no text or border, paired lateral cuts for Quickslash, a downward
fist impact for Thunder Strike, and a violet winged-gem glider for flight.

## Verification

Existing pickaxe progression and shop catalog integrity contracts pass.
Focused execution verifies all three upgrade mappings, image dimensions,
RGBA format, hashes, icon creation/update, released-texture fallback and
unrelated speed/power mappings. Boot and renderer syntax checks pass.

Live QA uses the existing local merchant review page with `jkd_e2e=1` and
`cinematics=0`. It reports saves blocked. Both Quick Slash and Thunder Strike
render their new artwork in Bobo's shop list with their original progression
locks (reach 100 m and find one Relic). No purchases were made.
Bobo's selected Quick Slash and Thunder Strike detail panels also render the
new icons correctly. Evidence: `live-quickslash.png`, `live-thunder-strike.png`.
No browser errors were recorded at this check.
The Gem Merchant catalog displays the new flight symbol with its original
reach-180m lock. Gameplay and purchase configuration files were not modified.
The selected flight detail panel was also visually verified; evidence is
`live-flight.png`. Browser error log remained empty. All three live list/detail
checks passed with save writes blocked and no purchases.
