# AI Tools

All scripts created by LLMs to audit, fix, or edit the codebase.

`2026-08-14-render-survival-global-benchmark-review.py` renders all twenty
Survival motion roles into an isolated review directory using the approved
four-light, Non-Color-normal, AgX, preserve-volume benchmark; the accepted
Blender rollback `MINER_run` replaces only the review run source.

`2026-08-14-build-survival-review-texture-cache.py` mirrors the protected
Survival texture library into a review-only 2K cache, retaining hashes and
relative paths so Blender can avoid decoding/resizing the 8K masters in-process.

`2026-08-14-build-survival-global-benchmark-reels.py` packages those isolated
renders into four synchronized MP4 approval reels with inspection-scale and
true-123-pixel motion checks; it never writes runtime assets.

## Rules (per `.clinerules` §4)
1. **Date-stamp all filenames:** `YYYY-MM-DD-description.ext`
2. **Archive outdated tools:** Move to `/archive/` with date prefix when superseded
3. **Keep readme updated:** Document what each active tool does

## Generated asset sources

`2026-07-26-hud-torch-off-source-v2.png` is the current alpha-clean ImageGen
source for the approved HUD's compact diagonal extinguished torch state.
`2026-07-26-hud-torch-off-source.png` remains the superseded first-pass source
for reproducibility.

The five `2026-07-26-graveborer-wurm-*-source-chroma-v1.png` files are the
full-resolution ImageGen extraction sources for the Hardcore Wurm head, body,
tail, threat medallion, and burrow-warning seam. The matching
`2026-07-26-hardcore-graveborer-wurm-gameplay-mockup-v1.png` records their
approved in-game scale and readability direction. Runtime alpha masters and
WebPs live under `sprites/environment/graveborer-wurm-v1/`.

`2026-07-28-demon-mist-three-layer-background-mockup-v1.png` is the review-only
surface-background concept with a far mountain plate, forward high-resolution
mist flowing around the mountain demon maw, and contrast-separated foreground
pine silhouettes. It is not wired into runtime.

`2026-07-28-demon-mist-three-layer-background-mockup-v2.png` keeps that
composition while pushing the near pines forward with darker cores, brighter
icy edge light, clearer mist separation, and a restrained breathing-cavern pose
for the demon maw. It is also review-only and not wired into runtime.

`2026-07-28-demon-mist-baked-motion-variant-v3.mp4` is the review-only,
eight-second first-pass baked-motion proof for V2. It remains retained as a
rejected comparison because its subpixel movement was not visibly perceptible.

`2026-07-28-demon-mist-baked-motion-variant-v4.mp4` is the corrected review
master: six seconds at 60 FPS with visible-but-gentle whole-plate travel. Its
three finished raster plates still use no individual mouth/eye/tree animation,
optical flow, deformation, HTML, or runtime wiring. The adjacent manifest pins
the motion amplitudes, output contract, and SHA-256; the matching GIF is the
lower-resolution autoplay review copy.

`2026-07-28-ui-notification-carousel-mockup-v1.png` is the first review-only
uncluttered notification direction. `2026-07-28-ui-notification-carousel-mockup-v2.png`
is the cleaner revision: one persistent message at a time, only the popup's
clickable side arrows and upper-right X, a queue counter, and no duplicated
control strip or redundant floating reward text. Neither is wired into runtime.

## Active Tools

| `2026-07-30-prepare-surface-hero-landmarks-v4.py` | Reproducibly crop all seven Level 2 hero-landmark alpha masters, validate green/magenta key removal, exact existing-pixel parity and the open portal center, and emit grounded dimensions plus SHA-256 provenance |
| Tool | Purpose |
|------|---------|
| `2026-08-14-build-animation-mesh-motion-comparisons.py` | Build review-only H.264 locomotion/action comparisons from exact current, Blender rollback, and Unreal GASP Survival sheets, plus the rendered Blender material A/B |
| `2026-08-14-render-animation-mesh-lighting-ab.py` | Render a paired current-seven-light versus coherent-four-light/normal-map/preserve-volume Survival idle loop without saving the production Blender master |
| `2026-08-14-build-animation-mesh-polish-board.py` | Compose the exact current Survival impact frame and the review-only mesh/deformation target into the V1 approval board |
| `2026-08-03-roboplaytest.mjs` | Run the save-isolated deep Phaser playtest, exercising the full progression route plus runtime, world, controls, economy, UI, weather, hazards, events, mining-depth, visual, performance, and Starlight lifecycle analysis with JSON/Markdown/PNG evidence |
| `2026-07-30-build-fire-light-piskel-polish-v1.py` | Orchestrate ten independent Fire Light `.piskel` authorities, 160-frame round-trip, candidate/rollback atlases, reports, and review boards without changing production |
| `2026-07-30-fire-light-piskel-core.py` | Split and pack the shared 313 px grid, measure source-root/luminous-core anchors, apply integer-only group registration, preserve light energy, and enforce true-black borders |
| `2026-07-30-fire-light-piskel-package.py` | Serialize and validate editable Piskel projects, hidden anchor guides, exact frame order, and pixel-identical round-trip |
| `2026-07-30-fire-light-piskel-assets.py` | Build the immutable-source, editable-work, hash-linked rollback, candidate-runtime, and strip stages for one Fire Light atlas |
| `2026-07-30-fire-light-piskel-visuals.py` | Render the complete before/after anchor grid and per-atlas drift summary |
| `2026-07-30-refresh-fire-light-piskel-polish.py` | Hash-verify and apply all ten polished runtime atlases or restore all ten byte-exact originals, then refresh manifest selection and hashes |
| `2026-07-30-old-school-lamp-anchor.py` | Measure and integer-register the seven lamp atlas roles to stable fixture, light-core, or ray-root group anchors |
| `2026-07-30-old-school-lamp-visuals.py` | Render the complete lamp asset-library and measured anchor-drift review boards |
| `2026-07-30-build-old-school-lamp-light-v1.py` | Package seven built-in ImageGen masters into 112 fixed-anchor runtime frames, editable Piskels, strips, manifests, rollback, and QA |
| `2026-07-30-build-old-school-lamp-comparison-board.py` | Compose untouched same-world torch and lamp WebGL captures into the final full-view plus close-detail A/B board |
| `2026-07-30-build-ground-damage-piskel-polish-v3.py` | Build the review-only three-stage ground-damage package: immutable registered-source Piskels, editable polished-work Piskels, derived runtime-scale projects/atlas, hash links, production guard, and visual QA |
| `2026-07-30-ground-damage-piskel-polish.py` | Classify temporal components, suppress proven sheet-seam contamination, repair fixed seed cores, paint the vertical-pressure branches, neutralize material color, and merge without stacked rims |
| `2026-07-30-ground-damage-piskel-package.py` | Serialize, guide-layer, round-trip, hash, and validate linked Piskel work and derived documents |
| `2026-07-30-ground-damage-piskel-polish-visuals.py` | Render native-scale, material-resolution, anchor-registration, and high-risk slicing/scale review boards |
| `2026-07-30-refresh-ground-damage-piskel-polish.py` | Apply the current editable Piskel style revision or restore all ten polished-work projects from hash-linked rollback-v1 copies |
| `2026-07-30-audit-high-impact-v2-geometry.py` | Read-only pixel audit of all 1,000 p00 sources and 9,000 derivatives: validates actual RGBA 320x256 canvases, exact nonzero support, p02-p09 alpha equality, p01 threshold-only changes, mining baselines, and source-sequence anchor risks; writes only dated JSON/Markdown evidence |
| `2026-07-29-build-underground-detail-library-v6.py` | Split and normalize twenty ImageGen alpha masters into 400 unique `320x256` frames, pack twenty biome/kind atlases, validate alpha/hash uniqueness, and emit production manifests plus complete contact sheets |
| `2026-07-29-build-underground-seam-blend-v6.py` | Derive 90 terrain and 50 ground-structure WebPs with complementary incoming left/top alpha, retained right/bottom coverage, hashes, and real-stride seam proof sheets without changing V3/V4/V5 |
| `2026-07-28-build-star-block-crystal-v2.py` | Normalize the six approved ImageGen crystal-star masters into exact-family 512 px release cores, paired 3x2 beauty/emissive Star Block atlases, a hash-pinned manifest, and the exact 94 px one-to-one pop / 136 px ascent proof |
| `2026-07-28-build-titan-creature-footprints-v2.py` | Project the 25 high-resolution 768px Titan stance alpha silhouettes into their authoritative underground tile grids, then emit the values module and hash-pinned footprint manifest |
| `2026-07-28-build-thunderstrike-indicator-v3.py` | Crop, alpha-validate, and losslessly export the approved ImageGen milestone rings, storm check, Roman numerals, and dynamic-copy backplates used by the Thunderstrike timing minigame |
| `2026-07-28-build-pickaxe-hud-overlays-v1.py` | Composite the seven approved pickaxe icons into exact 417x93 transparent HUD medallion, tier-rivet, GP-engraving, and end-cap overlays; emit hashes and a 320x71 readability sheet |
| `2026-07-28-build-pickaxe-icons-v1.py` | Normalize the seven transparent ImageGen pickaxe masters into consistent 256 px RGBA runtime icons, validate alpha/coverage, hash the exact inventory, and build the all-tier review sheet with 64 px UI proofs |
| `2026-07-28-build-starlight-talent-tree-v2.py` | Slice, chroma-clean, alpha-trim, validate, and hash the 18 ImageGen-authored Starlight panels, dedicated three-bay Engine page, modal shell/glyphs, talent frames, bespoke Bobo lock, branch filaments, and UI-safe celestial medallions |
| `2026-07-28-build-additive-surface-props-v2.py` | Trim, scale, alpha-validate, losslessly encode, hash, and assemble a physical-scale review sheet for seven moon-free ImageGen surface chapter anchors without replacing the existing prop kit |
| `2026-07-28-build-underground-visual-expansion-v3.py` | Validate and package 50 full underground ImageGen backgrounds plus 50 chroma-isolated terrain structures, extract edge-decontaminated alpha, emit optimized WebPs, hashes, coverage metrics, prompt provenance, and two QA contact sheets |
| `2026-07-28-build-underground-terrain-blend-v4.py` | Validate 50 approved ImageGen terrain masters, build alpha-feathered additive WebPs, derive 200 irregular painted exposed-top cap frames, emit the 16-state backdrop blend-mask atlas, hashes, prompt provenance, and visual QA sheets |
| `2026-07-28-build-ground-structure-blend-v4.py` | Preserve the 50 approved V3 ground-structure compositions as separate V4 WebPs with real 192x128 edge alpha, hashes, coverage evidence, manifest, and checkerboard QA sheet |
| `2026-07-28-build-thin-surface-ground.py` | Crop the approved Option A slate pixels into a 48px Town Square strip plus matching mirrored-repeat full-width surface cap, preserving RGB/RGBA pixels and emitting hash provenance |
| `2026-07-28-build-titan-surface-stances-v1.py` | Normalize the 25 independently generated Titan Walk alpha masters into baseline-aligned 768px transparent WebPs, validate alpha/coverage/inventory, and emit hashes plus a complete visual-QA contact sheet |
| `2026-07-28-build-titan-chambers-v3.py` | Derive transparent organic-edge WebPs from the 25 approved ImageGen chamber masters without repainting them, validate edge/center alpha plus hashes, resume partial builds, and emit biome-composited seam QA |
| `2026-07-28-build-surface-landscape-library-overviews.mjs` | Validate the fourteen review-only full-surface ImageGen panels, emit SHA-256 provenance, and assemble exact labeled Level 1, Level 2, and complete-library PNG overview sheets without repainting the source artwork |
| `2026-07-28-build-demon-mist-baked-motion-variant-v4.py` | Apply the corrected visible-motion profile to the shared V3 three-plate renderer and emit a versioned review-only V4 proof |
| `2026-07-28-build-demon-mist-baked-motion-variant-v3.py` | Shared three-baked-plate renderer that produces seamless high-quality H.264 proofs and hash-pinned review-only manifests |
| `2026-07-26-build-surface-prop-scale-sheet-v1.py` | Render the live Level 1 and Level 2 cutouts from their values/asset-key SSOT at one player-relative physical scale for review |
| `2026-07-26-lift-surface-prop-midtone-v1.py` | Build non-resized, alpha-preserving Level 2 v2 prop variants from the retained ImageGen v1 cutouts, lifting only dark midtones for forest readability and emitting a hash manifest |
| `2026-07-26-build-hud-torch-states.py` | Composite the generated extinguished torch onto the locked approved HUD core while preserving its exact 417x93 geometry |
| `archive/2026-08-02-root-overlay-climb-dash-prune/legacy-tools/2026-06-25-bulk-migrate.py` | Archived bulk migration/restructuring helper retained for rollback |
| `2026-06-25-check-404s.ps1` | Check for 404 resource errors |
| `2026-06-25-fix-404s.py` | Fix 404 resource paths |
| `2026-06-25-fix-corruption.ps1` | Fix file corruption issues |
| `2026-06-25-rewire-imports.bat` | Batch import path rewire |
| `archive/2026-08-02-root-overlay-climb-dash-prune/legacy-tools/2026-06-25-compare-stubs.py` | Archived stub comparison/import-fix helper retained for rollback |
| `2026-06-25-fix-player-stubs.py` | Fix player stub files |
| `2026-06-30-create-tiled-v8-polish.py` | Create the Tiled-only v8 visual review TMX with repaired/upscaled texture variants |
| `2026-06-30-create-tiled-v8-bold-composite.py` | Add large composite background plates to v8 to reduce box seams and low-resolution tiled structure |
| `2026-06-30-create-tiled-v9-world-rebuild.py` | Build a fresh Tiled-only v9 background/object world using current pallet-v9 assets as a full redesign |
| `2026-07-01-create-cave-geode-crystal-sheet.py` | Create the cave/geode/glow-crystal Tiled template sheet for copy-paste authoring |
| `2026-07-03-create-cave-edge-tile.py` | Derive the approved cave edge tile from existing cave wall/ceiling sprites |
| `2026-07-03-create-v7-30-detail-enhancement-samples.py` | Create stronger no-source-change v7-30 detail-enhanced visual review samples |
| `2026-07-03-create-v7-30-halo-clean-preview.py` | Create v7-30 preview samples with stronger halo cleanup and depixelation |
| `2026-07-03-create-v7-30-prop-detail-examples.py` | Create prop-only enhancement examples from actual placed v7-30 TMX props |
| `2026-07-03-create-v7-30-current-prop-comparison.py` | Compare current gametime-loaded props against enhanced prop candidates |
| `2026-07-03-create-current-prop-ultra-upscale.py` | Create ultra-upscaled candidates directly from current gametime-loaded props |
| `2026-07-03-create-current-prop-faithful-cleanup.py` | Create faithful current-source prop upscale previews with cleaner alpha/matte edges |
| `2026-07-03-v7-30-detail-processing.py` | Shared alpha-safe image processing helpers for the v7-30 detail-enhancement sample tool |
| `2026-07-08-build-simple-mockups-v1.py` | Build preview-only v7-30 tile, prop, and world-context mockup sheets before bulk regeneration |
| `2026-07-08-build-simple-mockups-v2.py` | Build a richer deterministic redo preview kept as a rejected baseline for comparison |
| `2026-07-08-build-simple-mockups-v3.py` | Build imagegen-driven v7-30 redo proof sheets from copied concept sources with exact tile/prop grids |
| `2026-07-08-build-expanded-mockups-v4.py` | Build expanded depth-resource, fixed-alpha prop, GP-regen, and background-asset approval mockups |
| `2026-07-08-build-current-close-mockups-v5.py` | Build current-close unique resource, high-GP, and component-sliced prop alpha proof sheets after rejected v4 drift |
| `2026-07-08-build-full-v10-non-tile-runtime-assets.py` | Regenerate and wire every v10 authored-world non-tile runtime asset into one full no-leak background/prop/card library |
| `2026-07-08-build-v14-clean-props-backgrounds-palette.py` | Build the v14 approval-only 12-layer background and 100-prop clean grid palette with numbered proof sheets |
| `2026-07-08-build-v14-high-quality-props-backgrounds-palette.py` | Rebuild v14 as a high-detail gametime-style approval palette from existing rendered prop/background sources |
| `2026-07-10-build-v7-renderer-first-mockup.py` | Rejected diagnostic: rendered authoring markers instead of Phaser runtime tiles; retained only as failure evidence |
| `2026-07-10-build-v7-runtime-ab-comparison.py` | Assemble the two real Phaser/WebGL v7 captures into the labeled approval A/B without repainting either frame |
| `2026-07-11-build-v11-level1-background-test.py` | Build the partial high-resolution Level 1 background placement test while copying only v7 gameplay tile layers into v11 |
| `2026-07-11-build-npc-idle-polish-previews.py` | Polish the two supplied alpha NPC WebMs and build identity-locked preview idles for the remaining v5 merchants |
| `2026-07-11-build-v11-skyline-inline-visual.py` | Build the inline exact-source v11 skyline motion mockup with cloud, star, smoke, and light overlays |
| `2026-07-11-build-v11-skyline-layer-assets.py` | Derive clean skyline, town-depth, and windmill-occlusion layers from the exact v11 surface artwork without changing the source |
| `2026-07-11-build-v11-skyline-weather-inline.py` | Package the layered day/night and weather-cycle skyline study as a self-contained inline visual |
| `2026-07-11-build-v11-weather-vfx-assets.py` | Prepare the versioned image-generated cloud, precipitation, atmosphere, and lightning sheets for the v11 weather comparison mockup |
| `2026-07-11-build-v11-weather-vfx-inline.py` | Package the versioned procedural-versus-imagegen v11 weather comparison as a self-contained inline visual |
| `2026-07-11-render-v7-full-depth-draw-over.py` | Render a scale-correct, full-depth v7 TMX tile blueprint for user annotation before any replacement background is wired |
| `2026-07-11-render-v11-scale-correct-mockup.py` | Render the user-edited v11 tile geometry at exact 0.8-tile character and 1-tile doorway scale without using rejected background layers |
| `2026-07-11-v11-0-20m-compositor.py` | Compose unique native-94px Tiled chunks with exact character, fence, door, and 20m physical scale |
| `2026-07-11-build-v11-0-20m-background.py` | Back up v11 and add the new scale-correct sky, ground, and exact 0–20m Tiled background layer without touching deeper content |
| `2026-07-11-validate-v11-0-20m-background.py` | Read-only verification of the v3 TMX wiring, backup invariants, 90 image chunks, native dimensions, and exact 20m cutoff |
| `2026-07-11-render-v11-wired-0-20m-preview.py` | Render the old-underlay plus new v3 Tiled image-object groups for compact visual QA without changing the TMX |
| `2026-07-11-export-v11-background-runtime-manifest.py` | Export only the saved v11 high-resolution background image objects into a validated, hash-pinned, browser-path-safe runtime manifest without touching gameplay tile data or the TMX |
| `2026-07-12-normalize-town-preview-edges.py` | Match generated town approval previews to their exact source dimensions using only right/bottom cropping or duplicated edge pixels, never artwork scaling |
| `2026-07-12-render-v11-neutral-skyline-preview.py` | Compose the neutral exterior/town candidates through the existing production crop/feather transforms and render clean plus tile-annotated exact-TMX previews without editing live chunks or TMX |
| `2026-07-12-build-neutral-town-contact-sheet.py` | Build the five-town plus ten-exterior time-neutral visual approval grid from exact-dimension preview masters |
| `2026-07-13-wire-v11-split-sky-islands.py` | Wire the approved high sky-island portal banks into the saved v11 TMX, clear sky bedrock except the level divider, and validate eight static portal slots |
| `2026-07-13-build-approved-hud-skin.py` | Extract transparent, text-cleared runtime HUD frames from the approved player HUD mockup |
| `2026-07-15-render-mining-world-3d-poc.py` | Render the review-only, front-facing Blender mining-world tile/background proof at the production 94px scale |
| `2026-07-15-build-mining-world-3d-poc.py` | Package the Blender renders into native 94px tile candidates and current-vs-3D review sheets |
| `2026-07-15-render-meshy-background-mockup.py` | Import one actual Meshy cave GLB and render a review-only 1280x720 side-view mining background without tile or runtime changes |
| `2026-07-15-build-meshy-background-comparison.py` | Build the current V11 versus actual Meshy 6 background-only approval image and provenance manifest |
| `2026-07-15-build-v11-background-relief-poc.py` | Derive the aligned height map used by the review-only V11 flat-versus-WebGL-relief background comparison |
| `2026-07-15-build-survival-robot-sphere-poc-assets.py` | Extract anchored transparent survivor action poses and Robot Sphere states from the approved proof sheets for the tanktest-v1 sandbox |
| `2026-07-15-build-level1-ground-facade.py` | Preserve the approved mockup's original 13-tile town span pixel-exactly, append one non-stretched edge-continuation tile, extend its earth into a native-runtime 94px 280x10 nine-chunk facade, and build the required transparent stone/ore/special recognition atlas with no fallback glyphs |
| `2026-07-15-build-world-scenic-facade-materials.py` | Build mirrored-seamless runtime materials from the approved v11 Level 1/Level 2 depth-detail sources for the streamed solid-cell facade |
| `2026-07-15-blender-mcp-client.py` | Send scene inspection, viewport capture, and code-execution commands to the local Blender MCP GUI bridge |
| `2026-07-15-setup-survival-blender-polish-v2.py` | Build and save the persistent Survival v2 Blender MCP scene with restored PBR materials, optional-disabled gear/tool builders, and fixed framing |
| `2026-07-15-author-survival-miner-poses-v2.py` | Retained manual unarmed IK-pose fallback; production uses the stronger normalized UE actions |
| `2026-07-15-normalize-survival-ue-actions-v2.py` | Copy the full-body UE clips into bounded `MINER_*` actions, remove camera-breaking travel, and save the persistent master |
| `2026-07-15-render-survival-polish-golden.py` | Render exact 128 px truth and 2x inspection comparisons from the fixed Blender camera |
| `2026-07-15-export-survival-blender-v2-runtime.py` | Render 512 px Blender frames, Lanczos-downsample 256 px sheet cells, and emit runtime sheets plus motion previews |
| `2026-07-16-render-ual-native-player.py` | Render the CC0 UAL1/UAL2 mannequin from authored 24 FPS timing into 30 FPS runtime frames; supports trimmed source ranges, seamless multi-clip composition, six gameplay-bone markers per frame, and explicit-only walk review candidates that never enter the default production render |
| `2026-07-16-pack-ual-native-player.py` | Fixed-scale crop, Lanczos-downsample, losslessly pack, transform projected rig markers, preserve composite/trim provenance, and safely merge or prune selected UAL action sheets in the production manifest |
| `2026-07-16-audit-ual-game-rig.py` | Measure native UAL root/pelvis travel and location curves before converting generic clips into Dig Game in-place physics motion |
| `2026-07-17-export-ual-unreal-source.py` | Export the 17 unique active punch-only UAL clips as one Unreal source skeletal FBX while excluding the rejected kick and `Sword_Regular_C` up strike |
| `2026-07-17-render-ual-survival-retarget-proof.py` | Render an approval proof from the Unreal-IK-retargeted Survival idle, Jog, Jab, and Cross FBX carriers before runtime promotion |
| `2026-07-17-render-survival-ual-player.py` | Render 512px source frames and manifests for the approved 18-sheet / 867-frame Survival runtime from Unreal IK outputs; the shared UAL packer performs the later WebP packing and 109px/123px presentation metadata step |
| `2026-07-17-build-blender-animation-lab.py` | Consolidate the 17 unique active Unreal-IK Survival FBX carriers into one source-preserving, add-on-ready Blender animation lab master and emit a SHA-256 build report |
| `2026-07-17-launch-blender-animation-lab.ps1` | Rebuild when requested, run the lab contract, register the local Blender add-on, and open the isolated animation lab master in Blender 5.1 |
| `2026-07-17-prepare-meshy-warrior-lab-source.ps1` | Hash-check and decompress the approved Meshopt Meshy Warrior into a Blender-readable, lab-owned review copy without changing its source |
| `2026-07-17-validate-blender-animation-lab.py` | Exercise protected endpoint tweening, hitboxes, tile guides, gear/pickaxe grips, 22-bone Meshy action baking, matched proof renders, and isolated review export in Blender 5.1 |
| `2026-07-17-audit-meshy-retarget-spaces.py` | Diagnostic ranker retained for comparing Blender constraint spaces against the Meshy/Survival proof rigs |
| `2026-07-17-build-scenic-semantic-assets.py` | Pack image-generated mineral insets, star rarity states, and seven physical reward-block formations; derive aligned emissive frames; build an offset/feather seamless bedrock material without mirrored lighting; and write the provenance manifest |
| `2026-07-18-render-superman-flight-review.py` | Render and pack the local Push Loop with an isolated Blender one-arm, stretched-leg Superman pose layer into the flight-lab review draft only |
| `2026-07-18-build-superman-pose-editor.py` | Build the simple upright-idle Survivor Blender workbook with large body, hand, and foot controls for review-only Superman pose editing |
| `2026-07-18-build-superman-horizontal-idle.py` | Strip the rejected pose-editor controls from the approved idle snapshot, rotate it flat by 90 degrees, and save a clean review-only horizontal idle preset |
| `2026-07-18-render-directional-side-punch-review.py` | Render the approved Punch Cross unchanged plus isolated upward and downward torso layers into review-only browser candidates |
| `2026-07-26-render-superman-flight-prone-v3-runtime.py` | Render the exact approved prone-v3 Blender pose as a mirrored, source-facing-right 36-frame production flight loop while retaining the old Push Loop sheet for rollback |
| `2026-07-26-build-npc-idle-director-review.py` | Crop the two ImageGen NPC director boards into synchronized review poses, build the current-versus-proposed contact sheet, and record active runtime hashes without changing production assets |
| `2026-07-26-build-npc-activity-review.py` | Crop the two v3 NPC activity boards into inspectable poses, build the labeled activity contact sheet, and record review-only hashes without changing production assets |
| `2026-07-26-build-npc-planted-idles-v9.py` | Detect isolated 4x3 panels across the approved v3 and planted v5 boards, rebuild 48 cache-safe review crops, extract/align transparent v9 runtime cutouts to one per-merchant baseline, reject edge contamination, and emit the checkerboard QA and provenance manifests |
| `2026-07-26-build-titan-sprites.py` | Split the approved 5x5 chroma-cleaned titan atlas into 25 normalized transparent runtime silhouettes, build the dark-background QA sheet, and normalize the ImageGen-approved Titan Walk plinth alpha master into its bounded runtime sprite |
| `2026-07-26-build-titan-chambers-v2.py` | Normalize the 25 individually authored ImageGen Titan chamber masters into exact 1536x848 streamed WebP cards, verify their inventory and hashes, and build the production visual-QA contact sheet |
| `2026-07-26-build-underground-biome-backgrounds-v2.py` | Convert mockups 51-100 into 50 unique exact-1536x1024 WebP scenic cards, allowing only a two-pixel source normalization and verifying dimensions, format, hashes, and output inventory |
| `2026-07-26-build-underground-biome-motion-runtime-v1.py` | Preserve the ten original motion-ready paintings as exact-1536x1024 static WebP derivatives; these are no longer the active motion implementation |
| `2026-07-26-build-underground-biome-baked-motion-v2.py` | Build ten silent four-second VP9 moving images from composition-locked painted keyframe pairs, bake the restrained whole-image float into the encoded frames, verify codec/dimensions/fps/duration/hash/inventory, and emit the runtime manifest |
| `2026-07-26-build-underground-biome-smooth-motion-v3.py` | Preserve the approved Weathered Roots 60 fps H.264 reference and, with `--production`, build and verify one eight-second subpixel whole-image loop for each of the ten biome paintings without optical flow or overlays |
| `2026-07-26-build-opening-flight-v2-assets.py` | Crop and losslessly pack the five chroma-cleaned Golden Five onboarding sprites, including the premium objective-HUD frame, into compact alpha-safe runtime WebPs |
| `2026-07-26-build-milestone-pillar-review-assets.py` | Split the five transparent ImageGen milestone-pillar progression sheets into 25 baseline-aligned Phaser review stages and emit their review-only manifest |
| `2026-07-26-build-milestone-pillar-runtime-contact-sheet.py` | Assemble the five stage-5 Phaser review captures into one labeled visual-approval contact sheet |
| `2026-07-26-build-approved-pillar-assets.py` | Pixel-verify the user's two approved screenshots against their reviewed sheets, promote screenshot 1/C and screenshot 2/A into ten RGBA production stages, and emit hashes/provenance under `sprites/environment/approved-pillars-v1/` |
| `2026-07-26-build-earthquake-feedback-ui-v2.py` | Pack the chroma-cleaned ImageGen seismic status master into a 2x Phaser status plate and reusable hazard medallion with alpha and size validation |
| `2026-07-28-build-earthquake-tile-feedback-v1.py` | Split the chroma-cleaned three-effect ImageGen atlas into validated 512px fracture, collapse, and rubble-return Phaser sprites |
| `2026-07-28-build-earthquake-dodge-review-assets.py` | Split the approved 2x2 ImageGen dodge atlas into four validated transparent landing-footprint, boulder, ceiling-fracture, and impact-debris review sprites |
| `2026-07-28-build-earthquake-dodge-review-assets.py` | Split the approved 2x2 ImageGen dodge atlas into four validated transparent landing-footprint, boulder, ceiling-fracture, and impact-debris review sprites |
| `2026-07-26-build-exact-town-square-ground.py` | Crop the approved Option A ground band pixel-exactly, append only a 129 px mirrored alpha handoff, and emit the ground-only v2 runtime asset plus hash provenance |
| `2026-07-28-build-overground-texture-clarity-assets.py` | Historical rejected comparison builder for the earlier resource/reward audit; its Teleport rollback and output atlases are not production |
| `2026-07-28-build-opaque-imagegen-tile-atlases.py` | Historical rejected opaque-block builder retained only to reproduce audit evidence; none of its resource outputs are production |
| `2026-07-28-build-approved-2d-resource-overlays-v5.py` | Validate six approved front-facing ImageGen alpha sheets, retain four accepted overlays, pack the RGBA 188 px semantic atlas and 94 px v6 recognition atlas, export per-resource WebPs, and emit deterministic hashes plus four-ground runtime QA |
| `2026-07-28-build-wide-embedded-resource-overlays-v6.py` | Pack ten checked-in ImageGen ground-formation sheets into 60 unique transparent semantic frames and a v7 recognition atlas, preserve the 18 approved special frames, export six-variant WebPs, and emit three-ground QA plus deterministic hashes |
| `2026-07-28-build-weather-particles-v2.py` | Re-extract the approved clean ImageGen rain, snow, water, and atmosphere sources, isolate usable particles, pack a transparent 32-frame production sheet, and reject residual chroma-green pixels |
| `2026-07-28-build-whole-world-visual-expansion-v5.py` | Pin exactly 100 approved ImageGen masters, build 50 scenic cards, 40 irregular terrain plates, ten 20-frame cap atlases, ten alpha surface-ground cards, a 16-state backdrop mask, contact sheets, hashes, and the additive V5 manifest |
| `2026-07-29-build-starlight-talent-tree-v3.py` | Preserve the V2 Starlight pack and build the native-ultrawide three-card foundation, authored live-copy plaques, carousel controls, alpha validation, and the V3 hash manifest |
| `2026-07-29-build-surface-sky-props-v3.py` | Split ten ImageGen 5x4 alpha masters into 200 connected-component-safe frames, pack ten lossless Phaser atlases, emit generated asset values/hashes and candidate placement provenance, validate landmark exclusions, and build eleven QA sheets; production selection is hand-authored separately |
| `2026-08-02-build-tile-destruction-fx-v3.py` | Promote only zero-warning mining-library frames into four-phase material atlases, extract independent foreground shards, pin source/runtime hashes, and render exact-94px QA |
| `2026-08-03-build-main-menu-v1.py` | Preserve the ImageGen-authored button end caps, extend only the neutral center span to exact 5:1 geometry, derive the selected state offline, and verify RGBA, alpha, density, and hashes |
| `2026-08-03-build-save-menu-v1.py` | Crop the approved four-part ImageGen UI kit, remove chroma, preserve caps and center crests while retargeting exact live geometry, derive choice selection art, and emit validated RGBA hashes |

| `2026-07-29-build-underground-backdrop-enhancers-v7.py` | Soft-matte, despill, frame-feather, preserve native 1536x1024 resolution, write 100 alpha WebPs, hash every source/runtime file, and build checkerboard plus correct-biome context proof sheets |

## Archive
Outdated import fixers from the initial restructuring have been archived to `/archive/2026-06-25-import-fixer-batch/`.
