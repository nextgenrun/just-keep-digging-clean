# Cave composition and player grounding

The first cave composition pass reuses the existing approved art. Distant cave
plates receive a restrained cool grade, and decorative layers share more of the
backdrop tint so they read behind the playable foreground. The grade fades in
over the first 12 underground tiles. Surface lighting remains unchanged.

Underground terrain returns to its authored neutral tint, while deep backdrop
cards retain only a small amount of the surface weather/lightning tint. Backdrop
grading uses each card's world depth, so moving the camera does not move its grade.
The torch, darkness reveal radius, tile health, rewards and movement remain under
their existing gameplay owners.

`PlayerContactShadowSystem` now reads the current custom physics body's
`x/y/w/h/vx` fields. Previously its Arcade-body fallback placed the shadow about
50 px below the player's feet in the current character presentation. The shadow
now follows the actual floor and horizontal speed, independently of sprite pose
offsets, and retains its existing airborne fade and cleanup.

## Configuration and review

- `values/caveVisualComposition.js` owns the grade, entrance fade and toggle.
- `?caveComposition=0` restores the previous cave tint and shadow presentation.
- Run the checkout's `serve.py`, then open
  `testing/2026-09-04-cave-composition-review.html`.
- The review compares two real Phaser worlds with the same art, world identity,
  torch profile and gameplay settings. Only `caveComposition` differs.
- Reserved fixture slots 901 and 902 keep the review separate from normal slots.
  Both use the local `jkd_e2e` save-write guard. GP is periodically replenished
  to the selected profile to keep a long review usable; this is review-only.
- Buttons expose full-width before/after, cave depths, weather, torch and actual
  keyboard movement/mining. Runtime checks report physical floor/shadow positions,
  visibility radius, save guard and input results. Independent frame timing can
  cause small movement differences; Resync aligns the resting position again.

The shared comparison launcher now transitions through the menu scene's plugin,
which stops that menu before world loading releases its textures.

## Focused validation

Run with Node:

```text
node --test testing/2026-09-05-cave-composition-contract.mjs testing/2026-07-30-natural-fire-live-compare-contract.mjs testing/2026-08-15-shallow-material-lighting-contract.mjs testing/2026-07-29-underground-backdrop-enhancers-v7-contract.mjs
```

The new behavior tests cover query rollback, smooth entrance blending, unchanged
surface samples, deep weather attenuation, preserved biome variation, physical
shadow anchoring, Arcade fallback, pose independence, airborne fade and cleanup.
They do not replace visual inspection in the real game.

## Verified on 2026-09-05

All 12 focused checks passed, followed by syntax checks for all nine JavaScript
files and a clean scoped diff whitespace check. These are focused checks, not a
repository-wide health claim.

The canonical `serve.py` runtime was visually inspected at actual depths 0, 18,
144, 693 and 1016 m. The paired views preserved visibility radius at full GP,
low GP and with the torch off. Surface terrain and far tints matched exactly.
Both save guards reported enabled. Real walking moved both bodies, and a real
S+F mining input reduced the same floor tile from 49 to 33 HP in each version.
The updated shadow sat 2 px above the physical floor; the baseline sat 48.5 px
below it. The existing airborne fade is covered by the behavior tests.

Screenshots and `cave-composition-browser-proof.json` are saved under the task's
visualization output directory. One reused browser tab stalled during boot;
a fresh tab completed the review. Captured gameplay UI error arrays were empty;
the browser log also contained an unsourced MutationObserver error during boot.
