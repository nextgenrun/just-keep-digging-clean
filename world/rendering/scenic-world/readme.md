# Scenic World Runtime

This is the authoritative non-tilemap visual runtime. `WorldModel` remains the hidden simulation grid for digging, HP, resources, collision, and saves, while this package renders continuous world-space art. The surface stage repeats the far scenic plate without scaling any card above its native source density and preserves its aspect ratio, preventing the former world-width stretch. The transparent surface-edge card is no longer part of normal preload or rendering because it duplicated the gameplay floor; `?surfaceEdge=1` restores it only for legacy visual comparison.

## Approved surface benchmark pack

Scenic mode now selects `town-benchmark-v1` by default through `worldVisualSurfacePacks.js`. `WorldVisualSurfacePackView` renders the accepted high-resolution town mockup as one world-anchored upper beauty crop, preserving its authored moonlit sky, mountain/forest separation, amber town lighting, and aspect ratio instead of reconstructing the benchmark from lower-quality overlays. Its scale derives from the player's shared 1.75 m midpoint physical-height reference: the plate's measured 75 px lintel-to-threshold opening becomes a 2.10 m opening, so the beauty spans roughly 23.05 world tiles with a bounded 20.3% enlargement. Source-dimension and density contracts fail loudly if the approved plate is replaced or enlarged beyond that allowance.

The crop's authored sky edge uses a local 0.75-tile alpha feather into the continuous far-sky stage. During high flight, the complete beauty lane then crossfades away before that edge reaches mid-frame. Together these remove the duplicate-sky fold without stretching, repeating, or camera-following the approved image; the town, door line, and terrain-masked ground remain fully opaque during normal play.

The same native-density far plate is repeated once more at the fixed v11 Sky
Island baseline. This second world-space band does not follow the camera and
cannot overlap the surface camera, but prevents both authored island platforms
and their eclipse gates from falling back to an empty clear-color backdrop.
Day/night and weather tinting remains shared with the surface far layer.

Approved floor Option A is a separate `town-square-slate-facade-v1.png` production layer, never the review screenshot itself. `WorldVisualTownFloorView` aligns its 2172x139 alpha strip to the enlarged beauty width, keeping essentially one source pixel per world pixel and only about 1.48 tiles of vertical coverage. It shares the authoritative solid-terrain mask, renders above the generic unbreakable-bedrock material, and stays below roots plus damage feedback. The original 14x10 high-resolution ground facade remains underneath, so dug cells still reveal air immediately and no presentation layer replaces tile type, HP, collision, resource identity, drops, or saves. Weather integration is additive and reversible: lightning drives restrained SCREEN duplicates of the beauty, floor, and ground, while wet weather applies a subtle cool SCREEN response to the floor and ground. Use `?surfacePack=current-v2` to disable the benchmark pack and restore the previous split scenic surface assembly for direct comparison; this selector changes rendering only.

The runtime owns the surface stage, camera-windowed material mask, generated semantic-asset layer, decorative landmark layer, diegetic damage/special-block feedback, and weather/day-night tint bridge. `WorldVisualSemanticAssetLayer` is the default presentation (`terrainSemantics=1`): it pools high-resolution raster insets for every resource type, maps `SKY_TILE` rarity to paired beauty/emissive star art, maps the seven reward blocks to physical generated beauty/emissive formations, and delegates `BEDROCK`, `CAVE_WALL`, and both authoritative town-floor types to `WorldVisualBedrockMaterialLayer`. The bedrock layer repeats one continuous offset-seamless material through a mask built only from authoritative unbreakable cells, making the Town Square foundation read as a distinct reinforced bedrock band. Its configured lighting lift and cool-blue tint keep the unbreakable boundary visibly distinct from nearby soil under day/night and weather tinting without adding a second gameplay layer. Resource, reward, and star images share the solid-world mask and receive the current terrain tint. Streaming caps, non-stone-first allocation, sparse stone geology, and deterministic frame selection keep this presentation bounded and stable while emissive passes pulse above darkness. Unchanged camera bounds now retint existing pools without rescanning the grid or rebuilding the bedrock mask.

These layers only read `WorldModel`; the grid still owns digging, tile HP and damage states, resource identity and rewards, collision, cave walls, and save data. Cell invalidation resynchronizes the raster view after gameplay changes instead of replacing the tile, while damage cracks remain independent in `WorldVisualFeedbackLayer`. Non-reward markers such as portals, chests, geodes, and glow crystals keep their existing gameplay cues. Use `?terrainSemantics=0` to restore procedural resource veins, the former faceted star cue, and legacy reward emblems for direct comparison; combine it with `?resourceVeins=0` to restore the older resource-emblem atlas. The landmark layer is anchored in world coordinates and only renders beauty/emissive cards; it cannot mutate the hidden gameplay grid. Scenic mode never creates a Phaser Tilemap, never exposes fallback square tiles, and keeps the compatibility methods used by mining and world systems.

`WorldVisualDamagePainter` turns normalized tile HP loss into nine persistent pre-break states. Four masked Graphics passes keep the treatment independent of the underlying art: low-alpha abrasion and fracture shadows use MULTIPLY, raised fracture rims use SCREEN, and microscopic resting flakes use a neutral top pass. The painter never reads tile type, material ID, or texture key, never erases terrain, and never paints a cell-shaped fill; new ground materials therefore inherit it automatically. `?groundDamage=legacy` restores the former radial crack comparison without changing HP or collision.

Boot only loads the surface pack. `WorldVisualAssetCache` streams the active
depth materials when a camera window intersects their bands and releases
non-surface textures after their last intersecting band leaves the window.
`WorldVisualMaterialBandView` owns one exactly cropped, world-anchored plane set
per intersecting band, so a view straddling a material boundary never reveals
the cavern through otherwise-solid cells. This keeps high-resolution regional
packs bounded instead of decoding the complete 5,000-tile-deep art library at
startup.

`WorldVisualDepthBackdropStage` covers all ten material bands from row 65
through row 5064. Each biome owns five background-only 1536x1024 logical cards;
the stage keeps only intersecting regions and their visible cards plus one
neighbor alive, streams their pool through `WorldVisualAssetCache`, and releases
departed textures. Boundary views may coexist, while partial last cards are
cropped exactly to the configured ground-band boundary. Negative render depths
place the backwall, its low-alpha SCREEN breathing pass, aspect-preserving mist,
and `WorldVisualDepthAmbientLayer` behind the opaque terrain facade at depth
`0.1`. Consequently, depicted bridges and architecture never become ground or
collision. The ambient layer draws deterministic pooled dust, drips, embers,
steam, ash, and stars into one Graphics object, reduces its update/count budget
below 44 FPS, and clears below 32 FPS. Generic material backdrops remain until
every required card for a selected region is ready.

Use `?biomeBackdropVariants=0` to restore the old Level 1 plates,
`?biomeBackdropMotion=0` to freeze mist/emissive/ambient movement, or
`?levelOneBackdrops=0` / `?shallowCavern=0` to disable the whole scenic stage.
All three controls are presentation-only and leave hidden tile state unchanged.

Use `?worldVisualRuntime=legacy` for the temporary rollback assembly. Legacy Tiled-derived visuals must not be mixed into scenic mode.

The mine-entrance landmark is the first scenic asset-pipeline pilot. It resolves against the deterministic shallowest standalone cave mouth after complete world generation, validates that the mouth is air with a solid row beneath it, and anchors its measured alpha-crop bottom exactly to that floor. The beauty card sits above scenic terrain but below resource/damage feedback and never mutates the cave mouth, collision, or tile state. It responds to day/night, rain, and lightning and can be removed independently with `?mineEntrancePilot=0`.

`TitanDiscoverySystem` adds a visual collection layer between the streamed cave
backwall and authoritative terrain. Each of its 25 deterministic windows records
only cells that were originally diggable; solid scenic terrain hides the titan
sprite, dug air reveals it, and clearing the final tracked cell plays a localized
glow, dust, crossing, and collection-echo flourish. Saved discovery ids only
control visual restoration and a procession of miniature surface echoes. The
system never changes tile type, HP, collision, rewards, player stats, or world
generation, and `?titans=0` removes it independently.
