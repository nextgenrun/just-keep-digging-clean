# Scenic World Runtime

This is the authoritative non-tilemap visual runtime. `WorldModel` remains the hidden simulation grid for digging, HP, resources, collision, and saves, while this package renders continuous world-space art. The surface stage repeats the far scenic plate without scaling any card above its native source density and preserves its aspect ratio, preventing the former world-width stretch. The approved transparent surface-edge card now repeats across the complete Level 1 and Level 2 surface as a stable visual cap when top cells are dug; `?surfaceEdge=0` restores the former tile-only presentation.

## Approved surface benchmark pack

Scenic mode selects `town-benchmark-v1` by default through
`worldVisualSurfacePacks.js`. `WorldVisualSurfacePackView` renders the accepted
1801x941 town mockup as a world-anchored upper beauty crop. The shared 1.75 m
player reference still records the requested 2.10 m door target, but source
quality now wins: the renderer caps world pixels per source pixel at `1`, so
the plate spans about 19.16 tiles and its 75 px door remains 75 world pixels
instead of being enlarged to 90.24. Source-dimension and density contracts fail
if the approved plate changes or any town layer drops below one source pixel
per world pixel.

The crop's authored sky edge uses a local 0.75-tile alpha feather into the continuous far-sky stage. During high flight, the complete beauty lane now stays opaque through the upper 42% of the viewport, then crossfades across half a viewport before clearing near the lower screen edge. Together these remove the duplicate-sky fold and the former abrupt image swap without stretching, repeating, or camera-following the approved image; the town, door line, and terrain-masked ground remain fully opaque during normal play.

`WorldVisualSurfaceMotionView` now overlays that upper beauty with one selected
18-second Seedance Mini loop in real gameplay. `town-air` is the default;
`?surfaceMotion=1`, `2`, or `3` selects `soft-canopy`, `town-air`, or
`layered-night`, and `?surfaceMotion=0` restores the static plate. The video is
forward-only, camera-locked, silent, and masked through the same top reveal plus
the 129 px right-side world handoff. It never includes or covers the separate
slate floor or earth. The static beauty stays underneath until decode succeeds
and automatically remains visible on cache, codec, playback, or size failure.

Three V2 review selectors run through the same single-video view:
`?surfaceMotion=natural`, `?surfaceMotion=depth`, and
`?surfaceMotion=stars`. Their final H.264 files pre-compose four feathered
canopy zones with different monotonic time curves, strongly anchor the lower
town/trunks, and add only stationary independently timed star pulses. They do
not create extra runtime video decoders or gain floor/gameplay ownership.

The same native-density far plate is repeated once more at the fixed v11 Sky
Island baseline. This second world-space band does not follow the camera and
cannot overlap the surface camera, but prevents both authored island platforms
and their eclipse gates from falling back to an empty clear-color backdrop.
Day/night and weather tinting remains shared with the surface far layer.

`WorldVisualSkyCohesionLayer` keeps three responsibilities ordered. First, an
immediate cobalt rectangle owns every upper-world pixel before loading can
begin. Second, one retained horizontally seamless atmosphere texture replaces
that fallback at depth `-10.2`. Both stay behind the original
`moonlit-mountain-forest-v1.png` plate at depth `-10`, so its baked trees and
mountains remain the stable surface and Titan-promenade background. Third, the
twenty approved sky paintings render as sparse feature cards at depth `-9.6`.

`values/worldVisualSkyTransitionOrder.js` defines fourteen west-to-east story
slots, four altitude bands, and the complete measured horizontal/vertical
compatibility matrix. Each 1672x941 painting uses only its clean 1254x705 safe
frame at native density. Every feature fades on all four edges into the common
foundation; direct pairs may remain assertive while haze/foundation pairs never
have to form an opaque hard join. Lower-band alpha is restrained so the older
tree-bearing surface plate remains visible around the Titan statues. Cards may
arrive independently because neither their absence nor a failed request owns a
black matte. Lighting retints stable world positions without changing asset
order. Use `?skyComposition=grid` for the prior dense normalized-ADD comparison
or `?skyCohesion=0` to remove the complete feature/foundation addition.

Approved floor Option A is the separate `town-square-slate-strip-v3.png`
production layer. Its 1801x48 pixels remain at exact 1:1 density: the first
1672 pixels are the approved mockup crop and the final 129 pixels are its alpha
handoff. `WorldVisualTownFloorView` therefore keeps the cap at 48 world pixels
(about 0.51 tile) instead of enlarging it. The matching 1672x48 repeating
surface edge and the 1672x941 rollback town are likewise capped at native
source size. Both floor routes share the authoritative solid-terrain mask,
remain below damage feedback, and preserve open shafts, collision, tile HP,
resources, drops, and saves. Weather integration remains additive and
reversible. Use `?surfacePack=current-v2` or `?surfaceEdge=0` for the existing
presentation-only rollbacks.

The runtime owns the surface stage, camera-windowed material mask, generated semantic-asset layer, decorative landmark layer, diegetic damage/special-block feedback, and weather/day-night tint bridge. `WorldVisualSemanticAssetLayer` is the default presentation (`terrainSemantics=1`): it pools six transparent, strict-orthographic, ground-embedded ImageGen variants for every resource type, maps `SKY_TILE` rarity to paired beauty/emissive star art, maps the reward blocks and five GP values to complete single-layer ImageGen formations, and delegates only `BEDROCK`, `CAVE_WALL`, and `GEODE_WALL` unbreakable cells to `WorldVisualBedrockMaterialLayer`. `FLOOR_TOWN_1` and `FLOOR_TOWN_2` remain gameplay-unbreakable but are explicitly excluded from that visual mask, so the exact Town Square slate strip is the sole surface material across both level widths. The bedrock layer keeps the existing megalith painting as a restrained accent over the existing seamless shale raster, reducing panel-like repeats while preserving the authoritative bedrock silhouette, visibility lift, and cool-blue identity. Resource, reward, and star images share the solid-world mask and receive the current terrain tint. Every resource in the active streamed camera window remains resident across snapped-window movement and reduced-FPS transitions; only explicit fallback profiles may apply the older resource cap. Non-resource streaming caps, deterministic frame selection, and FPS recovery hysteresis keep this presentation bounded and stable while only the approved star emissive pass pulses above darkness. Unchanged camera bounds now retint existing pools without rescanning the grid or rebuilding the bedrock mask.

These layers only read `WorldModel`; the grid still owns digging, tile HP and damage states, resource identity and rewards, collision, cave walls, and save data. Cell invalidation resynchronizes the raster view after gameplay changes instead of replacing the tile, while damage cracks remain independent in `WorldVisualFeedbackLayer`. Non-reward markers such as portals, chests, geodes, and glow crystals keep their existing gameplay cues. Use `?terrainSemantics=0` to compare the former star and reward presentation while keeping the approved 2D resource atlas; only an explicit `?resourceVeins=1` request enables the rejected procedural vein comparison. The landmark layer is anchored in world coordinates and only renders beauty/emissive cards; it cannot mutate the hidden gameplay grid. Scenic mode never creates a Phaser Tilemap, never exposes fallback square tiles, and keeps the compatibility methods used by mining and world systems.

`WorldVisualDamageImagePainter` turns normalized tile HP loss into twelve persistent pre-break states using polished universal V2 by default. One of ten coordinate-stable authored motifs is selected once per tile and progresses through twelve cumulative raster states. The default path draws one NORMAL image, ignores tile/resource identity, remains centered on the invariant 94 px gameplay tile, and stays clipped by the solid-world mask. It creates no material tint, rim, or resource-response layer and preloads no response atlas. The rejected V3-V6 packages remain available only through explicit local comparison queries. `?groundDamageAtlas=legacy` restores byte-intact ImageGen V1, `?groundDamage=legacy` restores the radial Graphics renderer, and the modular damage painter remains available through `?groundDamage=modular`.

Boot loads the static surface pack plus only the selected living-background
video. `WorldVisualAssetCache` streams active
materials, backdrops, terrain, structures, sky cohesion, underground details,
and enhancers when the camera demands them, then releases owned non-surface
textures after their final consumer leaves. Their requests share the global
`RuntimeAssetLoadCoordinator`. Up to three network/bitmap decodes overlap, the
complete demanded modern scenery stack outranks optional FX, and GPU activation
remains serialized across post-render idle windows. Images retain their original
dimensions and pixels; video and unsupported browsers use the bounded Phaser
fallback. `?runtimeAssetBitmap=0` disables only bitmap decode,
`?runtimeAssetQueue=0` restores prior direct loading without enabling Tiled, and
`?scenicAssetScheduler=0` keeps the older cache-local rollback.
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
are cropped exactly to the configured ground-band boundary. Every 1536x1024
source keeps its native 1152x768 inner frame after the baked 192x128 edge
vignette is excluded. Cards overlap by 144x140 on a 1008x628 stride. Runtime
smoothstep masks give every real neighbor complementary weights, then ADD the
result over one opaque world-space matte; horizontal, vertical, four-card, and
cross-biome intersections therefore remain fully covered without overbright or
dark folds. At each depth-band handoff the next biome begins 140 px early.
Named `handoff` paintings are reserved for the final row of their authored
biome, so transition imagery appears at the depth it depicts. No card is
mirrored or stretched, and the retained V4/V5 mask atlases remain available
without replacing any approved painting.

Within each biome, `worldVisualAreaComposition.js` makes backdrop and terrain
cards read as broad 6x5-card areas and ground structures as broader 8x6-card
areas. Each area draws only a small adjacent authored motif, so arches, ceilings,
strata, and mountain-like silhouettes remain related instead of changing every
card. Successive depth areas advance through the complete approved library.
`?naturalDepthAreas=0` restores the exact former one-step-per-card sequence;
neither path constructs or loads the legacy Tiled world.

Level 1 X0-131 and rows 65-2064 additionally share `levelOneBiomeField.js`: a
deterministic 2D field of fifty named 0-2000 m territories whose one hundred
warped sites respond to both world X and depth. Measured vertical travel has an
83 m median and 130 m maximum interior run. Backdrops, terrain plates/caps,
ground structures, and both underground-detail families retain five parent
material pools for stable joins. `levelOneBiomeVisualFamilies.js` partitions
those pools into fifty source families and gives every family independent
background, signature, ground, and foreground routing.

`levelOneBiomeDepthVariants.js` deterministically substitutes fifty scenic
alternatives, all 120 crops from thirty identity atlases, and twelve rare
landmarks inside the existing 400 generated-role placements. Fifteen selected
backgrounds are deliberate hard swaps with blunt fantasy palettes while their
edges and geology remain compatible with the parent material. The boundary
view routes three cutouts for each of seven material joins across the unchanged
481 placements; nineteen variants appear in the current field, with the two
remaining alternatives belonging to a join that occurs only once. Everything
is terrain-masked and demand-streamed. The M map uses the identical profile IDs
and distinctive colors. No layer changes tiles, collision, rewards, density,
or saves. `?levelOneBiomeField=0` restores horizontal source selection;
`?levelOneSourceFamilies=0` restores the five shared pools and removes the
generated family-role presentation. Level 2 is untouched.

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

The default V6 seam route is additive over those same ninety plates. It keeps
the previous card covered through its right/bottom edges and feathers only the
incoming card's left/top edge at a `1152x768` stride. Tiny deterministic
region/row/column depth offsets make the incoming card's ownership independent
of streaming order, eliminating the former double-fade fold valleys.
`?undergroundSeamBlend=0` restores the untouched V4/V5 assets and former
`1344x896` geometry.

`WorldVisualUndergroundDetailLayer` adds 200 foreground material textures and
200 decorative overlay props from twenty streamed biome atlases. Every named
320x256 frame now preserves its aspect ratio and renders at or below native
size. Foreground textures vary from 0.82-1.0 source scale, localized props from
0.50-0.82, and the fifty guaranteed multi-tile identities from 0.86-1.0. All
400 frames remain active. Inside Level One, the four profiles of each parent
material receive disjoint five-frame texture and five-frame prop subsets, so
all twenty frames are used without repeating one profile's foreground kit in
another. The former 3x-5x enlargement ranges are not used.
The detail region view keeps placement deterministic and world-anchored, clips
everything with the existing solid-terrain mask, and draws below caps,
resources, damage, and emissive feedback. It never writes `WorldModel`.
`?undergroundDetailLibrary=0` disables the full addition, while
`?undergroundForegroundTextures=0` and `?undergroundOverlayProps=0` isolate the
two 200-frame families.

`WorldVisualSurfaceStage` retains the complete Town Square slate core and adds
ten non-mirrored 1536x160 V5 ground paintings at exact 1:1 source density.
Their 192 px overlap produces a 1344 px stride; authored alpha plus the terrain
mask keep every join ground-only and preserve the underlying surface. The
1672x48 edge, 1672x941 rollback town, and repeated far landscape are also
capped at native size. The far cards retain their 576 px feather rather than a
visible fold. Use `?surfaceGroundVariation=0` to remove only the additive pool.

`WorldVisualGroundStructureLayer` is a separate additive presentation layer.
It streams five irregular transparent 1536x1024 structure plates per biome,
masks every pixel to the authoritative solid-terrain geometry, and renders at
depth `0.16`: above continuous material but below terrain edges, roots,
resources, rewards, damage, effects, and emissive feedback. These are
ImageGen-authored physical terrain structures, not Phaser Graphics, particles,
HTML, collision shapes, or world-generation input. Dug air removes them through
the shared mask immediately. Production uses complementary V6 incoming-edge
derivatives on the same deterministic `1152x768` seam contract as terrain.
`?undergroundSeamBlend=0` restores the feathered V4 route; all V3 assets remain
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
Both the 1536x848 chamber cards and 768x768 stance sprites now share a maximum
source scale of `1`; a larger search window reveals more surrounding scenic
backdrop instead of magnifying either Titan texture.
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
across both surface levels. Every object is an independent alpha image, starts
from real-world meters and the 1.75 m player, then uses one of three bounded
authored size variants plus restrained rear/mid/front perspective. It
bottom-anchors only after left/center/right support samples agree on the actual
world surface. Unsupported or uneven placements are reported and skipped
instead of being floated or forced.

Level 1 now reuses twelve existing plants, lanterns, fences, benches, supplies,
and handcarts as a low Titan-promenade rhythm. They sit only in measured gaps
between the first nineteen compact plinths, use rear/mid depth, and stop before
the Level 1 portal. Twenty-five per-plinth clear zones replace the former one
corridor-wide exclusion, preserving every footing while leaving the tree-bearing
background and Titan silhouettes as the visual owners. No standalone tree prop
assets are used. The 34 Level 2 placements combine the retained original prop
kit with seven additive chapter anchors. Their full rendered footprints form
irregular clusters and breathing gaps while avoiding the tunnel door, bridge,
portals, Arc Core, merchants, and interaction lanes. The Heavenblocks flight
lane additionally rejects any intersecting prop above its authored rendered-height
cap.
Camera-window culling removes offscreen sprites and clears the layer
underground. Use `?surfaceProps=0` for full rollback, or
`?surfacePropsL1=0` / `?surfacePropsL2=0` to isolate one surface.

`WorldVisualSurfaceAtmosphereLayer` streams six low-alpha accents beside those
chapters from the existing `atmosphere-screen.webp` ImageGen atlas. It uses
SCREEN blending and lighting/weather response only; it creates no procedural
fallback art and changes no background, sky, moon, terrain, collision, or
save data. Use `?surfaceAtmosphere=0` to remove only this layer.

`WorldVisualSurfacePropExpansionLayer` owns the hand-authored 38-object
selection from the 140-asset V3 Level 2 palette. It composes two or three story
clusters around each retained chapter anchor, preserves explicit breathing
ranges, uses static authored size, and separates far/middle/near objects with
scale plus 74/92/100% atmospheric opacity. It streams by camera, grounds with
the retained three-sample contact rule, and validates protected/low-profile
zones. Level 1 remains empty so Town Square, all 25 Titan statues, the Level 1
portal, and the Heavenblock gates keep their approved silhouettes.
Use `?surfacePropsV3=0` for this layer or `?surfaceSkyPropsV3=0` for the complete
surface/sky V3 addition.

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
continuous sky field streams only native-density cards intersecting the
expanded world window plus one neighboring segment and keeps their world
coordinates immutable. Its 28x12 grid locks columns to the nearest authored
west-to-east chapter, locks rows to altitude families, applies per-source
atmospheric grades, and uses quarter-frame normalized overlaps so no unloaded
neighbor can expose the matte. A scenic sync no longer repeats the continuous
update already completed earlier in the same frame.

## Optional underground backdrop enhancers V7

`WorldVisualBackdropEnhancerLayer` demand-streams a separate 100-image,
1536x1024 alpha library over the retained backdrop cards and below terrain.
`worldVisualBackdropCardGrid.js` exposes the exact existing card stride,
overlap, region-span, and tail placement without changing the backdrop stage.
Selection is stable, may return no overlay, and filters the biome pool against
the requested backdrop motif before choosing an asset. Structural cards use
normal blending; sparse light/atmosphere cards use restrained additive
blending. Use `?undergroundBackdropEnhancers=0` to remove this layer only.

## Star Block OpenRouter idle V1

`WorldVisualSemanticStarPresenter` now adds one pooled, black-backed additive
motion image over each exact identity core. Three 24-frame neutral caustic loops
are selected by identity and phase-offset by tile. The 250 ImageGen core/light
pairs keep their original per-identity alpha pulse and bounded rotation while
the overlay remains position/size/alpha anchored and advances only authored
frames. `WorldVisualSemanticAssetLayer` owns atlas frame installation, pool
visibility, emissive depth handoff, and cleanup. The steady hard-darkness light
and rare beacon pulse remain untouched. Use `?starIdle=0` to omit only the
video-derived atlas while retaining ImageGen identity motion.


The layeredSky=1 candidate now uses newly generated sky, ridge, forest and true-alpha cloud sources. WorldVisualLayeredSkyReview owns the sky, WorldVisualLayeredLandscapeField grounds independent scenery planes, and WorldVisualLayeredCloudField streams four wind planes. Legacy far/sky/cloud painting owners are disabled in this view. Town motion retains its original file and owner. The current review and evidence live in testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/ and qa-regenerated/.

WorldVisualLayeredEnvironment samples the existing clock and weather to grade the regenerated sky, ridges, cloud cover, fog and signed wind. WorldVisualLayeredLandmarks adds three Level 2 cliff landmarks, seven shader-driven waterfall channels and localized spray. WorldVisualWaterfallPipeline animates water UVs only; compositeGeneratedMatte composites the explicit ImageGen matte into owned textures. All owned textures, sprites, frames and pipelines are released on scene shutdown. Configuration is in values/worldVisualLayeredSkyReview.js and values/levelTwoScenicMotion.js.

The 2026-09-06 natural-motion follow-up adds WorldVisualLayeredMotionPipeline
for atlas-bounded cloud turbulence and rooted foliage sway. It uses the same
integrated wind distance as cloud travel and renewed waterfall spray. Calm wind
retargets preserve prevailing direction. Tuning is in values/layeredAtmosphereMotion.js;
fresh fixed-camera evidence and the motion clip are in qa-natural-motion/.
See markdown/2026-09-06-natural-layer-motion.md for the runtime checks.

## Current Level 1 preview

WorldVisualLandscapeSections creates native-density, opacity-preserving joins
between neighbouring source paintings. WorldVisualLayeredLandscapeField streams
these sections and applies wind to both Level 1 forest planes. Padded forest
frames let the shader sample neighbouring pixels without clipping the crowns.
The current demo-profile preview excludes Level 2 landmark assets and owners.
It adds a moving cloud deck, Level 1 valley mist and a wider sky-only Town video
transition. No source art or video bytes changed. Evidence and the current clip
are in testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one/;
see markdown/2026-09-06-level-one-background-polish.md.

The 2026-09-06 atmosphere V3 pass adds generated cumulus banks, a weather-only
ceiling and continuous optical thickness in the existing cloud pipeline.
DayNightCycle owns the new sun/moon art through LayeredCelestialView. Its Level 1
candidate orbit uses the accessible width, remains in world coordinates and
feeds the same camera projection to lighting. Celestial bodies render behind
clouds/ridges; owned halo textures fade to clear guards. Phase brightness now
blends continuously in the candidate. The baseline clock/orbit remains intact.
WorldVisualLayeredFloatingDetails adds a bounded world-anchored pool of existing
leaf/glimmer artwork: it drifts and curls, fades at lifetime/region boundaries,
responds to night and precipitation, and uses the cloud owner's pause clock.
See markdown/2026-09-06-level-one-atmosphere-v3.md and qa-atmosphere-v3 evidence.

Weather V4 adds two broad cloud-bank frames beside the four cumulus forms.
`layeredCloudShape.js` gives streamed cells stable mixed sizes and independent
slow growth; source density remains at or below scale 1. Banks overlap while
fine clouds and mist retain separate parallax and wind speeds. The live
WeatherSystem cover controls their optical depth, connected cover and size.
The sky and landscape guards continue to own edge continuity. Evidence lives
in the Level 1 comparison's qa-weather-v4 directory.

Cloud polish V5 removes valley-mist/near-haze and confines all remaining cloud
planes behind terrain in one compact ceiling. Shared vertical parallax stops
the layer stack spreading during flight; each plane retains its horizontal
wind/parallax and stable size variation. Cloud rows below the ceiling are not
admitted. Landscape alpha now preserves silhouette coverage through joins,
with soft border ramps and matching neighbour guards for the foliage shader.
See markdown/2026-09-06-level-one-cloud-polish-v5.md and qa-cloud-polish-v5.

## Approved Level 1 background V6

The previously reviewed Level 1 renderer is now the default in the bounded demo.
`WorldVisualLevelOneAmbientEvents` shares the cloud owner's pause clock and runs
one occasional bird flock, leaf eddy or dusk-glimmer group at a time, with
45-88 seconds of quiet after each event. Rain/storms suppress admission and fade
active sprites; reduced-motion preference disables these events. It owns and
releases the six authored bird frames. Town's video retains its original owner.
`landscapeRidgeJoin.js` aligns adjacent painted skylines inside the existing
join overlap, then blends their colors. This removes vertical mountain fade
curtains while keeping ridge interiors opaque and original assets intact.
Forest silhouette joins retain the V5 treatment. Historical Review class names
and the inspector remain for tool compatibility. See
`markdown/2026-09-06-level-one-live-backgrounds-v6.md` for runtime evidence.
