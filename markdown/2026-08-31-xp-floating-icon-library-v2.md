# XP Floating Icon Library V2 — 2026-08-31

## Outcome

XP pickup presentation now uses twelve unique 256x256 RGBA glyphs with the same
emerald crystal, antique-gold trim, and transparent-padding language as V1. The
runtime library is exactly 3 MiB decoded and remains presentation-only: reward
amounts, XP thresholds, level progression, and saves are unchanged.

The visual families are:

- **Routine (4):** core mote, faceted diamond, compass mote, split kite.
- **Cluster (3):** interlocked twins, orbit crystal, three-mote constellation.
- **Special (3):** core sigil, runic seal, Legend laurel.
- **Level (2):** core crest, crown starburst.

Runtime routing expands those four art families into seven semantic profiles:
`routine`, `cluster`, `surge`, `star`, `special`, `legend`, and `levelUp`.
Selection is deterministic for the reward context and avoids the two most
recent glyphs when the chosen pool allows it.

## Motion and accessibility

Each profile uses the shared reward-flight curve with importance-scaled flutter,
bob, bank, breathing/squash, trail flecks, travel echoes, and arrival echoes.
The pose resolver samples the path before and after the current point, applies
flutter perpendicular to that tangent, and blends tangent heading into bank, so
icons respond to the curve instead of playing a fixed spin over a static arc.

When `(prefers-reduced-motion: reduce)` matches, glyphs follow the base sampled
curve with no flutter, bob, breath, squash, travel trails, or travel echoes.
Rotation is limited to 16%, flight duration is reduced to 78%, and the compact
arrival confirmation remains.

## Assets and provenance

- Runtime, manifest, and review board:
  `sprites/UI/xp-gathering-v2/`
- Generated source and ImageGen/alpha-correction provenance:
  `sprites/UI/xp-gathering-v2/source/`
- Reproducible slice/downsample/center/hash/review builder:
  `ai-tools/2026-08-31-build-xp-glyph-library-v2.py`
- Runtime selection and motion values: `values/xpGathering.js`
- Asset keys: `values/assetKeys.js -> ui.xpGathering`

Nine glyphs were generated for V2. Three 256 px carrier glyphs are bounded
derivatives of the untouched 1254 px V1 routine, special, and level masters.

## Verification and rollback

`testing/2026-08-31-xp-floating-icon-library-v2-contract.mjs` checks dimensions,
RGBA mode, hashes, uniqueness, alpha coverage, the 3 MiB decoded budget, semantic
reachability and repeat avoidance, flight bounds, reduced-motion behavior,
dynamic preload, XP-bar targeting, and the presentation-only authority boundary.
The 2026-08-26 XP gathering contracts and browser harness remain the broader
coalescing, sound, curve-library, arrival, and responsive-HUD regression proof.

Rollback is values-only: restore the three V1 asset paths and matching
`ui.xpGathering` keys in `values/xpGathering.js` and `values/assetKeys.js`.
`BootScene` preloads the configured entries dynamically, and the original V1
masters remain intact under `sprites/UI/xp-gathering-v1/`.
