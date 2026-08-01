# Star Discovery UI v1

ImageGen-authored, transparent runtime art for the Star Block discovery popup
and the per-level Sign XP bars shown in both the popup and Starlight Talent
Tree.

The six tiers share one silhouette and become progressively richer:

| Tier | Full-depth weight | Sign XP | Material reward | Engine charge |
| --- | ---: | ---: | ---: | ---: |
| Common | 72% | 8 | 2x | 12 |
| Uncommon | 20% | 18 | 3x | 18 |
| Rare | 6% | 45 | 5x | 30 |
| Epic | 1.6% | 120 | 8x | 48 |
| Mythic | 0.35% | 360 | 14x | 72 |
| Astral | 0.05% | 1200 | 25x | 100 |

Epic unlocks below 300 tiles, Mythic below 900, and Astral below 1600. At
shallower depths the eligible weights are renormalized; disallowed tiers never
roll.

Every plate has a real transparent exterior. The deep midnight enamel inside
the ornamental frame is intentional authored contrast for runtime text, not a
leaked black rectangle. Phaser supplies only live text, placement, crop,
alpha, and bounded one-shot tweens. It does not draw visible frame or bar
primitives.

Rebuild and validate all twelve runtime files with:

```powershell
python tools/build_star_discovery_assets.py
node testing/2026-07-30-star-rarity-sign-xp-contract.mjs
```

`star-discovery-v1.manifest.json` pins tier order, source hashes, runtime
dimensions, alpha range, visible coverage, and SHA-256 hashes.

