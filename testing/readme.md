# Testing

`2026-07-16-scenic-world-pipeline-smoke.py` verifies the offline scenic bake
foundation: the shared 94 px orthographic contract, 2x master profile, required
beauty/data passes, syntax, environment-only Meshy authentication, explicit
spend confirmation, request-aware credit ceilings, SHA-256 provenance,
promotion blocking, non-color data passes, and manual-only community fallback.

testing directory.

`2026-07-16-scenic-world-runtime-foundation.mjs` verifies the default scenic/legacy selector, complete depth-material coverage, renderer compatibility surface, absence of tilemap construction in scenic mode, and versioned gameplay-layout save identity.

`2026-07-16-scenic-shallow-cavern-smoke.mjs` keeps its pilot-era filename while
verifying complete row 65..2064 Level 1 scenic coverage, exact region/boundary
resolution, surface-only startup residency, deterministic blue variants,
current/intersecting-region streaming and release, exact final-card crops,
native-size 1536x1024 cards, aspect-preserving mist, emissive motion, both
rollback flags, ready-only generic-backdrop
suppression, production asset dimensions, and zero gameplay mutation.

`2026-07-17-scenic-terrain-semantic-assets-contract.mjs` verifies that every resource type, `SKY_TILE`, and `BEDROCK` resolves to a real high-resolution PNG/WebP in the generated semantic-decals package; the generated layer is preloaded, masked, pooled, bounded, invalidated, and destroyed with the scenic runtime; star beauty/emissive art remains rarity-aware; bedrock uses a continuous bedrock-only material mask; primitive semantic drawing is absent by default; and the visual layer cannot mutate gameplay state. It also guards `terrainSemantics=1` as the production default and `?terrainSemantics=0` as the explicit rollback.

`2026-07-17-scenic-semantic-runtime-lifecycle-smoke.mjs` instantiates the semantic renderer with practical scene/texture/image/mask stubs. It verifies all seven reward types use generated 256 px beauty/emissive frames instead of the 94 px feedback atlas, non-stone ores cannot be starved by common stone, same-bounds lighting changes avoid a grid/mask rebuild, custom emissive depth survives later pool allocation, invalidation rebuilds only visible cells, and destroy releases every image and mask.

`2026-07-18-production-deployment-smoke.py` verifies the production snapshot closes over the complete reachable ES-module and runtime-media graph, warns only for files already absent from development, injects the debug lock before Phaser and the entry module, refuses unsafe output roots, and retains compressed HTTP/1.1 caching, byte-range, MIME, security, and read-only contracts.

`2026-07-17-render-density-foundation-smoke.mjs` locks High/Ultra backing dimensions, legacy/auto rollback profiles, physical render matrices and WebGL viewports, logical pointer coordinates and text resolution, plus the CameraManager resize guard that keeps full-screen cameras at 1280x720 after a 1920x1080 or 2560x1440 backing-canvas resize event.

`2026-07-17-scenic-surface-bedrock-feedback-contract.mjs` guards the corrected surface presentation and unbreakable-material feedback: far-mountain segments cannot render above their source width when `farMaxSourceScale=1`; the duplicate `town-surface-edge` floor is absent from default preloads and stage instances while `?surfaceEdge=1` restores it; `BEDROCK` and `CAVE_WALL` mining attempts return `blockedByBedrock`; PlayScene routes the configured `Cannot dig` message through a keyed, timed warning; and the generated bedrock runtime applies its configured visibility lift and cool tint to both tile types.

`2026-07-16-scenic-resource-veins-smoke.mjs` keeps its compatibility filename while verifying generated raster resources and reward blocks as the default, independent damage cracks and non-reward markers, suppression of procedural ore geometry plus the legacy 94 px reward emblems, `?terrainSemantics=0` restoration of deterministic veins/nodules and reward emblems, and the combined `?terrainSemantics=0&resourceVeins=0` rollback to the older resource-emblem atlas.

`2026-07-16-scenic-cave-mouth-smoke.mjs` verifies that recurring standalone
`CaveScene` entrances use the transparent bottom-anchored scenic cutout, skip
the shallowest landmark-owned pilot, keep interaction intact, never silently
fall back to the opaque square, and restore legacy visuals only through
`?scenicCaveMouths=0`.

`2026-07-16-integrated-cave-restoration-contract.mjs` guards the restored
production cave path: legacy ellipse chambers, traversable shell entrances,
authored-world authority preservation, approved scenic mouth landmarks, strict
coordinate-key persistence, and compact `CaveScene` isolation behind the
explicit `?compactCaves=1` rollback.

`2026-07-16-world-functionality-restoration-contract.mjs` builds the complete
authored runtime world and guards renderer-independent NPC, mining, collision,
special-tile, weather, lighting, earthquake, gate, tunnel and Arc Core setup;
functional tile inventory; integrated caves; tile damage; and complete v7 save
normalization.

`2026-07-16-scenic-asset-streaming-smoke.mjs` verifies that deep scenic
materials queue on demand, deduplicate pending requests, release non-surface
textures, retain the surface fallback, and clean loader listeners after errors.

`2026-07-16-scenic-material-band-boundary-smoke.mjs` verifies that camera
windows spanning rows 160, 520, and 1040 render both adjacent continuous
material planes with exact boundary crops, retain the shared solid mask, prune
departed planes, and release departed non-surface material textures.

`2026-07-11-weather-sunlight-smoke.mjs` deterministically verifies that clear
weather preserves DayNightCycle sunlight while a storm smoothly adds cloud/fog,
cools the tint at equivalent 30/60 FPS results, and lowers the resolved
LightSystem sun strength. `2026-07-11-celestial-clock-smoke.mjs` verifies the
opposed sun/moon orbit, smooth horizon travel/fades, and screen anchoring.
`2026-07-17-lighting-render-gating-smoke.mjs` verifies that visually inactive
render-to-texture shader layers hide both GPU producer and sampled image, skip
uniform churn, and that the darkness compositor skips clear/fill/erase plus
local-light scans until its exact active-frame path is needed again.
`2026-07-11-world-background-ambient-motion-smoke.mjs` covers all six shallow
effect families, exact 0–20 m anchor bounds, culling, FPS fallback, and the
`?worldMotion=0` rollback.

`2026-07-15-level1-ground-facade-smoke.mjs` verifies exact 280x10 coverage,
always-opaque scenic damage states, zero-overlap dug-cell boundaries, integrated
stone recognition, distinct geode/relic/glow markers, missing-frame hard failure,
Boot-only start-chunk residency, current-plus-neighbor camera streaming, distant
texture removal, underground unloading, cleanup, and the `?level1Facade=0`
rollback. Structural soil remains continuous rather than receiving repeated
placeholder recognition glyphs.

`2026-07-15-level1-living-backdrop-smoke.mjs` keeps its compatibility filename
while verifying deterministic full-depth Level 1 + Level 2 ambience, four
fixed-size sprite pools, world anchoring, slow bounded motion, depth-faded
weather/day-night response, FPS degradation, and dedicated, legacy, and shared
motion rollback flags.

`2026-07-15-deep-world-living-backdrop-smoke.mjs` verifies the separated Level
Two `x132..279 / y2065..5064` ambience pass: facade-band inheritance, fixed
atlas pools, world anchoring, 8–20 second motion, strongly attenuated underground
weather/wind, FPS gates, cleanup, facade dependency, and both rollback flags.

`2026-07-15-world-wisp-ownership-smoke.mjs` verifies that skyline weather and
background ambience never double-render the same smoke/steam families.

`2026-07-15-v11-background-depth-streaming-smoke.mjs` verifies that the scenic
runtime crop union reaches the deepest Level 1 tile and that camera bounds do
not shrink while streamed chunks change.

`2026-07-15-world-scenic-facade-smoke.mjs` verifies the streamed, world-space
continuous material facade across all 280 columns and the full 5,065-row model,
including authoritative solid masking, exact digging holes, integrated damage
and resource feedback, grid-anchored/cropped image repeats, a hard guard against
memory-heavy Phaser `TileSprite` canvases, and `?worldFacade=0` rollback.

`2026-07-16-world-depth-continuation-smoke.mjs` verifies that approved detailed
Level Two plates continue without vertical gaps through `x132..279 / y2065..5064`,
stay cropped to the playable deep world, reuse existing source textures, inherit
facade-band grading, and disappear with the depth-master rollback.

`2026-07-13-sky-star-release-smoke.mjs` verifies that mined sky stars update
constellation UI progress immediately, drift upward with the configured slow
fade, clean themselves up, and never enter or restore a persistent world pool.

`2026-07-13-earthquake-feedback-ui-smoke.mjs` verifies the seismic phase banner,
toast offset, persistent escape objective, cave-in markers, offscreen danger,
falling-rock lanes, restored-rubble outlines, trap dedupe, and medium shake key.

`2026-07-13-earthquake-world-epicenter-smoke.mjs` verifies that epicenters are
selected from world coordinates instead of the player, and that mutations,
cave-ins, aftermath rubble, rewards, shake, HUD awareness, and trap guidance
remain local to that epicenter.

`animation-sandbox/earthquake-feedback-ui-v1/` renders the production seismic
feedback classes in isolated warning, earthquake, and escape review states.

`level-two-arc-core-contract.mjs` verifies the exact four-cell 2x2 footprint,
gold/silver Arc recipe, expanded deep-resource Omega recipe, seller resource
separation, and 5,000-meter depth contract.
`level-two-world-generation-smoke.mjs` builds the full runtime world,
checks the old Level 1 bottom seal, and samples deep Level 2 resource rendering.
With `?jkd_e2e`, F9 centers the scenic mine-entrance pilot on the deterministic
shallowest traversable integrated cave mouth below the surface plate,
Ctrl+Alt+Home opens the godmode Level 2 surface/Arc Core preview, and
Ctrl+Alt+End opens the Molten Money Monster sell preview.

`2026-07-16-ual-native-production-contract.mjs` verifies UAL rollback routing,
19 game-loaded sheets / 882 active frames versus the 23-action / 987-frame
review manifest, exact referenced-frame load bounds, punch-only SIDE/UP actions,
authored visual-contact timing, action-start cooldown admission, velocity-matched
flight, the 109px base and 123px locomotion presentation, the 0.8-tile visible
target and 31x75 collider, weapon-free assets, deterministic idle fidgets,
wall-push selection, hit reactions, and action-lock priority.

`2026-07-16-ual-animation-tuning-lab-v2-contract.mjs` guards the additive
production-asset tuning lab at `animation-sandbox/ual-animation-tuning-lab-v2/`:
all six scenario lanes, 23 review actions / 987 frames, the separate 19-sheet
game preload, Option C identity, action-aware 109px/123px scaling, control and
export surfaces, line budgets, complete versus partial rig-marker truth, and
the rule that sandbox review never mutates production.

`2026-07-16-ual-directional-combo-contract.mjs` proves the punch-only
Jab/Cross/Jab/Cross chain, adjacent-block continuity,
direction/timeout reset, Jab/Cross UP variants, floor contact, ground-directed
Thunder, horizontal flight hysteresis, per-frame rig markers, explicit rejection
of the kick and `Sword_Regular_C` up strike, and action-start cooldown timing that
cannot drop the earlier-contact Jab after a later-contact Cross.

`2026-07-16-ual-action-contact-timeline-contract.mjs` proves one and only one
contact for normal, skipped, repeated, reversed, cancelled, and completed action
sequences. Tile mutation remains on that visual contact even though mining
cooldown is measured from action start.

`2026-07-16-cave-ual-action-contract.mjs` exercises the compact-cave runtime with
an event-emitting player: DOWN mining and Thunder remain damage-free until their
authored contact, UAL mining carries the original action-start timestamp through
the delayed contact, actions stay locked through completion, repeated DOWN
attacks keep facing the same way, and flight traverses
enter/travel/hover/exit/fall/landing phases.

`2026-07-16-ual-locomotion-transition-selector-contract.mjs` proves all 15 shared
locomotion phases, walk/run hysteresis, old-facing pivot stop, new-facing pivot start,
one landing per airborne interval, and a Phaser-independent selector under 300 lines.

`2026-07-16-player-tile-contact-contract.mjs` verifies body-AABB-adjacent aim
candidate order, proves every candidate lies outside the 31x75 UAL body, and
covers WebGL solid-cell mask creation/update/cleanup plus Canvas and non-UAL guards.

`2026-07-16-player-collision-contract.mjs` verifies high-speed swept collision
against both walls, floors, and ceilings, nearest-face overlap recovery, exact
31x75 profile dimensions, and full-foot-span ground detection while straddling
tile columns.

`2026-07-16-ual-game-physics-motion-contract.mjs` verifies that UAL cadence is
driven by post-collision body displacement rather than requested velocity,
matches run and climb strides to the 94px world grid, suppresses teleport
spikes, exposes signed resolved velocity, preserves falling hysteresis, and has
equivalent shared-selector integration in the main world and caves.

`2026-07-24-flight-foot-particle-contract.mjs` verifies the approved Survivor
Superman-flight visual gate, mirrored two-foot origins, spawn cadence, cleanup,
and matching main-world / compact-cave lifecycle wiring.

`2026-07-16-player-rig-contact-contract.mjs` verifies Game Rig v2 projected
marker metadata, packed-frame flip projection, hand selection for all five
mining directions, capped sprite-only tile-face alignment, independent contact
hitboxes, an unchanged 31x75 movement body, manifest loading, Blender/packer
support, diagnostic-only marker validation that cannot veto mining, and
main-world/compact-cave parity.

`animation-sandbox/ual-walk-review-v1/` is the additive five-candidate UAL walk
chooser. `2026-07-16-ual-walk-review-contract.mjs` proves its exact 94px/0.8-tile
selection-era scale, 200px/s live cadence inputs, complete review sheets, and
separation from the promoted runtime profile. Production compensates the chosen
Jog clip from the 109px base to 123px locomotion display size.

`2026-07-17-survival-ual-player-profile-contract.mjs` verifies the approved
Survivor default's query/save migration, explicit native rollback, unique asset keys, 19-sheet mixed
Blender-core / UAL-fallback profile, 109px base / 123px locomotion scale, shared
31x75 collider and UAL contact mappings, Blender-only idle fidgets, no-weapon
policy, and runtime loader/animation wiring.

`animation-sandbox/survival-side-combo-review-v1/` presents four real-sheet,
fist-only SIDE-combo candidates without changing gameplay. Its
`2026-07-18-survival-side-combo-review-contract.mjs` guards the asset paths,
0.8-tile / 31×75 review truth, no-pickaxe policy, and explicit non-production
isolation.

`animation-sandbox/ual-flight-style-lab-v1/` is the additive A-E flight chooser.
`2026-07-17-ual-flight-style-lab-v1-contract.mjs` guards the two real character
manifests, five motion directions, marker-following board separation, fixed
31x75 collider, 0.8-tile guide, bounded deep-link controls, module line budgets,
and `productionChanged: false` review isolation.

`blender-animation-lab-v1/` is the isolated Blender 5.1 source-rig authoring
lab. `2026-07-17-blender-animation-lab-contract.py` verifies its reproducible
17-FBX / 18-runtime-action master, source hashes, exact game-scale collider and
contact starting values, pose interpolation contract, Meshy review candidate,
and strict separation from production assets.
`ai-tools/2026-07-17-validate-blender-animation-lab.py` performs the deeper
Blender 5.1 runtime proof and stages endpoint-tween plus Meshy-fit evidence only
under the lab's documented `review-drafts/` directory.

`2026-07-25-release-safety-contract.mjs` exercises runtime-canary lifecycle,
failure, recovery, persistence, cleanup, and source/workflow wiring without
starting Phaser. `2026-07-25-production-http-canary.py` probes a built snapshot
or configured remote canary URL for manifest/build identity, reachable health
wiring, MIME/cache/range/compression/security headers, and local read-only
behavior.

`2026-07-26-heavenblocks-visual-layout-contract.mjs` guards the three
non-overlapping sky regions, complete background/facade loading and cleanup,
visual rollback, gate/prompt drawing, relic projection, transit, component and
vault animation lifecycles, and presentation health publication.
