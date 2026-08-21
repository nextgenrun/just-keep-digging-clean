# Testing

- `2026-08-20-mixamo-locomotion-comparison-contract.mjs` guards the five new
  V4-retargeted walk/run/crouch-walk/jump/falling review carriers, 1024-to-256
  one-pass packing, zero green pixels, clipping/residual gates, the complete
  13-row synchronized comparison, the no-jump boundary, and zero runtime
  references.

- `2026-08-19-critical-feedback-fixes-contract.mjs` guards the clock-only HUD,
  complete removal of weather UI actors/assets/constants, Thunderstrike on V
  with Shift+V reserved for God Mode, first-use ability-asset buffering, free
  God Mode Star Pillar talent purchases, and removal of the recent level-up
  reward sound. The runtime asset coordinator contract additionally proves
  that diffuse/normal pairs bypass bitmap activation and do not settle on the
  diffuse-only file event.

- `2026-08-03-celestial-talent-tree-ui-contract.mjs` now guards the socket-free
  V2 foundation, 33 resident node icons, Pillar-matched node frame, restrained
  connector, and unchanged three-branch runtime topology. The 2026-08-14
  visual harness renders the exact production view at wide and compact sizes.

- `2026-08-14-understar-ending-contract.mjs` guards the reachable 2,000 m demo
  bound, enormous 1672x941 authored backdrop, fail-closed save state, codec
  round trip, Interact priority, ordinary-cinematic suppression, raster-only
  finale UI, module budgets, and save-safe E2E installation order.
- The save-safe `window.__jkdE2E.previewUnderstarEnding()` hook moves the real
  PlayScene player to displayed depth 2,000 m, advances the production ending
  system once, and returns both scene and ending state for visual/runtime QA.
  `Ctrl+Alt+E` invokes the same preview without browser-script access.

- `2026-08-14-survival-animation-global-polish-contract.mjs` pins all 78
  current Survival/UAL animations and 1,617 referenced frames, proves the
  lean-wall loop registers from a loaded sheet, preserves the 101–123 px
  reviewed scale band and 31x75 collision body, and verifies the profile-local
  1.12-tile marker-fitted run stride plus the 107 px standing-quickslash size
  continuity calibration. It also locks the measured 101/119/104/114/123 px
  idle/start/walk/run/stop display cells that remove locomotion size pumping.

- `2026-08-14-material-lighting-polish-contract.mjs` guards the additive-only
  Phaser material-response pass, its below-darkness ordering, conservative
  highlight/lighting ceilings, SSOT uniforms, and `?materialLighting=0`
  rollback.
- `2026-08-14-material-lighting-webgl-harness.html` compiles, links, draws, and
  samples the production material fragment in real WebGL so a shader setup
  failure cannot be mistaken for a successful visual fallback.

- `2026-07-22-deep-game-logic-health.py --lane demo-release` is the strict
  production-demo gate. `--lane full-compat` and `--lane artifact-review`
  accept only the exact reviewed failure hashes in
  `2026-08-12-contract-lanes.json`; a new test, changed failure, or resolved
  baseline fails until it is deliberately classified.
- `2026-08-12-architecture-ratchet.mjs` blocks missing imports, cycles, new
  layer violations, larger oversized modules, new direct scene-state/storage
  writers, and unclassified unreachable runtime modules.
- `2026-08-12-gameplay-capabilities-contract.mjs` proves production cannot
  select the local `full-review` profile. The NPC shop interaction contract
  executes merchant selection and overlay admission instead of pinning source
  spelling in the production HTTP canary.
- `2026-08-12-scene-runtime-stability-contract.mjs` injects presentation and
  persistence failures, proves phase ordering/quarantine/safe blocking, checks
  nested suspension restoration, and verifies idempotent reverse teardown plus
  the world-to-UI composition boundary.
- `2026-08-12-save-v15-integrity-contract.mjs` proves one-time v14 sidecar
  migration, v15 primary authority, monotonic/out-of-order save rejection,
  interrupted-write recovery, corrupted payload rejection, rounding, numeric
  bounds, and duplicate reward protection.

- `2026-08-11-demo-mode-contract.mjs` proves the current default-on development
  demo excludes Level Two, its gate and saved portals, and Arc Core/Omega
  content while admitting local V-key God Mode and F9 screen recording across
  state, UI, input, rendering, preloading, world bounds, and save restoration.
- `2026-08-11-demo-intro-recovery-contract.mjs` locks the clean aligned Inventory
  and ESC controls, integrated new-expedition choices, typed Skip/hidden One-Life
  guards, seven-beat route, no-bank Skip, durable Hardcore lives, and restored
  canonical design authority.
- `2026-08-11-new-run-setup-visual-harness.html` isolates the authored 2×2
  empty-slot decision panel for pointer, keyboard, typed-Skip, hidden One-Life,
  alignment, and screenshot review without touching real save slots.

## First five minutes — 2026-07-30

- `2026-07-30-first-five-onboarding-contract.mjs` locks the default-on and
  `?firstFive=0` profiles, in-camera normal-HP target, persistent objective,
  remapped control copy, tutorial-specific surface gate, saved Flight practice,
  guaranteed 15 m first portal, seven real action stages, and Next Promise priority.
- `2026-07-30-first-upgrade-breakpoint-contract.mjs` exercises the real
  `UpgradeSystem` handoff: an early purchase cannot skip the route, the authored
  Upgrade beat advances only from a real purchase, no money is injected, and
  legacy Miner's Grip remains hidden/save-compatible.
- The town persistence and retention fixtures complete MOVE, DIG, FLIGHT,
  PORTAL, SELL, UPGRADE, and RESUME without an injected wallet/resource reward.

## Playtester feedback implementation — 2026-08-02

`2026-08-02-playtester-feedback-implementation-contract.mjs` guards the full
seven-stage route, versioned legacy-stage migration, deterministic 15 m first portal,
nonblocking multi-level rewards, disabled generic notification admission,
optional narration hooks, unchanged Depth Gates and combo duration, and
physical removal of Level Up, Star-discovery, and Flight-reminder views.
`2026-08-03-player-progression-regressions-contract.mjs` guards hard-material
dig audio, the guaranteed and repeatedly repaired 15 m tutorial portal,
Titan-only Escape ownership, the always-available Milestone Pillar, lenient
early/midgame shop lanes, and protected hazard/endgame upgrades.
`2026-08-02-combo-block-reward-contract.mjs` keeps the authoritative +combo
result and output fields while proving it creates no forced popup.
`2026-08-03-tutorial-town-exit-flight-reminders-contract.mjs` now guards only
the reversible MOVE/DIG/FLIGHT/PORTAL Town boundary, exact restoration at SELL, seven-stage bridge
wiring, and the absence of notification/reminder/upgrade bypasses.
`2026-08-03-main-menu-return-contract.mjs` reproduces the former double scene
start and guards one shared save promise, one forced flush, one MainMenuScene
transition, and graceful continuation after a save-teardown error.

## Fire Light V3 — 2026-07-30

`2026-07-30-fire-light-v3-contract.mjs` locks all ten exact 1252x1252 ImageGen
atlases and 160 retained components, spritesheet wiring, character-aware socket,
compact flame limits, default-hidden ray allocation, real exposure response,
three-layer material default, natural rollback, lifecycle cleanup,
class separation, line budgets, complete legacy rollback, and the exact former
layered profile.

`2026-07-30-natural-fire-light-contract.mjs` proves natural fire displays only
its authored flame, hides volume/atmosphere/expanded illumination, uses 0.98
world glow, 0.96 shader energy, and 0.24 adaptation overlay, while
`?fireLightStyle=layered` restores all eight possible authored layers.

`2026-07-30-fire-illumination-textures-contract.mjs` locks the retained 80
light-only frames, 96 total authored illumination frames, layer/state routing,
missing-asset fallback, Boot wiring, and `?fireLightTextures=0` inside the
explicit `?fireLightStyle=layered` rollback profile.

`2026-07-30-fire-light-piskel-anchor-contract.py` verifies ten editable
projects and all 160 frames: exact Piskel round-trip, hidden anchor guides,
integer-only registered shifts, three-pixel black borders, retained-light
energy, per-group drift/error limits, hash-linked byte-exact rollback, candidate
exports, promoted runtime parity, and recorded apply/rollback commands.

`2026-07-30-fire-light-v3-live-qa.mjs` drives the real save-safe E2E harness in
hidden Edge, moves the player to valid underground standing air, activates the
torch at full GP, verifies every authored atlas response and runtime snapshot,
and captures natural default, explicit `?fireRays=1`, adaptation-off, full
`?fireLightStyle=layered`, and complete legacy scenarios at one deterministic
target.

`2026-07-30-natural-fire-live-compare-contract.mjs` locks the dedicated
natural-versus-legacy page, queries, two real iframe routes, shared values-only
runtime, separate saves, synchronized controls, default-hidden rays, and line
budgets. `2026-07-30-natural-fire-live-compare-qa.mjs` cold-boots both real
Phaser/WebGL worlds, verifies identical tile/camera/day-night state, one versus
zero authored layers, 0.96 versus 1.0 procedural shader energy, low-GP rain/night,
torch-off adaptation, final resync, 20 successful lighting responses, and three
comparison screenshots. Its only generic browser misses are two `favicon.ico`
requests.

`2026-07-30-natural-fire-deep-live-qa.mjs` drives the same two real worlds
through settled standing-air targets near 700, 1000, and 1800 m plus a 1000 m
low-GP state. It normalizes sequential boot easing without freezing flame or eye
adaptation, checks each radius against the authoritative piecewise depth curve,
and records identical settled reach of 3.412, 3.021, and 2.973 tiles at darkness
alpha 1. All twenty Fire assets returned HTTP 200; depth streaming intentionally
aborted outgoing biome-video requests during jumps, with no UI or fatal errors.

## Material lighting runtime A/B - 2026-08-15

`2026-08-15-material-lighting-live-compare.html` boots the previous
`natural-fire-v1` and production `material-lighting-v1` in deterministic real
Phaser/WebGL worlds. `2026-08-15-material-lighting-live-capture.html` provides
full-width before/after captures at the same generated standing tile, weather,
day phase, camera, GP profile, and gameplay darkness. The after route must
report three authored layers; the `?fireLightStyle=natural` before route must
report one.

## Old-school lamp light review — 2026-07-30

`2026-07-30-old-school-lamp-light-contract.mjs` locks seven conditional
atlases, 112 authored components, the separate class boundary, query-only
selection, default-hidden ray allocation, explicit collision-clamped ray opt-in,
exposure participation, shader snapshot, and unchanged natural-fire fallback.

`2026-07-30-old-school-lamp-piskel-contract.py` verifies all seven editable
Piskel authorities, 112 exact round-tripped frames, integer-only registration,
subpixel group ranges, true-black cell borders, retained light energy, runtime
parity, and hash-linked source rollback.

`2026-07-30-old-school-lamp-light-live-qa.mjs` captures isolated real-WebGL
torch and lamp pages at the same underground standing tile and full GP. It
checks both runtime IDs, darkness, eye adaptation, all seven asset responses,
zero default rays, shader selection, browser health, and renderer type.

`2026-07-30-old-school-lamp-live-compare-contract.mjs` locks the live A/B page,
two real iframe routes, shared world identity, separate saves, synchronized
controls, default-hidden rays, day/dusk/night, and the 300-line runtime budget.

`2026-07-30-old-school-lamp-live-compare-qa.mjs` cold-boots the two real
Phaser/WebGL worlds, verifies identical tile, camera, and solar phase, measures
the compact fire envelope, drives full/low GP, clear/rain/storm, day/dusk/night,
torch-off eye adaptation, resync, and captures three synchronized screenshots.
The final run served all 27 lighting assets with HTTP 200 and reported no UI
errors; the only generic console misses were two root-frame `favicon.ico`
requests.

## Ground damage Piskel anchor V2 — 2026-07-30

- `2026-07-30-ground-damage-piskel-anchor-v2-contract.py` verifies ten
  twelve-frame editable projects, corrected source-grid row boundaries,
  invariant `94,94` pivot/seed mapping, cumulative coverage, edge safety,
  pixel-identical Piskel round-trip, hashes, and no production reference.
- `2026-07-30-ground-damage-piskel-anchor-v2-harness.html` uses
  `WorldVisualDamageImagePainter` with a review-only config so Phaser/WebGL
  exercises the exact production placement and display-size contract without
  modifying runtime values or preload registration.
- `2026-07-30-ground-damage-piskel-polish-contract.py` verifies the immutable
  272 px source, editable 272 px polish, derived 188 px round-trip, fixed seeds,
  shared family matrices, safe 180 px envelope, recovered scales, and production isolation.
- `2026-07-30-ground-damage-piskel-rollback-contract.py` verifies all ten
  hash-linked rollback Piskels, apply/rollback commands, and the production atlas guard.
- `2026-07-30-ground-damage-piskel-production-contract.mjs` proves the approved
  review atlas was promoted byte-for-byte, default and rollback preload
  descriptors share the exact 10x12 slicing contract, placement remains centered
  at 94x94, Boot queues only the selected atlas, and the radial renderer remains
  available through `?groundDamage=legacy`.
- `2026-07-30-ground-damage-piskel-production-harness.html` renders all nine
  materials and all twelve states through the real production resolver and
  `WorldVisualDamageImagePainter`. Add `?groundDamageAtlas=legacy` to exercise
  the narrow atlas rollback in the same painter.
- `2026-07-30-ground-damage-piskel-production-live-visual.mjs` launches the
  browser twice, validates both 120-frame/188 px/94 px runtime snapshots and
  HTTP 200 atlas responses, rejects browser errors, and captures the polished
  default plus V1 rollback boards under
  `visual-approval-previews/ground-damage-piskel-production/`.

`2026-08-03-loading-minigame-archive-contract.mjs` guards the restored regular
loader, absence of active minigame imports/preloads, complete reversible archive,
and retained pause-feature loading chrome. Historical minigame contracts,
harnesses, live QA, and captures are stored under
`archive/2026-08-03-loading-mining-minigame/testing/`.
Supplying `--game-url` adds a
real BootScene pass that requires the live diagnostic and all 27 textures while
Boot is active.

`2026-07-30-runtime-feature-asset-tiering-contract.mjs` guards default and
rollback selection, every real demand-group path, the deferred Boot guards, Star
Block FX, slot-aware current/next Campfire loading, managed versus external
texture ownership, cancellation, delayed eviction, and lazy full-rarity exact-art
renderer recovery.

`2026-07-30-play-scene-save-scheduling-contract.mjs` proves repeated state
mutations collapse into one debounce/idle request, the maximum delay remains
bounded, timing samples remain visible, hidden/page-hide lifecycle events force
fresh saves, and setup retains immediate shutdown persistence.

`2026-07-30-surface-hero-landmarks-v4-contract.mjs` guards all seven Level 2
chapter RGBA cutouts, exact dimensions/hashes, production player-relative scale,
high source density, deterministic grounding, live-portal depth/opening safety,
Titan/portal exclusions, one hero per chapter, conditional preload, and
complete/per-landmark rollback resolution.

`2026-07-30-surface-hero-landmarks-v4-runtime-contract.mjs` guards static
transforms, no repeated visual writes, exact ID-based prop replacement, scenic
runtime lifecycle wiring, preload wiring, and clean teardown.

`2026-07-30-surface-hero-landmarks-v4-live-qa.mjs` launches an isolated hidden
Edge profile, enters a no-tutorial save with `?jkd_e2e=1`, captures all seven
Level 2 chapters at their exact authored tiles, repeats the same views through
`?surfaceHeroLandmarksV4=0`, and emits screenshots plus runtime health, texture,
suppression, grounding, and browser-error evidence under `tmp/` by default.

`2026-07-29-runtime-audio-streaming-contract.mjs` executes the real 144-track
playlist and complete voice catalog. It guards the default 15-file/under-40-MiB
Boot working set, all 292 registered audio entries, `?runtimeAudioQueue=0`
eager rollback, one-at-a-time fallback and shared-coordinator loads, cached
voice playback plus post-line prefetch, and delayed low-priority next-track
music prefetch. It also guards selected-only menu-background loading and the
byte-identical canonical texture shared by the semantic and tile bedrock
consumers.

`2026-07-29-runtime-asset-load-coordinator-contract.mjs` guards the three-load
decode bound, serialized rollback, scenery-over-optional-FX priority, key
deduplication, obsolete-request cancellation, full 1672x941 source preservation,
premultiplied bitmap decode, serialized activation, Phaser fallback isolation,
decoded-source release, all-seven-cache telemetry, coordinated facade materials,
staged Heavenblocks presentation, Titan cancellation, long-task metrics, and
both loading rollbacks.

`2026-07-30-natural-depth-area-composition-contract.mjs` guards broad default
areas, bounded within-area motifs, complete approved-library participation over
descent, exact one-step rollback, and profile wiring across modern backdrop,
terrain, and ground-structure views.

`2026-07-29-underground-detail-library-v6-contract.mjs` guards the 400-entry
ImageGen library, twenty production atlas hashes, 90+50 complementary seam
derivatives, deterministic terrain-masked placement, and complete per-biome
frame participation. Every 320x256 detail frame must keep uniform aspect and a
source scale at or below `1`; localized and guaranteed multi-tile classes retain
separate bounded ranges without changing gameplay or saves.

`2026-07-29-expanded-cave-level-contract.mjs` guards the default 60x20 cave,
zero in-bounds `CAVE_WALL` cells, four fully mineable dirt/stone floor rows,
embedded rewards, migration, and all six identity routes. It also proves three
distinct authored 3:1 interiors remain available, exactly one continuous image
spans a cave, the approved left entrance stays wired, five-tile material runs
prevent checkerboards, and repeated Meshy cards or giant shell actors cannot
return.

`2026-07-29-world-texture-native-density-contract.mjs` reads the real cave,
surface, Heavenblocks, Titan, standard sky-island, and living-atmosphere source
files. It fails if any corrected scale ceiling exceeds `1`, exact native
geometry drifts, a surface overlap no longer closes, or an ambient frame would
be displayed larger than its source.

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
or mutating a save. `?mode=memorial` renders the production full-screen grave
inspection with representative overview/stat/achievement pages. Add
`&threshold=100`, `300`, or `1000` to review each depth phrase.

`2026-07-28-ui-notification-carousel-contract.mjs` guards the centered one-card
compatibility implementation, complete-queue close, consumptive navigation,
modal pausing, interrupt safety, strict producer purge, mouse/touch drag
lifecycle, and the disabled production construction/admission gate.

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

`2026-07-28-hardcore-permadeath-contract.mjs` now guards explicit integrated
mode selection, Flight-delayed arming, Casual no-loss behavior, Hardcore free
revive then 2→1→0, One-Life 1→0, durable exhausted saves, stress/GP drain,
paid teleports, typed 50% unstuck, exact position/fractional-GP persistence,
active-oath rollback rejection, one-second checkpoints, non-destructive death
bridge wiring, legacy purge API isolation, cross-slot preservation, and approved art.

`2026-08-21-hardcore-death-transaction-contract.mjs` reproduces the death-time
save lock and proves ordinary writes remain blocked, only the exact death
transaction crosses it, a failed remote write leaves one durable local life
decrement, retry resends that same revision, and readback verifies transaction,
lives, revive, death-count, and exhaustion fields before UI release.

`2026-07-28-hardcore-memorial-contract.mjs` guards complete stat and bounded
Journey-achievement recap coverage, duration/run-counter formatting,
append/read-only memorial persistence outside save slots, per-slot/global
bounds, permanent grave/button assets, exact 0.8-tile player-matched world
height with preserved aspect ratio, visible-alpha ground contact, airborne
death floor search, re-grounding after mined support, full-screen inspection
input/control restoration, scene lifecycle wiring, both death actions, and the
absence of primitive placeholder art in the new views.

`2026-07-29-hardcore-gp-reserve-contract.mjs` guards the armed-only one-GP
Flight/Torch floor, full startup-plus-upkeep Flight admission, shutdown instead
of free Flight, torch shutdown without auto-relight flicker, unchanged Casual
zero-GP behavior, and final-GP lethality for stress and Hardcore hazards.

`2026-08-21-ui-layer-ownership-contract.mjs` proves the ordered active stack,
one-layer-per-Escape closure, random-event ownership, close-failure containment,
debug-only diagnostics, explicit F10 fullscreen routing, and idempotent combo
pause/resume with unchanged remaining time.

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

`2026-08-02-shop-catalog-integrity-contract.mjs` pins the complete Money
Monster (6), Gear (7), and Bobo (8) catalog IDs across fresh and progressed
saves. It verifies locked rows remain visible with conditions, five-item page
unions and wraparound selection retain every row, Page Up/Page Down never
conflict with interact-to-purchase, complete Gear requirements are rendered,
locked and cross-merchant purchases cannot mutate money/resources/levels, and
the Level-2 Arc Forge refuses direct opening at 999m but opens at 1000m. Both
shop uptime and general quality workflows run this contract with pacing and
Level-Two operational coverage.

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
`2026-07-26-star-block-light-persistence-contract.mjs` verifies th…3766 tokens truncated… parity.

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

`2026-07-28-starlight-talent-tree-contract.mjs` proves the physical Star
Pillar contains ten unique material sections and three Engine options, while
Escape contains the Titan Archive and no Talents page. It gates the automatic
first-star reveal once per material and save slot and publishes the tree
invariant through the runtime-canary worker route. It also guards the three-page
5/5/3 data layout, exactly three widely spaced visible branch cards, the native
ultra-wide ratio, physical-Pillar content bounds, measured alcove centers,
visible-alpha sign centering, enlarged cards and medallions,
exactly one visible page, all 29 hash-pinned V3 texture mappings, transparent
Engine/Heart/glyph/plaque assets, the dedicated three-bay Engine presentation,
generated Pillar shell, crest, close rune, bespoke Bobo lock, active-only
navigation chrome, center-only ribbons, deterministic God Mode review state,
click-only horizontal selection, a one-loop steady-motion budget, four-row
dossier typography floors, quiet flank cards, center-first Engine activation,
and no procedural tree panels or leaked black-core Engine textures.

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
pages. Add `&shell=pause` only for an isolated comparison shell; it is not
wired into the current gameplay Escape menu. Omit it for the physical Star
Pillar shell. The harness
publishes the resolved layout scale and bounds for exact wide/compact checks.
Add `&god=1` to verify free abilities, all three free Engines, and the normal
safety/health state without mutating a save. It deliberately does not preload
the generic UI atlas or black-background V1 celestial cores, so those assets
cannot hide an accidental tree regression.

`2026-07-26-godmode-abilities-contract.mjs` exercises the debug cheat through
the live activation methods: Flight, Quickslash, Thunderstrike, and torch are
unlocked and GP-free; every Celestial Engine can be switched and activated
without charge or save mutation; normal Engine caps and runtime-canary
invariants remain active; Citadel Storm supplies +10% Thunderstrike damage
without widening the protected-safe one-lane strike or restoring a retry; and
the removed Gem Dash API is absent and no HUD path advertises it.

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
Tutorial Yes/No routing, the real move/dig/Flight/portal/sell/resume progression, completed
and skipped reload behavior, exact underground pixel-position/GP persistence,
Town Square fallback wiring, and the awaited save-before-main-menu path.

`2026-07-28-earthquake-dodge-audit.mjs` executes the leading-edge swept
rock/body hit boundary and all-GP consequence. It guards current-frame movement
before collision, independent wide-collapse validation, complete 1/2/8/21-rock
visual coverage, the 223 ms open-space clear time, ground-top landing, and
occupied-rubble retry instead of silent loss.

`2026-07-26-heavenblocks-visual-layout-contract.mjs` guards the three
non-overlapping sky regions, complete background/facade loading and cleanup,
visual rollback, gate/prompt drawing, relic projection, transit, component and
vault animation lifecycles, and presentation health publication.

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
duplicate browse/delete labels, the strict popup purge, disabled default
construction, and main-world/compact-cave compatibility routing.

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

`2026-08-02-titan-underground-grounding-polish-contract.mjs` guards all 25
explicit region mappings, the 75 reused V7 arch/crown/hanging assignments,
all 30 selected alpha WebPs, both shared RGBA grounding assets, 56-item full
preload, bottom anchoring, depth tinting, `?titanEnvironment=0`, raster-only
resonance, and removal of long lateral/idle drift motion.

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
14-frame Jog phase advance, restored 109/123 apparent-size normalization,
body-locked moving contacts, a 16-frame phase-aware moving Quickslash at its
original sequence-4 contact, seven-frame upper-body enter/release envelopes,
1 px maximum foot-baseline drift, pelvis-derived rig markers, 8 px contact
backoff, at least 1.5 px visible-fist clearance, symmetric 21 px authoritative body
stand-off and solid-target release, profile/loader registration, selector
eligibility in both world modes, unchanged 360 ms minimum cadence, and
`?movingSideDig=0` rollback.

`2026-07-28-phase-handoff-production-contract.mjs` guards the approved production
handoff: eight entry variants, one 132-frame compact atlas, at most two Jog frames
of phase quantization, exact `23 -> Jab 24 -> Jog 10` entry/resume, immediate
facing plus planted `21 -> 22` pivot, frame-6/original-foot-phase contact parity, Piskel
anchor/baseline limits, main-world/cave wiring, and `?phaseHandoff=0` rollback.

`2026-07-28-player-animation-polish-production-contract.mjs` guards the complete
follow-up pass: the promoted 28-frame Jog, 133 centralized transition frames,
120 moving-diagonal frames,
two-frame planted start/stop and action-settle clips, four phase variants per
diagonal family, authored soft/hard landing ownership, wall-brace release phase,
Piskel round-trip metadata, anchor/baseline limits, both runtime worlds, and
every parent/per-feature rollback.

`2026-07-29-held-dig-next-five-review-contract.mjs` guards the isolated V2
attack-size/anchor review: the measured 109-to-123 px presentation mismatch,
88.6%-to-100% proposal, one-pixel baseline and pelvis-alignment limits,
preserved strike contacts, synchronized GIF/contact-sheet outputs, helper line
budgets and no imports from production runtime files. The contract also guards
its rejected-after-runtime-test decision and proves the enlarged proposal is
absent from production.

`2026-07-30-vertical-dig-before-after-review-contract.mjs` guards the isolated
four-case UP/DOWN comparison: fixed 31x75 collider and 94 px tile geometry,
shared foot plane, zero candidate sprite translation, zero measured tile
intrusion, preserved contact/input timing, normalized Blender DOWN source,
phase-locked Jog composition, generated GIF/contact outputs, helper line budgets
and no production-runtime imports.

`2026-07-30-player-animation-optimization-500-review-contract.mjs` guards the
review-only 20-family by 25-lens matrix, all 500 unique optimisation IDs and
pass rules, three synchronized 1280x380 comparisons, calibrated candidate
atlas, measurable SIDE/Q contact and release, landing finish, wall-brace
continuity, compact helper budgets, and complete production-source isolation.
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
`2026-07-28-backdrop-mask-coverage-contract.mjs` locks generated normalized
masks to complete scenic cards, including irregular tail cards. It proves
adjacent smoothstep weights sum to one, all real neighbor edges participate,
named handoff art is reserved for its biome boundary, and cross-biome joins
remain world-space and fully covered.

`2026-07-28-whole-world-visual-expansion-v5-contract.mjs` guards all 100
pixel-distinct ImageGen masters, 111 built runtime files, exact biome
allocations, additive V2/V3/V4 retention, isolated rollback switches,
terrain-mask ownership, non-mirrored surface placement, and the 128 px
cross-biome material overlap.

`2026-07-28-sky-underground-cohesion-runtime-contract.mjs` guards all thirty
unique additive assets, the gap-free 24x10 native-density sky field,
altitude-monotonic scheduling of all twenty sky images, balanced reuse inside
each altitude family, native safe-frame crops, ten dedicated native-density
terrain-masked biome placements, immutable world coordinates, opaque
world-space mattes, and four-sided normalized sky transition masks.

`2026-07-29-surface-backdrop-fallback-contract.mjs` guards an opaque scenic
fallback from the first underground row while the requested biome card streams.
It rejects unrelated ready-region substitution, then verifies clean requested
replacement and generic-material last-resort behavior.

`2026-07-28-performance-foundation-contract.mjs` additionally guards
visible-card scenic demand and its rollback, cancellation of obsolete queued
loads, complete five-cache health accounting, exact-state setter suppression,
thirty-frame phase sampling, supplied-light reuse, and stable-window sync
skipping. The sky/terrain/structure contracts remain the image-quality
authority for the optimized paths.

`2026-07-26-heavenblocks-visual-layout-contract.mjs` also starts the
Heavenblocks system while a fake Phaser loader is active and proves that no
large plate joins that in-flight cycle; all six plates queue and render after
the loader-idle handoff.

`2026-07-29-surface-sky-props-v3-contract.mjs` guards the exact 200/140/60
asset inventory and ten lossless atlas hashes while separately enforcing the
38-surface/13-sky authored runtime selection. It checks bounded story clusters,
explicit breathing ranges, static transforms, rear/mid/front distance opacity,
full Titan/portal/pillar/Heavenblock exclusions, and Phaser-like streaming
lifecycles. Save-safe browser review uses Ctrl+Alt+F10 plus 9/0 and Ctrl+Alt+H.

`2026-07-29-underground-backdrop-enhancers-v7-contract.mjs` guards the exact
100-file/ten-biome high-resolution alpha inventory, runtime hashes, transparent
outer edges, sparse occupancy, 70 normal plus 30 additive blend split,
motif-compatible stable selection, deliberate no-overlay cards, full asset
participation, shared backdrop-card geometry, below-terrain depth, streaming
lifecycle wiring, rollback, and the visual-only boundary.

`2026-07-30-star-rarity-sign-xp-contract.mjs` guards the exact 80% spawn
reduction, six weighted/depth-gated tiers, monotonic high-impact rewards,
five-level capped Sign XP and legacy migration, both Star mining paths, both
deferred identity preload routes, dedicated Starlight progress art, and absence
of popup config, preload, settings, policy, and view files.

`2026-07-26-pause-settings-layout-contract.mjs` also guards that the retired
Star popup preference is absent from config, settings UI, and user settings
while the remaining responsive Gameplay controls retain their layout.

`2026-07-30-star-identity-library-contract.mjs` guards all 250 identities, the
exact 60/50/50/40/30/20 split, 250 distinct primary colours and light styles,
V1 index stability, byte-storage capacity, fourteen V2 ImageGen source hashes,
six atlas dimensions/output hashes/alpha coverage, and the 64 MiB decoded cap.
It also guards deterministic coordinate assignment without an extra primary
RNG draw, both Star mining paths, Boot preload, authored-only
world/release/Atlas routing, and runtime texture health.

`2026-07-30-star-identity-v2-art-contract.py` performs pixel-level QA on the
fourteen expansion sheets and 200 appended frames. It rejects dirty corners,
cross-cell source bleed, clipped runtime edges, wrong atlas dimensions, or
missing expansion pages.

`2026-07-30-star-atlas-ui-smoke.mjs` executes the real third-tab renderer with
Phaser-like doubles. It requires the 1536x800 foundation, twelve visible
selectors, authored previous/next arrows, five Common pages, one large
preview, all sixty Common frames, and correct page-two identity routing
without Graphics. It also pins the painted socket alignment and complete
Tab/grid/page/rarity keyboard navigation path.

`2026-07-30-star-identity-light-smoke.mjs` executes the real pooled
`SkySteadyLightRenderer`, proves a newly appended Astral dedicated light frame
and bounded motion/alpha/scale are applied, then verifies the pool releases
cleanly.

`2026-07-30-star-identity-light-art-contract.py` validates all ten built-in
ImageGen sources and six RGBA light atlases: 250 unique frame hashes, exact
dimensions and source/output hashes, transparent edges, alpha coverage, and
the original-six-light decoded-memory cap.

`2026-07-30-star-identity-dedicated-light-contract.mjs`,
`2026-07-30-star-identity-semantic-layer-smoke.mjs`, and
`2026-07-30-star-identity-release-light-smoke.mjs` guard the separate
core/light metadata, exact hard-darkness frame, dynamic semantic
beauty/emissive pairing, bounded collected-light follower, release/Atlas
underlays, no runtime tint/Graphics, and legacy rarity-light fallback.

`2026-07-30-pause-feature-loading-contract.mjs` guards the authored-only
Starlight loader, guaranteed Boot chrome, exact 41-asset progress, responsive
layout, bounded component size, 100% beat and cancellation teardown. The
matching harness plus `2026-07-30-pause-feature-loading-live-qa.mjs` render
partial and ready states in hidden Edge and reject browser errors.

`2026-07-30-pause-feature-loading-production-live-qa.mjs` is retained as a
historical Talents-in-ESC fixture and is no longer part of current production
QA. Titan-only Escape coverage supersedes it.

`2026-07-30-depth-resource-economy-contract.mjs` verifies the modern and
legacy query modes, exact depth-curve points, modern/legacy rarity HP and yield,
deterministic integer rounding, final caps, decimal pricing, Deep Market
locking, Milestone speed/crit wiring, runtime-canary failure/recovery, and
health-worker forwarding. It builds both complete authoritative worlds and
reports real coins per 100 HP for four Level One and five Level Two bands,
including the continuous world handoff and rising deep income.

`2026-07-30-starlight-mockup-fidelity-live-qa.mjs` renders all three production
Starlight pages in hidden Edge at configurable review sizes. It verifies the
real view health snapshot, active page, missing-texture list, and browser error
stream before writing screenshots under
`visual-approval-previews/starlight-talent-tree-v4/`. The companion updated
Starlight contract pins the V4 foundation hash, exact 29-file package,
full-shell host geometry, readable art floors, Bobo locks, and worker alerts.

`2026-08-03-ground-running-motion-contract.mjs` verifies the 120 ms grounded
acceleration, 90 ms release, and 150 ms complete reversal at 30, 60, and 144 Hz,
plus direct-response rollback and timing alignment with the planted two-frame
Jog transition bridge.

`2026-08-03-player-run-piskel-polish-contract.mjs` pins the byte-identical source
Jog hash, 28-frame Piskel round-trip, uniform root transform, zero baseline
drift, transformed rig markers, sequence-index versus texture-frame footfall
mapping, production sheet registration, and `?animationPolish=0` rollback.

`2026-08-03-ground-footstep-fx-contract.mjs` executes the grounded contact
system with Phaser-like doubles. It guards Game Rig planted-foot projection,
the authoritative `w/h` collision-floor anchor, facing mirroring, material
sampling, explicit and visually distinct routing for all 33 non-air tile
materials, the three-fragment/0.09-tile/twelve-live subtlety caps, promoted
bitmap-only shards, low-speed sound preservation, legacy cadence fallback,
main/cave wiring, lifecycle cleanup, and `?groundFootFx=0`.

`2026-08-03-main-menu-native-resolution-contract.mjs` pins the authored idle
and selected PNG dimensions, RGBA format, transparent corners, hashes, exact
5:1 geometry, greater-than-4x Ultra source density, SSOT routing, Graphics
rollback, and Ultra/High renderer presets.

`2026-08-03-main-menu-native-resolution-live-qa.mjs` boots the real game in
hidden Edge without a quality override, waits for `MainMenuScene`, captures
idle and hover frames, and rejects browser/UI errors, non-Ultra backing size,
texture misrouting, or drift from the original 260x52 display and hit zones.

`2026-08-03-save-menu-presentation-contract.mjs` pins every authored slot,
modal, and choice texture to its RGBA dimensions and hash manifest, verifies
the `?saveMenuArt=0` Graphics fallback, and guards the existing slot keys,
WorldLoad transition, export, import, clear, and backup restore paths.

`2026-08-03-save-menu-presentation-live-qa.mjs` drives the real Play → save
flow in hidden Edge at the default Ultra 2560x1440 backing size. It uses only
ephemeral in-scene slot fixtures, preserves storage, verifies mouse and keyboard
selection plus all original hit geometry, captures clear/backup/import/rules/
tutorial surfaces, and rejects browser and UI errors. Pass `--rollback=1` when
the additional explicit `?saveMenuArt=0` Graphics rollback boot is required.

`2026-08-11-demo-first-five-live-qa.mjs` drives the recovered production route
from Main Menu through Save Vault, the integrated Hardcore + Guided setup,
WorldLoad, and PlayScene. It verifies the durable two-life Hardcore state, the
authored Step 1 current-action frame and live `GUIDE 1 / 7` badge, the subtle
25 px Inventory keycap, aligned clickable ESC control, Tutorial Town barrier
sequence, Star Pillar textures, the full seven-beat Move → Dig → Flight →
Portal → Sell → Upgrade → Resume route, and the absence of browser/page errors
while saving its report and screenshot under
`tmp/2026-08-11-demo-first-five-live-qa/`.

`2026-08-03-celestial-action-bar-contract.mjs` now pins the v2 1024x320 authored
foundation ratio, five equal slot centers, aligned live-number tabs and metric
plaques while retaining activation, lock, drag-save rollback, keyboard, resize,
and teardown coverage. `2026-08-02-hud-controls-live-qa.mjs` additionally pins
the authored Inventory keycap texture and 25x25 display size without changing
the 94x94 bag target or its 102x102 click area.

`2026-08-11-weather-indicator-hud-contract.mjs` pins the authored RGBA weather
panel and five medallions, their SSOT key/path routing, dynamic-kind adapter,
emoji-free approved branch, 14 px top rail, symmetric 320 px top panels, exact
weather-to-audio gap, aligned Hardcore bounds, and the shared bottom/left HUD
gutters. The upgraded 2026-08-02 weather harness additionally proves the storm
medallion is visible and dynamically selected in a real Phaser render.
The same contract guards that the active random-event ribbon consumes only the
derived lane between the player and weather panels with exact 16 px gaps.

`2026-08-15-approved-sfx-findings-contract.mjs` pins the four audio candidates
explicitly rated `good`, their production OGG hashes, two-entry non-repeating
seismic-warning and rare-discovery families, Boot preload parity, warning-phase
stop behavior, and the exact Ancient Relic and Titan discovery hooks. Rejected
mining sounds and the `maybe` crystal candidate remain review-only.

`2026-08-15-town-surface-relief-bake-contract.mjs` pins the exact active
source and derived hashes, unchanged 1801x941 geometry, default-off
`?surfaceRelief=1` routing, complete rollback precedence, selected preload,
and restrained measured correction ceilings.

`2026-08-15-survival-animation-contract-repair-v2-contract.mjs` pins the six
active animation families and both rig manifests to the last known-good motion
authority, while protecting the 31x75 collider, 1.12-tile run stride, corrected
locomotion sizes, complete 36-frame prone flight loop, and repair version.

`2026-08-15-survival-motion-locked-mesh-quality-v2-contract.py` proves the
review candidate is production-isolated, all six pre-lock silhouettes pass,
packed alpha is pixel-identical to restored authority, Blender reports contain
no bone/weight/camera/geometry edits, and runtime sheets remain byte-identical
to the last known-good rollback authority.

`2026-08-15-survival-mesh-quality-v2-v3-contract.py` proves every V3 frame
changes RGB presentation while retaining V2.1 alpha exactly, keeps all six
family counts/cadences, records zero motion change, and produces the complete
164-frame animated comparison.

`2026-08-15-survival-microdetail-secondary-v3-2-contract.py` proves the
representative 24-frame walk remains review-only, retains the exact V2.1 body
action and original 83,188-vertex mesh, adds no subdivision, limits deformation
to named secondary shape keys, restores full-resolution maps, and keeps alpha
IoU above 0.95 with centroid drift below one packed pixel.

`2026-08-15-survival-hero-quality-v4-contract.py` proves all five equipment
materials use reconstructed ORM channels, full-resolution maps and full-glove
coverage across the exact 164-frame six-family set while facing, camera, weights,
root and source actions remain unchanged. It gates per-family frame counts,
silhouette/centroid/bounds drift, rejects saturated green pixels, verifies every
native-cadence GIF, and confirms both V4 scales remain production-isolated.

`2026-08-20-complex-dig-animation-runtime-contract.mjs` pins the approved
ten-stage SIDE and Uppercut-only UP families, byte-exact green-free sheets,
101 px scale, single-contact authority, current cadence, cave/main-world wiring,
and the `?complexDig=0` plus Ctrl+Alt+9 legacy rollback paths.
`2026-08-21-celestial-branch-focus-contract.mjs` proves compact Celestial talent
layouts automatically focus one readable branch, wide layouts retain the full
overview, branch selectors reuse authored chrome, connector geometry follows
the visible topology, and the dossier compares current state with the exact
configured effect without changing progression or purchase authority.
`2026-08-21-semantic-audio-safety-contract.mjs` prevents urgent gameplay states
from borrowing misleading audio: Hardcore stress and near-death cannot reuse
seismic warnings, low-GP alerts use threshold hysteresis, portal transitions
own distinct semantic slots, and every unauditioned slot remains silent while
returning actionable caption metadata until a human approves matching assets.
`2026-08-21-merchant-prompt-anchor-contract.mjs` pins merchant interaction copy
to a measured ground-relative anchor, keeps compact legacy NPCs within their
existing safe offset, and verifies that the shared play-scene NPC manager uses
the resolver instead of positioning prompts from the top of the canvas.
`2026-07-15-deep-world-living-backdrop-smoke.mjs` now supplies the scene's
injected gameplay capability authority and proves the backdrop honors it. This
keeps focused Level Two tests deterministic without weakening the production
demo-profile gate.
`2026-08-21-ambient-particle-band-contract.mjs` pins four distinct underground
ambient depth identities, verifies the live diagnostic snapshot, and proves an
explicit building-occupancy signal immediately clears the bounded particle set.
The legacy environment contract continues to guard depth, FPS, cap, and teardown
behavior.
`2026-08-15-celestial-talent-tree-polish-browser-check.mjs` opens the production
Celestial tree harness at wide and compact sizes, proves the three-lock
pre-level gate, exercises a near-edge mouse target, and captures the rebuilt
tooltip on both an outer capstone and an inner branch node.
`2026-08-15-celestial-actionbar-empty-browser-check.mjs` renders the production
floating action bar with five unowned abilities and proves that all five
authored sockets remain empty: no ghost icons and no repeated lock objects. It
also hovers Hollow Sun and verifies the shared Star Pillar frame, larger type,
and lower-trim copy clearance.
