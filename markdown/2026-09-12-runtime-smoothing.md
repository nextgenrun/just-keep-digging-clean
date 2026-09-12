**Runtime smoothing pass — 12 September 2026**

Implemented the next focused optimization pass from the performance audit. Local code is updated; nothing was deployed. Visual assets, resolution, gameplay balance, and combo timing were preserved.

- Fixed private Phaser video-texture cleanup for underground backdrop cards and surface motion. Teardown removes only the video's owned texture, checks for other live consumers, and releases its tracking entry. Static and shared textures are preserved.
- Cave proximity checks now reject distant entrances before querying terrain.
- Animated chest discovery reuses its candidate map while camera bounds, tile types, and opened-chest state are unchanged. Animation, proximity frames, and delayed asset readiness still update every frame.
- Added a transient WorldModel tile-type revision to invalidate discovery on terrain changes and destruction. HP-only changes do not invalidate it. No save schema changes.
- Currency HUD compares numeric balances before formatting text.
- Added a direct Star-balance getter so the HUD no longer builds the complete talent-tree snapshot every frame.

**Measured result**

The same isolated local route was repeated: surface → 800m → 1200m → 1800m → 800m → surface, with 65 seconds of surface cooldown.

| Metric | Audit baseline | Optimized |
|---|---:|---:|
| Texture estimate after returning to surface | 1,687.5 MiB | 1,603.5 MiB |
| Texture estimate at 1800m | 1,945.1 MiB | 1,903.1 MiB |
| Cave-entry CPU/frame at first 800m visit | 0.238 ms | 0.006 ms |
| Animated-cache CPU/frame at first 800m visit | 0.159 ms | 0.003 ms |
| Currency HUD CPU/frame at first 800m visit | 0.183 ms | 0.060 ms |
| Median frame interval | Approximately 16.7 ms | Approximately 16.7 ms |

The route saved **84 MiB** of retained texture data at the final surface sample. Starting texture memory was identical between runs. Some legitimate newly loaded assets remain after returning, so the optimized surface total is still 14.9 MiB above initial residency.

The optimized p95 frame intervals were 17.5–18.5 ms. The prior route measured 17.4–18.3 ms in equivalent short samples. There is no demonstrated FPS/p95 improvement from these refresh-limited samples; the verified improvements are lower subsystem CPU work and removal of accumulating private video textures.

The direct Star getter was added after this route capture, when the remaining HUD cost led to inspection of its provider. Its behavior was validated by the focused runtime and talent/save contracts; the 0.060 ms HUD timing above does not include that final additional reduction.

Texture numbers are source-size RGBA estimates, not measured total GPU/process memory. The game still has a large permanent Boot/player footprint. Reducing that residency is the next substantial optimization opportunity.

**Validation**

- Twenty real-Phaser video creation/destruction cycles: zero retained textures after every cycle. The old path retained 6 MiB per destroyed card.
- Focused regression: 60 stationary chest updates add zero tile queries after initial discovery; camera movement, resize, chest opening/restoration, and tile revisions invalidate correctly.
- Delayed chest texture readiness and open animations work without rescanning every frame.
- Only the nearby entrance is queried in a fixture containing 1,000 distant caves.
- 1,000 unchanged currency HUD updates perform zero locale-formatting calls; changed balances and forced updates still render.
- Tile damage/destruction and transient revision behavior are checked without modifying save semantics.
- Shared/renamed textures are preserved; exclusively owned video textures are removed.
- Eleven relevant contracts passed, including cave entrances, currency HUD, visual texture lifetime, deep teleport, performance foundation, feature residency, weather, the new smoothing regression, celestial progression, celestial save, and save scheduling.
- Two older tests still fail and were replayed without the relevant new source changes: interactive-world visual state fails on unsafe authored reliquary placement at line 146; the surface-living fixture lacks `context.createImageData`. These failures predate this pass. The real browser surface/depth route completed with no captured errors.
- Changed runtime modules pass syntax checks and the scoped diff passes whitespace validation.

The browser route uses a temporary no-save world, synthetic rooms and direct placement, and short frame samples. This is not a natural 20-minute mining run on the user's hardware. It retains the audit's existing development configuration and instrumentation overhead.

**Evidence and reproduction**

- [Optimized travel capture](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-optimized-travel.json)
- [Original travel capture](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-audit-travel.json)
- [Twenty-cycle browser result](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-optimized-video-lifetime.json)
- [Focused regression](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-smooth-runtime-contract.mjs)
- [Original full audit](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/markdown/2026-09-12-full-performance-audit.md)

Run `node testing/2026-09-12-smooth-runtime-contract.mjs`.
With `python serve.py 8080`, open `/testing/2026-09-12-audit-video-lifetime.html?soak=1` or `/testing/2026-09-12-full-performance-entry.html?jkd_e2e=1&cinematics=0&auditTravel=1`.

The original audit results remain unchanged as the before measurements. All added browser harnesses and evidence are test-only.

