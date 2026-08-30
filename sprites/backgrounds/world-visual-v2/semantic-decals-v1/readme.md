# Scenic semantic assets v1

Image-generated physical terrain art for the scenic renderer. These assets are
visual-only: `WorldModel` remains authoritative for tile type, HP, digging,
collision, rewards, and saves.

- `ground-damage-piskel-anchor-v2.png` and `piskel-ground-damage-v2/` are the
  active universal damage package. Ten coordinate-stable motifs x twelve
  cumulative states produce 120 resource-independent frames in one 16.2 MiB
  decoded atlas. The normal painter creates no material tint/response layer.
- The resource-specific V3, V4, V5, and V6 damage packages are rejected as the
  production direction. Their files remain as local comparison/history assets,
  but normal startup does not preload them.
- `ground-damage-dynamic-response-v6/` records the built-in ImageGen Stone
  fragments, alpha extraction, prompt summaries, Blue Caverns reference,
  profile-major offsets, hashes, coverage, and decoded-memory budget for the
  rejected V6 comparison.
- `ground-damage-response-aligned-v5.png` and
  `ground-damage-aligned-v5/` remain the complete fixed-registration V5
  rejected response comparison selected by `?groundDamageAtlas=v5`.
- `ground-damage-fracture-expanded-v4.png`,
  `ground-damage-response-expanded-v4.png`, and
  `ground-damage-expanded-v4/` remain the complete expanded V4 comparison
  selected only for local comparison by `?groundDamageAtlas=v4`.
- `ground-damage-fracture-v3.png`, `ground-damage-response-v3.png`, and
  `ground-damage-layered-v3/` remain the complete layered V3 comparison selected
  only for local comparison by `?groundDamageAtlas=v3`.
- `ground-damage-imagegen-v1.png` and `imagegen-ground-damage-v1/` remain the
  byte-intact V1 atlas/source package selected by
  `?groundDamageAtlas=legacy`.
- `resource-ground-veins-imagegen-2d-v6.png` is the active 188 px semantic
  atlas. Its 60 RGBA frames give all ten resources six genuinely different,
  transparent, orthographic, ground-embedded ImageGen formations. The current
  soil or rock remains visible beneath every frame.
- `imagegen-ground-veins-2d-v6/` preserves all ten ImageGen source sheets,
  extracted alpha sheets, deterministic manifest, and hashes.
- `resource-overlays-imagegen-2d-v5.png` and `imagegen-overlay-2d-v5/` remain
  the immediate rollback for the superseded three-variant isolated-symbol
  direction.
- `resource-recognition-clarity-v1.png` is retained as earlier comparison art.
- `resource-insets-beauty-v1.png` is retained as rejected comparison/source
  art. Its dark physical formations were attractive in isolation but several
  resource identities collapsed together at the native 94 px gameplay size.
- `sky-stars-floating-crystal-beauty-v2.png` is the active 3x2 Choice 1 Star
  Block atlas. Its six frames use the exact normalized ImageGen core family
  used by the mined release, shown at one 94 px tile with no terrain tint.
- `sky-stars-floating-crystal-emissive-v2.png` is its pixel-aligned glow atlas.
  The beauty layer uses screen blend while the restrained emissive layer
  preserves rarity colour through hard underground darkness.
- `sky-stars-beauty-v1.png` and `sky-stars-emissive-v1.png` remain as the
  previous rollback comparison.
- `special-blocks-imagegen-gp-tiers-v3.png` remains the approved 188 px
  special-block atlas. It contains five distinct GP restoration tiers plus
  Speed, XP, Crit, Berserk, Combo, Legend, and Ancient Relic.
- `special-reward-clarity-beauty-v1.png` is retained as earlier comparison art.
- `special-reward-clarity-emissive-v1.png` is its aligned restrained raster
  light response; semantic identity is never rebuilt as HTML or Phaser
  primitives.
- `special-reward-insets-beauty-v2.png` and
  `special-reward-insets-emissive-v2.png` are retained as rejected
  comparison/source art because their physical ore formations were ambiguous
  at gameplay scale.
- `overground-texture-clarity-v1.manifest.json` pins source/output hashes and
  records that gameplay, saves, and authored eclipse gates are unchanged.
- `bedrock-megalith-lock-v1.png` is the approved continuous bedrock material,
  mirrored byte-for-byte from the user-selected 1254 x 1254 source.
- `bedrock-seamless-v1.webp` is retained as the previous rollback material.
- `semantic-decals-preview-v1.webp` is review-only.
- `sources/` preserves the built-in image-generation results plus the locally
  chroma-keyed intermediates used by the deterministic build script. The
  builder preserves their authored light direction and uses an offset/feather
  seam treatment rather than four-way mirroring the bedrock source.

Rebuild with:

```powershell
python ai-tools/2026-07-17-build-scenic-semantic-assets.py
python ai-tools/2026-07-26-build-heavenblocks-progression-assets.py
python ai-tools/2026-07-28-build-overground-texture-clarity-assets.py
python ai-tools/2026-07-28-build-wide-embedded-resource-overlays-v6.py
python ai-tools/2026-07-28-build-star-block-crystal-v2.py
python ai-tools/2026-07-29-build-ground-damage-imagegen-v1.py
python ai-tools/2026-08-26-build-layered-ground-damage-v3.py
python ai-tools/2026-08-26-build-expanded-ground-damage-v4.py
python ai-tools/2026-08-26-build-aligned-ground-damage-v5.py
python ai-tools/2026-08-26-build-dynamic-ground-damage-v6.py
```

Runtime rollback is controlled by the query parameters documented in
`values/worldVisualSemanticAssets.js` and `values/worldVisualDamage.js`.
