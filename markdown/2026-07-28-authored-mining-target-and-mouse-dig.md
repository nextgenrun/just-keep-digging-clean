# Authored Mining Target and Mouse Dig

**Date:** 2026-07-28  
**State:** production wired

## Player-facing result

- The former full yellow target rectangle is replaced by one transparent,
  ImageGen-authored four-corner overlay.
- Pointer movement makes an adjacent solid tile the visible target; primary
  click or hold mines through the same authoritative path as the configured dig
  key.
- A held primary button remains authoritative until release, emits the same
  repeated cooldown-gated requests as held `F`, and can retarget another valid
  adjacent tile under the cursor without requiring a second click.
- The approved corner art now has a restrained second-layer glow: calm on hover,
  then brighter, tighter, and faster while the button is held.
- Directional keys immediately retake aim ownership. The dig key remains
  unchanged and fully supported.
- The redundant final-hit square, label, and special preview state are removed.
- The older `OVERKILL +damage` floating label and its extra presentation effects
  are removed; excess-damage bookkeeping remains compatible with existing
  gameplay and stats.
- Main-world and compact-cave gameplay share the same pointer controller and
  body-adjacent target safety.

## Safety contract

- Mouse targets must be solid, in bounds, and directly adjacent to the real
  31x75 player body.
- Shops, pause, inventory, level-up choices, Campfire, Milestones, Star Pillar,
  dialog, and every other shared modal shell own the mouse before world mining.
  Their priority remains active through the completed exit tween, preventing a
  close click from leaking into the tile underneath.
- Clicking through the player, clicking distant tiles, clicking air, and
  clicking an interactive UI object cannot arm digging.
- A quick click is retained through the next frame; holding the primary button
  follows existing held-dig cadence and animation/contact timing.
- Pointer release, leaving the game canvas, disabled controls, invalid range,
  air, or an interactive UI hit immediately pauses or cancels the held gesture.
- Arc Core, Living Drill, Heavy Punch direction, UAL contact validation,
  cooldowns, rewards, saves, and tile authority remain on their existing paths.

## Runtime and rollback

- `?miningTargetVisuals=0` restores the former rectangle and skips the new
  texture preload.
- `?mouseDig=0` disables pointer targeting/digging without changing keyboard
  controls.
- `window.__jkdMiningTargetFeedback.snapshot()` reports visual mode, visibility,
  target key, and texture key.

## Verification

`testing/2026-07-28-mining-target-mouse-dig-contract.mjs` covers pointer
adjacency/range rules, query rollbacks, hover ownership, click/hold and
quick-click behavior, repeated held requests, live held retargeting, canvas-exit
cancellation, hover/held visual modes, UI rejection, asset/preload wiring,
main/cave integration, and final-hit/overkill-presentation removal.

`testing/2026-07-29-ui-mouse-priority-contract.mjs` additionally covers nested
modal locks, same-click close races, held-dig cancellation, paused-state
blocking, and idempotent UI cleanup.
