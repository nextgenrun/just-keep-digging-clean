# Dynamic Systems

Procedural generation and runtime-computed systems.

## Responsibility (per `organisation-policy.md`)
Procedural generation, runtime-computed systems. These systems produce data at runtime and may be computationally expensive.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `generation/` | World generation pipeline (orchestrator, terrain, caves) |

## Import Rules
- Imports from `values/` only
- Does NOT import from `world/`, `player/`, or `ui/`
- Output is consumed by `world/` layer at setup time

## Content
Moved from `world/generation/` — world generation is procedurally computed and belongs in dynamic-systems per the layered architecture.