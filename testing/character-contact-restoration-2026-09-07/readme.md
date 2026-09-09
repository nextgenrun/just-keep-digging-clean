# Character contact and jump restoration - 2026-09-07

This follow-up keeps the approved V2/V3 character artwork and animation sequences. It restores the integration between that artwork and impacts, Stellar Lance, material footsteps, and jump momentum. There are no added outlines or cloth physics. Cave scenes are outside this review.

## Changes

- Impact projection uses full source-frame dimensions, so the 512px atlases no longer fall back to a generic body/tile point when markers were authored at 192px or 256px.
- Native fist sampling corrects 16 moving SIDE/diagonal contacts and their extension frames. The missing low downward punch marker is included without changing that clip's accepted timing. 130 unique contacts across 21 active sheets land on opaque character pixels.
- Stellar Lance keeps its original fixed 64x28 core, 225px/s travel, short echoes and 0.02 tail origin. Its launch now receives the correct limb contact again. Damage, collision bodies and authoritative tile damage are unchanged.
- Material scuffs and grit are more readable. Moving landings emit one scuff on the actual supporting floor. The existing 12-object foot-effect budget, reduced motion and cleanup remain intact.
- Running jumps carry the existing 336px/s speed through takeoff and held air input. Neutral air drag is 0.45 tiles/s squared. Release braking after landing is 260ms, with 180ms braking for opposite input; ordinary ground movement keeps its previous tuning. The fixed 1.2-tile height and Shift Flight controls remain unchanged.

## Validation

- `contact-contract.mjs`: 1,554 old/current-size, mirrored and rotated projection/Lance cases, 25 native action mappings, and complete current mining-contact coverage.
- `audit-current-assets.mjs` plus `audit-contact-pixels.py`: all 130 contact markers are on the current opaque sprite pixels. `probe-native-markers.py` samples the original Blender poses without rendering or writing a blend file.
- `jump-contract.mjs`: full-controller carry, landing, reversing and reset checks at 30/60/144 FPS. Neutral running-jump landing slides measure about 36-40px, depending on frame integration.
- `foot-contact-contract.mjs`: 64 native foot/material/facing cases, plus one-shot landing scuff ownership and cleanup.
- Existing required Space/Shift suite: 33 full-controller regressions; jump/momentum, collision rollback, 14 impact, 13 material, 11 hitstop/resolution and Stellar Lance contact contracts pass.
- `verify-lance-gameplay.mjs`: 11 real keyboard releases at the visible limb, correct contact frame, full-opacity stable core, no page or console errors.
- `verify-traversal-gameplay.mjs`: real left/right jumps retain +/-336px/s in the air, land at about 310px/s, then slide 37.7px over 267ms. Both produce one supported landing scuff. Continuous walking produces 18 contacts across dirt, stone, copper and magma crystal, with no body overlap or mismatched visible frames.
- `verify-downward-gameplay.mjs`: five real downward impacts, all authored and on the visible frame, with no crouch inserted between the accepted attacks.
- `verify-side-gameplay.mjs`: both facing directions complete the original 12-stage SIDE chain and the moving Jab/Cross transition. All 32 impacts use authored contacts on their visible frame; 505 sampled frames keep the body/sprite alignment, with no animation-frame mismatches. Final proofs are `live-side-combo/evidence-right.json` and `live-side-combo/evidence-left.json`.

Gameplay probes use normal input after a save-disabled fixture setup in the real PlayScene. Menu-video aborts on scene transitions are expected. These are focused restoration checks, not a full game or production-deployment audit.

Review: `/visual-approval-previews/2026-09-07-character-contact-restoration/index.html`.
Exact before-edit copies are in `pre-change/`; no unrelated checkout changes were reverted.
