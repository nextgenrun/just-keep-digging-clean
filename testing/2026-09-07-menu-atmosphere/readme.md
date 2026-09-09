# Living HD menu scenery verification

Serve the repository with its canonical `serve.py` and open this directory. The normal URL uses v5 and renders the production loading component. Select a scenery to review that landscape; it repeats into itself indefinitely. The page never cycles through the list. `?motionReview=v1`, `v2`, `v3` and `v4` preserve earlier comparisons.

Controls exercise pause/resume, destruction/recreation, loading errors, video fallback and still mode. The review-only loop-join button waits for a fully buffered and seekable clip. Natural repeat checks are recorded separately from manual seeks.

Current smoothing evidence is `smooth-v5-proof.json`, `smooth-v5-media-checks.json` and `smooth-v5-browser-proof.json`. The source-resolution 60 fps clips have scene-specific slower timing, and the logo retains its sharp static lettering with additive moving light. See `markdown/2026-09-07-menu-motion-smoothing.md`.

Earlier v4 media evidence is `living-hd-proof.json`: six 1920x1080, 24 fps silent outputs, per-scene timing, original source hashes, output hashes and encoded-boundary/frame checks. `hd-motion-browser-proof.json` and `hd-v4-*.jpg` record actual production-component playback and ownership. The source artwork is unchanged.

`generation-v3.json` records the stronger OpenRouter generations. The uncertain grotto revision has no job ID and is not retried automatically; v4 uses the retained original generation with an original-art cave holdout. `upscale-v4.json` records an unsuccessful remote upscale submission: the endpoint rejected a data URL before returning a job ID. The final HD exports use local Lanczos scaling, not that remote service.

The raw videos, build intermediates and downloaded tooling are ignored local reproduction material. v1/v2 proof files and `living-motion-proof.json` describe historical treatments, not current opacity, timing or resolution. See `markdown/2026-09-07-quiet-menu-atmosphere.md` for the current implementation report.

The scenery viewport is frameless: no preview outline or rounded border is added, and the shared loading UI has no decorative full-screen frame.

Foreground review: loadingUiReview=clean presents a fixed 64% loader with a real gameplay tip from loadingMessages.js. loadingUiReview=1 adds progress and fade controls. The production boot retains its eight-second tip rotation.
