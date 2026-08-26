# UI Sprites

Runtime bitmap assets used by heads-up displays, overlays, pickup feedback, and
inventory presentation. Gameplay state and progression remain authoritative in
their systems; these files are presentation only.

`inventory-fullness-v3/` contains ten transparent ImageGen-authored states for
the always-visible inventory bag, from empty through packed. Its shared open
master supplies a dark interior cavity; every ore pile is clipped inside it,
interior-shaded, and occluded by the restored curved front rim and clasp. This
removes V2's pasted-on cargo while retaining its no-colour-drift construction.
The manifest pins runtime/source hashes and the only pixels cargo may change;
the 100-unit saturation remains visual only. `inventory-fullness-v2/` stays
available as the direct runtime-art rollback.

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
the step markers remain in the approved pack but are intentionally omitted
from the cleaner click-only runtime layout. `starlight-talent-tree-v2/`
remains intact as the visual rollback source.

`star-discovery-v1/` contains six ImageGen-authored rarity popup plates and six
matching Sign XP fills. The live Star Block popup and Talent Tree crop these
transparent assets from real progression state; the manifest pins dimensions,
alpha behavior, source provenance, and hashes.

`star-atlas-v2/` contains the active 1738x905 Star Codex foundation for the
third `I`-key tab. Its six rarity sockets, twelve selector sockets, large
identity showcase, lore dossier, and three reward-stat sockets are measured in
source pixels so live art, labels, selection rings, and hit zones scale as one.
`star-atlas-v1/` remains the untouched visual rollback source.

`resource-codex-v1/` contains the authored 1738x905 Resource Codex foundation
and the 4x4 specimen atlas for all fourteen materials. It deliberately does not
reuse pasted gameplay ground tiles; Phaser supplies live names, discovery
state, quantities, lore, selection borders, and aligned input only.

`starlight-talent-tree-v4/` contains the active mockup-fidelity Starlight
package. Its new `1672x941` ImageGen foundation supplies one tall antique-gold
frame, three navigation plaques, three generous sign alcoves, embedded arrow
housings, and the broad lower dossier. The other 28 runtime PNGs are the
unchanged approved transparent V3 assets, copied locally so deferred loading
remains one exact package. `manifest-v4.json` pins the new source dimensions,
bytes, and SHA-256; `sources/` retains the unmodified ImageGen output. The V3
folder remains intact as the presentation rollback source.
