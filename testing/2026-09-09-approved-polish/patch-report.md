# Approved presentation patch — 2026-09-09

## Scope

Implemented only approvals 3, 4, 5, 6, 9, 12, 13 (icon), 22, 24, 25, 31, 33, 35, 40, 42 and 45, plus the explicitly requested inventory correction. Proposals 26 and 28 are image mockups only. Wisdom gameplay is a proposal below. Other ranked items and combo timing are unchanged.

- Twelve distinct upgrade icons: four GP, two torch, strength/heavy punch, agility/quick reflexes, Cave Eyes and Wisdom. Existing approved ability icons remain.
- Generated dirt/stone/copper minis appear only in floating pickup flights. Open inventory and remembered resource visuals use the original world artwork.
- Merchants render at 1.15 instead of 1.55 scale, about 26% smaller. Existing 42 authored activities, 680 ms shop entrance and 430 ms cue are retained; nearby idle activities and a 1250 ms farewell action are connected. Shops use the existing approved merchant signs. Owned/max seals do not imply affordability.
- Material excavation rims, sparse ceiling roots and material debris use bounded pools. Quickslash contact crescents and Flight activation/braking wisps use generated raster art; ability mechanics are unchanged.
- Active speed, damage and free-ability rewards use yellow, orange and violet respectively, driven by the real effect state. Existing HUD timers remain authoritative.
- Death records/saves still happen immediately. Presentation performs a bounded visual fall to a nearby floor if airborne, plays the existing 73-frame Survivor collapse, holds the last pose for 450 ms, then fades in the recap over 420 ms. Shutdown or a replacement cinematic cancels the presentation. A watchdog explicitly sets the final collapse frame before its hold, so severe throttling cannot reveal the recap over a standing pose. Missing animation/event fallbacks avoid trapping the player. The death sheet is prewarmed and retained.

## Assets and concepts

24 source/runtime PNG pairs are in `sprites/UI/approved-polish-2026-09-09`. The manifest retains prompts, hashes and verified alpha extrema (0, 255). The build script can reproduce runtime files using the committed sources. Readability was reviewed at 34, 64 and 96 pixels.

`mockup-26-distant-cave.png`: restrained distant arch and needles behind the playable cave.
`mockup-28-mining-remains.png`: one small abandoned cart/rail/lantern vignette.
Both are edited concepts based on an older reference screenshot, not runtime evidence. Neither is imported by game code.

## Verification

Passed focused contracts: approved-polish (collapse ordering, visual fall without physics/save mutation, cancellation/watchdog, pickup descriptor isolation, effect authority/expiry, bounded read-only terrain), 33-case jump/momentum-flight, shop catalog, 14-material inventory keys, 42-activity merchant entrance, merchant grounding, Hardcore death/save/tutorial, Hardcore bed retry, 13 material-particle checks, and 11 impact-resolution checks. Syntax checks and `git diff --check` passed. No full-suite claim.

Browser review uses the canonical `serve.py` server at `http://localhost:8080` with `jkd_e2e=1`; the different server on `127.0.0.1:8080` was not used for final evidence. The review reached gameplay, displayed smaller merchants and Bobo's shop with distinct torch/Cave Eyes art, and played advancing death frames with the recap hidden. Runtime screenshots are in this folder. The review reports about 1 FPS, so smooth cinematic cadence, traversal input feel and all effect combinations are not certified by this browser session.

The first Casual-slot collapse preview lacked the Hardcore-only action texture. Normal Hardcore mode already queues it. The review fixture now explicitly loads that existing feature group before starting a save-free preview. This was a fixture dependency issue, not evidence of a missing normal Hardcore preload.

## Wisdom proposal — not wired

Keep Bobo's Wisdom free, but make it offer one contextual next objective based on actual unlocks and progress: name the goal, explain why it helps, and show current progress toward it. Let the player pin or dismiss the suggestion. Rotate only after completion or an explicit request for a different tip. Add short Bobo-flavoured discovery clues later, using real world discoveries rather than random claims. This gives the player a useful decision and a reason to revisit Bobo without adding another currency or changing upgrade balance. The icon is approved and wired; this gameplay redesign remains unimplemented.

## Git checkpoint and safety

The full local development baseline was backed up and pushed before this patch. Large history transfer required eight bounded asset commits, followed by checkpoint `bee3963` and documentation checkpoint `a932248`. The checkpoint tree exactly matched the original full local snapshot. Local main was advanced to existing origin/main without rewriting it. Six fully merged local branches were archived locally then deleted; unique histories were preserved. A verified bundle and full working-tree backup exist outside the repository. The initial combined archive-tag publication failed at the remote HTTP endpoint. The approved patch push subsequently published all six archive tags successfully, and their remote refs were verified. The original full-checkpoint safety tag remains local.

This patch targets `codex/dev-env-2026-09-09`. GitHub publication does not imply a SiteGround/live deployment.

The throttled review also exposed overlapping local preview callbacks; replacing a cinematic now cancels its predecessor. Automated regression coverage verifies one recap callback and final-pose watchdog behavior. The recap artwork was displayed after loading its proper feature group; smooth final cadence remains unverified at the observed 1 FPS.
