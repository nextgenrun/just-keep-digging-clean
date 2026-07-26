# Visual Approval Previews

Review-only visual assets live here before runtime wiring. Each subfolder must identify its source art, intended review scope, and whether anything is game-loaded.

## Player torch lighting current vs future v1 — 2026-07-26

- `2026-07-26-player-torch-lighting-current-vs-future-v1.png` keeps the exact
  restored 131 m runtime capture on the left and compares it with a feasible
  Phaser WebGL lighting target on the right.
- The future half demonstrates a hand-height warm source, tile occlusion, soft
  shadow falloff, normal-map-like rock relief, and restrained ground bounce
  without changing the gameplay visibility radius.
- `reviewOnly: true`; `productionChanged: false`. Neither comparison image is
  loaded, registered, preloaded, or wired into Phaser.

## Arc Core Piskel v3 — 2026-07-26

- Small/Omega bodies, energy, dig effects, and cloud transitions were approved
  and promoted to `sprites/vehicles/arc-core-v3/`.
- The active manifest contains ten production roles plus one sandbox
  background, all round-tripped through two fixed-center Piskel documents.
- The former `arc-core-piskel-v3/` board was archived because its screenshots
  showed the rejected random tile atlas. The ornamental frame, tiles, and
  affected captures now live only in
  `archive/2026-07-26-rejected-arc-review-random-art/`.
- `reviewOnly: false`; `productionChanged: true`. The older Arc v1/v2 boards
  remain comparison evidence only.

## Titan collection mockups v1 — 2026-07-26

- `titan-collection-mockups-v1/` is the promotion record for the Titan
  collection language: underground reveal, ESC Titan Archive, and physical
  town-side Titan Walk.
- It includes a five-environment comparison proving that titan chambers should
  be authored individually rather than recolored from one shared background.
- `reviewOnly: false`; `productionChanged: true`. The 5x5 archive, canonical
  retention wiring, all 25 town plinths, compact creature cutouts, and generated
  plinth derivative are live. The mockup PNGs themselves remain reference-only;
  bespoke high-resolution 15-22-block chamber paintings remain an unpromoted
  future art pass.

## Milestone Pillar concepts v1 — 2026-07-26

- `milestone-pillar-concepts-v1/` compares five ImageGen art directions, each
  with five physically scaled depth states from shallow digging to 2,000 m.
- The Phaser review scene places each candidate in the approved Town Square,
  includes a 1.75 m player reference, and can open the exact production
  Milestone Pillar modal with `U` or Enter.
- The gallery remains review evidence. On 2026-07-26, screenshot 1 / Option C
  was explicitly approved for the production Milestone Pillar and screenshot 2 /
  Option A was explicitly approved for the production Sky Island Star Pillar.
  Renamed RGBA copies are loaded only from
  `sprites/environment/approved-pillars-v1/`; the other three options remain
  review-only.

## Underground biome background production v2 — 2026-07-26

- `underground-biome-background-production-v2/` preserves 50 new background-only
  ImageGen source plates, numbered 51-100, with five compositions for each of
  the ten live underground material bands.
- `reviewOnly: false`; `productionChanged: true`. Optimized derivatives are
  wired from `sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/`.
- The prompt manifest, source/runtime mapping, ground-versus-background
  contract, and rebuild command live inside the production folder.

## Underground biome baked moving images v2 — rejected 2026-07-26

- `underground-biome-motion-mockups-v1/` now preserves only the ten approved
  Keyframe A source paintings. Its rejected Canvas/Phaser-shape animation was
  removed and its old review URL redirects to V2.
- `underground-biome-baked-motion-v2/` contains ten composition-locked painted
  Keyframe B edits and the rejected optical-flow WebMs. The gallery preserves
  them one at a time as evidence and labels them rejected.
- `reviewOnly: true`; `productionChanged: false`. The WebMs were rejected for
  choppy movement and deformation. Production uses the fifty approved static
  WebPs; no V2 video path is registered or loaded by Phaser.

## Underground biome smooth motion v3 — 2026-07-26

- `underground-biome-smooth-motion-v3/` is a one-biome temporal-quality gate
  using the exact Weathered Roots painting.
- The candidate uses an eight-second 60 fps H.264 encode of a subpixel
  whole-image transform. It has no optical flow, generated in-between art,
  Canvas/Graphics animation, effect overlay, or CSS motion.
- `reviewOnly: true`; `productionChanged: false`. Do not build the other nine
  candidates or register video playback until this one is explicitly approved.

## NPC idle activities v3 — 2026-07-26

- `npc-idle-activities-v3/` keeps the v2 planted idles and explores profession, rare personality, and player-reactive activity poses for all six active merchants.
- Its browser mockup staggers activities, caps large simultaneous actions at two, exposes every activity manually, and includes a true 138 px scale check.
- `reviewOnly: true`; `productionChanged: false`. The generated poses are direction animatics and no runtime file is changed.

## NPC planted idles v5 — 2026-07-26

- `npc-planted-idles-v5/` keeps the successful v3 acting language and adds four
  new profession/personality activities plus a four-frame rooted quiet loop for
  each of all six merchants.
- Its fixed-anchor simulator exposes 66 Piskel exports with 520 ms quiet-frame
  dissolves, slower activity transitions, exact 138 px scale, a maximum of one
  large town activity, and no walking or whole-body translation.
- `reviewOnly: false`; `productionChanged: true`. Runtime loads only the
  clean, versioned derivatives under `sprites/npc/npc-v9-planted-idles/`.

## NPC alive walking v4 — rejected 2026-07-26

- The walking/pacing direction was explicitly rejected and replaced by planted
  activities.
- Its dated boards and frames remain provenance only. The old page no longer
  loads or animates them, and no production file references the folder.

## Arc Core ImageGen animation v1 — 2026-07-26

The current Arc production runtime is centralized in
`sprites/vehicles/arc-core-v3` and loaded through
`values/arcCoreVisuals.sprite.json`. The boards below are retained as visual
evidence; neither gameplay nor the sandbox loads their independently generated
whole-body frames.

- `arc-core-imagegen-animation-v1/` retains the superseded Small and Omega
  four-idle/four-dig ImageGen boards and their former 512 px runtime sheets.
- The pointed Small `v1` is rejected. Round Small `v2` became identity
  reference for the current single-body `v3` sprite; the Omega board likewise
  became reference for the fixed `v2` cathedral master.
- None of these whole-body sheets are loaded by the sandbox.
- `reviewOnly: true`; `productionChanged: false` for this old board only. The
  separate v3 package is the approved production route.

## Arc Core layered sprite v2 — archived 2026-07-26

- The former six-state browser board was moved to
  `archive/2026-07-26-rejected-arc-review-random-art/preview/legacy-layered-html-v2/`.
- Its visible HTML controls and gray/brown placeholder blocks fail the approved
  presentation bar and must not be reused as active review art.
- The Piskel-authored production route remains
  `values/arcCoreVisuals.sprite.json` plus `sprites/vehicles/arc-core-v3/`.

## NPC idle polish v2 — 2026-07-26

- `npc-idle-polish-v2/` audits the exact five live merchant WebMs plus the static Magma Money Monster and presents character-specific four-pose idle direction.
- The synchronized browser review includes play/pause, restart, scrub, speed, and a true 138 px gameplay-scale check.
- `reviewOnly: true`; `productionChanged: false`. No runtime asset, loader, animation registry, or NPC behavior is changed.

## Village floor concepts v1 — 2026-07-26

- `village-floor-concepts-v1/` compares three gameplay-screen replacements for
  the flat Town Square block band: mountain slate, a timber/stone miner
  boardwalk, and star-forged basalt.
- Option A is approved. Its full-screen image stays review evidence, while an
  exact 1672x139 crop plus 129 px alpha handoff is game-loaded from
  `sprites/backgrounds/start-zone-scenic-v1/town-square-slate-facade-v2.png`.
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
