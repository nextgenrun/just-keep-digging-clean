# Animations

Phaser animation frame definitions and creation.

## Responsibility (per `organisation-policy.md`)
Animation frame definitions and creation. These are Phaser animation configs that reference spritesheet frames — NOT the image files themselves (those go in `/sprites/`).

## Planned Files

| File | Purpose |
|------|---------|
| `PlayerAnims.js` | Player character animation configs (idle, walk, dig, climb, airborne) |
| `NpcAnims.js` | NPC animation configs (merchants, quest NPCs) |
| `RobotAnims.js` | Robot character animation configs (alternate player model) |

## Rules
- Imports from `values/assetKeys.js` for frame key references
- Imports from `systems/` for animation-related utilities only
- Does NOT import from `world/` or `ui/`
