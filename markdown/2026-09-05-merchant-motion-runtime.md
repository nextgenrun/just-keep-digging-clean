# Merchant motion runtime - 2026-09-05

The approved six-merchant sandbox motion is now the default game presentation.
NPCManager creates the articulated merchant texture at the existing calibrated
position and size; NPCActivitySystem supplies the existing quiet-town and
player-proximity schedule. Each merchant plays its approved 6.8-second gesture.
Magma retains its existing Level Two eligibility and is available locally with
`?gameplayProfile=full-review`.

`values/merchantMotion.js` and `values/merchantMotionRigs.js` own the shared
motion, joints and rendering limits. The sandbox imports the same renderer,
math and values. Existing v13 source paintings are unchanged. This is weighted
mesh animation of the approved paintings, rather than a generated spritesheet.

MerchantMotionSystem owns one 768 x 512 px atlas with a 256 px frame per
merchant. Visible merchants share one GPU context and one upload at a bounded
30 fps. The source artwork stays at its
original resolution in the mesh renderer. Offscreen and unavailable merchants
skip uploads. The existing shared interaction buffer now also feeds merchant E-key taps, so
a released quick tap survives a slow render frame without changing input timing.
Game-driven clocks preserve animation phases across pauses;
opening a shop eases an unfinished gesture back into the current idle pose.
Shutdown releases the owned textures, buffers and WebGL contexts. Rendering
failure restores the existing artwork; unavailable WebGL 2 uses the existing
video/static path. Reduced-motion preference keeps the articulated view still.

Use `?merchantMotion=0` to restore the legacy idle videos/static baseline and
still-pose activity crossfades. `?npcActivities=0` independently disables the
activity scheduler while retaining calm idle motion.

## Verification

- `testing/2026-09-05-merchant-motion-contract.mjs`: six merchant coverage,
  planted feet, complete gestures, smooth cancellation, proximity scheduling,
  hidden/offscreen culling, bounded uploads, pause clocks and owned cleanup.
- Existing NPC activity fallback, v13 asset/grounding and E-key shop interaction
  contracts pass.
- The shared geometry audit passes all 264 sampled poses, including peak blinks:
  zero reference-foot drift, positive triangle areas and continuous endpoints.
- All changed JavaScript modules pass syntax checks.

The local actual-game review uses
`testing/2026-09-05-merchant-motion-game-review.html?jkd_e2e=1&gameplayProfile=full-review&cinematics=0`.
It imports the normal game entry, blocks saves through the existing E2E harness,
and adds only review navigation/diagnostics. The normal game page never loads
those controls. Browser results are recorded after the final verification pass.

## Final browser evidence

All six merchant frames rendered from the shared atlas at their existing game
size, with zero anchor/ground-contact violations. Each shop opened with a real
browser E-key tap. Magma was reached using the existing Ctrl+Alt+Home Level Two
review/god-mode control; production eligibility was not changed. The final
merchant samples were 59-60 fps, with exactly one live merchant atlas. These are
local observations, not a full-game/device benchmark.

Pause held all six motion clocks, poses and uploads unchanged across separate
reads; Resume restarted uploads. Returning through the actual Main Menu control
destroyed the renderer and left zero merchant atlas textures. The legacy
merchantMotion=0 route rendered and opened its shop successfully. Browser
console warnings/errors in the final run: 0.

The game review controller also restores keyboard focus to the canvas after
merchant navigation. Its navigation does not bypass normal Level Two access.
Evidence is in the original sandbox's runtime-validation.json and runtime-*.png.
The jump/flight contract also passed all 19 traversal input regressions after
the merchant interaction-buffer handoff.


## Generated merchant signs

Six distinct signs now display each merchant name and normal shop action directly from generated artwork. The user approved code-based outside-background cleanup on 2026-09-05. Untouched sources, alpha masters, optimized 768-pixel RGBA runtime assets, exact prompts and hashes live in `sprites/UI/merchant-signs-v1/`; `values/merchantSignArt.js` enables their preload and presentation.

`MerchantPromptView` renders no dynamic title/action text over these signs. Its separate key badge follows rebinding, and a separate event row retains live rush messages. Missing artwork retains the existing prompt fallback. The cutout builder preserves source RGB and opaque lettering, and downsizes using premultiplied alpha to avoid pale fringes.

The new merchant-sign contract passed along with the existing presentation, motion and shop-interaction contracts. Canonical browser verification visited all six merchants, confirmed one in-bounds sign at a time with no legacy text overlays, opened every shop with a real E tap, and checked prompt hiding for shop/pause menus. Observed frame rates were 59-60 fps; browser warning/error logs were empty. Molten was reached using the existing local Level Two review control. Returning to the menu destroyed the motion renderer and left zero motion textures. Rebind and timed-event cases were verified by focused contracts.

Evidence: `testing/animation-sandbox/2026-09-05-merchant-motion-v1/merchant-signs-runtime-validation.json` and its six `runtime-sign-*.png` screenshots.
