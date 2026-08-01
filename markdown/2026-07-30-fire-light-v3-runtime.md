# Fire Light V3 Runtime

**Status:** production-wired; Natural Fire V1 is the selected default

**Date:** 2026-07-30

## Outcome

The carried torch is now a fire-specific presentation stack instead of another
surface/star light variant. Gameplay darkness, GP drain, and reveal radius stay
authoritative in `LightSystem`; Fire Light V3 only replaces the visible torch
presentation and adds exposure response.

Natural Fire V1 now selects the restrained production presentation from this
system: one compact authored flame over the established procedural world
falloff. The broad base volume, atmosphere, and expanded illumination described
below remain intact behind `?fireLightStyle=layered` for exact comparison and
rollback. See `markdown/2026-07-30-natural-fire-light-v1.md` for the selected
profile and its simultaneous legacy comparison.

The base production art family contains five 4x4 ImageGen atlases:

| Atlas | Runtime role | Frames |
| --- | --- | ---: |
| `fire-flame-steady-v3.png` | calm carried-flame loop | 16 |
| `fire-flame-states-v3.png` | wind, rain, low-GP, rekindle rows | 16 |
| `fire-light-volume-v3.png` | asymmetric warm volume and floor bounce | 16 |
| `fire-light-rays-v3.png` | local smoke/dust ray gobos | 16 |
| `fire-atmosphere-v3.png` | embers, sparks, and lit smoke | 16 |

A second, light-only family gives the illumination itself the authored
variation previously reserved for celestial light:

| Atlas | Runtime role | Frames |
| --- | --- | ---: |
| `fire-light-hot-core-v3.png` | turbulent white-gold source hotspots | 16 |
| `fire-light-penumbra-v3.png` | broad irregular warm falloff | 16 |
| `fire-light-bounce-v3.png` | surface-agnostic floor/wall reflection | 16 |
| `fire-light-breakup-v3.png` | smoke-filtered mottled breakup | 16 |
| `fire-light-environment-v3.png` | wind, wet, low-fuel, and rekindle rows | 16 |

The result is 80 new light-only frames, 96 authored illumination frames when
the retained base volume is included, and 160 authored components across ten
runtime files. Each production copy is 1252x1252, divided into exact 313x313
cells. New light sheets have true-black frame borders to prevent additive
atlas seams. Immutable hashes and generation mode are recorded in
`sprites/environment/fire-light-v3/manifest.json`.

## Responsibility split

- `values/fireLightConfig.js` is the SSOT for assets, sockets, state thresholds,
  ray limits, exposure response, render depths, and rollback queries.
- `FireLightSystem.js` owns feature selection, fail-safe fallback, lifecycle,
  diagnostics, and the four fire-specific presentation components.
- `FireLightRenderer.js` selects authored flame states and composites flame,
  asymmetric volume, embers, and smoke.
- `values/fireIlluminationConfig.js` is the separate SSOT for the five expanded
  light atlases, layer timing, state rows, and narrow texture rollback.
- `FireIlluminationRenderer.js` layers authored penumbra, bounce, hot-core,
  breakup, and environment-state light without owning gameplay visibility.
- `FireLightRayRenderer.js` maintains six pooled, authored local rays. Every ray
  is clamped to the first solid world tile and remains below the darkness mask.
- `EyeAdaptationSystem.js` applies asymmetric bright/dark exposure response
  below the HUD without changing visibility or collision.
- `resolveFireLightAnchor.js` keeps a separate hand/socket anchor for visual
  fire while the gameplay reveal remains centered on the authoritative player
  light anchor.
- `fireLightMath.js` contains Phaser-independent ray and exposure math.

`LightRayAtmosphere` remains the surface-only sun/moon ray system.
`SkySteadyLightRenderer` and `SkyBeaconPulseRenderer` remain Star Block systems.
Fire Light V3 does not inherit from or import any of them.

## Runtime behavior

The renderer chooses a deterministic authored flame state in this order:
rekindle, low GP, surface rain, surface wind, then steady. The visible source is
bounded to roughly `0.46 x 0.62` tiles and its atmosphere to `1.45 x 1.65`
tiles. Reduced-motion mode retains a living fire but compresses alpha, position,
and exposure pulses.

With `?fireLightStyle=layered`, expanded illumination runs four independently
phased authored layers in the steady state: penumbra, bounce, hot core, and
smoke-filtered breakup. Wind, rain/wet, low-fuel, and rekindle add the matching
environment row as a fifth layer. Layer-specific frame rates, phase offsets,
flips, alpha, and scale keep all sixteen frames in circulation without
synchronized looping or procedural colour tinting.

Visible rays are disabled by default. `?fireRays=1` explicitly allocates the
six-ray diagnostic pool at the same carried-fire socket as the flame. Sampled
world lengths refresh after player tile movement or a short bounded interval;
solid tiles truncate each ray before contact and the darkness texture hides any
portion outside the authoritative reveal.

Eye adaptation computes a smoothed scene luminance from surface sunlight,
night, underground ambient light, active torch strength, and lightning.
Bright-to-dark and dark-to-bright response rates are intentionally asymmetric.
Natural Fire applies `0.24` of the visual overlay while retaining the real
adaptation state; layered mode retains the prior full-strength response. The
result is presentation-only: it never edits `LIGHT_CONFIG`, GP, tile state,
visibility radius, or the darkness eraser.

Natural Fire restores the existing procedural world glow at `0.98` scale and
uses a `0.96` shader mix, with one compact flame supplying the authored motion.
Layered mode retains the earlier authored-light behavior: its shader mix falls
from `0.18` to `0.10` while the expanded library is available, returning to
`0.18` if that library is missing. Missing base atlases or a complete rollback
keep the previous player-light path automatically.

## Rollback and comparison

- Default or `?fireLightStyle=natural` — selected one-layer Natural Fire V1.
- `?fireLightStyle=layered` — exact previous asset-heavy Fire Light V3 stack.
- `?fireLight=legacy` — complete Fire Light V3 presentation rollback.
- `?fireLight=0` — alias for the complete rollback.
- `?fireLightTextures=0` — inside layered mode, disable only the expanded
  80-frame illumination library; retain the compact V3 flame, base volume,
  atmosphere, and eye adaptation.
- `?fireRays=1` — explicit diagnostic opt-in for collision-clamped local rays.
- `?eyeAdaptation=0` — keep authored fire; disable exposure overlays.
- `?fireFlicker=reduced` — reduce fire/exposure motion. The OS
  `prefers-reduced-motion` setting selects the same mode.
- `?playerLight=legacy` — pre-existing player-light anchor/shader comparison;
  independent of the Fire Light V3 rollback.

## Asset generation provenance

The atlases were created with built-in ImageGen as production raster art:

1. the five retained base sheets for flame, volume, rays, atmosphere, and fire
   state;
2. a 4x4 diffuse, abstract white-gold hot-core family;
3. a 4x4 broad, irregular dusty-cave penumbra family;
4. a 4x4 surface-agnostic floor/wall bounce family;
5. a 4x4 natural smoke-filtered breakup family;
6. a four-row light-state atlas for wind, wet/rain, low fuel, and rekindle.

The light-only prompts explicitly exclude visible flames, objects, cave
geometry, circular gradient discs, vortexes, and magical symbols.

The original 1254x1254 ImageGen outputs remain outside the runtime asset
directory. Production copies were edge-normalized to 1252x1252 so all 16 cells
have exact, equal dimensions.

## Piskel drift polish

All ten runtime atlases also have independent editable authorities under
`sprites/environment/fire-light-v3/piskel/polished-work/`. The package keeps
the exact 4x4 order and 313x313 cells, then applies integer-only translations:
source-root registration for flame, rays, and atmosphere; luminous-core
registration for broad illumination; and per-row registration for wind, wet,
low-fuel, and rekindle states. This preserves organic animation and state
identity while removing accidental grid-row climb.

Across the ten atlases, the worst measured within-group anchor range fell from
79.57 px to 0.98 px. No frame was scaled or interpolated, every cell has a
three-pixel true-black safety border, and worst-case retained-light loss is
1.04%. The builder round-trips all 160 frames through `.piskel` and does not
change production. Promotion and recovery are explicit:

```powershell
python ai-tools/2026-07-30-refresh-fire-light-piskel-polish.py --apply
python ai-tools/2026-07-30-refresh-fire-light-piskel-polish.py --rollback
```

The rollback command was rehearsed against all ten byte-exact originals before
the polished selection was restored.

## Verification

`testing/2026-07-30-fire-light-piskel-anchor-contract.py` verifies ten editable
projects, 160 frames, the hidden guide layers, exact Piskel round-trip, approved
shift/energy/error/range thresholds, true-black borders, hash-linked rollback,
candidate/runtime parity, and the promoted manifest selection.

`testing/2026-07-30-fire-light-v3-contract.mjs` verifies:

- all ten atlas dimensions and SHA-256 hashes;
- 160 authored components, compact flame limits, and exact preload registration;
- default-hidden rays and explicit collision-traced opt-in;
- dual-anchor direction, exposure asymmetry, lifecycle, missing/legacy fallback,
  and the 300-line class limit;
- architectural separation from surface rays and Star Block light;
- authored/procedural shader mix wiring.

`testing/2026-07-30-fire-illumination-textures-contract.mjs` separately locks
the 80 new frames, 96-frame light total, four steady/five state layer routing,
true fail-safe fallback, narrow texture rollback, and texture-only class
boundary.

The existing Player Light V2, camera-follow centering, and inactive-light-render
contracts are run alongside it to guard the prior behavior.

`testing/2026-07-30-fire-light-v3-live-qa.mjs` also exercises the production
WebGL path in hidden Edge at a real underground standing-air location. It
captures Natural Fire, explicit rays, adaptation-off, layered rollback, and
complete legacy modes while asserting healthy scenes, zero UI errors, exact
texture residency, collision-bounded opt-in rays, eye adaptation, shader
ownership, and successful atlas responses.

`testing/2026-07-30-natural-fire-live-compare.html` is the simultaneous
Natural-Fire-versus-legacy review. It synchronizes both real worlds to the same
tile, camera, GP, weather, solar phase, and torch state.
