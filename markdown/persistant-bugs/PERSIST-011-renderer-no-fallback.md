# PERSIST-011: Default WebGL selection has no runtime fallback

- Status: confirmed
- Severity: P1 when WebGL is unavailable; otherwise latent compatibility defect
- Category: broken runtime initialization / missing fallback
- Evidence: `main.js:49` selects `Phaser.WEBGL` whenever `renderDensityProfile.rendererMode` is not `"auto"`. `systems/visual/RenderDensitySystem.js:255-257` defaults that mode to `"webgl"`; the opt-in query contract is `values/gameConfig.js:33-34` (`?renderer=auto`).
- Reproduction: with the local server returning HTTP 200 for `index.html`, `main.js`, and `libs/phaser.js`, the normal URL left `#game-root` with zero canvas elements after more than 20 seconds. The same URL with `?renderer=auto` created one canvas after 7 seconds. No application source edits were made during this check.
- Failure: environments without a usable WebGL context can retain the fullscreen shell while Phaser never creates the gameplay canvas. The default path does not attempt `Phaser.AUTO`, Canvas, or a guarded retry.
- Why it persists: renderer policy is split between `main.js` and the density resolver, and the resolver treats every non-`auto` value as WebGL. The only fallback is a query-string opt-in, so the compatibility path is not the default safety path.
- Permanent solution: make renderer selection capability-driven. Prefer `Phaser.AUTO` for the default, or probe WebGL before requesting it and fall back to Canvas/AUTO on failure. Keep the selected renderer in the published diagnostics, expose a visible initialization error if both renderers fail, and add a browser smoke matrix covering WebGL available, WebGL unavailable, and `?renderer=auto`.
- Verification contract: a fresh load must create exactly one canvas or show an explicit initialization error; the normal URL and the forced-auto URL must both be covered; a WebGL-unavailable run must never leave a silent blank `#game-root`.
