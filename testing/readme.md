# Testing

`2026-07-16-scenic-world-pipeline-smoke.py` verifies the offline scenic bake
foundation: the shared 94 px orthographic contract, 2x master profile, required
beauty/data passes, syntax, environment-only Meshy authentication, explicit
spend confirmation, request-aware credit ceilings, SHA-256 provenance,
promotion blocking, non-color data passes, and manual-only community fallback.

testing directory.

`2026-07-26-player-light-v2-and-torch-ui-contract.mjs` guards the default/legacy
selector, collider-center anchor plus live sprite displacement, locked light
center, coherent day/night/rain/storm and weather-insulated cave response,
matched RGBA HUD frame geometry, generated OFF-state source, removal of the
approved-skin status dot, and the shader's legacy comparison branch.

`2026-07-26-graveborer-wurm-contract.mjs` guards the two exact query flags,
Casual isolation, 10x developer self-trigger, committed non-homing warning
path, bounded terrain-carve events, one GP hit per encounter, cooldown, safe
reload telegraph, and Hardcore/Wurm save sanitization.

`2026-07-16-scenic-world-runtime-foundation.mjs` verifies the default scenic/legacy selector, complete depth-material coverage, renderer compatibility surface, absence of tilemap construction in scenic mode, and versioned gameplay-layout save identity.

`2026-07-16-scenic-shallow-cavern-smoke.mjs` keeps its pilot-era filename while
verifying complete row 65..5064 ten-biome scenic coverage, exact region/boundary
resolution, surface-only startup residency, deterministic six-card variants,
one smooth V3 card per biome, current/intersecting-region mixed-media streaming
and release, exact final-card crops, native-size 1536x1024 cards, 60 fps video
playback, FPS-floor pause/resume, camera-response and legacy-pool rollback,
ready-only generic-backdrop suppression, production asset headers/dimensions,
absence of procedural background drawings, and zero gameplay mutation.

`2026-07-26-underground-baked-motion-runtime-contract.mjs` verifies the ten V2
WebMs are marked rejected and review-only, their evidence hashes remain intact,
all production pools exclude V2 while containing only five approved images and
one approved V3 MP4, and gameplay mutation APIs remain absent.

`2026-07-26-underground-motion-review.mjs` verifies that the rejected gallery
uses one native `<video>` evidence player, has no Canvas renderer, is isolated
from production registration, and preserves its source/keyframe/biome mapping.

`2026-07-26-underground-smooth-motion-v3-review.mjs` verifies the single
Weathered Roots replacement candidate is an eight-second 60 fps H.264 file
built from the exact source through subpixel affine sampling, has no optical
flow or overlay renderer, and remains byte-hashed as the approved reference.

`2026-07-26-underground-smooth-motion-v3-runtime-contract.mjs` verifies the ten
production H.264 loops, exact 1536x1024 dimensions, 480-frame/eight-second
timing, hashes, source mappings, complete-image motion method, and one-to-one
registration across the live biome pools.

`2026-07-26-underground-baked-camera-motion-contract.mjs` verifies ten bounded
camera-response profiles, three deliberately anchored industrial/material
biomes, stronger but still sub-ten-pixel deep/cosmic lag, teleport reset,
motion rollback, whole-image position transforms, removal of separate
mist/emissive motion passes, and the absence of DOM, Canvas, Phaser Graphics,
tweens, or gameplay mutation.

`2026-07-17-scenic-terrain-semantic-assets-contract.mjs` verifies that every resource type, `SKY_TILE`, and `BEDROCK` resolves to a real high-resolution PNG/WebP in the generated semantic-decals package; the generated layer is preloaded, masked, pooled, bounded, invalidated, and destroyed with the scenic runtime; star beauty/emissive art remains rarity-aware; bedrock uses a continuous bedrock-only material mask; primitive semantic drawing is absent by default; and the visual layer cannot mutate gameplay state. It also guards `terrainSemantics=1` as the production default and `?terrainSemantics=0` as the explicit rollback.

`2026-07-17-scenic-semantic-runtime-lifecycle-smoke.mjs` instantiates the semantic renderer with practical scene/texture/image/mask stubs. It verifies all seven reward types use generated 256 px beauty/emissive frames instead of the 94 px feedback atlas, non-stone ores cannot be starved by common stone, same-bounds lighting changes avoid a grid/mask rebuild, custom emissive depth survives later pool allocation, invalidation rebuilds only visible cells, and destroy releases every image and mask.

`2026-07-18-production-deployment-smoke.py` verifies the production snapshot closes over the complete reachable ES-module and runtime-media graph, warns only for files already absent from development, injects the debug lock before Phaser and the entry module, refuses unsafe output roots, and retains compressed HTTP/1.1 caching, byte-range, MIME, security, and read-only contracts.

`2026-07-17-render-density-foundation-smoke.mjs` locks High/Ultra backing dimensions, legacy/auto rollback profiles, physical render matrices and WebGL viewports, logical pointer coordinates and text resolution, plus the CameraManager resize guard that keeps full-screen cameras at 1280x720 after a 1920x1080 or 2560x1440 backing-canvas resize event.

`2026-07-17-scenic-surface-bedrock-feedback-contract.mjs` guards the corrected surface presentation and unbreakable-material feedback: far-mountain segments cannot render above their source width when `farMaxSourceScale=1`; the duplicate `town-surface-edge` floor is absent from default preloads and stage instances while `?surfaceEdge=1` restores it; `BEDROCK`, `CAVE_WALL`, and both town-floor types return authoritative blocked results with zero damage; PlayScene routes `You cannot break this` through a keyed warning plus one `0 damage` hit float; and the generated bedrock runtime visibly separates all four unbreakable tile types with its configured lift and cool tint.

`2026-07-26-town-square-runtime-contract.mjs` guards the approved Option A
promotion: a 1.75 m midpoint player reference, 2.10 m door calibration, five
unique absolute surface-merchant slots inside the opaque scenic square, and an
unchanged Level 2 Arc Core merchant.

`2026-07-26-shop-ui-uptime-contract.mjs` reproduces the overlapping Bobo and
Milestone Pillar input path with Phaser's consumptive `JustDown`: a blocked
pillar cannot discard `E`, Bobo must open `boboMerchant`, the live prompt,
visual, key, and shop collaborators must report ready, and the pillar still
opens normally when it is the selected target.

`2026-07-26-town-square-ground-fidelity-contract.mjs` guards the ground-only
correction: the v2 PNG and approved source hashes, exact 1672x139 Option A crop,
129 px handoff, shared town/floor scale, semantic occlusion only inside the
foundation (including shader depth rebinding), and unchanged town beauty plus
diggable underground facade.

`2026-07-26-npc-activity-runtime-contract.mjs` guards the promoted v12
accepted-only Piskel merchant pack: 42 unique exports, seven editable activity
frames per merchant, sub-pixel lower-body root drift, zero bottom/edge drift,
measured Gem/Magma panel separation, original video/static idle baselines,
one-at-a-time scheduling, player reactions, fixed X/Y/rotation/display size,
shop coordinates, and runtime health publication. It rejects every archived
quiet frame, walking path, and whole-body wobble hook.

`2026-07-26-npc-planted-idle-review-contract.mjs` guards the four approved
activity boards, 42 review exports, seven Piskel frames per merchant,
1.4/1.65-second activity cross-fades, at least 88% original-idle time, explicit
rejection metadata for the six removed quiet concepts, no CSS transform
animation, and strict preview-versus-runtime separation.

`2026-07-26-npc-alive-walking-review-contract.mjs` retains the rejected v4
walk art only as provenance. It requires rejection metadata, a non-animated
replacement page, and complete isolation from production preload/runtime files.

`2026-07-26-milestone-pillar-review-contract.mjs` guards the five-option,
five-stage ImageGen review set, monotonic physical growth, transparent PNG
integrity, review-only isolation, readable paginated production modal, and
nearest-target Town Square interaction arbitration.

`2026-07-26-approved-pillar-runtime-contract.mjs` guards the explicit
screenshot-1/screenshot-2 promotion: ten hashed RGBA production stages,
best-depth growth, readable world prompts, five constellation-pair socket
states, Wayward Star cores over additive Star Heart halo pulses, unlock beams,
top-HUD-safe maximum scale, Boot preload wiring, and the absence of persistent
collected world stars. With `?jkd_e2e=1`, `9`
and `0` provide browser-safe Level 1/Level 2 Sky Island visual anchors; the
existing Ctrl+Alt+Insert/Delete aliases remain available outside browsers that
reserve native clipboard chords. `8` cycles save-safe Star Pillar visual states
at 0/1/3/5/7/10 unlocked constellations without changing progression.

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
`2026-07-26-star-block-light-persistence-contract.mjs` verifies that every
in-view `SKY_TILE` keeps a strong, softly shaped light pool outside the player's
torch/vision radius, emits only a rare faint cross-free ring, never stacks more
than one traveling pulse, spans more than ten tiles, never drops the steady
core, and leaves geode and other local lights proximity limited.
`2026-07-26-star-block-pulse-quality-contract.mjs` verifies the upgraded pulse
uses 1024 px linearly filtered radial artwork, all feather/bloom gradient bands,
one pooled ring plus soft constellation-node images, restrained additive alpha,
long-range flattened geometry, quiet-frame hiding, and complete cleanup.
`2026-07-26-titan-discovery-contract.mjs` verifies all 25 unique alpha sprites,
the 512x320 generated plinth, deterministic non-overlapping clear-area zones,
`?titans=0`, canonical persistence without duplicate or unknown ids, journal
exposure, partial-reveal plus player-entry visual unlock, remote-award rejection,
all 25 surface slots, real-art archive wiring, production-health publication,
save requesting, scenic-runtime lifecycle wiring, matching legacy-renderer
lifecycle ownership, and complete cleanup.
`2026-07-26-titan-discovery-experience-contract.mjs` instantiates the production
world and verifies first-seven depth guidance, explicit 700 m coverage,
locked-name protection, partial-entry admission, remote reveal rejection,
discovery copy, `?titanGuidance=0`, and `?titanEncounter=legacy`.
`2026-07-26-titan-chamber-production-contract.mjs` verifies the complete 25-card
1536x848 WebP art inventory and unique hashes, colossal 15-22 by 8-13 tile
zones, Boot de-queuing, `?titanChambers=0`, near-zone stream/load/release,
compact fallback restoration, archive pinning, renderer parity, and production
manifest completeness.
`2026-07-26-relic-discovery-fx-contract.mjs` verifies that Ancient Relic awards
remain authoritative and failure-isolated while visible discoveries use a
world-space pedestal wake, residual floor mark, live-player orbit, bounded
full/low/reduced modes, canonical token art, warning-only health reporting for
presentation failure, and complete transient cleanup.
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
constellation UI progress immediately, flash at the mined tile, add one bounded
impact ring and paced sparkle trail, sway slowly upward through the configured
fade, clean every transient element up, and never enter or restore a persistent
world pool.

`2026-07-13-earthquake-feedback-ui-smoke.mjs` verifies the compact generated-art
phase card, notification offset, auto-expiring escape guidance, short completion
recap, image-backed cave-in markers, offscreen danger, restrained fall guides,
restored-rubble outlines, trap dedupe, and medium shake key.

`2026-07-26-earthquake-feedback-lifecycle-contract.mjs` guards the v2 restrained
seismic presentation: generated RGBA runtime assets, Boot preload wiring,
compact phase/recap timing, auto-expiring escape guidance, one quake-start flash,
no repeated warning/toast/emoji path, image-backed hazard markers, non-filled
fall lanes, event-completion teardown, and protection against a restarted hide
tween that could leave the card visible forever.

`2026-07-13-earthquake-world-epicenter-smoke.mjs` verifies that epicenters are
selected from world coordinates instead of the player, and that mutations,
cave-ins, aftermath rubble, rewards, shake, HUD awareness, and trap guidance
remain local to that epicenter.

`animation-sandbox/earthquake-feedback-ui-v1/` renders the production seismic
feedback classes in isolated warning, earthquake, and escape review states.

`2026-07-26-arc-core-production-visual-contract.mjs` guards the approved
Small/Omega Arc Core production path: distinct silhouettes, idle cadences, dig
languages and timing; truthful 2x2 versus 8x8 footprints; ten Piskel
machine/VFX roles with fixed-center hashes; sandbox-only foundry background;
complete isolation of the archived random tiles/HUD and legacy HTML/placeholder
board; Boot and PlayScene wiring; runtime health publication; F-key digging;
the separate rebindable B boarding/exiting action; and
`?arcCoreVisualsV3=0` rollback.

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

`2026-07-16-ual-locomotion-transition-selector-contract.mjs` proves jog-only
grounded routing even below the former walk threshold, same-frame input-facing
reversal without restarting the jog cycle, immediate stop despite residual
smoothed velocity, one landing per airborne interval, flight hysteresis, and a
Phaser-independent selector under 300 lines.

`2026-07-16-player-tile-contact-contract.mjs` verifies body-AABB-adjacent aim
candidate order, proves every candidate lies outside the 31x75 UAL body, keeps
Thunder Strike damage on the first floor cell directly below the player, and
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
Superman-flight visual gate, prone-v3 Blender marker-calibrated and mirrored
two-foot origins, spawn cadence, cleanup, and matching main-world / compact-cave
lifecycle wiring.

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

`2026-07-26-celestial-engines-contract.mjs` proves the Star Heart requires ten
constellations, permits one permanent Engine choice, caps charge and every
activation, prevents Engine hits from feeding their own recharge, preserves
bedrock, deduplicates mining rewards, round-trips save v10, exposes the
`?starHearts=0` rollback, and guards the Boot/scene/pillar runtime wiring.

`2026-07-26-godmode-abilities-contract.mjs` exercises the debug cheat through
the live activation methods: Flight, Quickslash, Thunderstrike, and torch are
unlocked and GP-free; every Celestial Engine can be switched and activated
without charge or save mutation; normal Engine caps and runtime-canary
invariants remain active; and the retired Gem Dash stub is not registered.

`2026-07-26-boot-live-asset-health-contract.mjs` prevents the archived,
unused 3840x3840 Shadow Miner idle atlas from re-entering the production boot
queue while keeping the compact active sheet present. It is a required
structural-health worker check because the oversized dead atlas can stop
PlayScene from starting on constrained renderers.

`2026-07-26-modular-ground-damage-contract.mjs` guards the nine visible
pre-break states, monotonic fracture/scuff/flake progression, four masked
adaptive blend layers, all current material entries plus an unknown future
material, lifecycle cleanup, the `?groundDamage=legacy` comparison, and the
absence of erase, cavity, square-fill, material-ID, or texture-key coupling.
`2026-07-26-ground-damage-visual-harness.html` renders the production painter
over every current material in one continuous-row comparison, with intact plus
states 1 through 9 and a small readiness contract for browser visual QA.

`2026-07-26-thunderstrike-three-slam-contract.mjs` guards the 3x upfront cost,
zero-cost authorized follow-ups, 1x/3x/10x base damage, cumulative +20%/+40%
successful-timing damage buffs producing effective 3.6x/14x follow-ups,
sequential stage admission, the practical 220 ms / 140 ms timing windows,
visible-needle input authority, left-to-right challenge restart, miss/timeout
cancellation, direct floor contact, responsive approved-art UI, and shared
main-world/cave timing-HUD and impact-FX wiring.
`2026-07-26-thunderstrike-chain-visual-harness.html` renders that production UI
without the full Boot asset graph; Space animates the left-to-right needle, R
restarts it, and 2/3 selects the follow-up slam.

`2026-07-26-opening-flight-golden-five-contract.mjs` guards the complete
first-five-minutes opening: query rollback, fresh/mid-ascent/cache-pending spawn
routing, deterministic 14-cell seam, three-wide escape, reward ledge, calm
weather window, protected ascent, surface-gated and pauseable 30-second flight
bank, idempotent permanent cache rewards, generated runtime assets, preloads,
save flags, and non-blocking starter choice integration.
`openingFlightGoldenFiveFixture.mjs` keeps its deterministic world, scene, and
view doubles reusable without inflating the executable contract.
`2026-07-26-opening-flight-polish-visual-harness.html` renders the production
route and reward-reveal views together at 1280x720 for chest grounding, ring
scale, and center-message visual QA without depending on full-game boot.

`2026-07-26-heavenblocks-visual-layout-contract.mjs` guards the three
non-overlapping sky regions, complete background/facade loading and cleanup,
visual rollback, gate/prompt drawing, relic projection, transit, component and
vault animation lifecycles, and presentation health publication.

`2026-07-26-pause-settings-layout-contract.mjs` guards automatic FULL floating
damage/reward text with one-time legacy-default promotion, explicit OFF
preservation, persistent selected-state styling, responsive non-overlapping
settings tabs, camera-event controls, and the full-height ESC modal layout.
`2026-07-26-pause-settings-visual-harness.html` renders that same production
modal shell, tab bars, controls, persistence path, and Gameplay selection in an
isolated Phaser scene so UI review is not blocked by unrelated game assets.

`2026-07-26-cave-resource-hazard-darkness-contract.mjs` guards deterministic
real-resource seams, authored-cell protection, live mining HP, challenge
density and checkpoint safety, all three hazard grammars, all-GP failure
recovery, synchronized hazard lights, and distinct cave darkness rhythms.
`?jkd_e2e=1` disables all save writes; F2 (or Ctrl+Alt+C) cycles live cave
hazards and F3 (or Ctrl+Alt+V) enters the selected hazard for consequence
validation. F4 cycles directly through one timed gate, spike run, and ember
vent for visual comparison.

`2026-07-26-surface-props-contract.mjs` guards all 18 live paths, dimensions,
WebP alpha modes, physical player-relative scale, 2.10 m town-door and 2.20 m
pergola clearance, 68 scale-free authored anchors, protected interaction zones,
both complete surface ranges, maximum visual gaps, exact production-world
support under all 68 footprints, camera cleanup, runtime lifecycle, and all
rollback queries. With
`?jkd_e2e=1`, `Ctrl+Alt+F10` cycles representative modular prop clusters across
both levels; plain `F10` retains its existing surface benchmark sequence.
