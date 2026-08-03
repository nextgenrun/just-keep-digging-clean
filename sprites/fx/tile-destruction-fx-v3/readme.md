# Tile destruction FX v3

This is the production bridge from the 2026-07-29 high-impact review library
to normal tile destruction. The game preloads only these two compact atlases;
it never loads the 10,000-image review directory.

- `tile-break-core-v3.png`: four front-facing phases for 17 material families.
- `tile-break-shards-v3.png`: five detached, alpha-safe fragments per family.
- `provenance.json`: pinned library IDs, source hashes, substitutions, atlas
  hashes, and the explicit promotion boundary.

Every promoted source record is `pending` with zero source/master warnings.
When a material-specific library phase was quarantined, the pack uses a
zero-warning donor phase and keeps the material-specific safe scatter/settle
frames. No quarantined source is copied into production.

At runtime the core sprite remains inside one tile and billboards toward the
camera. It mirrors toward the player. Detached shards travel toward the player,
rotate independently, then grow slightly as they enter the foreground before
gravity and alpha settle them. `?authoredMineImpact=0` disables the system.

Ground damage-state atlases are separate and unchanged.
