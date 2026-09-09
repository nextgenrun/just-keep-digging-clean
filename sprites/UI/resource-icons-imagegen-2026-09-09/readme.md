# Resource icon regeneration - 2026-09-09

Three ImageGen-authored resource illustrations selected after inspecting the
legacy dirt, stone and copper icons, the active shop icon atlas, approved
world tiles, and the bronze pickaxe style reference. This is a targeted visual
assessment, not an exhaustive quality ranking of every asset in the project.

## Selection

1. Copper: the legacy image repeats the dirt cube with orange squares;
   the new ore has readable metallic seams and an independent silhouette.
2. Stone: the legacy gray cube repeats the dirt geometry; the new cluster
   has broad fractured planes and an angular silhouette.
3. Dirt: the legacy coarse cube is replaced with painted earth and roots.

These are foundational resource identities. The shop and inventory use
`values/uiIcons.js` atlas frames 18, 19 and 20; merely replacing the legacy
standalone images loaded by BootScene would not replace those shop icons.
The approved bronze pickaxe supplied the painted material reference.

## Files and verification

- `dirt-v2.png`: 1254 x 1254 RGBA; transparent corner verified (alpha 0).
- `stone-v2-chroma-source.png`: 1254 x 1254 source art on magenta.
- `copper-v2-chroma-source.png`: 1254 x 1254 source art on magenta.

Stone and copper require background extraction before runtime use. Multiple
ImageGen transparency edits returned RGB images with painted checkerboards;
those failed candidates are excluded from this folder. Magenta sources are
retained for reliable future extraction. No runtime paths or atlas mappings
were changed, and no in-game acceptance or small-size validation is claimed.

## Provenance

Generated with the built-in ImageGen tool in task
`01a08594-0e6f-7a73-89e7-ae5804bf1cbb`.
Selected output identifiers:

- Dirt: `exec-762d0c40-7e58-45a7-aec8-008aea79ad7f.png`
- Stone: `exec-78b54c55-bcc0-4376-8f0d-b8aef14ada8b.png`
- Copper: `exec-ba64ef68-21c2-455b-bf46-6be428b92738.png`

Prompts requested isolated, textless, unframed painted resource icons with
clear small-size silhouettes, upper-left light, and restrained detail.
Background correction used ImageGen only. Originals remain intact.

## Approved integration - 2026-09-09

The user approved these illustrations and requested runtime integration.
Stone and copper now have extracted RGBA masters (`stone-v2.png` and
`copper-v2.png`), prepared with the existing ImageGen chroma-removal helper
using border sampling, soft matte 12/220, and despill.

`*-runtime-v2.png` are the active normalized 256 px PNGs, built by
`ai-tools/2026-09-09-pack-resource-icons.py` from the approved cutouts.
`values/resourceIconArtBuild.json` owns packing settings; the manifest records
hashes, alpha bounds, dimensions and zero detected magenta contamination.
`runtime-readability-review.png` shows 30, 48 and 96 px on dark/light grounds.

`values/resourceIconArt.js` owns versioned keys and paths. BootScene preloads
these and the three legacy resource keys. The shared UI icon renderer selects
the new artwork for dirt, stone and copper, preserving atlas fallback.
Inventory holdings, collection and dossier portraits use the same artwork.
World terrain and mined pickup appearance remain gameplay-owned.

Validation: existing pickaxe icon, inventory resource key and Resource Codex
contracts pass. Focused calls cover icon creation/update, missing-texture atlas
fallback, portrait proportions and discovered-state alpha. Syntax checks pass.

Live verification: opened the casual expedition with `?jkd_e2e=1`, then the
inventory holdings and Resource Codex through the visible UI. All three new
icons render with clean transparency in the holdings and selector list; the
selected dirt portrait renders correctly in the large dossier socket.
`live-inventory.png` records the actual holdings screen. Browser error log
was empty at the check. All three PNGs return HTTP 200 with exact local bytes.
The shop uses the verified shared renderer; its icon routing was checked in
focused execution rather than a live merchant interaction.

Next high-impact artwork candidates after inspecting the live UI:
1. Authored inventory holdings foundation/cards matching the Resource Codex.
2. Distinct upgrade symbols for abilities currently sharing speed/power icons.
3. Normal/rare cave chest sprites: both current files are 94 px and mostly
   distinguished by recoloring. Stronger silhouettes would improve recognition.
Large selected stone and copper portraits were also verified through the
Resource Codex. `live-copper-codex.png` records the copper portrait. The copper
field-note description now matches the approved artwork's warm seams.
