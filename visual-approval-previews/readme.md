# Visual Approval Previews

Review-only visual assets live here before runtime wiring. Each subfolder must identify its source art, intended review scope, and whether anything is game-loaded.

## Wide embedded resource runtime QA V8 — 2026-07-28

- `overground-texture-audit-v8-wide-embedded-runtime/` shows all 60 production
  ImageGen formations: six variants for each of ten resources over representative
  brown soil, cool rock, and volcanic ground at gameplay size.
- Resource identities follow the natural ground-embedded reference boards while
  silhouette and material cues remain clear at 94 px.
- `reviewOnly: true`; `productionChanged: true`. The QA boards are not loaded;
  their source frames are packed into the v6 semantic and v7 recognition atlases.

## Superseded 2D resource runtime QA V7 — 2026-07-28

- `overground-texture-audit-v7-approved-2d-runtime/` shows all ten transparent
  production resource overlays on four actual ground families at gameplay size.
- Copper, Iron, Silver, Gold, Ember Ore, and Obsidian use the newly approved
  ImageGen identities; Stone, Bronze, Steel, and Magma Crystal are retained.
- `reviewOnly: true`; `productionChanged: false`. These isolated-symbol boards
  remain rollback evidence after the approved V8 embedded-vein promotion.

## Sky and underground game-ready approval assets v1 — 2026-07-28

- `sky-underground-game-ready-assets-v1/` now contains 30 additive final-size
  candidates: 20 opaque `1672x941` upper-world far plates and ten
  alpha-feathered `1536x1024` underground foreground-geology plates.
- The retained two approved files remain unchanged. Nineteen sky and nine
  underground plates fill the regional/biome gaps without deleting or
  replacing the existing visual library.
- All sky edges share a gradual 128 px deep-cobalt handoff; every underground
  plate has a continuous 80 px transparent perimeter. Labeled contact sheets
  expose the whole family, and a separate proof tests the four largest sky
  palette jumps with overlap wider than both paired handoff bands.
- `reviewOnly: true`; `productionChanged: false`. No file in this package is
  registered, preloaded, referenced by values, or wired into Phaser.

## Overground resource clarity revisions V6 — 2026-07-28

- `overground-texture-audit-v6-clarity-revisions/` contains separate ImageGen
  ground-context redesign boards for Copper, Iron, Silver, Gold, Ember Ore, and
  a more expressive shattered-eclipse Obsidian.
- Previously retained Stone, Bronze, Steel, Magma Crystal, and the approved GP
  special-tile family are deliberately unchanged by this review pass.
- `reviewOnly: true`; `productionChanged: false`. The V6 boards remain concept
  evidence; runtime uses the isolated, true-2D V7 derivatives.

## Additive surface props V2 runtime review — 2026-07-28

- `surface-props-v2-additive-runtime/` compares all nine retained Level 2
  production props with seven additive ImageGen chapter anchors at one
  player-relative physical scale.
- The generated cutouts contain no landscape, terrain strip, background, sky,
  moon, celestial body, player, text, or UI.
- `reviewOnly: false`; `productionChanged: true`. The comparison sheet itself
  is never loaded; runtime loads only the seven alpha WebPs under
  `sprites/environment/surface-props-v2/`.

## Underground floating Star directions v2 — 2026-07-28

- `underground-star-floating-directions-v2/` corrects the rejected container
  concept and compares five literal free-floating star families: Pure Crystal
  Star, Fallen Wish Star, Celestial Compass Star, Aurora-Woven Star, and Hollow
  Nova Star.
- Every board uses the current faceted floating `star-core` release art as its
  quality anchor, preserves the six production rarity colors, and includes a
  small gameplay-scale check.
- Choice 1, Pure Crystal Star, is approved and promoted through the normalized
  six-core production package. The four remaining boards are review-only.
- `reviewOnly: mixed`; `productionChanged: true`. Phaser does not load the
  boards themselves; it loads the derived exact-family tile/release assets.

## Underground Star Tile redesign concepts v1 — rejected 2026-07-28

- `underground-star-tile-redesign-v1/` compares five complete six-rarity
  ImageGen directions for replacing the current underground Star Block atlas:
  Starheart Geodes, Celestial Fossils, Astral Lockstones, Living Starseeds,
  and Eclipse Prisms.
- Every board preserves the production cyan/lavender/gold/orange/turquoise/
  violet order and includes a small underground scale-check strip, while
  replacing the current repeated five-point-star-on-rock language.
- Rejected because all five directions trapped the star inside another physical
  object. The authoritative correction is that the visual itself is a literal
  free-floating star, with the current floating release icon as the quality
  benchmark.
- `reviewOnly: true`; `productionChanged: false`. No generated board is loaded,
  registered, preloaded, or referenced by Phaser.

## Three-Engine Celestial action bar mockup v1 — 2026-07-28

- `celestial-engine-action-bar-v1/` proposes a WoW-style three-slot loadout
  above the approved XP frame, with mouse drag/drop reordering, slot swapping,
  click activation, and `1`/`2`/`3` shortcuts.
- All three Engines remain equipped and visible while sharing one Star Heart
  charge pool and allowing one active world effect at a time, preserving the
  existing lifetime and impact caps.
- The ready and edit boards use the exact existing Engine cores, Star Heart,
  HUD frame, and gameplay reference.
- `reviewOnly: true`; `productionChanged: false`. Nothing in the folder is
  loaded, registered, preloaded, or referenced by Phaser.

## Complete surface landscape library v1 — 2026-07-28

- `surface-landscape-final-library-v1/` is the final-look proposal for all 280
  Level 1 and Level 2 surface tiles, arranged as fourteen contiguous,
  player-scale gameplay panoramas and three labeled overview sheets.
- Every chapter has a unique landscape activity, ground/foundation identity,
  natural prop scale and spacing, and explicit protection for Titans, portals,
  gates, doors, the mine threshold, and the conditional drop seam.
- `reviewOnly: true`; `productionChanged: false`. No mockup, overview, prompt
  manifest, or source image is loaded, registered, preloaded, or wired into
  Phaser.

## Overworld resource and special-tile texture audit v1 — 2026-07-28

- `overground-texture-audit-v1/` compares the former physical semantic ore and
  reward formations against the earlier native-scale vein/emblem textures.
- The audit keeps physical stone, Gamble, Ancient Cache, cave/chest/crystal
  markers, and separately approved Star Tile art. It restores the earlier
  colored vein language, clear reward emblems, and exact purple Teleport Up
  rift.
- `reviewOnly: false`; `productionChanged: true`. The sheets remain QA
  evidence; runtime loads only the versioned production atlases.

## ESC Starlight Talent Tree mockup v1 — 2026-07-28

- `star-pillar-talent-tree-esc-v1/` established the approved permanent
  `TALENTS` tab inside the existing ESC shell, restoring visibility for all ten
  Star Pillar constellation unlocks.
- The layout splits the live mutations into Quickslash and Thunderstrike
  branches, demonstrates mastered/in-progress/locked states, and converges on
  three permanent Hearts and three Celestial Engine choices.
- `reviewOnly: true`; `productionChanged: true`. No preview PNG is loaded,
  preloaded, or registered; the approved direction is now recreated in native
  Phaser UI with production sign and Engine assets.

## Whole upper-world sky mockups v1 — 2026-07-28

- `sky-air-whole-world-mockups-v1/` contains three connected traversal boards
  covering approved-town continuity, Level 1, the central divider, Level 2,
  the eastern storm corridor, and all three Heavenblock altitudes.
- The set uses no baked sun, moon, planet, eclipse disc, or distant complete
  halo. The former Devil eclipse body is replaced by an angular atmospheric
  scar, leaving celestial bodies to the runtime day/night system.
- `reviewOnly: true`; `productionChanged: false`. No mockup is registered,
  preloaded, or wired into Phaser.

## Heavenblock surface gate concepts v1 — 2026-07-28

- `heavenblock-surface-gate-concepts-v1/` compares three diegetic replacements
  for the temporary Phaser ground circles: low relic daises, raised aether
  wells, and one connected three-route sky altar.
- Every board shows the exact post-relic state: Cloud Reef active, with Angel
  and Devil still route-sealed until Cloud Reef is completed.
- `reviewOnly: true`; `productionChanged: false`. No mockup is registered,
  preloaded, or wired into Phaser.

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

## Titan surface stances v1 — 2026-07-28

- `titan-surface-stances-v1/` presents the exact 25 independently generated,
  alpha-clean runtime stances used by the enlarged surface Titan Walk.
- Every Titan keeps its own approved identity and receives a distinct
  species-specific pose; the shared plinth remains a separate runtime layer.
- `reviewOnly: false`; `productionChanged: true`. Phaser loads only the
  transparent WebPs under `sprites/backgrounds/titan-surface-stances-v1/`.

## Titan chamber seamless blend v3 — 2026-07-28

- `titan-chambers-production-v3/` compares the opaque rectangular v2 card with
  the production organic-feather derivative and shows all 25 cards composited
  over representative live biome textures.
- It preserves the approved built-in ImageGen paintings; only the outer alpha
  boundary changes.
- `reviewOnly: false`; `productionChanged: true`. Phaser streams the
  transparent WebPs under `sprites/backgrounds/titan-chambers-v3/`, then applies
  the shared live depth grade.

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
  Keyframe A source paintings. Their exact WebP derivatives are now active
  static variants alongside the older fifty-card library; the rejected
  Canvas/Phaser-shape animation was removed and its old review URL redirects
  to V2.
- `underground-biome-baked-motion-v2/` contains ten composition-locked painted
  Keyframe B edits and the rejected optical-flow WebMs. The gallery preserves
  them one at a time as evidence and labels them rejected.
- `reviewOnly: true`; `productionChanged: false`. The WebMs were rejected for
  choppy movement and deformation. Production uses all fifty older static
  WebPs plus the ten source-painting static derivatives; no V2 video path is
  registered or loaded by Phaser.

## Underground biome smooth motion v3 — 2026-07-26

- `underground-biome-smooth-motion-v3/` preserves the explicitly approved
  one-biome temporal-quality reference using the exact Weathered Roots painting.
- The approved method uses an eight-second 60 fps H.264 encode of a subpixel
  whole-image transform. It has no optical flow, generated in-between art,
  Canvas/Graphics animation, effect overlay, or CSS motion.
- The reference remains `reviewOnly: true`; `productionChanged: false`, while
  ten separately verified runtime files are production-selected from
  `sprites/backgrounds/world-visual-v2/depth/biome-motion-v3/`.

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
  exact 1672x48 thin crop plus 129 px alpha handoff is game-loaded from
  `sprites/backgrounds/start-zone-scenic-v1/town-square-slate-strip-v3.png`;
  the same 1672x48 core repeats across the complete surface.
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

## Earthquake dodge layering v1 — 2026-07-28

- `earthquake-dodge-layering-v1/` shows the proposed in-world warning footprint,
  lateral dodge, and safe-impact layer sequence with the current Survival
  character and earthquake HUD skin.
- The captures come from a test-only Phaser scene. No production hazard logic,
  collision, damage, timing, or terrain mutation is loaded from this folder.

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

## Whole-world visual expansion V5 — 2026-07-28

- `whole-world-visual-expansion-v5/` preserves the 100 approved ImageGen
  masters, three contact sheets, prompts, hashes, and the exact production
  mapping for 50 background, 40 underground terrain, and ten surface-ground
  additions.
- Production files are derived into `biome-expansion-v5/`,
  `terrain-variation-v5/`, and `surface-ground-variation-v5/`; every older
  approved asset remains in its original directory and active pool.
