# Merchant idle personality review — 2026-09-07

Open: http://127.0.0.1:8080/testing/animation-sandbox/2026-09-07-merchant-idle-personality/index.html

This isolated mockup restores the seven polished v13 activity illustrations for every merchant. It retains current articulated calm motion between activity beats, adds restrained body/head breathing while each alternate pose holds, and uses short fixed-scale dissolves into and out of the poses.

Use **Activity** to preview each type across the cast, the selector on a merchant to try one pose, **Compare with today** for the current repeated gesture alongside the recovered activity, **Inspect** for a close view, and **Game size** for the runtime sprite size. Pause and scrub the cycle to inspect transitions. Reduced-motion preference starts the preview paused; Play opts into motion. Timing is accelerated for review.

## Why variety disappeared

The current `startNpcPose(actor, state, time)` in `systems/visual/npcActivityVisuals.js` routes every activity to the same argument-free `actor.motion.startGesture()`. Motion actors bypass the old distinct state textures. All seven polished source paintings still exist in `sprites/npc/npc-v13-piskel-polished-activities/singles/`.

## Scope

Sandbox only. No production scheduler, playback adapter, merchant interaction, save path, approved sign, or source painting is changed. This is a pose-and-timing mockup using the recovered paintings, not newly generated in-between animation frames.

The existing merchant mesh math and paint shader render six canvases, one context per merchant. Both sides share the same size and fixed ground anchor. Alternate paintings use only gentle torso/head influences; the original rig's eye and prop masks stay with the calm baseline they were authored for.

## Files

- `main.js`: controls and the preview clock.
- `PersonalityCard.js`: one merchant's assets and review controls.
- `PersonalityRenderer.js`: current motion and blended alternate poses.
- `timeline.js`: deterministic activity selection and transition weights.
- `personality.css`: review layout, extending the existing motion sandbox.
- `../../../values/merchantIdlePersonalitySandbox.js`: review tuning.

## Verification

All 42 poses rendered in the in-app browser. Current/restored Bobo comparison, individual greeting cue, pause/scrub, playback, and the 99.2 px game-size view passed; no browser warnings or errors were captured. The preview reported 51–60 fps across the observed checks. Screenshots and browser-validation.json record the review.

Run verify.mjs with Node for the 49 HTTP routes, all-pose schedule coverage, fixed-scale metadata, finite transitions, module paths, and fixed-foot mesh samples. This is focused sandbox evidence.
