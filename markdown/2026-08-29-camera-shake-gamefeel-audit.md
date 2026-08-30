# Camera shake echo and gamefeel audit

Date: 2026-08-29  
Status: implemented and contract-verified

## Scope

This pass audited camera displacement, repeated-impact ownership, shake
priority, the low-frame-rate gate, and the existing hitstop/zoom-pulse hooks.
It did not retune damage, mining cadence, movement, authored animation, sound,
or persistence.

## Findings and fixes

| Finding | Player-facing risk | Resolution |
| --- | --- | --- |
| The oscillator multiplied absolute scene milliseconds by values described as `Hz-ish`. The configured range therefore behaved as roughly 10-155 cycles per second, with a phase determined by how long the scene had been open. | Equal hits could begin on different phases and high-frequency signatures could alias into harsh or inconsistent motion. | Motion now uses elapsed seconds and explicit 1-15.5 Hz signatures, so equal impacts resolve to equal samples independent of scene age. |
| Curated depth milestones dispatched `misc.depthMilestone` before the cinematic, whose own opening dispatched the same signature again. | One authored beat could restart its impulse and replay its flash. | A triggered cinematic is now the single owner. Non-cinematic/finale depths retain the direct fallback. |
| Same-signature calls arriving within one render frame restarted the envelope and replayed the companion flash. | Area hits or overlapping producers could feel like a short shake echo. | Identical calls inside a 34 ms window merge peak strength/duration without resetting start time or flashing twice. A completed short impulse can still start again. |
| Light, medium, and heavy mining signatures shared priority 10. | A later light hit could replace a heavier same-frame hit. | Mining priorities now rise 10, 11, and 12 while crit and sky-block priorities remain authoritative. |
| The 40 FPS safety check lived at selected mining call sites. | Quake, weather, combo, and ability shakes could still add jitter during a low-FPS frame. | The gate is enforced in the shared dispatcher on both trigger and update. Existing mining boundary checks remain as cheap early exits. |
| The exponential envelope retained residual amplitude immediately before hard reset, and two summed waves could exceed the named intensity. | The final sample could pop to zero and the configured intensity was not a real bound. | The exponential tail now tapers continuously to zero; secondary motion is normalized so each axis stays within the signature's peak intensity. |

## Intentionally unchanged

- Signature intensity and duration remain unchanged; the retune targets motion
  quality and ownership rather than making the game louder or heavier.
- `HitstopSystem` remains constructed but unwired, and `zoomPulse` remains an
  unused configuration hook. Wiring either during this audit would change
  gameplay/tween timing and needs a separate representative visual benchmark.
- Authored player-body animation remains the silhouette authority under the
  current Survival profile.
- Accessibility group switches, master intensity, flash settings, and the
  `?cameraShake=0` rollback continue to work through the existing dispatcher.

## Verification

- `testing/2026-08-29-camera-shake-gamefeel-contract.mjs` covers true-Hz phase
  stability, offset bounds, duplicate merging, stale-impulse restart, priority,
  centralized FPS safety, and depth-milestone ownership.
- Existing core-state, AAA-polish, weather, earthquake, and Thunder Strike
  contracts remain green.
- Browser validation booted the production game at 1280x720 with
  `?jkd_e2e=1&nativeDensity=0`, entered a save-safe `PlayScene`, staged a real
  resource through the existing F8 harness, and registered a pointer-driven
  hit with rendered damage feedback. Integer image registration measured zero
  residual world displacement 240 ms after contact, and the browser reported
  no JavaScript errors. Ten existing Memory Reliquary unsafe-anchor warnings
  remain unrelated to camera shake.

## Rollback

Restore the former dispatcher and frequency values, remove
`systems/visual/cameraShakeMath.js`, and revert the depth-milestone ownership
hunk. No save migration or asset cleanup is required.
