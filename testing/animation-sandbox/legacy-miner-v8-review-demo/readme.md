# Legacy Miner V8 Review Demo

Phaser-based runtime preview for the legacy miner v8 animation cleanup pass.

The demo compares current runtime sheets with one selectable review set:

- `Candidate cleanup (2026-07-03)` (default)
- `Legacy runtime mirror`

Open:

```text
http://127.0.0.1:8080/testing/animation-sandbox/legacy-miner-v8-review-demo/index.html
```

By default, the page now opens in side-by-side mode:
- Left pane: `off` baseline
- Right pane: selected `visual` mode (defaults to `impact` in split mode when omitted)

## Query parameters

- `pack=` — choose pack (`candidate` or `runtimeMirror`)
- `compare=` — choose layout:
  - `split` (default): left/right side-by-side
  - `single`: legacy single canvas mode
- `visual=` — choose visual mode for right pane in split mode and for the only pane in single mode:
  - `off` (default baseline)
  - `swap`
  - `impact`
  - `meshyOrHiggs`
- `meshUrl=` — optional remote concept texture URL used by `meshyOrHiggs`
- `leftVisual=` — optional left pane visual mode for split mode (`off` default)
- `rightVisual=` — optional right pane visual mode for split mode
- `meshy=off` — keeps concept features disabled when older deep links pass the old flag

## Test URLs

```text
http://127.0.0.1:8080/testing/animation-sandbox/legacy-miner-v8-review-demo/index.html?pack=candidate&compare=split
http://127.0.0.1:8080/testing/animation-sandbox/legacy-miner-v8-review-demo/index.html?pack=candidate&compare=split&leftVisual=off&rightVisual=impact
http://127.0.0.1:8080/testing/animation-sandbox/legacy-miner-v8-review-demo/index.html?pack=candidate&compare=split&leftVisual=off&rightVisual=meshyOrHiggs&meshUrl=<SIGNED_URL>
http://127.0.0.1:8080/testing/animation-sandbox/legacy-miner-v8-review-demo/index.html?pack=candidate&compare=split&leftVisual=swap&rightVisual=meshyOrHiggs&meshUrl=<SIGNED_URL>
http://127.0.0.1:8080/testing/animation-sandbox/legacy-miner-v8-review-demo/index.html?pack=candidate&compare=single&visual=off
```

If `meshUrl` is omitted, `meshyOrHiggs` uses a local fallback texture from the runtime sprites.

## Controls (unchanged behavior)

- Spec toolbar buttons (`Walk`, `Dig Down`, `Falling`, `Fly`, `Combat Return`, etc.)
- `Restart`
- `Pause`
- `Step -` / `Step +`
- `Guide`
- `Boxes`
- `Black/Checker`

## What should look different by mode

Use the same full-screen spec set with each mode to validate impact:

- `off` — baseline baseline setup. Only nominal compare playback.
- `swap` — current side uses candidate animation set where available; stronger glow/outline layers appear.
- `impact` — larger silhouette geometry, more aggressive trail density, larger glow halos, fast pulse FX, visible vignette/edge contrast.
- `meshyOrHiggs` — impact + concept backdrop layer (remote `meshUrl` if provided, local runtime fallback otherwise), plus stronger grain/fog + outline emphasis.

Run server:

```bash
python serve.py 8080
```
