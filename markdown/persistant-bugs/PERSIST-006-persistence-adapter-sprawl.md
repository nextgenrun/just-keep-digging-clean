# PERSIST-006: Progression persistence uses repeated ad-hoc adapters

Severity: `P2 risk / P3 current`
Status: confirmed active repeated failure-handling defect
Area: persistence architecture and progression

## Evidence

- `systems/environment/CampfireSystem.js:365-385` repeats slot-1 legacy migration and silently ignores both read and write failures.
- `systems/visual/MilestoneBoardSystem.js:225-245` repeats the same slot migration pattern and resets loaded state on failure. The concrete loss case is tracked in `PERSIST-001`.
- `systems/visual/FloatingTextSystem.js:45-52` has another slot migration reader, while `:1450`, `:1472`, and `:1493` independently swallow star and constellation write failures.
- `systems/map/WorldMapDiscoverySystem.js:48-58` returns `false` when its write fails, but the delayed persistence callback ignores the result and emits no diagnostic.
- These systems use separate key prefixes, fallback formats, and error policies instead of one save-slot persistence contract.

## Impact

The same storage conditions can produce different behavior by subsystem: a progression write may be silently lost, a read may reset in-memory state, or map discovery may simply stop persisting. The player cannot distinguish a new save from a failed save. The duplication also makes migrations and backup policy drift over time.

## Permanent solution setup

- Introduce one slot-aware persistence adapter with namespaced keys, legacy migration, schema validation, and structured success or failure results.
- Make every progression subsystem use the adapter rather than direct `localStorage` calls.
- Centralize write retry and shutdown flush policy so delayed map writes cannot disappear silently.
- Emit one deduplicated save-health event for storage unavailable, quota exceeded, malformed data, and migration failure.
- Keep the subsystem-specific payload schema separate from the storage transport, then add fault-injection coverage for each payload.

