# Scenic World Runtime

This is the authoritative non-tilemap visual runtime. `WorldModel` remains the hidden simulation grid for digging, HP, resources, collision, and saves, while this package renders continuous world-space art. The surface stage repeats the far scenic plate without scaling any card above its native source density and preserves its aspect ratio, preventing the former world-width stretch. The approved transparent surface-edge card now repeats across the complete Level 1 and Level 2 surface as a stable visual cap when top cells are dug; `?surfaceEdge=0` restores the former tile-only presentation.

## Approved surface benchmark pack

Scenic mode now selects `town-benchmark-v1` by default through `worldVisualSurfacePacks.js`. `WorldVisualSurfacePackView` renders the accepted high-resolution town mockup as one world-anchored upper beauty crop, preserving its authored moonlit sky, mountain/forest separation, amber town lighting, and aspect ratio instead of reconstructing the benchmark from lower-quality overlays. Its scale derives from the player's shared 1.75 m midpoint physical-height reference: the plate's measured 75 px lintel-to-threshold opening becomes a 2.10 m opening, so the beauty spans roughly 23.05 world tiles with a bounded 20.3% enlargement. Source-dimension and density contracts fail loudly if the approved plate is replaced or enlarged beyond that allowance.

The crop's authored sky edge uses a local 0.75-tile alpha feather into the continuous far-sky stage. During high flight, the complete beauty lane then crossfades away before that edge reaches mid-frame. Together these remove the duplicate-sky fold without stretching, repeating, or camera-following the approved image; the town, door line, and terrain-masked ground remain fully opaque during normal play.

The same native-density far plate is repeated once more at the fixed v11 Sky
Island baseline. This second world-space band does not follow the camera and
cannot overlap the surface camera, but prevents both authored island platforms
and their eclipse gates from falling back to an empty clear-color backdrop.
Day/night and weather tinting remains shared with the surface far layer.

`WorldVisualSkyCohesionLayer` now streams a separate approved twenty-frame
library above that retained far base. Five horizontal world chapters and four
air bands provide twenty fixed world anchors. Each complete approved plate is
used exactly once at 0.88 source density, with no cover crop or enlargement,
and an irregular four-edge feather merges it into the continuous far stage.
Frame updates change tint and alpha but never reposition the cards around the
camera. The original far stage remains continuously visible beneath every
join and between authored cards. Use `?skyCohesion=0` to remove only this
additive layer.

Approved floor Option A is the separate `town-square-slate-strip-v3.png` production layer. Its first 1672x48 pixels are copied directly from the approved mockup floor band without resizing or repainting; only a 129 px mirrored alpha handoff is appended beyond that exact frame. `WorldVisualTownFloorView` aligns the resulting 1801x48 strip with the same uniform source scale as the enlarged beauty, keeping the cap near 0.61 tile tall so the first underground row remains visible. The matching `town-surface-edge-thin-v2.png` core repeats at that same physical scale across all 280 surface columns with mirrored overlapping joins. The Town Square strip shares the authoritative solid-terrain mask, renders above overlapping terrain semantics, and stays below damage feedback; the repeating cap remains visual-only so open shafts still use the separate S/down release rule. `WorldVisualTownFloorOcclusion` demotes only emissive sprites overlapping the thin surface rectangle, so first-row stars and reward glows are no longer hidden by a deep masonry facade. The original 14x10 high-resolution underground facade remains unchanged underneath, so dug cells still reveal air immediately and no presentation layer replaces tile type, HP, collision, resource identity, drops, or saves. Weather integration is additive and reversible: lightning drives restrained SCREEN duplicates of the beauty, floor, and ground, while wet weather applies a subtle cool SCREEN response to the floor and ground. Use `?surfacePack=current-v2` to disable the benchmark pack and `?surfaceEdge=0` to disable the full-width cap; both selectors change rendering only.

The runtime owns the surface stage, camera-windowed material mask, generated semantic-asset layer, decorative landmark layer, diegetic damage/special-block feedback, and weather/day-night tint bridge. `WorldVisualSemanticAssetLayer` is the default presentation (`terrainSemantics=1`): it pools six transparent, strict-orthographic, ground-embedded ImageGen variants for every resource type, maps `SKY_TILE` rarity to paired beauty/emissive star art, maps the reward blocks and five GP values to complete single-layer ImageGen formations, and delegates only `BEDROCK`, `CAVE_WALL`, and `GEODE_WALL` unbreakable cells to `WorldVisualBedrockMaterialLayer`. `FLOOR_TOWN_1` and `FLOOR_TOWN_2` remain gameplay-unbreakable but are explicitly excluded from that visual mask, so the exact Town Square slate strip is the sole surface material across both level widths. The bedrock layer keeps the existing megalith painting as a restrained accent over the existing seamless shale raster, reducing panel-like repeats while preserving the authoritative bedrock silhouette, visibility lift, and cool-blue identity. Resource, reward, and star images share the solid-world mask and receive the current terrain tint. Every resource in the active streamed camera window remains resident across snapped-window movement and reduced-FPS transitions; only explicit fallback profiles may apply the older resource cap. Non-resource streaming caps, deterministic frame selection, and FPS recovery hysteresis keep this presentation bounded and stable while only the approved star emissive pass pulses above darkness. Unchanged camera bounds now retint existing pools without rescanning the grid or rebuilding the bedrock mask.

These layers only read `WorldModel`; the grid still owns digging, tile HP and damage states, resource identity and rewards, collision, cave walls, and save data. Cell invalidation resynchronizes the raster view after gameplay changes instead of replacing the tile, while damage cracks remain independent in `WorldVisualFeedbackLayer`. Non-reward markers such as portals, chests, geodes, and glow crystals keep their existing gameplay cues. Use `?terrainSemantics=0` to compare the former star and reward presentation while keeping the approved 2D resource atlas; only an explicit `?resourceVeins=1` request enables the rejected procedural vein comparison. The landmark layer is anchored in world coordinates and only renders beauty/emissive cards; it cannot mutate the hidden gameplay grid. Scenic mode never creates a Phaser Tilemap, never exposes fallback square tiles, and keeps the compatibility methods used by mining and world systems.

`WorldVisualDamagePainter` turns normalized tile HP loss into twelve persistent pre-break states. Four masked Graphics passes keep the treatment independent of the underlying art: cumulative abrasion and stress marks plus fracture shadows use MULTIPLY, restrained two-sided fracture edges use SCREEN, and microscopic resting flakes use a neutral top pass. `drawWorldVisualDamageSurfaceWear`, `drawWorldVisualDamageChips`, and `worldVisualDamageMath` keep those concerns separate and deterministic. The painter never reads tile type, material ID, or texture key, never erases terrain, and never paints a cell-shaped fill; new ground materials and very high-HP blocks therefore inherit the same proportional progression automatically. `?groundDamage=legacy` restores the former radial crack comparison without changing HP or collision.

Boot only loads the surface pack. `WorldVisualAssetCache` streams the active
depth materials when a camera window intersects their bands and releases
non-surface textures after their last intersecting band leaves the window.
Each cache starts at most one missing file per loader batch, so a new depth
region cannot ask the browser to decode its complete image/video set in one
frame. `?scenicAssetScheduler=0` restores the former eager queue behavior.
`WorldVisualMaterialBandView` owns one exactly cropped, world-anchored plane set
per intersecting band, so a view straddling a material boundary never reveals
the cavern through otherwise-solid cells. This keeps high-resolution regional
packs bounded instead of decoding the complete 5,000-tile-deep art library at
startup.

`WorldVisualRuntime` still refreshes terrain and semantic lighting at the
configured 20 Hz cadence, but it no longer rebuilds stable material masks,
resource pools, damage decals, and gameplay-effect target lists when the
snapped camera window and reduced-rendering state are unchanged.
`WorldVisualPerformanceTracker` publishes sync/skipped-sync timings and streamed
asset counts through the runtime health telemetry. Use
`?scenicStreamScheduler=0` to restore the former periodic full-sync cadence.

`WorldVisualDepthBackdropStage` covers all ten material bands from row 65
through row 5064. Each biome owns five previously approved background-only
1536x1024 WebPs, five additive V3 ImageGen cards, one static WebP of its named
motion-concept painting, and one approved 1536x1024, eight-second, 60 fps H.264
V3 loop. V5 adds another fifty gap-targeted ImageGen cards across the same
bands, taking the default pool from 120 to 170 cards. Existing cards are
interleaved with the additions; no approved file or layout contract is
replaced. `?biomeBackdropExpansionV5=0` removes only those fifty V5 cards.
The stage keeps only intersecting regions and their visible cards plus one
neighbor alive, streams their mixed media pool through `WorldVisualAssetCache`, and
releases departed media. Boundary views may coexist, while partial last cards
are cropped exactly to the configured ground-band boundary. Cards keep their
native 1536x1024 density, overlap at a 1344x896 stride, and crossfade through
the shared 16-state RGBA edge-mask atlas. No card is mirrored, eliminating the
former fold lines without altering an approved painting. At each depth-band
handoff the next raster composition begins 128 px early and enters through the
same irregular top-feather mask, so biome changes never meet on a straight
horizontal cut. Phaser crop offsets for both the mask-atlas frame and the
cropped art cannot shift the feather: each of the 16 atlas cells is registered
as a real Phaser texture frame and scaled from its own 384x256 bounds. Every
mask therefore stays aligned to its complete world card instead of exposing
clear strips or shifted translucent rectangles.

The rejected V2 optical-flow WebMs are not registered, loaded, or played. Their
source paintings remain review evidence, but the warped/choppy files cannot
enter a production biome pool. The previous Graphics-based signature,
duplicate-emissive, and drifting-mist paths are likewise absent. Each V3 loop
uses a seamless subpixel affine transform of the complete finished painting:
no optical flow, morphing, generated in-between art, or object overlay. Video
automatically pauses below the configured FPS floor and resumes after recovery.

All backdrop layers remain at negative render depth behind the opaque terrain
facade at depth `0.1`. Consequently, depicted bridges, roots, buildings and
architecture never become ground or collision. Generic material backdrops
remain only when no scenic plate is renderable. The first approved roots plate
is preloaded as a full-card fallback, so the safety row and every underground
region show scenic art immediately; each card replaces that fallback with its
requested biome asset as streaming completes.

`WorldVisualTerrainVariationLayer` retains five V4 alpha-feathered material
plates per biome, adds forty V5 plates where the visual gaps were largest, and
streams one approved foreground-cohesion painting per biome through its
dedicated world-anchored image view at depth `0.16`. The second V5 cap atlas
doubles exposed-top variety from 200 to 400 painted cuts.
Every next-biome plate begins 128 px inside the preceding biome, using its
authored irregular alpha feather instead of a straight transition line. All
plates and caps share the native crop/overlap path and authoritative terrain
mask; digging only invalidates the visible cap set and never changes gameplay
terrain. The cohesion paintings are also clipped by the same terrain mask and
never become a screen-space overlay. `?undergroundTerrainExpansionV5=0` removes
only the forty V5 plates and second cap atlases;
`?undergroundForegroundCohesion=0` removes only the ten cohesion paintings.

`WorldVisualSurfaceStage` retains the complete Town Square slate core and adds
ten non-mirrored V5 surface-ground paintings on a 192 px overlap. Their authored
alpha and the production terrain mask keep them ground-only; the underlying
surface remains present through every join. Use `?surfaceGroundVariation=0` to
remove only this additive surface pool. The repeated far landscape now uses a
256 px overlap and the same registered raster edge-mask frames, so its full
paintings feather together instead of meeting at a visible vertical fold.

`WorldVisualGroundStructureLayer` is a separate additive presentation layer.
It streams five irregular transparent 1536x1024 structure plates per biome,
masks every pixel to the authoritative solid-terrain geometry, and renders at
depth `0.16`: above continuous material but below terrain edges, roots,
resources, rewards, damage, effects, and emissive feedback. These are
ImageGen-authored physical terrain structures, not Phaser Graphics, particles,
HTML, collision shapes, or world-generation input. Dug air removes them through
the shared mask immediately. Production uses feathered V4 derivatives on the
same 1344x896 overlap stride with mirroring removed; all V3 assets remain
available through `?groundStructureBlend=0`.

`WorldVisualDepthCameraMotion` changes only the position of the complete media
cards. It applies one shared seam-safe offset to every active card, so every
finished plate remains one coherent composition. Amber, Slagworks and Pressure Foundry stay
world-anchored to feel massive. Other bands receive a small inertial lag, rising
from four pixels in Weathered Roots to ten pixels in Starfire. The offset
settles back smoothly and resets on camera teleports. It never uses a DOM
element, Canvas drawing, Phaser Graphics, tweened primitive or per-object
overlay.

Use `?biomeBackdropVariants=0` to restore the old Level 1 plates,
`?biomeBackdropExpansion=0` to remove only the fifty new full-background cards,
`?biomeBackdropMotion=0` to freeze V3 playback and disable complete-card camera
response, `?undergroundGroundStructures=0` to remove only the fifty masked
terrain structures, or
`?levelOneBackdrops=0` / `?shallowCavern=0` to disable the whole scenic stage.
All three controls are presentation-only and leave hidden tile state unchanged.

Use `?worldVisualRuntime=legacy` for the temporary rollback assembly. Legacy Tiled-derived visuals must not be mixed into scenic mode.

The mine-entrance landmark is the first scenic asset-pipeline pilot. It resolves against the deterministic shallowest standalone cave mouth after complete world generation, validates that the mouth is air with a solid row beneath it, and anchors its measured alpha-crop bottom exactly to that floor. The beauty card sits above scenic terrain but below resource/damage feedback and never mutates the cave mouth, collision, or tile state. It responds to day/night, rain, and lightning and can be removed independently with `?mineEntrancePilot=0`.

`TitanDiscoverySystem` adds a visual collection layer between the streamed cave
backwall and authoritative terrain. Each of its 25 deterministic 15-22 by 8-13
tile windows records only cells that were originally diggable. The dedicated
`TitanChamberStream` loads at most two nearby 1536x848 authored cards, uses
transparent organic borders plus the same live depth tint as the neighboring
biome backdrop, swaps them over the compact fallback, and removes stream-owned
texture memory outside the release range. Solid scenic terrain hides the card, dug air reveals it, and
clearing the final tracked cell plays the localized glow, dust, crossing, and
collection-echo flourish. A discovered ESC entry can pin one card for its large
vignette. Saved ids only control visual restoration, the 5x5 archive, and which
compact surface basalt dais shows its independently generated stance. Both
renderer modes expose the same unlocked-only plinth-inspection distance/update
surface, with remapped interaction copy and `?titanStatueLore=0` rollback. The system never changes tile type,
HP, collision, rewards, player stats, or world generation.
`?titanChamberBlend=0` restores opaque cards; `?titanChambers=0` restores
compact art; `?titans=0` removes the complete layer.

`WorldVisualSurfacePropLayer` streams the approved Variant C prop language
across Level 2. Every object is an independent alpha image, starts from
real-world meters and the 1.75 m player, then uses one of three bounded authored
size variants plus restrained rear/mid/front perspective. It bottom-anchors
only after left/center/right support samples agree on the actual world surface.
Unsupported or uneven placements are reported and skipped instead of being
floated or forced.

Level 1 intentionally has no modular prop anchors: the enlarged 25-position
Titan Walk occupies the town-to-tunnel corridor and must remain free of props
and visual blockers. Its calculated clear zone includes the largest
identity-specific creature width, compact footing, and two tiles of padding.
The 34 Level 2 placements combine
the retained original prop kit with seven additive chapter anchors. Their full
rendered footprints form irregular clusters and breathing gaps while avoiding
the tunnel door, bridge, portals, Arc Core, merchants, and interaction lanes.
The Heavenblocks flight lane additionally rejects any intersecting prop above
its authored rendered-height cap.
Camera-window culling removes offscreen sprites and clears the layer
underground. Use `?surfaceProps=0` for full rollback, or
`?surfacePropsL1=0` / `?surfacePropsL2=0` to isolate one surface.

`WorldVisualSurfaceAtmosphereLayer` streams six low-alpha accents beside those
chapters from the existing `atmosphere-screen.webp` ImageGen atlas. It uses
SCREEN blending and lighting/weather response only; it creates no procedural
fallback art and changes no background, sky, moon, terrain, collision, or
save data. Use `?surfaceAtmosphere=0` to remove only this layer.

## Performance and residency

The scenic runtime demands only the backdrop, terrain-variation, and
ground-structure cards intersecting the expanded visible tile window. A typical
18 by 12 tile camera window asks for four to six depth cards instead of queuing
the complete twelve-card biome library. Crossing a boundary can retain a card
that is already visible, but queued cards that have not begun decoding are
cancelled as soon as they become obsolete. `?scenicDemandStreaming=0` restores
the former eager full-region residency for comparison.

Continuous layers keep the exact authored density, tint, alpha, position,
scale, animation, and blend math. Their Phaser state setters now no-op only
when the requested value already equals the live Game Object value. The
twenty-card sky field streams only native-density cards intersecting the
expanded world window and keeps their world coordinates immutable. A scenic
sync no longer repeats the continuous update already completed earlier in the
same frame.
