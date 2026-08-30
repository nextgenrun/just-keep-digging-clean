# Archived: 2026-08-27-debris-shield-retirement

**Archived on:** 2026-08-27  
**Reason:** experimental debris-shield input conflicted with held-Q Quickslash and the standalone debris cadence was not functioning as intended  
**Replaced by:** held Q is again dedicated to `player/PlayerInput.js` Quickslash; established earthquake cave-ins and falling rocks remain in `systems/environment/EarthquakeSystem.js`  
**Last used in:** `89c85a1`  
**Safety:** safe to delete after 2027-02-23 if no references are restored

## Preserved files

- `values/debrisShield.js` — retired tuning and preload descriptor.
- `systems/visual/DebrisShieldSystem.js` — retired contextual-Q shield runtime.

The active imports, preload, setup, frame update, lifecycle disposal, Hardcore
upkeep source, rock-absorption hook, and standalone debris scheduler were
removed together. This package is rollback evidence only and must not be
imported by production runtime code.
