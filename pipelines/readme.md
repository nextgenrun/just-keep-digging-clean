# Pipelines

Asset pipeline scripts for building, converting, and processing game assets.

## Responsibility (per `organisation-policy.md`)
Asset pipeline scripts (blender, piskel, audio conversion). No game runtime code.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `blender/` | Blender pipeline scripts (3D → 2D rendering, sprite sheet generation) |
| `piskel/` | Piskel pipeline scripts (pixel art export, sprite sheet compositing) |
| `audio/` | Audio conversion pipeline (format conversion, normalization, compression) |