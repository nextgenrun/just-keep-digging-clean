# Material particle polish

Refines the approved v3 particle assets for footsteps, ordinary dig contacts
and tile destruction. No raster assets, character frames, scale, collision,
damage, attack cadence, rewards, camera shake or hit-stop authority are changed.

## Presentation

- Isolated chips use lazily installed alpha-bounded aliases of the existing
  shard atlas, with a two-pixel sampling gutter. Size follows the visible chip's
  longest dimension without stretching it. Tiny dirt frames no longer vanish
  because of their transparent cell padding. Atlas hashes remain unchanged.
- Tumbling chips exclude baked piles, explosions and rings. Earth travels less
  and settles longer; ore chips scatter faster; crystals tumble more gently.
  Existing per-tile tints remain authoritative.
- Walking emits a low authored scuff and up to two small backward chips.
  Current walk/torch-walk contacts use texture frames 0 and 12, fixing the old
  zero-based versus one-based event comparison. The short-stride sheet uses
  0, 6, 12 and 18. Sole samples are pinned to current-sheet hashes, not the
  rejected legacy rig. Playback, actor transforms and body geometry are untouched.
- Foot effects flush after same-frame movement. Ground/speed gates, supporting
  row checks and twelve live objects keep dust off empty ledges and bridges.
  Slow walking retains contact sound without visual noise.
- Punches and kicks retain their individually measured impact points/sweeps,
  with more consistent fine chips and material-specific motion.
- Tile destruction retains all four approved phases. Shards start after 28 ms,
  with fine/coarse sizes, a crisp non-overshooting entrance and a 96-object cap.
  Eviction cancels owned tweens. Reduced motion uses fewer fragments and less
  travel; teardown clears pending contacts, timers, tweens and sprites.

## Rollback

`particlePolish=0` restores the preceding particle composition, footstep
presentation and destruction pacing. Previous dig-contact timing corrections
and front-plane mesh overlap remain intact.

Independent switches remain: `groundFootFx=0`, `digImpact=0` and
`authoredMineImpact=0`. The earlier `digImpact=0` switch also disables its
unified contact-presentation corrections. None disables physical collision.

## Local review

Use canonical `serve.py` with
`index.html?jkd_e2e=1&collisionReview=1&cinematics=0&particleReview=1`.
Enter gameplay, then F1 stages a wall and material-matched floor.
`impactMaterial=dirt`, `copper`, `stone` or `glow_crystal` chooses the material;
`impactBreak=1` makes the target one-hit. Shift+F8 catches a hit, with optional
`impactAfter=80` or `180` for later phases. F8 resumes the real scene.

Ctrl+F7 catches a foot contact. Ctrl+F8 runs a bounded 1.8-second authoring walk through
the normal keyboard event path; normal A/D remain available. The release timer
also runs while paused and is cancelled on reset/shutdown. F9/F10 are untouched.
The caption reports actual material, frame, world point and recent foot contacts.
These controls require localhost, the harness, collision review and blocked
save writes. They never replace production input or locomotion code.

## Validation

`testing/2026-09-03-material-particle-polish-contract.mjs` covers all seventeen
atlas families, bounds/aspect ratios, sole hashes, both walk contacts, torch and
short-stride variants, mirrored placement, stale handoffs, idle/air/unsupported
suppression, ledges, budgets, fades, cleanup, material identity, break timing,
rollback and review gates. The existing footstep, dig-contact, destruction,
speed, collision and Space/Shift contracts are also part of the focused run.

`testing/2026-09-03-particle-polish-asset-audit.py` only writes diagnostic contact
sheets under testing. They are never loaded by the game.
