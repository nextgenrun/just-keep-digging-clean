# Star Block Crystal Pop-out V2

Date: 2026-07-28  
Status: production  
Selected direction: Pure Crystal Star, Choice 1

## Outcome

All six underground Star Block rarities now use a literal free-floating
crystal-star family. The mined release uses the same normalized core source as
the block icon. The block keeps its 94 px tile envelope, and the first fully
visible released core now matches that exact 94 px envelope one-to-one. Growth
waits until the star begins lifting free, reaches about 136 px, and continues
the calmer levitation behind six paced echoes.

This is presentation-only. Tile identity, HP, mining rewards, constellation
progress, saves, collision, rarity selection, lighting persistence, and the
UI-only ownership of collected stars are unchanged.

## Art package

The deterministic builder is:

```powershell
python ai-tools/2026-07-28-build-star-block-crystal-v2.py
```

It normalizes the six approved high-resolution ImageGen core masters into:

- `sprites/environment/star-block-crystal-v2/star-core-*-v2.png`
- `sprites/backgrounds/world-visual-v2/semantic-decals-v1/sky-stars-floating-crystal-beauty-v2.png`
- `sprites/backgrounds/world-visual-v2/semantic-decals-v1/sky-stars-floating-crystal-emissive-v2.png`
- `sprites/environment/star-block-crystal-v2/star-block-crystal-v2.manifest.json`

The manifest pins source and runtime SHA-256 values, rarity order, frame sizes,
the selected mockup, and both active atlases.

## Runtime behavior

`values/worldVisualSemanticAssets.js -> skyTile` owns the block presentation:

- six 256 px atlas frames in a 3x2 sheet;
- one 94 px display footprint;
- screen-blended beauty with no terrain tint;
- paired emissive art above the hard-black underground mask.

`values/starConstellations.js -> collectedStarReleaseFx` owns the mined release:

- 94 px tile-calibrated source envelope;
- 0.90 transparent fade-in start scale, approximately 85 px;
- 1.00 fully visible pop beat, exactly matching the 94 px live tile;
- 720 ms delayed growth after the pop tween;
- 1.45 peak scale, approximately 136 px;
- 10.8 seconds plus a small rarity duration bonus;
- 360–480 px upward travel;
- six delayed ImageGen-core echoes;
- retained matching fracture and pulse art;
- no procedural circles, Graphics, generated textures, or tint replacement.

`FloatingTextSystem` still records the constellation award immediately and
keeps collected stars out of the persistent world. `SkyStarReleaseView` owns
only the transient bitmap animation.

## Validation

Primary automated gates:

```powershell
node testing/2026-07-27-star-block-destruction-quality-contract.mjs
node testing/2026-07-13-sky-star-release-smoke.mjs
node testing/2026-07-27-star-block-steady-colour-light-contract.mjs
node testing/2026-07-26-star-block-light-persistence-contract.mjs
node testing/2026-07-27-star-block-pulse-quality-contract.mjs
```

The destruction contract verifies the selected revision, exact 94 px
block-to-release handoff, delayed growth, six core hashes, paired atlas hashes,
calmer rise, restrained peak, heavy echo count, boot preload, and absence of
procedural replacement art.

Development-only F5 still triggers the real save-safe release path for live
visual inspection.

## Rollback

The former `sky-stars-beauty-v1.png`, `sky-stars-emissive-v1.png`, and all
`star-block-destruction-v1/` sources remain retained. A narrow tile comparison
can use `?terrainSemantics=0`. A full art rollback changes only the `skyTile`
atlas paths and `collectedStarReleaseFx` asset/timing values; gameplay and save
data require no migration.
