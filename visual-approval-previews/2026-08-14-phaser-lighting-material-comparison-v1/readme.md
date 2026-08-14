# Phaser lighting and material comparison v1

Date: 2026-08-14

Status: **superseded for approval**. This set contains mixed-provenance baselines, including imagery that does not represent the latest active runtime. Use `../2026-08-14-phaser-lighting-material-comparison-v2-latest-runtime/` instead.

Nothing in this folder is wired into Phaser or Unity.

## Pairs

- `01-surface-town-old.png` / `01-surface-town-new.png`
- `02-shallow-mine-old.png` / `02-shallow-mine-new.png`
- `03-deep-mine-old.png` / `03-deep-mine-new.png`
- `04-crystal-portal-old.png` / `04-crystal-portal-new.png`

## Direction being tested

- Coherent cool ambient light plus localized warm or emissive sources.
- Restrained normal-mapped response on stone, soil, wood, metal, ore, and crystal.
- Contact shadows and crevice occlusion to ground characters and terrain.
- Low-radius glow only from existing lanterns, magma, portals, and crystals.
- Darkness and unexplored regions remain gameplay-readable and are not globally brightened.

## Approval boundary

These generated images demonstrate lighting and material language. Image generation can slightly reinterpret sprite edges, UI spacing, text, and proportions. Those changes are not proposed or approved. A runtime implementation must preserve the current camera, layout, HUD, sprites, terrain authority, and gameplay state exactly.
