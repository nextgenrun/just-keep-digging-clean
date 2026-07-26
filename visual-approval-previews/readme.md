# Visual Approval Previews

Review-only visual assets live here before runtime wiring. Each subfolder must identify its source art, intended review scope, and whether anything is game-loaded.

## Titan collection mockups v1 — 2026-07-26

- `titan-collection-mockups-v1/` proposes the full visual language for colossal
  block-spanning underground titan chambers, the ESC Titan Archive, and the
  physical town-side Titan Walk.
- It includes a five-environment comparison proving that titan chambers should
  be authored individually rather than recolored from one shared background.
- `reviewOnly: true`; `productionChanged: false`. Nothing in the folder is
  game-loaded, registered, preloaded, or wired into Phaser.

## Milestone Pillar concepts v1 — 2026-07-26

- `milestone-pillar-concepts-v1/` compares five ImageGen art directions, each
  with five physically scaled depth states from shallow digging to 2,000 m.
- The Phaser review scene places each candidate in the approved Town Square,
  includes a 1.75 m player reference, and can open the exact production
  Milestone Pillar modal with `U` or Enter.
- `reviewOnly: true`; `productionChanged: false` for pillar artwork. Production
  UI pagination, larger text, bounded panels, and interaction priority are
  improved independently.

## Underground biome background production v2 — 2026-07-26

- `underground-biome-background-production-v2/` preserves 50 new background-only
  ImageGen source plates, numbered 51-100, with five compositions for each of
  the ten live underground material bands.
- `reviewOnly: false`; `productionChanged: true`. Optimized derivatives are
  wired from `sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/`.
- The prompt manifest, source/runtime mapping, ground-versus-background
  contract, and rebuild command live inside the production folder.

## Underground biome motion mockups v1 — 2026-07-26

- `underground-biome-motion-mockups-v1/` adds ten motion-ready ImageGen key-art
  plates and a real-time Canvas review gallery, one direction per live depth band.
- The gallery demonstrates distinct root, crystal, dust, shimmer, heat, steam,
  ash, pressure, prism, and cosmic loops with optional hard-darkness and
  authoritative-ground previews.
- `reviewOnly: true`; `productionChanged: false`. The approved 50-card Phaser
  runtime remains unchanged until a separate explicit promotion pass.

## NPC idle activities v3 — 2026-07-26

- `npc-idle-activities-v3/` keeps the v2 planted idles and explores profession, rare personality, and player-reactive activity poses for all six active merchants.
- Its browser mockup staggers activities, caps large simultaneous actions at two, exposes every activity manually, and includes a true 138 px scale check.
- `reviewOnly: true`; `productionChanged: false`. The generated poses are direction animatics and no runtime file is changed.

## Arc Core ImageGen animation v1 — 2026-07-26

The current Arc review runtime is centralized in
`sprites/character/arc-core-review-v2` and loaded through
`values/arcCoreReview.sprite.json`. The boards below are retained as visual
evidence; the sandbox no longer loads their independently generated whole-body
frames.

- `arc-core-imagegen-animation-v1/` retains the superseded Small and Omega
  four-idle/four-dig ImageGen boards and their former 512 px runtime sheets.
- The pointed Small `v1` is rejected. Round Small `v2` became identity
  reference for the current single-body `v3` sprite; the Omega board likewise
  became reference for the fixed `v2` cathedral master.
- None of these whole-body sheets are loaded by the sandbox.
- `reviewOnly: true`; `productionChanged: false`. Production Arc textures and
  registration remain unchanged.

## Arc Core layered sprite v2 — 2026-07-26

- `arc-core-layered-sprite-v2/` contains the current six-state in-engine review
  board for the drift-locked body, dig, and generated cloud layers.
- The Phaser pack and runtime art remain centralized under `values/` and
  `sprites/character/arc-core-review-v2`; this folder stores review evidence
  only.
- `reviewOnly: true`; `productionChanged: false`.

## NPC idle polish v2 — 2026-07-26

- `npc-idle-polish-v2/` audits the exact five live merchant WebMs plus the static Magma Money Monster and presents character-specific four-pose idle direction.
- The synchronized browser review includes play/pause, restart, scrub, speed, and a true 138 px gameplay-scale check.
- `reviewOnly: true`; `productionChanged: false`. No runtime asset, loader, animation registry, or NPC behavior is changed.

## Village floor concepts v1 — 2026-07-26

- `village-floor-concepts-v1/` compares three gameplay-screen replacements for
  the flat Town Square block band: mountain slate, a timber/stone miner
  boardwalk, and star-forged basalt.
- Option A is approved. Its full-screen image stays review evidence, while the
  clean 2172x139 derivative is game-loaded from
  `sprites/backgrounds/start-zone-scenic-v1/town-square-slate-facade-v1.png`.
- Runtime now uses the 1.75 m midpoint player / 2.10 m doorway calibration.
  Options B and C remain review-only and are not wired into Phaser.

## Underground biome variation library v1 — 2026-07-26

- `underground-biome-variation-library-v1/` contains 50 gameplay-screen
  mockups: five composition roles for each of the ten live material bands from
  Weathered Roots through Starfire Rift.
- The library includes a complete ImageGen prompt manifest and an exact
  placement map for far wall, proposed mid silhouettes, emissive, atmosphere,
  authoritative terrain, and darkness layers.
- Every image is review-only. Nothing in the folder is game-loaded, registered,
  or wired into Phaser.

## Underground layer differentiation v1 — 2026-07-26

- `underground-layer-differentiation-v1/` compares Blue Caverns, Amber Depths,
  and Level 2 Pressure Foundry as matching gameplay-screen layer mockups.
- The current torchlit runtime capture preserves the HUD, player scale, dug
  silhouette, hard-black exploration, and authoritative gameplay-plane shape.
- All three images are review-only. Nothing in the folder is game-loaded,
  registered, or wired into Phaser.

## UNDERSTAR floating logo redesign v1 — 2026-07-26

- `understar-floating-logo-redesign-v1/` compares three new-name treatments sized for the current floating main-menu logo slot.
- The approved UNDERSTAR cover establishes the new brand language; the legacy Just Keep Digging asset is used only as a compact-silhouette reference.
- Rift Monolith was approved on 2026-07-26 and promoted as a separate transparent runtime asset; nothing in the preview folder itself is game-loaded.

## V11 background relief POC v3 — 2026-07-15

- `v11-background-relief-poc-v3/` compares one untouched high-detail V11 detail plate against the same art with an aligned height map and live WebGL relief/parallax.
- It tests 3D depth treatment for backgrounds only: no tiles, props, Meshy models, or replacement artwork.
- Nothing in the folder is game-loaded; it is a review-only mockup.

## Meshy background render mockup v2 — 2026-07-15

- **Rejected:** `meshy-background-render-poc-v2/` proved that a single generated cave prop/model is not a valid high-detail mining-background depth treatment.
- It intentionally excludes tile generation and the rejected procedural rock-overlay method.
- Nothing in the folder is game-loaded; it is a visual mockup only.

## Mining world 3D bake POC v1 — 2026-07-15

- `mining-world-3d-bake-poc-v1/` compares the actual V11 mining runtime and dynamic-soil tiles with a front-facing 3D-to-2D bake at exactly 94px per tile.
- The proof is Meshy-ready but currently uses local procedural Blender geometry because no Meshy provider/key was connected.
- Nothing in the folder is game-loaded; approval is required before any runtime flag or asset-path wiring.

## Approved player HUD v1 — 2026-07-13

- `approved-player-hud-v1/` preserves the exact approved full-screen mockup and a transparent runtime-parts review sheet.
- The approval files are not game-loaded; production frame copies are under `sprites/UI/hud-approved-v1/`.

## V11 underground depth approval — 2026-07-12

- `v11-underground-depth-approval-contact-sheet-2026-07-12.png` is the primary art-direction review for Level 1 through 2,000m and Level 2 through its future 5,000m envelope.
- `v11-underground-depth-plan-blueprint-2026-07-12.png` records the exact current runtime cutoff near 1,935m, the prepared 2,000m art boundary, and the dormant Level 2 extension.
- The annotated and unannotated Level 1/Level 2 concept images are mockups only. None are loaded by Phaser or referenced by the TMX.
- Rebuild annotations with `ai-tools/2026-07-12-annotate-v11-underground-depth-concepts.py`.
- `v11-runtime-depth-v4-sample-contact-sheet-2026-07-12.png` shows the final streamed production chunk families after the anti-stretch and anti-repeat polish pass.
