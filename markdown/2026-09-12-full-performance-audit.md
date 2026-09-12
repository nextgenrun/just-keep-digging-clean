**Full performance audit — UNDERSTAR — 12 September 2026**

The strongest confirmed defect is a video-texture lifetime leak in underground scenery. It compounds an already excessive resident asset footprint. Rain adds measurable surface work, but after the earlier weather patch it was inexpensive at 800m in this test. The reported sustained severe lag was not reproduced on this browser; memory accumulation and occasional streaming hitches were reproduced.

This audit adds evidence, test fixtures, and this report. It makes no additional gameplay/runtime changes and performs no deployment. The four weather optimizations from the preceding investigation are part of the measured baseline.

**Priority and evidence**

| Priority | Finding | Evidence | Recommended change |
|---|---|---|---|
| P1 | Underground video textures survive card destruction | Real Phaser reproduction: four destroyed cards leave four textures, 24 MiB total. | Explicitly release each exclusively owned video texture when destroying its card; register its runtime ownership. |
| P1 | Resident texture footprint already exceeds the configured budget before deep travel | Surface 1,588.6 MiB; 800m 1,843.1 MiB; configured high watermark 704 MiB. | Reduce Boot/UI and player residency before adding more scenery. |
| P2 | Streaming/initialization still produces individual stalls | Travel windows include 44.2–88.6 ms frames; initial scenic sync reached 324.8 ms. | Profile and split expensive activation/sync work; preserve the existing stable-window scheduler. |
| P2 | Cave interaction scans every entrance before checking distance | Browser CPU about 0.20–0.26 ms/frame; synthetic 1,000 distant caves cause 2,000 solidity queries/frame. | Proximity rejection before entrance validation; cache configuration decisions. |
| P2 | Animated cache discovery rescans a stationary viewport every frame | Browser CPU about 0.11–0.18 ms/frame; 40,020 tile queries over 60 calls at a 1280×720 world view. | Rescan on bounds/tile/open-state changes; continue animating live records each frame. |
| P2 | Currency/progression UI recomputes unchanged data | Currency HUD about 0.15–0.21 ms/frame; money formatting runs before equality checks; introduction state clones journal data every frame. | Compare raw values first; reuse formatters and a small progression revision/snapshot. |
| P2 | Individual destroyed-tile updates rebuild the whole visible material mask | Synthetic 660-cell solid viewport: 3,300 tile reads per visible invalidation. | Accumulate changed cells and commit one visual refresh per frame; retain the damage-only fast path. |
| P3 | Session-log batching repeatedly serializes a growing batch | Synthetic 128-event batch: median 2.97 ms, p95 4.17 ms in Node. | Account encoded event bytes incrementally and serialize the final batch once. |
| P2, delivery | Production candidate graph remains very large | 6,169 asset files / 4.57 GiB; 1,115 JS modules / 11.42 MiB uncompressed. | Tighten the shipped manifest, separate review-only dependencies, and set startup and resident-memory budgets. |

P1 means first implementation priority. These rankings distinguish measured defects from optimization opportunities; they do not imply every item caused the user's particular lag.

**1. Confirmed video texture leak**

[WorldVisualDepthBackdropRegionView.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js:431) creates a Phaser Video for each moving backdrop card. Its [destructor](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js:538) stops and destroys the Game Object but never releases the video's private texture.

The bundled [Phaser Video implementation](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/libs/phaser.js:86398) creates that texture under a fresh UUID. [Video.preDestroy](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/libs/phaser.js:87866) stops playback and removes the video element and listeners, but does not remove the texture from the Texture Manager. Destroying the Game Object therefore does not complete resource cleanup.

A separate browser fixture invokes the actual production segment destructor on four real, sequentially created 1536×1024 backdrop videos:

| Cycle | Extra textures after destruction | Estimated retained texture data |
|---|---:|---:|
| 1 | 1 | 6 MiB |
| 2 | 2 | 12 MiB |
| 3 | 3 | 18 MiB |
| 4 | 4 | 24 MiB |

Explicitly removing those four owned keys returns the texture count to baseline. This cleanup was demonstrated only in the isolated fixture, not applied to production.

The full-game route was surface → 800m → 1200m → 1800m → 800m → surface. After 65 seconds back at the surface, textures remained 98.9 MiB above the starting surface sample. The saved largest-source lists include fourteen additional 6 MiB UUID textures, accounting for at least 84 MiB of that growth. The remainder includes legitimate new assets, such as the minicamp; not all growth is a leak.

[RuntimeAssetCatalog](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/RuntimeAssetCatalog.js:145) adopts otherwise unknown textures. Its default policy classifies these UUID resources as unmanaged Boot assets. Consequently, “zero untracked textures” is not proof of correct ownership, and the Boot owner total includes runtime-generated sources.

Implementation acceptance: repeat at least twenty create/destroy cycles and multiple depth round trips; texture counts should return to the expected live set. Verify that only the card's private texture is released, that shared sources remain alive, and that surface motion has the same lifecycle coverage.

Evidence: [video lifecycle result](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-audit-video-lifetime.json) and [full-game travel result](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-audit-travel.json).

**2. Excessive baseline residency**

Runtime source estimates:

| Sample | Texture estimate | Multiple of 704 MiB watermark |
|---|---:|---:|
| Surface | 1,588.6 MiB | 2.26× |
| First 800m visit | 1,843.1 MiB | 2.62× |
| 1800m | 1,945.1 MiB | 2.76× |
| Surface after route and 65-second cooldown | 1,687.5 MiB | 2.40× |

These are source-width × source-height × four-byte estimates, not measured GPU allocation. They include tracked video textures but exclude costs such as extra framebuffers, decoder surfaces, audio PCM, and possible additional CPU/GPU copies. Browser JS heap samples were approximately 163–199 MiB and do not describe total process memory.

The initial surface owner totals include about 864.1 MiB under Boot and 486.2 MiB under player-core. The largest individual player sheets include idle fidget (29.9 MiB), wall push (27.4 MiB), transition polish (24.9 MiB), and held-torch falling (23.6 MiB). These are worthwhile pack/residency targets; preserving animation continuity and approved artwork remains necessary.

The production-mode Boot inventory queues 583 loader entries, representing 537 unique physical paths and approximately 94.11 MiB of encoded files. Image-header totals are 905.68 MiB for unique physical sources and 920.01 MiB counted by texture key. This is an inventory estimate, not an HTTP capture or exact GPU total; audio alternatives, video decoding, atlas metadata, and loader deduplication need separate accounting.

Large Boot stages, counted by captured loader entries:

| Stage | Estimated image RGBA |
|---|---:|
| UI | 293.63 MiB |
| Backgrounds | 190.57 MiB |
| Constellations | 111.23 MiB |
| Pillars | 87.98 MiB |
| NPCs | 55.00 MiB |
| Tiles | 48.66 MiB |
| Surface sky atlases | 38.44 MiB |
| FX | 36.02 MiB |
| Weather VFX | 25.99 MiB |

[Boot queue ownership](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/ui/scenes/BootScene.js:342) marks many assets as permanent/unmanaged. [RuntimeFeatureResidency](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/RuntimeFeatureResidency.js:9) can trim only eligible unused managed groups. The [704/640 MiB watermarks](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/runtimeAssetLoading.js:225) therefore cannot bring this baseline under budget. Eligible optional loads may be deferred by [RuntimeAssetPressureGate](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/RuntimeAssetPressureGate.js:38), but the route recorded zero deferred or timed-out groups; no feature-starvation incident was observed.

Prioritize splitting menu/modal art from always-visible HUD art, loading threshold features close to use, and reducing genuinely oversized texture dimensions. Keep instant menu behavior through deliberate prefetch and short retention. Existing archive portraits are already small startup variants; do not assume those 25 portraits are the primary UI cost. Converting an image to a smaller WebP alone will not reduce its decoded width × height allocation.

Evidence: [Boot capture](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-audit-boot.json), [asset inventory](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-audit-inventory.json), and [runtime samples](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-audit-runtime.json).

**3. Rain, steady frames, and travel hitches**

The first run used six seconds of settling followed by 90 rendered-frame intervals per condition:

| Depth | Weather | Median frame | p95 frame | Mean weather CPU/frame | Textures |
|---|---|---:|---:|---:|---:|
| Surface | Clear | 16.7 ms | 17.8 ms | 0.080 ms | 1,588.6 MiB |
| Surface | Storm | 16.7 ms | 18.1 ms | 0.444 ms | 1,588.6 MiB |
| 800m | Clear | 16.7 ms | 18.0 ms | 0.054 ms | 1,843.1 MiB |
| 800m | Storm | 16.7 ms | 17.8 ms | 0.054 ms | 1,843.1 MiB |
| 1200m | Clear | 16.7 ms | 17.9 ms | 0.064 ms | 1,853.6 MiB |
| 1200m | Storm | 16.6 ms | 18.2 ms | 0.067 ms | 1,853.6 MiB |

The weather patch eliminated invisible deep occlusion sampling. Its focused contract measures 12,125 terrain queries in the old sampler path versus zero over 1,000 simulated frames at 800m, and no retained completed thunder timers. Surface storm still carries rain collision, particle, and rendering cost, but this run does not justify further visual cuts before fixing texture retention.

The second route also recorded built-in rolling telemetry, including travel/settling frames. At 800m, 1200m, 1800m, and the return to 800m, the rolling worst frame was respectively 58.7, 44.2, 65.2, and 88.6 ms. Median remained 16.7 ms. These are window maxima, not exact per-teleport timings. The fixture directly places the player rather than exercising the normal teleport loading transition.

Initial scenic synchronization reached 324.8 ms. Later reported syncs were about 5.6–9.5 ms. Recorded bitmap decode maximum was 135.3 ms and texture activation maximum 11.7 ms. Decode elapsed time can include asynchronous waiting and must not be equated with blocked main-thread time. The initial long-task window also includes startup work; no individual startup stall is attributed to one subsystem without a trace.

The renderer already skipped 724 of 727 window checks in the first route sample. Preserve that scheduler. Profile first-time mask creation, asset activation, and the complete sync pass rather than assuming the whole world redraws every frame.

**4. CPU work and digging**

[CaveEntryController._findNearestZone](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/playScene/CaveEntryController.js:182) validates every entrance before calculating proximity. The synthetic counts use explicitly constructed distant cave lists and are not claims about the actual world's cave count. Distance-first filtering is a small, straightforward improvement; spatial indexing is optional only if subsequent measurements justify it.

[AnimatedCacheVisualSystem](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/visual/AnimatedCacheVisualSystem.js:27) rebuilds a Map and string keys while scanning camera bounds every update. It also copies opened keys into its known set every frame. Separate structural discovery from animation. Invalidation must include camera bounds, changed tiles, opening events, and biome/asset readiness.

[CelestialCurrencyHudSystem](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/visual/CelestialCurrencyHudSystem.js:86) formats values before comparing displayed strings. [Money formatting](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/celestialCurrencyHud.js:64) uses locale options on every call. Reuse numeric formatters and compare raw values first. The HUD already avoids unchanged text rendering; this finding concerns preparation work.

[SystemIntroductionSystem](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/onboarding/SystemIntroductionSystem.js:53) obtains a full journal snapshot during each refresh. [RetentionProgressSystem](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/progression/RetentionProgressSystem.js:503) copies discovery arrays and builds additional state. Return a small progress projection or cache by revision. Keep combo decay/timing and progression rules unchanged.

[WorldVisualMaterialField.invalidateCell](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/scenic-world/WorldVisualMaterialField.js:239) rebuilds the visible solid mask. A synthetic all-solid 30×22 viewport produces 3,300 tile reads per invalidation; fifty individual calls produce 165,000 reads. This demonstrates amplification, not the measured cost of a real fifty-tile ability.

The runtime already has [applyTileUpdates](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/scenic-world/WorldVisualRuntime.js:367) for bulk changes, and [DigSystem](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/mining/DigSystem.js:132) has a cheaper path for non-destructive damage. Extend batching only where callers still emit repeated individual destruction updates, including multi-hit/miner effects. Do not rebuild masks for damage-only hits or rewrite the terrain renderer wholesale.

[SessionRecorder.takeBatch](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/telemetry/SessionRecorder.js:64) serializes and UTF-8 encodes the complete growing batch on each event. Synthetic medians were 0.07 ms at 16 events, 0.74 ms at 64, and 2.97 ms at 128. The configured flush interval is five seconds; this is a potential periodic hitch on slower devices, not proof of continuous lag. Local browser telemetry delivery was not used to reproduce production logging overhead.

Evidence: [hot-path measurements](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-audit-hotpaths.json) and [reproduction script](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-audit-hotpaths.mjs).

**5. Rendering, package size, audio, and saves**

The browser ran WebGL with a 1920×1080 backing canvas. The logical viewport is 1280×720, so High renders 2.25 times as many pixels as Balanced. Large-screen density scaling and Ultra can cost more. The local debug configuration can preserve the drawing buffer; production disables that setting. CPU render submission averaged approximately 2.0–2.6 ms in the first run. This is not GPU timer evidence or proof that weaker GPUs have headroom.

Offer quality settings with explicit backing-pixel limits and measure them on the target low-end device. Texture lifetime/residency fixes should precede reducing approved artwork quality. Bitmap masks, multiple backdrop layers, and independent video decoders deserve GPU/media profiling, but this audit did not measure per-pass GPU time.

The production builder's candidate asset inventory is 4.57 GiB, dominated by backgrounds (about 1.73 GiB), pallet exports (0.64 GiB), playlist files (0.46 GiB), and character assets (0.41 GiB). This is neither the cold-page download nor actual resident memory. The scanner follows static and literal dynamic imports and asset references, so review/fallback paths require an explicit allowlist audit. The 681 unresolved scanner strings are not 681 proven missing runtime files. All captured Boot physical paths exist.

Reachable JS totals 11.42 MiB raw / 2.52 MiB when files are independently gzipped. The module graph is not a browser network waterfall. No production package was built or published. The existing 10-billion-byte package cap does not enforce a useful startup or decoded-memory budget.

Audio is substantially demand-loaded already. The Boot mock captured the preloadAudio stage at 41 entries, plus one earlier audio entry. File inventory alone cannot establish decoded PCM use, simultaneous stream count, or playback cost. No unrelated tracks were removed. A real production logging/audio/media trace remains necessary to quantify those costs.

The core world uses typed arrays: 280×5,065 cells across nine bytes/cell is about 12.17 MiB before maps and ancillary structures. It is not the source of the 1.6–1.9 GiB texture footprint. Dug-history conversion to arrays occurs in save capture; no every-frame full dug-map scan was found in the audited paths. Save coordination is coalesced and gated by persistence policy. This isolated run intentionally disabled save writes, so large progressed-save capture, load, and storage timing remain unmeasured.

**Recommended implementation order and acceptance**

1. Fix private video texture ownership/lifetime. Verify video re-entry, surface/deep transitions, pause/resume, and repeated teardown. Require texture-count recovery after twenty cycles.
2. Reduce permanent Boot/UI/player allocations and give generated textures accurate ownership. Use the existing 640/704 MiB watermarks as the current target; if that requires an art/residency tradeoff, make it explicit rather than silently raising the budget.
3. Apply distance-first cave checks, event-driven cache discovery, and raw-value HUD checks. Verify unchanged behavior, then repeat CPU samples.
4. Batch visible destruction updates and profile first-use scenic sync/activation spikes. Preserve normal teleport preparation and damage-only behavior.
5. Tighten the release manifest and introduce separate budgets for first playable transfer, peak decoded textures, long-frame frequency, and steady CPU/GPU frame time.

Before claiming the reported lag fixed, repeat a natural mining run beyond 800m using a substantially progressed save and the user's target hardware. Include storm/clear comparisons, repeated surface returns, abilities, menu openings, sleep/save, and at least a 20-minute soak. This audit's short steady samples and synthetic placements do not substitute for that acceptance run.

**Validation and reproducibility**

Seven focused contracts passed: performance foundation, runtime feature residency, world background texture lifetime, world visual texture lifetime, deep teleport performance, save scheduling, and the new weather performance contract. Passing existing lifetime contracts did not detect the video ownership defect; add that lifecycle to regression coverage during the fix.

[Validation outputs](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-12-audit-checks.json) preserve the actual command results.

Start the local server with `python serve.py 8080`. Open:

- `/testing/2026-09-12-full-performance-entry.html?jkd_e2e=1&cinematics=0` for clear/storm samples.
- The same URL with `&auditTravel=1` for repeated depths and the 65-second return cooldown.
- `/testing/2026-09-12-audit-video-lifetime.html` for the isolated real-Phaser leak reproduction.

The game fixture starts a fresh temporary world, closes test overlays, enables feature visibility by disabling introduction gating, and places the player in small carved rooms. Saves are disabled by E2E mode. It pauses at completion. Per-system wrappers introduce some observer cost, and nested timings must not be added together. The initial six-condition capture predates the fixture's corrected built-in snapshot call; its direct frame/system/texture measurements remain valid. The travel capture includes the corrected built-in telemetry.

No natural long mining run, mobile/low-end device comparison, production network waterfall, full GPU trace, or save-writing benchmark was performed. The generic WebGL renderer string does not identify the physical GPU.

