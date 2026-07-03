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
| `2026-07-03-v7-30-detail-processing.py` | Shared alpha-safe image processing helpers for the v7-30 detail-enhancement sample tool |

## Archive
Outdated import fixers from the initial restructuring have been archived to `/archive/2026-06-25-import-fixer-batch/`.
