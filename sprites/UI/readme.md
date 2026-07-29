# UI Sprites

Runtime bitmap assets used by heads-up displays, overlays, pickup feedback, and
inventory presentation. Gameplay state and progression remain authoritative in
their systems; these files are presentation only.

`earthquake-feedback-v2/` contains the generated 2x seismic status plate and
reusable hazard medallion used by the compact earthquake feedback lifecycle.

`thunderstrike-chain-v1/` contains the approved mockup-derived backing frame
for the live ten-slam timing panel. `thunderstrike-chain-v2/` adds the authored
transparent lightning target gate and moving needle.
`thunderstrike-chain-v3/` replaces the remaining procedural milestone states,
checkmarks, Roman numerals, and bare copy rows with ten authored ImageGen
components. Phaser now only selects, positions, scales, fades, and labels those
production pieces from live chain state.

`pickaxe-icons-v1/` contains seven distinct transparent ImageGen pickaxes,
their selected chroma sources and alpha masters, a reproducible 256 px packer,
hash manifest, prompt set, and an all-tier review sheet. The Gear Merchant uses
the exact runtime icons in both upgrade rows and the selected-item detail panel.

`pickaxe-hud-v1/` contains seven transparent production overlays derived from
those approved icons and the approved HUD core. The owned pickaxe remains
visible in the top-left medallion after purchase and reload, while tier rivets
and restrained GP-bar accents identify the current tool without replacing the
purple GP read or its orange/red warning states. `?pickaxeHud=0` restores the
generic approved HUD.

`starlight-talent-tree-v2/` contains the 18-piece ImageGen runtime family for
the shared ESC talent tree and dedicated Star Pillar: outer shell, inner
panels, dedicated three-bay Engine page, card states, selection halo, bespoke
Bobo seal, branch filaments, Star Heart socket, alpha-safe Heart/Engine
medallions, constellation crest, and close rune. Its manifest pins dimensions,
alpha behavior, and SHA-256 hashes.

`starlight-talent-tree-v3/` is the active, non-destructive polish pack. It
retains those 18 approved assets and adds eleven ImageGen-authored pieces: a
native 2.39:1 three-alcove foundation, navigation plaques, card ribbons,
status/progress plaques, carousel arrows, and star-step markers. Its 29-entry
manifest pins every runtime filename, size, color mode, alpha range, and hash;
`starlight-talent-tree-v2/` remains intact as the visual rollback source.
