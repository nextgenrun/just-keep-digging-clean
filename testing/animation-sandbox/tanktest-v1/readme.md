# Tank Test V1

**Updated:** 2026-07-26

Standalone Phaser sandbox for testing character concepts, Arc Core motion language, and redesigned dig feel.

The Arc Core review is explicitly additive: `reviewOnly: true` and
`productionChanged: false`. The small and Omega mockups do not replace the
production vehicle art until a direction is approved.

The sandbox includes the native UAL mannequin using zero-retarget 30 FPS source motion: idle, walk/run, fly, unarmed attack, the punch-only SIDE/UP set, and same-facing DOWN. The active side chain is Jab/Cross/Jab/Cross; the former fifth power cross, kick, and `Sword_Regular_C` up strike are rejected. `Robot Sphere` remains an optional articulated concept with idle, roll, fly, and directional drill strips.

## Run

From the project root:

```bash
python tools/build_tank_v1_assets.py
python testing/animation-sandbox/tanktest-v1/serve.py
```

Or from this sandbox folder, run `python serve.py`.

Open:

```text
http://127.0.0.1:8081/testing/animation-sandbox/tanktest-v1/index.html
```

Do not open `index.html` directly with `file://`; Phaser loads the PNG sheets through HTTP, and browsers block those requests from a file origin.

## Focus

- Every character mode uses a silhouette-matched physics hull instead of the old shared `94x94` harness collision.
- The tank uses its measured chassis hull; the UAL character uses one stable torso hull; the single Robot Sphere uses one stable body hull.
- The UAL character opens at the 109px production base size and origin, yielding an approximately `75px`/`0.8 tile` upright figure beside the `94px` blocks. This older concept harness does not apply the newer 123px walk/run compensation; use the tuning lab or game for locomotion scale truth.
- `UAL View: 2x Inspect` enlarges the harness's 109px base to `218px` for close review while preserving its foot anchor and gameplay hitbox.
- The drill, pickaxe swing, unarmed strikes, beams, exhaust, and other action effects never enlarge the movement hitbox.
- The chassis art is anchored to the tile center and tread baseline.
- The drill is a separate elastic tool layer, not part of the physics size.
- The target tile stays solid until the configured break frame.
- Occlusion hides the drill inside the block so it reads as penetration instead of clipping.
- Cracks, entry gouge, sparks, dust, and break fragments are generated in engine.
- Up/down digging uses center bore mode: the drill deploys from the tank center after the top hatch opens or the rubber tread retracts into the body.
- `Drill Head` mode tests the alternate concept where the whole one-tile character is the drill, with no separate arm or extension.
- `Small Arc — Round Gyro` is the compact 2x2 miner: its exterior stays
  circular in every direction while inset gyro rings counter-precess quickly
  and brace into a focused two-lane energy bore.
- `Omega — Array` is the 8x8 miner: four separated bastions form a reactor gate, idle on a slow tidal suspension, then deploy an eight-lane compression lattice. It is a different silhouette and cadence, not the small Arc enlarged.
- Both Arc modes default to the Layered `.sprite` v2 package. Each form uses one
  fixed master body plus independently animated energy layers, so no
  whole-character frame crossfade can change its silhouette, pivot, scale, or
  lighting. `Arc Art: Layered .sprite` switches back to the earlier procedural
  comparison without touching production.
- `Cloud Enter / Exit` previews a reversible ImageGen cloud sprite with
  in-engine rings, sparks, and filaments around the current UAL mannequin and
  selected Arc tier.

## Controls

| Input | Action |
| --- | --- |
| A / D or left / right | Drive and set side drill aim |
| W / up | Set drill aim up |
| S / down | Set drill aim down |
| F | Dig with the current aim |
| B | Enter or exit the selected Arc through the cloud transition |
| Q | Trigger the UAL character unarmed attack |
| Shift + W / S or up / down | Fly movement |
| Fly Mode panel button | Toggle a hands-free fly pose preview |
| UAL View panel button | Toggle between `1x Production (109px)` truth view and `2x Inspect (218px)` |
| R | Reset world |
| Space | Toggle pause/step mode |
| . | Step one frame while paused |

The panel also exposes animation buttons and debug toggles for body box, anchor, chassis bounds, drill pivot, drill tip, target tile, occluder mask, slow motion, and frame stepping.
Body/anchor/tool guides start hidden so the animation silhouette is readable;
the target-footprint guide remains on by default.

Use `Dig Up` and `Dig Down` in the panel to compare vertical drilling. `Drill` uses the current aim shown in the overlay. Side aim uses front drill mode; up/down aim uses center bore mode.

Use `Tank Rig` and `Drill Head` to compare character concepts. In `Drill Head`, the whole player is the boring head and the dig read comes from body vibration plus target-tile grinding effects. Drill Head now loads anchored `living-drill-v1` runtime sheets for idle, dig, and fly from `sprites/character/living-drill-v1/runtime`.

Use `Small Arc — Round Gyro` and `Omega — Array` to compare the two Arc Core tiers.
The small form breaks its real 2x2 footprint in a fast `0.74s` snap. Omega
switches to a zoomed 8x8 review wall, takes `1.68s` to anchor and charge, then
ruptures all 64 cells with a sequential compression sweep. `Idle` cancels the
current dig so each resting loop can be judged cleanly.

The canonical generated artwork lives under
`sprites/character/arc-core-review-v2`; runtime assets are normalized to fixed
512 px canvases by `tools/build_arc_core_sprite_package.py`. Phaser loads all
six assets through `values/arcCoreReview.sprite.json`, which centralizes their
roles, paths, hashes, pivots, display sizes, layer depths, and motion profiles.
The older boards under
`visual-approval-previews/arc-core-imagegen-animation-v1` remain rejection and
comparison evidence only. Everything remains review-only.

In the production game, boarding and leaving the Arc Core uses the separately
rebindable `B` action. `E` remains the general world-interact action and `F`
remains dig.

Use `UAL Native 30 FPS` to inspect the zero-retarget mannequin, native motion, and weapon-free punch mining at the 109px base scale. Production locomotion now uses 123px and should be judged in the tuning lab or game. Marker/contact overlays are diagnostic only; gameplay cooldown begins at action start and damage remains on the visual contact. Use `Robot Sphere` to inspect the rendered shell roll, articulated hover, directional drill deployment, and single-robot split bore against the four-cell footprint. Camera-entry tuning is intentionally deferred until the character direction is final.

`Use Walk` / `Use Run` switches between native UAL locomotion clips while moving with A/D or the arrow keys.

## Generated Assets

The local generator writes anchored placeholder sheets to `sprites/character/tank-v1/runtime`, records the EUR 1 Grok Imagen/OpenRouter prompts in `sprites/character/tank-v1/openrouter-lab/eur1-prompts.json`, and outputs:

- `sprites/character/tank-v1/manifest.json`
- `sprites/character/tank-v1/piskel/*.piskel`
- `sprites/character/tank-v1/previews/tank-v1-contact-sheet.png`
- `sprites/character/tank-v1/previews/tank-v1-slowmo-preview.gif`
- `sprites/character/tank-v1/reports/tank-v1-drift-report.json`

The chassis `.piskel` projects keep idle, drive, fly, and dig on the same `94x94` canvas so cleanup can happen with the chassis centered and tread baseline locked. The isolated drill strip has its own fixed drill canvas, and `tank-drill-rig.piskel` provides the full anchored dig view: the chassis remains in the left `94x94` tile while the drill overhang is locked to the fixed pivot.

`living-drill-v1` keeps the supplied living-drill mockup on a fixed `94x94` canvas with a center anchor at `47,47`. The local builder writes:

- `sprites/character/living-drill-v1/runtime/living-drill-idle-sheet.png`
- `sprites/character/living-drill-v1/runtime/living-drill-dig-sheet.png`
- `sprites/character/living-drill-v1/runtime/living-drill-fly-sheet.png`
- `sprites/character/living-drill-v1/piskel/*.piskel`
- `sprites/character/living-drill-v1/openrouter-lab/eur1-grok-imagen/payloads/*.json`

The Grok/OpenRouter payloads are prepared for the EUR 1 pass, but live submission requires `OPENROUTER_API_KEY` to be set in the local environment.
