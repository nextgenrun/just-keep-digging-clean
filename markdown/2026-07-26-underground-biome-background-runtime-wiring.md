# Underground biome background runtime wiring

Date: 2026-07-26  
Status: fifty static images live; optical-flow motion rejected

## Production outcome

Fifty background-only WebPs are active across the ten underground material
bands. Each band has five deterministic 1536x1024 world-space compositions.
The rejected V2 WebMs are not part of any production pool.

| Layer | Phaser depth | Ownership |
|---|---:|---|
| Finished background image | -6.4 | Scenic caves, buildings, bridges, roots and machinery |
| Solid terrain facade | 0.1 | Authoritative ground mask |
| Terrain exposed edge | 0.2 | Readable boundary of real solid cells |

Painted buildings, bridges, ledges, roots, and machinery remain background.
They never become ground or collision.

## Variation and streaming

- Five approved WebPs per biome; fifty total.
- Deterministic selection from world-space card column and row.
- Only intersecting regions and neighbor cards remain active.
- Exact bottom-card crops align every family with its material boundary.
- Generic material remains visible until the selected image pool is resident.
- Departed non-startup images are released.

## Motion-quality contract

Current motion may only move the complete finished image card:

- Weathered Roots, Blue Caverns, Silver Core, Core Magma, Obsidian Catacombs,
  Blackglass Abyss, and Starfire Rift use restrained inertial camera response.
- Amber Depths, Slagworks, and Pressure Foundry stay anchored.
- All offsets are seam-safe, capped at ten pixels, settle to zero, and reset on
  camera teleports.
- No V2 WebM, optical flow, HTML visual, Canvas drawing, Phaser Graphics,
  particle field, mist drift, emissive duplicate, or tweened decoration is
  permitted in this stage.

## Rollback controls

- `?biomeBackdropVariants=0` restores the previous Level 1 plate pool.
- `?biomeBackdropMotion=0` disables complete-image camera response.
- `?worldMotion=0` is the compatibility motion override.
- `?levelOneBackdrops=0` or `?shallowCavern=0` disables the scenic backdrop.

All controls are presentation-only.

## Rejected evidence

- `visual-approval-previews/underground-biome-baked-motion-v2/`
- `sprites/backgrounds/world-visual-v2/depth/biome-motion-v2/`
- `markdown/2026-07-26-underground-biome-baked-motion-runtime-v2.md`

These paths preserve evidence only and are not production-selected.
