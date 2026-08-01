# Lighting

Game system — lighting.

`LightSystem.getSunlightSnapshot()` is the production sunlight contract: it
combines the `DayNightCycle` sun position/alpha with smooth weather
transmittance, exposure, cloud cover, fog, and tint for atmosphere and shaders.

Player light v2 is the production default. It anchors every reveal/glow layer
to the authoritative collider center plus the sprite's live rig/animation
displacement, so the visible character stays in the exact middle. Positional
flutter is disabled while radius and brightness retain restrained fire
variation. The compact inverse-style penumbra has no visible world torch and
responds as one profile across daylight, night, rain, storms, lightning, and
weather-insulated deep caves. `?playerLight=legacy` restores the earlier
player-origin glow and shader math for direct comparison.

Torch upkeep consumes GP through the shared player floor provider. In armed
Hardcore it burns down to exactly one GP, switches off, and becomes manually
off so passive regeneration cannot make it flicker on every frame. It cannot
be re-lit until spendable GP exists; Casual retains its zero-GP floor.

`LightFrameSync` prepares lighting after player movement, then commits the
darkness mask, world glow, and shader position from Phaser's `followupdate`
phase after smooth camera follow, pixel rounding, bounds, and shake are final.
The Survival UAL prone-flight sheet also supplies an alpha-audited visible
center, while other character sheets retain the collider-center fallback.

Star Blocks remain independent hard-darkness light sources.
`SkySteadyLightRenderer` pools six dedicated 192 px identity-light atlases
above the darkness mask. Every in-view Star Block selects its exact
one-of-250 light-only ImageGen frame while the separate 256 px core atlas stays
crisp in the semantic world layer, popup, mined release, and I-key guide. Each
identity retains bounded radius, opacity, pulse, vertical, and rotation
character, so one rarity can contain many visibly different lights without
changing rewards. Phaser only positions, scales, alpha-fades, rotates, and
additively composites authored images; it neither tints one generic texture
nor draws replacement geometry. The previous six 1254 px rarity textures
remain safe fallbacks if a dedicated light atlas is unavailable.

`SkyBeaconPulseRenderer` separately presents the rare staggered beacon with six
matching ImageGen sprites. The ring travels outward for 8.8 seconds while
continuously fading, with a low coordinate-seeded chance per 45-second window.
Cross flares are intentionally absent, and only one visible Star Block ring may
exist at a time while the darkness mask reveals a restrained area beneath the
wave.

## Fire Light V3

The carried torch now has its own fire-specific class family. `FireLightSystem`
orchestrates `FireLightRenderer`, `FireIlluminationRenderer`,
`FireLightRayRenderer`, and `EyeAdaptationSystem`; it does not import or inherit
the surface-only `LightRayAtmosphere` or either Star Block renderer.

Ten 4x4 ImageGen atlases remain available, but the production natural profile
no longer stacks them. `natural-fire-v1` displays only the compact authored
flame and restores the existing procedural world glow and shader falloff at
0.98 and 0.96 strength. The volume, atmosphere, four steady illumination
layers, and environment layer are invisible. Eye adaptation remains real but
its presentation overlay is scaled to 0.24, preventing radius, glow, flicker,
and exposure from becoming one overpowered combined effect.

The exposed flame remains compact: its configured envelope is `0.46 x 0.62`
tiles and the final live sample measured about `0.450 x 0.607` during flicker.

`resolveFireLightAnchor` supplies the character-aware hand socket, while the
existing collider/visible-center anchor remains authoritative for the darkness
reveal.

Visible fire rays are off by default. `?fireRays=1` is an explicit diagnostic
that creates the pooled authored rays, clamps them against
`WorldModel.isSolid`, and keeps them below the darkness mask. Eye adaptation
remains active above the darkness shader and below the HUD; it responds
asymmetrically to daylight, night, cave entry, torch, and lightning without
changing gameplay visibility.

`?fireLightStyle=layered` restores the previous asset-heavy Fire V3 exactly:
base volume, atmosphere, expanded penumbra/bounce/hot-core/breakup/environment,
and its former shader/adaptation balance. `?fireLightTextures=0` remains the
layered profile's narrower expanded-library rollback. `?fireLight=legacy` (or
`?fireLight=0`) removes Fire Light completely and restores the untouched
procedural baseline. `?eyeAdaptation=0` and `?fireFlicker=reduced` remain
isolated comparisons. Missing required fire assets still fail safely to legacy.

Integrated caves use identity-specific darkness profiles rather than one
constant reveal: Echo and Storm pulse sharply, Root and Gilded stay heavier,
Prism is clearer, and Ember flickers. Hazard lights share the same darkness
mask and switch between idle, telegraph, and active ratios using the collision
system's exact timing.

## Old-school lamp review

`OldSchoolLampLightSystem` is a review-only carried-light class selected by
`?carriedLightStyle=lamp-review`. It shares the character socket,
`EyeAdaptationSystem`, darkness input, weather snapshot, and solid-tile ray
trace, but it does not inherit from `FireLightSystem`.

Seven 4x4 ImageGen atlases supply sixteen physical-lamp frames and 96 authored
light frames. `OldSchoolLampLightRenderer` composes the hanging fixture,
shielded volume, glass-rib penumbra, floor bounce, hot core, and atmosphere.
`OldSchoolLampRayRenderer` retains three collision-clamped reflector/glass ray
assets for explicit `?fireRays=1` diagnostics; it creates no ray sprites in the
normal lamp review.

The presentation is steadier, tighter, more directional, and more
floor-weighted than the exposed torch. Removing the query restores Fire Light
V3 immediately; saves, GP drain, reveal radius, and gameplay state are not
changed.

The retained lamp A/B is `testing/2026-07-30-old-school-lamp-live-compare.html`.
The selected-direction comparison is
`testing/2026-07-30-natural-fire-live-compare.html`: natural fire and untouched
legacy procedural light in two synchronized Phaser/WebGL worlds with shared
tile, camera, GP, weather, day/night, darkness, and controls. It now starts at
1000 m and can jump to 140, 700, 1000, or 1800 m. The settled deep run measured
identical reach on both sides: 3.412 tiles near 700 m, 3.021 near 1000 m, and
2.973 near 1800 m, all against darkness alpha 1.
