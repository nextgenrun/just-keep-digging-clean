# Speed Block attack-speed feedback

## Measured cause

The production Speed Block already divides mining cooldown by 1.5 for 20
seconds. At Level 1 this is 1500 ms to 1000 ms, or 50% more attacks per second.
However, both cooldowns hit the ordinary-animation 750 ms playback ceiling,
so the actual swing animation looked unchanged. God Mode deliberately replaces
the final cooldown with its fixed benchmark and does not gain this bonus.

## Changes

- Preserve the existing +50% reward and 20-second duration. A further pickup
  refreshes the same effect; no extra balance stack was introduced.
- Expose the effective special-block multiplier from `DigSystem` to both UAL
  action presenters. Normalize the unbuffed ordinary swing, then apply the
  temporary multiplier, preserving the authored contact frames and the
  gameplay-owned start gate. Quickslash's playback limits are unchanged.
- End the speed bonus exactly at expiry and show a ceiling-rounded countdown,
  avoiding a misleading zero-second label while the effect is still active.
- Reuse the approved mining-spark bitmap atlas for yellow pickup/contact
  bursts and a bounded player trail. No new atlas, player resizing, hitbox
  changes, procedural placeholder, screen flash, or camera shake is added.
- Colour the existing approved timer yellow and keep active special rewards
  visible even before the ordinary buff-HUD progression gate.

## Validation

`node testing/2026-08-31-level-one-speed-balance-contract.mjs` now includes
sixteen focused Speed Block regressions covering real reward routing, cadence,
all complex SIDE/UP clips, upgrades, refresh, precise expiry, saved remaining
time, God Mode, Quickslash, HUD visibility, bounded bitmap effects, reduced
motion, visual rollback, and cleanup.

The local, save-safe real-input browser route is
`index.html?jkd_e2e=1&speedBlockReview=1&cinematics=0`. Press F1 during gameplay
to stage a real Speed Block on the player's right and ordinary stone overhead.
Mining them uses the production input, animation, damage, and reward paths.

Final browser verification on the `serve.py` source runtime confirmed a real
Speed Block pickup, the yellow `ATK +50% 20s` chip, sustained authored glints,
an overhead stone contact burst, and removal of both timer and sparks after
expiry. The browser reported no errors; the existing Memory Reliquary
unsafe-anchor warnings remain separate from this change. The review gallery
keeps saves disabled, and the existing save remained unchanged between runs.

The focused speed-balance, Level 1 rhythm/moving-scale, authored contact,
buff-hover, jump/flight, collision rollback, and up-dig/wall pipeline contracts
all pass. The older moving-complex-dig production contract still fails its
pre-existing origin expectation (`0.96484375` versus the unified
`0.890625`); neither origin was changed here. This is focused validation,
not a claim that the complete repository suite passes.

## Rollback

`?speedBlockFx=0` disables only the world-space sparks. The timer and actual
50% attack-speed reward remain functional. Animation presentation is isolated
to the multiplier argument in the two UAL presenters and the shared timing
resolver; no source animation or character geometry was modified.
