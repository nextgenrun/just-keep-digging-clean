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

## Archive
Outdated import fixers from the initial restructuring have been archived to `/archive/2026-06-25-import-fixer-batch/`.
