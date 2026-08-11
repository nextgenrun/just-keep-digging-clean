# PERSIST-004: Two animation properties share one asset key

Severity: `P3`
Status: confirmed active compatibility debt; currently contained
Area: animation catalog

## Evidence

- `values/assetKeys.js:371` defines `walkAnim: "char-v5-walk-loop-anim"`.
- `values/assetKeys.js:373` defines `walkLoopAnim: "char-v5-walk-loop-anim"`.
- `world/playScene/PlaySceneSetup.js:330` queues both profile properties but uses a `Map` that silently deduplicates the same key.
- `world/playScene/CaveActionAnimationRuntime.js:201` and `:205` maintain fallback logic between the two names.

## Impact

There are two semantic names for one animation resource. The current preload path avoids a duplicate load, so no current collision was observed. The alias still obscures which property is authoritative and makes future changes risky: changing one key or removing the `Map` deduplication can create missing animations or duplicate work.

## Permanent solution setup

- Select one canonical property, preferably `walkLoopAnim`, and mark the other as a deprecated compatibility alias.
- Centralize profile-key alias resolution in the asset catalog instead of repeating fallback logic in runtime consumers.
- Add a catalog validation rule that rejects duplicate literals unless an explicit alias declaration exists.
- Log or fail in development when a deprecated alias is consumed.
- Migrate consumers, then remove the alias only after save/profile compatibility requirements are closed.

