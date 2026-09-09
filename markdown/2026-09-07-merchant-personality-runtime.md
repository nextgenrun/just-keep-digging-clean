# Merchant personality and shop acknowledgement

The approved seven activity paintings now run through the existing merchant motion atlas for all six merchants. Their calibrated size and planted feet are retained. Each activity has a short eased crossfade, calm body/head motion, then a quiet idle tail. Weighted ambient activities avoid an immediate repeat. Existing town cadence and availability rules still apply.

Pressing the existing shop interaction key starts a 680 ms acknowledgement. A merchant already holding an activity keeps that painting and nods from it. Repeated presses share the pending opening. At 430 ms the quiet welcome blend plays once; the shop then opens with the ordinary menu-opening cue suppressed. Reduced-motion and missing-renderer cases open immediately. Walking out of range, opening another UI, pausing, hiding the document or scene destruction cancels the pending reveal.

Values are in values/merchantActivityMotion.js and values/merchantShopAudio.js. MerchantShopEntrance owns the pending interaction; MerchantMotionPlayback owns the activity blend and acknowledgement phase. The existing 30 fps shared atlas retains one GPU upload per visible frame batch and allocates only one additional activity texture per merchant.

The audio composite uses approved coin/chime recordings plus an authored soft rustle and warm body. Credits, mix recipe and hashes are in sound/soundEffects/merchant-entrance-2026-09-07/readme.md and manifest.json. It is preloaded and routed through the existing UI, SFX, master and active-mix limits. A 1.2-second cue cooldown prevents rapid reopen stacking.

Local review: testing/2026-09-07-merchant-personality-game-review.html?jkd_e2e=1&gameplayProfile=full-review. Enter through Play; select a merchant, then use the normal E key. The local controller can also preview any activity in the real renderer. Save writes are blocked; Magma keeps its Level Two availability.

## Verification

The focused personality/entrance contract passes all 42 configured activity timings, smooth interruption, weighted non-repeating habits, the 680 ms reveal, the single cue at 430 ms, repeated requests, pause/range/UI cancellation, reduced-motion fallback, mute/volume handling and cleanup. Existing motion, activity, merchant-sign, shop-interaction, gameplay-presentation and 33 jump/flight input regressions also pass.

Live browser verification rendered all 42 paintings through the production atlas and opened all six shops using the real interaction key. Each opened once with one blended cue; measured reveal times were 680-698 ms. There were no anchor or ground-contact errors and no browser warning/error logs. A quick Escape press cancelled the pending acknowledgement, leaving the shop closed while paused. Returning to the main menu destroyed the renderer and left zero merchant-motion textures.

Evidence: testing/animation-sandbox/2026-09-07-merchant-idle-personality/runtime-validation.json and runtime-*.png. The observed game frame rates during the full-review checks are recorded there; they are not a whole-game performance audit. Audio preload, playback ownership and mix gain were verified technically. Final subjective listening preference remains with the user.

For Magma, use the existing local Ctrl+Alt+Home Level Two review hotkey, then select Magma in the review strip. This runs only with the save-safe local harness.
