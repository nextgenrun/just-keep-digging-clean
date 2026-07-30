# Testing

`2026-07-29-expanded-cave-level-contract.mjs` guards the default 60x20
camera-traversed cave level, continuous no-jump painted floor collision,
expanded mineable-node route, legacy collected-node migration, all six
identity routes across three native 3:1 ImageGen panoramas, explicit
`?caveLevel=legacy` rollback, and the absence of HTML or primitive cave
placeholders.

`2026-07-29-ui-mouse-priority-contract.mjs` guards nested modal input locks,
exit-tween ownership, same-click close races, cancellation of an active held
dig, event-time interactive hit priority, paused-state blocking, and idempotent
cleanup.

`2026-07-28-escape-ui-routing-contract.mjs` reproduces Phaser's key-listener
before frame-update ordering and guards one-press topmost UI closure, no
same-press Pause reopen, later distinct Pause opening, Settings capture
cancellation, remapped Pause input, and Star Heart/dialog close coverage.
`2026-07-28-escape-ui-routing-harness.html` runs that same race through the
real browser Phaser keyboard plugin without loading the full game or any save.

`2026-07-28-depth-gate-typed-modal-contract.mjs` guards the 100m, 300m, and
1000m progression stops: each receives the exact Phaser modal instance used by
Unstuck, requires `100M`, `300M`, or `RISK` through its typed confirmation path,
pauses controls and earthquakes, persists acceptance, returns safely on Escape,
and contains no visible DOM UI.
`2026-07-28-depth-gate-typed-modal-visual-harness.html` loads that production
modal class and approved runtime textures in isolation; `?mode=depth` and
`?mode=unstuck` provide a direct same-surface visual comparison without loading
or mutating a save. Add `&threshold=100`, `300`, or `1000` to review each depth
phrase.

`2026-07-28-ui-notification-carousel-contract.mjs` guards the centered one-card
seven-second queue, complete-queue close, consumptive arrow navigation, modal
pausing, interrupt safety, strict producer purge, mouse/touch drag lifecycle,
HUD-safe clamping, and normalized saved positioning.

`2026-07-28-webp-test-utils.mjs` supplies its bounded WebP
geometry/alpha/hash inspection helpers.

`2026-07-16-scenic-world-pipeline-smoke.py` verifies the offline scenic bake
foundation: the shared 94 px orthographic contract, 2x master profile, required
beauty/data passes, syntax, environment-only Meshy authentication, explicit
spend confirmation, request-aware credit ceilings, SHA-256 provenance,
promotion blocking, non-color data passes, and manual-only community fallback.

`2026-07-28-inventory-resource-icon-key-contract.mjs` guards the `I` inventory
legend: every material keeps its real icon and explicit colored name visible
before discovery, while only its quantity remains locked, and the holdings grid
still fits below the two-tab header.

`2026-07-28-inventory-resource-world-guide-contract.mjs` guards the clickable
second `I`-menu tab: complete fourteen-material coverage, ten exact six-frame
ImageGen formations, three authoritative runtime soil types, five Lava Dirt
dig stages, valid live ground slots, production-atlas geometry, click wiring,
and the absence of generated placeholder resource art.

`2026-07-28-overground-texture-clarity-contract.mjs` guards the approved
ground-embedded 2D resource direction: 60 unique ImageGen frames across all ten
resources, six deterministic variants each, RGBA semantic and recognition
atlases, deterministic hashes, image-only semantic rendering,
disabled-by-default Phaser veins, five GP values, the latest Teleport Up asset,
and unchanged portal rules.

`2026-07-28-pickaxe-icon-progression-contract.mjs` guards seven unique
upgrade-to-texture mappings, exact 256 px RGBA runtime assets and hashes, Boot
preloading, both Gear Merchant consumers, and the generic-pickaxe fallback.

`2026-07-28-pickaxe-hud-theme-contract.mjs` guards seven unique 417x93
transparent HUD overlays and hashes, exact theme labels/tiers, Boot preloading,
the production view lifecycle, generic fallback, immediate successful-purchase
refresh, continuous `UpgradeSystem.ownedPickaxe` synchronization after reload,
and the independent `?pickaxeHud=0` visual rollback.

testing directory.

`2026-07-26-player-light-v2-and-torch-ui-contract.mjs` guards the default/legacy
selector, collider-center anchor plus live sprite displacement, locked light
center, coherent day/night/rain/storm and weather-insulated cave response,
matched RGBA HUD frame geometry, generated OFF-state source, removal of the
approved-skin status dot, and the shader's legacy comparison branch.

`2026-07-27-player-light-dynamic-centering-contract.mjs` verifies the
alpha-audited prone-flight visual center (including horizontal flip), deferred
camera-follow render timing, shared darkness/shader commit order, teardown, and
the late PlayScene movement-camera-light sequence.

`2026-07-26-graveborer-wurm-contract.mjs` guards production query lockdown,
development summon/10x save isolation, the explicit live-to-test activity
ratio, depth-scaled two-to-six-pass hunts, fresh between-pass retargeting,
committed non-homing warning paths, 3.6-to-1.2-second telegraphs,
1.9-to-roughly-0.5-second breach travel, critical shallow/direct strikes,
full-GP deep executions, swept low-FPS collision without off-lane false hits,
one hit per pass, three-tile collision, bounded carve events, cooldown, safe
mid-hunt reload advance without a duplicate hit, and Hardcore/Wurm save
sanitization.

`2026-07-28-graveborer-wurm-hud-contract.mjs` guards the approved ImageGen
medallion as a visible, hand-cursor, hover/press developer summon control while
proving that the same medallion remains non-interactive and hidden when inactive
in a production runtime.

`2026-07-28-hardcore-permadeath-contract.mjs` guards explicit new-save mode
selection, Flight-delayed arming, Bobo conversion, stress/GP drain, paid
teleports, typed 50% unstuck, exact position/fractional-GP persistence, schema
v13 death tombstones, backup/remote purge, anti-resurrection writes, central
hazard routing, bounded death I/O, late-purge/new-save isolation, external
rollback-file rejection, live/other-slot backup rewind rejection, no-backup
one-second Hardcore checkpoints, checkpoint cleanup on death, stored
armed-Hardcore deletion evidence, cross-slot Casual preservation, fresh
Hardcore retry routing, and approved generated UI art.

`2026-07-28-hardcore-memorial-contract.mjs` guards complete stat and bounded
Journey-achievement recap coverage, duration/run-counter formatting,
append/read-only memorial persistence outside save slots, per-slot/global
bounds, permanent grave/button assets, scene lifecycle wiring, both death
actions, and the absence of primitive placeholder art in the new views.

`2026-07-16-scenic-world-runtime-foundation.mjs` verifies the default scenic/legacy selector, complete depth-material coverage, renderer compatibility surface, absence of tilemap construction in scenic mode, and versioned gameplay-layout save identity.

`2026-07-16-scenic-shallow-cavern-smoke.mjs` keeps its pilot-era filename while
verifying complete row 65..5064 ten-biome scenic coverage, exact region/boundary
resolution, surface-only startup residency, deterministic seven-card variants,
one concept-static and one smooth V3 card per biome, current/intersecting-region mixed-media streaming
and release, exact final-card crops, native-size 1536x1024 cards, 60 fps video
playback, FPS-floor pause/resume, camera-response and legacy-pool rollback,
ready-only generic-backdrop suppression, production asset headers/dimensions,
absence of procedural background drawings, and zero gameplay mutation.

`2026-07-26-underground-baked-motion-runtime-contract.mjs` verifies the ten V2
WebMs are marked rejected and review-only, their evidence hashes remain intact,
all production pools exclude V2 while containing all five older approved
images, the approved concept static, and one approved V3 MP4, and gameplay
mutation APIs remain absent.

`2026-07-26-underground-motion-review.mjs` verifies that the rejected gallery
uses one native `<video>` evidence player, has no Canvas renderer, is isolated
from V2 production registration, and proves every approved source maps to the
matching production concept-static card and biome.

`2026-07-26-underground-smooth-motion-v3-review.mjs` verifies the single
Weathered Roots replacement candidate is an eight-second 60 fps H.264 file
built from the exact source through subpixel affine sampling, has no optical
flow or overlay renderer, and remains byte-hashed as the approved reference.

`2026-07-26-underground-smooth-motion-v3-runtime-contract.mjs` verifies the ten
production H.264 loops, exact 1536x1024 dimensions, 480-frame/eight-second
timing, hashes, source mappings, complete-image motion method, all fifty older
static registrations, all ten concept-static registrations, and one-to-one V3
registration across the live biome pools.

`2026-07-26-underground-baked-camera-motion-contract.mjs` verifies ten bounded
camera-response profiles, three deliberately anchored industrial/material
biomes, stronger but still sub-ten-pixel deep/cosmic lag, teleport reset,
motion rollback, whole-image position transforms, removal of separate
mist/emissive motion passes, and the absence of DOM, Canvas, Phaser Graphics,
tweens, or gameplay mutation.

`2026-07-17-scenic-terrain-semantic-assets-contract.mjs` verifies that every resource type, `SKY_TILE`, and `BEDROCK` resolves to a real high-resolution PNG/WebP in the generated semantic-decals package; the generated layer is preloaded, masked, pooled, bounded, invalidated, and destroyed with the scenic runtime; star beauty/emissive art remains rarity-aware; bedrock uses a continuous bedrock-only material mask; primitive semantic drawing is absent by default; and the visual layer cannot mutate gameplay state. It also guards `terrainSemantics=1` as the production default and `?terrainSemantics=0` as the explicit rollback.

`2026-07-17-scenic-semantic-runtime-lifecycle-smoke.mjs` instantiates the semantic renderer with practical scene/texture/image/mask stubs. It verifies all seven reward types use complete single-layer 188 px ImageGen frames instead of the 94 px feedback atlas, no retired special emissive overlay is allocated, resources that remain inside the streamed camera window survive camera shifts and low-FPS mode without culling, non-stone ores cannot be starved by common stone in the explicit fallback profile, same-bounds lighting changes avoid a grid/mask rebuild, custom star-emissive depth survives later pool allocation, invalidation rebuilds only visible cells, and destroy releases every image and mask.

`2026-07-18-production-deployment-smoke.py` verifies the production snapshot closes over the complete reachable ES-module and runtime-media graph, warns only for files already absent from development, injects the debug lock before Phaser and the entry module, refuses unsafe output roots, and retains compressed HTTP/1.1 caching, byte-range, MIME, security, and read-only contracts.

`2026-07-17-render-density-foundation-smoke.mjs` locks High/Ultra backing dimensions, legacy/auto rollback profiles, physical render matrices and WebGL viewports, logical pointer coordinates and text resolution, plus the CameraManager resize guard that keeps full-screen cameras at 1280x720 after a 1920x1080 or 2560x1440 backing-canvas resize event.

`2026-07-17-scenic-surface-bedrock-feedback-contract.mjs` guards the corrected surface presentation and unbreakable-material feedback: far-mountain segments cannot render above their source width when `farMaxSourceScale=1`; the approved 1672x48 cap preloads by default, overlaps without gaps from column zero through the eastern world edge, remains below 0.65 tile tall, and disappears with `?surfaceEdge=0`; `BEDROCK`, `CAVE_WALL`, and both town-floor types return authoritative blocked results with zero damage; PlayScene keeps those repeated blocked attempts free of warning cards and `0 damage` floats; and the generated bedrock runtime visibly separates all four unbreakable tile types with its configured lift and cool tint.

`2026-07-26-town-square-runtime-contract.mjs` guards the approved Option A
promotion: a 1.75 m midpoint player reference, 2.10 m door calibration, five
unique absolute surface-merchant slots inside the opaque scenic square, and an
unchanged Level 2 Arc Core merchant.

`2026-07-26-shop-ui-uptime-contract.mjs` reproduces the overlapping Bobo and
Milestone Pillar input path with Phaser's consumptive `JustDown`: a blocked
pillar cannot discard `E`, Bobo must open `boboMerchant`, the live prompt,
visual, key, and shop collaborators must report ready, and the pillar still
opens normally when it is the selected target. It also proves the shop's
full-row mouse target matches the visible row, sits above its icon, labels,
status, and price, synchronizes the same selection state as keyboard input,
and routes every tab, row, page, action, and sell control through one
modal-depth-aware shared button primitive.

`2026-07-26-town-square-ground-fidelity-contract.mjs` guards the ground-only
correction: the v3 Town Square and v2 full-width PNG hashes, exact 1672x48
Option A crop, 129 px handoff, shared town/floor scale, semantic occlusion only
inside the thin surface cap (including shader depth rebinding), and unchanged
town beauty plus diggable underground facade.

`2026-07-26-npc-activity-runtime-contract.mjs` guards the promoted v13
accepted-only merchant runtime: original video/static idle baselines,
one-at-a-time scheduling, player reactions, fixed X/Y/rotation/display size,
scale-aware floor contact, shop coordinates, and anchor/contact health
publication. It rejects every archived quiet frame, walking path, and
whole-body wobble hook.

`2026-07-28-npc-v13-asset-grounding-contract.mjs` guards the 42 Piskel-polished
activity exports, six cleaned calm baselines, editable seven-frame Piskel
documents, sub-pixel root/bottom matching, zero green leakage, measured
Gem/Magma crop separation, and every merchant's manifest-derived foot line at
all supported player-profile display sizes.

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

`2026-07-16-scenic-resource-veins-smoke.mjs` keeps its compatibility filename while verifying generated raster resources and reward blocks as the default, independent damage cracks and non-reward markers, suppression of procedural ore geometry plus the legacy 94 px reward emblems, `?terrainSemantics=0` restoration of the approved ImageGen recognition atlas, and `?terrainSemantics=0&resourceVeins=1` as the only explicit procedural veins/nodules comparison.

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
than one traveling pulse, fades as it travels, spans more than ten tiles, never
drops the steady core, and leaves geode and other local lights proximity
limited.
`2026-07-27-star-block-pulse-quality-contract.mjs` verifies all six 1254 px
ImageGen colour sprites, lossless production paths, rarity-to-colour selection,
one pooled additive image, long-range flattened geometry, quiet-frame hiding,
complete cleanup, and the absence of Canvas, tint, or Phaser primitive drawing.
`2026-07-27-star-block-steady-colour-light-contract.mjs` verifies six unique
1254 px ImageGen atmosphere textures in production rarity order, Boot preload,
live rarity selection, a bounded pooled renderer above hard darkness and below
the rare pulse, restrained additive opacity, softly flattened reach beyond the
tile, cleanup, and the absence of Canvas, tint, or Phaser primitive drawing.
`2026-07-26-titan-discovery-contract.mjs` verifies all 25 unique alpha sprites,
the 512x320 generated plinth, deterministic non-overlapping clear-area zones,
`?titans=0`, canonical persistence without duplicate or unknown ids, journal
exposure, complete creature-cover clearance before visual unlock, pre-final-tile
award rejection, all 25 surface slots, real-art archive wiring,
discovered epithet/field-lore/inscription rendering with locked-entry privacy,
production-health publication, save requesting, scenic-runtime lifecycle wiring,
matching legacy-renderer lifecycle ownership, and complete cleanup.
`2026-07-26-titan-discovery-experience-contract.mjs` instantiates the production
world and verifies first-seven depth guidance, explicit 700 m coverage,
locked-name protection, remaining-cover guidance, final-cover-cell admission,
silent discovery guidance cleanup, `?titanGuidance=0`, and the stricter rectangular-clear
`?titanEncounter=legacy` rollback.
`2026-07-28-titan-guidance-indicator-contract.mjs` verifies exact camera-edge
ray projection in every direction, on-screen chamber anchoring, clearance from
the center notification and bottom XP HUD, restrained alpha/pulse, a
transparent 256 px ImageGen pointer, approved-frame reuse, preload wiring, and
the absence of routine carousel or Phaser-primitive pointer drawing.
`2026-07-26-titan-chamber-production-contract.mjs` verifies the complete 25-card
1536x848 v2 rollback and transparent-edge v3 production inventories, unique
hashes, alpha flags/chunks and bounded edge/center opacity, colossal 15-22 by
8-13 tile zones, Boot de-queuing, `?titanChamberBlend=0`,
`?titanChambers=0`, near-zone stream/load/release, shared depth-biome tint,
independent compact-creature/chamber layering, archive pinning, renderer parity,
both production manifests, post-render-safe texture eviction, and cancellation
of that eviction when rapid return travel makes the chamber resident again.
`2026-07-27-titan-clue-catalog-contract.mjs` verifies depth- and
purchase-escalated clue prices against the upgrade economy, atomic wallet
deduction/refund, index-only journal persistence, restore/re-track behavior,
locked-name protection, long-range exact directions, rollback, archive control,
autosave, and both renderer providers.
With `?jkd_e2e=1`, `Ctrl+Alt+U` supplies an isolated 5,000 M wallet and opens the
real pause catalog without writing the save, allowing the purchase control and
wallet deduction to be inspected directly.
`2026-07-28-titan-creature-footprint-contract.mjs` regenerates all 25 masks from
the actual approved PNG alpha and verifies exact row-mask parity, coverage
counts, no unlock while one covering tile remains, unlock on the final tile,
fixed real-art progressive reveal, independent chamber layering, remaining-tile
guidance, and production-health coverage.
With `?jkd_e2e=1`, `Ctrl+Alt+Y` advances a save-suppressed first-Titan preview
through sealed, partial, one-covering-tile-left, and complete states so the
progressive real-art reveal and final-tile trophy/archive transition can be
visually inspected.
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
constellation UI progress immediately, play the matching ImageGen rarity core,
fracture bloom, quiet pulse, and three delayed image echoes, sway slowly upward
through the configured fade, clean every transient image up, and never enter or
restore a persistent world pool.

`2026-07-13-earthquake-feedback-ui-smoke.mjs` verifies the compact generated-art
phase card, notification offset, auto-expiring escape guidance, silent event
completion, one-to-one landing footprints, ceiling fractures, authored boulders,
footprint persistence during the fall, exact-ground settling-boulder contact,
offscreen danger, restored-rubble lifecycle, trap dedupe, and medium shake key.

`2026-07-26-earthquake-feedback-lifecycle-contract.mjs` guards the v2 restrained
seismic presentation: nine generated RGBA runtime assets, Boot preload wiring,
320x60 short active-phase timing, silent completion, auto-expiring escape guidance, one quake-start
flash, no repeated warning/toast/emoji path, image-backed hazard/tile feedback,
ground/player/falling/settling/debris layer ordering, non-flattened footprint
readability, event-completion teardown, and
protection against a
restarted hide tween that could leave the card visible forever.

`2026-07-28-earthquake-polish-and-suppression-contract.mjs` verifies the
Level 99 + accepted-1000 m Seismic Suppression purchase gate, permanent upgrade
save round-trip, immediate active-hazard cancellation, debug-start rejection,
three distinct camera-culled authored tile effects, bounded pooling, PlayScene
lifecycle wiring, and the absence of primitive fallback drawing.

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
checks the ceiling-to-bottom one-tile Level 1/2 divider and locked gate cell,
rejects every stray underground bedrock cell, and samples deep Level 2 resource
rendering.
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

`2026-07-28-quickslash-facing-contract.mjs` repeatedly alternates A/Q and D/Q
against intentionally stale locomotion facing, proves the admitted direction is
locked while Q remains held, checks both authored source orientations in the
main-world and cave animation runtimes, and guards the complete removal of the
purple Quickslash route/GP preview.

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

`2026-07-28-mining-target-mouse-dig-contract.mjs` verifies the authored target
asset and preload, visual/input rollback queries, primary-pointer adjacency and
range safety, hover ownership, one-frame quick clicks, repeated held requests,
held retargeting, canvas-exit cancellation, hover/held visual modes, UI-hit
rejection, main-world/compact-cave wiring, and complete removal of the redundant
final-hit preview.

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
constellations for the first Heart, awards later Hearts at 20 and 50 completed
Engine activations, permits permanent ownership of all three choices, migrates
the legacy one-choice save, caps charge and every activation, prevents Engine
hits from feeding their own recharge, preserves bedrock, deduplicates mining
rewards, round-trips save v10, exposes the `?starHearts=0` rollback, and guards
the Boot/scene/pillar runtime wiring.

`2026-07-28-starlight-talent-tree-contract.mjs` proves the shared ESC/Pillar
tree contains ten unique material sections and three Engine options, gates the
automatic first-star reveal once per material and save slot, and publishes the
tree invariant through the runtime-canary worker route. It also guards the
three-page 5/5/3 data layout, exactly three widely spaced visible branch cards,
the native ultra-wide foundation ratio, enlarged cards and medallions, vertical
ESC page navigation, exactly one visible page, all 29 hash-pinned V3 texture
mappings, the dedicated three-bay Engine presentation, transparent
Engine/Heart/glyph/plaque assets, the generated Star Pillar shell, crest, close
rune, bespoke Bobo lock, authored controls, deterministic God Mode review
state, click-only horizontal selection, a one-loop steady-motion budget,
readable typography floors, quiet flank cards, center-first Engine activation,
and the absence of procedural tree panels or leaked black-core Engine textures.

`2026-07-28-constellation-upgrade-audit-contract.mjs` executes every permanent
constellation reward against its live gameplay consumer: matching Star Block
yield; all five Quick Slash damage, cost, movement, free-cast, and cadence
mutations; all five Thunder Strike range, two damage, falloff, and cost
mutations; its fixed one-lane footprint; protected-tile rejection; Bobo
prerequisite locks; banked mastery; God Mode bypass; both shared UI injection
paths; and the ability-provider runtime-health invariant.

`2026-07-28-starlight-talent-tree-visual-harness.html` renders the production
view and exact assets in first-reveal, mid-progress, and all-mastered profiles
for deterministic interaction and screenshot review across all three inner
pages. Add `&god=1` to verify free abilities, all three free Engines, and the
normal safety/health state without mutating a save. The harness deliberately
does not preload the generic UI atlas or black-background V1 celestial cores,
so those assets cannot hide an accidental tree regression.

`2026-07-26-godmode-abilities-contract.mjs` exercises the debug cheat through
the live activation methods: Flight, Quickslash, Thunderstrike, and torch are
unlocked and GP-free; every Celestial Engine can be switched and activated
without charge or save mutation; normal Engine caps and runtime-canary
invariants remain active; Citadel Storm supplies +10% Thunderstrike damage
without widening the protected-safe one-lane strike or restoring a retry; and
the retired Gem Dash stub is not registered.

`2026-07-26-boot-live-asset-health-contract.mjs` prevents the archived,
unused 3840x3840 Shadow Miner idle atlas from re-entering the production boot
queue while keeping the compact active sheet present. It is a required
structural-health worker check because the oversized dead atlas can stop
PlayScene from starting on constrained renderers.

`2026-07-26-modular-ground-damage-contract.mjs` guards the twelve visible
pre-break states, monotonic fracture/scuff/stress/flake progression, four masked
adaptive blend layers, all current material entries plus an unknown future
material, lifecycle cleanup, the `?groundDamage=legacy` comparison, and the
absence of erase, cavity, square-fill, material-ID, or texture-key coupling.
`2026-07-26-ground-damage-visual-harness.html` renders the production painter
over every current material in one continuous-row comparison, with intact plus
states 1 through 12, a fixed per-row fracture seed for honest cumulative
comparison, and a small readiness contract for browser visual QA.
`2026-07-28-ground-damage-old-vs-new.html` presents the frozen nine-state
production baseline beside the improved twelve-state runtime board, including a
dark-material detail crop; the matching PNG is the review-ready comparison.

`2026-07-26-thunderstrike-three-slam-contract.mjs` retains its compatibility
name while guarding the ten-slam chain: one 3x upfront cost, nine free
authorized follow-ups, the full base/effective damage curves, +20% damage per
timing success, sequential stage admission, doable Slam II-V windows, and the
increasingly severe Slam VI-X windows. It also verifies the 180 ms opening
anticipation, visible-needle input authority, left-to-right challenge restart,
immediate first-miss/timeout cancellation with zero retries, movement/Escape
cancellation, direct floor contact, authored target/needle components, ten v3
milestone/glyph/backplate assets, absence of timing-view `Graphics` primitives,
approved I/V/X milestone UI, and shared main-world/cave timing-HUD and impact-FX
wiring.
`2026-07-26-thunderstrike-chain-visual-harness.html` renders that production UI
without the full Boot asset graph; Space animates the left-to-right needle, R
restarts it, 2-9/0 selects Slam II-X, Left/Right steps between slams, and M
shows the immediate `CHAIN ENDED` failure state.

`2026-07-26-opening-flight-golden-five-contract.mjs` keeps deterministic
rollback coverage for the rejected Golden Five seam, route, Flight bank, and
generated assets while asserting that production setup never routes spawn into
that shaft and no rejected copy remains in the HUD.
`openingFlightGoldenFiveFixture.mjs` keeps its deterministic world, scene, and
view doubles reusable without inflating the executable contract.
`2026-07-26-opening-flight-polish-visual-harness.html` renders the production
route and reward-reveal views together at 1280x720 for chest grounding, ring
scale, and center-message visual QA without depending on full-game boot.

`2026-07-28-town-tutorial-position-persistence-contract.mjs` guards new-save
Tutorial Yes/No routing, the real move/dig/sell/upgrade progression, completed
and skipped reload behavior, exact underground pixel-position/GP persistence,
Town Square fallback wiring, and the awaited save-before-main-menu path.

`2026-07-28-earthquake-dodge-audit.mjs` executes the leading-edge swept
rock/body hit boundary and all-GP consequence. It guards current-frame movement
before collision, independent wide-collapse validation, complete 1/2/8/21-rock
visual coverage, the 223 ms open-space clear time, ground-top landing, and
occupied-rubble retry instead of silent loss.

`2026-07-26-heavenblocks-visual-layout-contract.mjs` guards the three
non-overlapping native sky regions, 51 unique modular preload assets,
cell-level damage/dug view removal, deep-relic render isolation, authored
portal activation, Phaser display-scale preservation, cleanup, and the absence
of the deleted baked facade runtime.

`2026-07-29-heavenblocks-native-world-contract.mjs` executes the complete
production path: 3,881 model cells, collision, HP, six resources, safety
floors, locked damage/direct entry, three-relic activation, all regions and
parts, both Arc Forge recipes, three vaults, Zenith Keystone, schema-v13 save
sanitization, 51 hashed assets, and every PlayScene lifecycle hook.

`2026-07-26-pause-settings-layout-contract.mjs` guards REDUCED floating text as
the uncluttered default, explicit FULL/OFF preservation, persistent
selected-state styling, responsive non-overlapping settings tabs, camera-event
controls, and the full-height ESC modal layout.
`2026-07-26-pause-settings-visual-harness.html` renders that same production
modal shell, tab bars, controls, persistence path, and Gameplay selection in an
isolated Phaser scene so UI review is not blocked by unrelated game assets.

`2026-07-28-ui-notification-carousel-contract.mjs` guards the single-card
bounded queue, severity preemption, consumptive arrows, full-queue `X` clearing
even during enter/switch/expiry races, fresh seven-second selection timers,
centered default placement, modal pause/resume, immediate keyboard capture,
directly interactive visible control art, approved control surface without
duplicate browse/delete labels, the strict popup purge, and
main-world/compact-cave routing.

`2026-07-27-manual-save-transfer-ui-contract.mjs` guards the visible Start Menu
export/import row, the responsive Esc-menu `SAVES` tab, five-tab safe width,
backup-before-overwrite import semantics, and the reload-after-import path.

`2026-07-26-cave-resource-hazard-darkness-contract.mjs` guards deterministic
real-resource seams, authored-cell protection, live mining HP, challenge
density and checkpoint safety, all three hazard grammars, all-GP failure
recovery, synchronized hazard lights, and distinct cave darkness rhythms.
`?jkd_e2e=1` disables all save writes; F2 (or Ctrl+Alt+C) cycles live cave
hazards and F3 (or Ctrl+Alt+V) enters the selected hazard for consequence
validation. F4 cycles directly through one timed gate, spike run, and ember
vent for visual comparison.

`2026-07-26-surface-props-contract.mjs` guards all 25 live paths, dimensions,
WebP alpha modes, physical player-relative scale, 2.10 m town-door and 2.20 m
walk-through clearance, 34 Level 2 named-variant authored placements, the prop-free
Level 1 Titan Walk corridor, protected interaction zones, both complete surface
ranges, maximum visual gaps, exact production-world support under all 34 prop
footprints, camera cleanup, runtime lifecycle, and all rollback queries. With
`?jkd_e2e=1`, `Ctrl+Alt+F10` cycles representative modular prop clusters across
both levels; plain `F10` retains its existing surface benchmark sequence.

`2026-07-28-additive-surface-landscape-contract.mjs` verifies the seven
versioned ImageGen WebPs against their SHA-256 manifest, proves that they extend
rather than replace the original kit, enforces portal/Titan and low-profile
footprint limits, checks the six approved-atlas atmosphere anchors and their
independent rollback, and exercises runtime streaming/cleanup without allowing
procedural substitute art.

`2026-07-28-natural-surface-and-drop-through-contract.mjs` guards the three
bounded size variants, irregular cluster/breathing-gap rhythm, full rendered
Titan Walk exclusion, continuous one-way support over dug top cells, AIR-only
S dropping, bedrock/occupied-row rejection, town-floor save protection, and
the `?surfaceDrop=0` rollback.

`2026-07-28-titan-surface-gallery-polish-contract.mjs` guards the 25 unique
ImageGen surface-only stance WebPs, alpha/dimension/hash inventory, the compact
shared underground basalt dais, at least ten bounded per-Titan scale values,
transparent-bottom ground contact, near-opaque normal-blend unlocked textures,
town clearance, the complete prop-free Level 1 corridor,
player-above-display layering, and the absence of Phaser-drawn creature
substitutes.

`2026-07-28-titan-underground-presentation-v2-contract.mjs` guards reuse of the
25 sharp 768px stances underground, the compact ImageGen basalt dais and
resonance overlay alpha assets, dais-to-Titan scale, colored glow only on
remaining authoritative cover cells, exact odd/even 50% thresholds, automatic
remainder destruction, and removal of chamber-cover count instructions from UI.

`2026-07-28-titan-lore-and-statue-inspection-contract.mjs` guards all 25 unique
epithets, inscriptions, and expanded archive accounts; unlocked-only surface
prompts; remapped interact handling; approved notification copy; nearest-target
renderer arbitration; locked privacy; and the `?titanStatueLore=0` rollback.
With `?jkd_e2e=1`, `Ctrl+Alt+I` teleports save-safely to the first unlocked
plinth using the production gallery coordinates for direct prompt/card review.

`2026-07-27-star-block-destruction-quality-contract.mjs` pins the approved
Choice 1 revision, six normalized release cores, retained fracture art, a
94 px block envelope with an exact 94 px one-to-one visible release, about-136 px peak,
10.8-second-plus ascent, six authored-image echoes, atlas/manifest hashes, and
the complete absence of
Phaser circles/graphics/tints/generated textures in the production Star Block
destruction path. With `?jkd_e2e=1`, F5 plays that exact image-only release
without awarding or persisting a star; F6 retains the non-destructive semantic
target preview. `2026-07-28-star-block-release-visual-harness.html` runs the
same production `FloatingTextSystem` and `SkyStarReleaseView` with the exact
tile atlas, core, fracture, and pulse assets in an isolated no-save scene.

`2026-07-28-moving-side-dig-production-contract.mjs` guards the approved
Option C promotion: two editable 22-frame Piskel clips over the original
14-frame Jog phase advance, seven-frame upper-body enter/release envelopes,
1 px maximum foot-baseline drift, pelvis-derived rig markers, 8 px contact
backoff, 2 px visible-fist clearance, profile/loader registration, selector
eligibility in both world modes, unchanged 360 ms minimum cadence, and
`?movingSideDig=0` rollback.

`2026-07-28-phase-handoff-production-contract.mjs` guards the approved production
handoff: eight entry variants, one 132-frame compact atlas, at most two Jog frames
of phase quantization, exact `23 -> Jab 24 -> Jog 10` entry/resume, immediate
facing plus planted `20 -> 21` pivot, frame-6/original-foot-phase contact parity, Piskel
anchor/baseline limits, main-world/cave wiring, and `?phaseHandoff=0` rollback.

`2026-07-28-player-animation-polish-production-contract.mjs` guards the complete
follow-up pass: 61 centralized transition frames, 120 moving-diagonal frames,
two-frame planted start/stop and action-settle clips, four phase variants per
diagonal family, authored soft/hard landing ownership, wall-brace release phase,
Piskel round-trip metadata, anchor/baseline limits, both runtime worlds, and
every parent/per-feature rollback.

`2026-07-28-weather-world-precipitation-contract.mjs` exercises the production
ImageGen rain, snow, splash, ripple, and powder routing with Phaser-independent
scene stubs. It verifies world-coordinate terrain and roof collisions, visible
snow impact events, scroll-factor-1 actors, winter-only natural weighting,
forced-snow support, the clean 32-frame particle manifest, measured transparent
frame bounds/source density, and sampled landing rows against the generated
production `WorldModel.isSolid` grid.

`2026-07-28-weather-swept-collision-contract.mjs` proves high-speed segment
traversal through a real AIR shaft, first-solid contact below that shaft,
diagonal tile entry, width-aware snow/rain edge contact, and correctly oriented
world-space wall impacts without spawning a horizontal ground ripple. With
`?jkd_e2e=1`, F12 forces the production snow phase for save-safe live review;
F11 retains the clear-weather benchmark.
`2026-07-28-backdrop-mask-coverage-contract.mjs` locks the cropped blend-mask
frame to the complete scenic backdrop card, including tail cards, and cancels
its Phaser atlas offset at the display origin. It also proves horizontal and
cross-biome joins keep the retained card opaque, feather only the incoming
left/top edge, and use deterministic depth order rather than a double-fade cut.

`2026-07-28-whole-world-visual-expansion-v5-contract.mjs` guards all 100
pixel-distinct ImageGen masters, 111 built runtime files, exact biome
allocations, additive V2/V3/V4 retention, isolated rollback switches,
terrain-mask ownership, non-mirrored surface placement, and the 128 px
cross-biome material overlap.

`2026-07-28-sky-underground-cohesion-runtime-contract.mjs` guards all thirty
unique additive assets, the gap-free 18x8 native-density sky field, balanced
use of all twenty sky images, ten dedicated native-density terrain-masked biome
placements, immutable world coordinates, complete source frames, opaque world
edges, and incoming-only sky transition masks.

`2026-07-29-surface-backdrop-fallback-contract.mjs` guards an opaque scenic
fallback from the first underground row while the requested biome card streams,
then verifies clean replacement and generic-material last-resort behavior.

`2026-07-28-performance-foundation-contract.mjs` additionally guards
visible-card scenic demand and its rollback, cancellation of obsolete queued
loads, complete five-cache health accounting, exact-state setter suppression,
thirty-frame phase sampling, supplied-light reuse, and stable-window sync
skipping. The sky/terrain/structure contracts remain the image-quality
authority for the optimized paths.

`2026-07-29-guarded-git-rollback-contract.py` creates isolated repositories to
prove that a green guarded commit persists and that a deliberately failed
post-commit gate creates an exact clean `git revert`. The production
Heavenblocks health gate runs the native contract, every game contract, the
production builder, and an isolated HTTP canary before and after committing.
