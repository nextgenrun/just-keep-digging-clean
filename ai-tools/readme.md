# AI Tools

All scripts created by LLMs to audit, fix, or edit the codebase.

## Rules (per `.clinerules` §4)
1. **Date-stamp all filenames:** `YYYY-MM-DD-description.ext`
2. **Archive outdated tools:** Move to `/archive/` with date prefix when superseded
3. **Keep readme updated:** Document what each active tool does

## Active Tools

| Tool | Purpose |
|------|---------|
| `2026-06-25-bulk-migrate.py` | Bulk file migration/restructuring |
| `2026-06-25-check-404s.ps1` | Check for 404 resource errors |
| `2026-06-25-fix-404s.py` | Fix 404 resource paths |
| `2026-06-25-fix-corruption.ps1` | Fix file corruption issues |
| `2026-06-25-rewire-imports.bat` | Batch import path rewire |
| `2026-06-25-compare-stubs.py` | Compare stub files against originals |
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
| `2026-07-26-build-heavenblocks-progression-assets.py` | Rebuild relic atlases, UI tokens/components, and the three alpha-safe 512px native Heavenblock component hearts from retained masters |

## Archive
Outdated import fixers from the initial restructuring have been archived to `/archive/2026-06-25-import-fixer-batch/`.
