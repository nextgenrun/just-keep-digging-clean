# Progression

Game system — progression.

- `AncientRelicSystem.js` owns only the bounded persistent Relic count; cache
  placement, gates, crafting, presentation, and save transport remain separate
  consumers.
- `RetentionProgressSystem.js` / `retentionProgressState.js` own Titan discovery
  persistence. Load sanitization drops unknown ids and duplicates, restores the
  canonical 1-25 definition order, and exposes the same array through the
  journal snapshot used by collection surfaces.
