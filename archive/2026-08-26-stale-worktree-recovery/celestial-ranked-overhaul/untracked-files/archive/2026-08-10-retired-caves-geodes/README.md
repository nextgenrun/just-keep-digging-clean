# Retired caves and geodes

Archived on 2026-08-10 as part of the Celestial ranked-progression overhaul.

These files implemented the standalone CaveScene, cave generation, entrances,
hazards, cave-only presentation, geode content, and their focused tests. The
production boot, scene registration, PlayScene setup/update, world generation,
tile registry, save writer, renderer, and asset preload paths no longer refer to
this subsystem.

Legacy numeric tile IDs are normalized on load so existing saves retain safe
terrain instead of failing. The archive is intentionally not imported by the
runtime and is retained only as a rollback/reference boundary.

