# Tank Test V1

Standalone Phaser sandbox for testing the one-tile tank character and the redesigned drill feel.

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

- The tank collision/body box is exactly `94x94`.
- The chassis art is anchored to the tile center and tread baseline.
- The drill is a separate elastic tool layer, not part of the physics size.
- The target tile stays solid until the configured break frame.
- Occlusion hides the drill inside the block so it reads as penetration instead of clipping.
- Cracks, entry gouge, sparks, dust, and break fragments are generated in engine.
- Up/down digging uses center bore mode: the drill deploys from the tank center after the top hatch opens or the rubber tread retracts into the body.
- `Drill Head` mode tests the alternate concept where the whole one-tile character is the drill, with no separate arm or extension.

## Controls

| Input | Action |
| --- | --- |
| A / D or left / right | Drive and set side drill aim |
| W / up | Set drill aim up |
| S / down | Set drill aim down |
| E | Drill with the current aim |
| Shift + W / S or up / down | Fly movement |
| R | Reset world |
| Space | Toggle pause/step mode |
| . | Step one frame while paused |

The panel also exposes animation buttons and debug toggles for body box, anchor, chassis bounds, drill pivot, drill tip, target tile, occluder mask, slow motion, and frame stepping.

Use `Dig Up` and `Dig Down` in the panel to compare vertical drilling. `Drill` uses the current aim shown in the overlay. Side aim uses front drill mode; up/down aim uses center bore mode.

Use `Tank Rig` and `Drill Head` to compare character concepts. In `Drill Head`, the whole player is the boring head and the dig read comes from body vibration plus target-tile grinding effects. Drill Head now loads anchored `living-drill-v1` runtime sheets for idle, dig, and fly from `sprites/character/living-drill-v1/runtime`.

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
