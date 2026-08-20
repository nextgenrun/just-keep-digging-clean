# Rendering

World layer module — rendering.

- `scenic-world/WorldVisualRuntime.js` is the default authoritative visible-world renderer. It renders continuous world-space materials and separately layered production plates while the hidden `WorldModel` grid retains gameplay precision. Stable camera windows keep their 20 Hz tint refresh but skip full mask/decal/effect rescans. `WorldVisualAssetCache.js` cancels obsolete not-yet-started loads, while all seven scenic caches demand only assets intersecting the visible window. Exact-state guards suppress redundant Phaser setters without changing any visual value. `WorldVisualPerformanceTracker.js` exposes sync, demand, cancellation, and all scenic cache counters to runtime health. Use `?scenicStreamScheduler=0`, `?scenicAssetScheduler=0`, and `?scenicDemandStreaming=0` for narrow performance rollbacks, or `?worldVisualRuntime=legacy` for the temporary all-or-nothing renderer rollback. Scenic mode never constructs the tilemap/background/facade stack.
- `RuntimeAssetLoadCoordinator.js` is PlayScene's shared full-quality demand-load lane. It priority-orders the seven scenic caches plus Titan chambers and Heavenblocks, deduplicates keys, keeps at most three network/bitmap decodes active, prioritizes the complete modern scenic stack above optional FX, and serializes original-resolution Phaser activation after rendered-frame and idle windows. Unsupported image decode and video use the bounded Phaser-loader fallback. `RuntimeAssetActivationScheduler.js` owns loader/render/idle sequencing, and `RuntimeAssetLoadMetrics.js` publishes queue, cancellation, fallback, decode, and GPU-activation timing. Use `?runtimeAssetBitmap=0` for the serialized Phaser decode fallback or `?runtimeAssetQueue=0` for the previous direct-loading rollback; neither selector enables Tiled or the legacy world renderer.
- `RuntimeAssetCatalog.js` is the canonical texture ownership manifest. Each
  queued or adopted source records its owner, capability, original dimensions,
  priority, residency class, pack, and consumers. Production's immutable demo
  profile rejects Level Two, Arc Core, Heavenblocks, and screen-capture owners
  before they can enter a loader; local full-review retains those exact sources.
- `RuntimeFeatureAssetManager.js` composes atomic Star Block FX, Starlight,
  Titan Archive, World Map, and Campfire groups on that same lane. It retains
  explicit consumers, cancels abandoned groups, removes only textures it owns,
  delays closed-view release to prevent tab thrash, and trims unused feature
  groups in least-recently-used order against `RuntimeTextureMemoryTracker.js`
  decoded-memory estimates. Optional packs wait above 704 MiB and time out
  without committing their action; eviction continues toward 640 MiB. Boot and
  WorldLoad sources are adopted into the same tracker, so the health snapshot
  reports unclassified texture sources instead of hiding them as Boot debt.
  `getGroupProgress()` derives loaded/total/pending/progress from actual texture
  residency, and those same fields reach the manager health snapshot; feature
  UIs never invent timer-based progress.

- `WorldBackgroundMasterSystem.js` streams the reversible v11 composition-master bands near the camera; its ordered crop union reaches the final Level 1 row at `y=2064`. `WorldBackgroundVisibilityIndex.js` caches crop/object geometry and uses `WorldBackgroundSpatialIndex.js` to query only nearby vertical bands. `WorldBackgroundTextureStream.js` loads at most one missing large texture per batch and releases distant owned textures. Use `?worldStreamScheduler=0` for the exact legacy scan/batch cadence.
- `WorldVisualDepthBackdropStage.js` applies Phaser `Light2D` only to the
  shallow `surface-entry` backdrop cards that have derived normal maps. Its
  cool fill and compact warm player light follow the live player while the
  existing darkness/reveal system remains authoritative. The owned diffuse
  art, camera composition, masks, gameplay tiles, HUD, and deeper biomes are
  unchanged; `?shallowMaterialLighting=0` is the narrow rollback.
- `WorldRenderer.js` keeps the full 5,065-row model authoritative but streams a 256-row Phaser tilemap window around the player, avoiding eager multi-million-tile layer allocation. `WorldRenderWindowScheduler.js` plans early bounded shifts and `WorldRenderWindowBuffer.js` paints 24 rows per frame into hidden world/root layers before an atomic swap; teleports retain an immediate safe path. Use `?tileStreamStaging=0` for the synchronous legacy repaint. The renderer implements the same Titan create/update/invalidate/refresh/snapshot/destroy and unlocked-plinth inspection surface as scenic mode, so `?worldVisualRuntime=legacy` never disables discovery, persistence, the archive, Titan Walk, or statue lore.
- `WorldBackgroundAmbientMotionSystem.js` redraws one pooled Graphics layer for subtle v11 town lights, smoke, shallow L1 crystal/drip motion, and shallow L2 ember/steam motion. It stays behind terrain, requires the master background, and supports `?worldMotion=0` rollback.
- `LevelOneLivingBackdropSystem.js` retains its compatibility name but now carries the complete active authored Level 1 + Level 2 backdrop. Four fixed 8/10/8/9-sprite pools reuse the approved atmosphere atlas across `x0..279 / y65..2064`; soft 7–18 second motion, camera culling, FPS gates, and surface-to-depth weather fading keep it alive without camera-following art. `?worldLiving=0` rolls back this pass, `?level1Living=0` remains an alias, and `?worldMotion=0` rolls back all background motion.
- `DeepWorldLivingBackdropSystem.js` continues that standard through the separately generated Level Two runtime at `x132..279 / y2065..5064`. Its fixed ember/steam/ash/magma-aura pools inherit `WORLD_SCENIC_FACADE` material bands, stay world-anchored, attenuate surface weather and wind underground, and degrade by FPS. It requires the depth master plus world facade; `?deepWorldLiving=0` is its narrow rollback and `?worldMotion=0` remains the shared rollback.
- `StartZoneScenicBackgroundSystem.js` crops the approved plate at its authored ground line and fixes the town/sky art to a real world-space surface anchor instead of following the camera.
- `StartZoneGroundFacadeSystem.js` projects one continuous 13 by 8 earth cross-section over every solid town cell while reading the authoritative `WorldModel`. Square base tiles stay hidden; dug air removes only its matching crop, damage cracks remain live, and compact resource/special markers preserve recognition. Both town systems roll back with `?townScenic=0`.
- `LevelOneGroundFacadeSystem.js` camera-streams the mockup-aligned 280 by 10 facade over `x0..279 / ty65..74`: only the current horizontal chunk plus one neighbor on each side is resident, and all surface chunks unload underground. Distant chunk textures are removed instead of retaining 2,800 Images. `LevelOneGroundFacadeChunkView.js` owns the active cells, opaque damage treatment, exact dug boundaries, and stone/resource/special recognition. Missing required atlas frames throw instead of substituting placeholder art. `?level1Facade=0` restores the former 13 by 8 town facade.
- `WorldScenicFacadeSystem.js` continues the same opaque-solid contract from row 75 through row 5064 without allocating a sprite per world tile. `WorldScenicFacadeBandView.js` camera-streams only the world-grid-aligned 2508px image repeats that intersect the view; the shared source texture replaces Phaser `TileSprite` canvases that would otherwise allocate several gigabytes for a full depth band. A camera-local `WorldModel` geometry mask keeps digging exact, while visible recognition/crack images preserve gameplay state. Damage never fades to legacy square art, materials unload outside the depth margin, and `?worldFacade=0` is the narrow rollback.
- Resource recognition in the semantic, Level One, and deep-facade paths uses
  the same transparent ImageGen 2D frame order. Phaser places raster images
  over continuous geology; it does not draw resource veins or baked ground
  squares. The procedural comparison is disabled unless `?resourceVeins=1`.
- Star recognition in the semantic renderer uses the exact one-of-fifty
  identity atlas frame stored by `WorldModel`. That same frame reaches the
  darkness light, mined release, popup, and I-key guide. The previous six
  rarity assets remain missing-frame fallbacks only; Phaser never recolours a
  generic Star with tint.
- `WorldDepthContinuationBuilder.js` extends the approved high-detail Level Two depth plates from row 2065 through row 5064 over the playable `x132..279` deep-world span. It reuses the authored source plates with exact edge crops and facade-band color grading; `WorldBackgroundMasterSystem` still camera-streams only nearby images, and `?worldDepthMaster=0` rolls the continuation back with the rest of the depth master.
