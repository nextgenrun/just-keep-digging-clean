# Scenic semantic assets v1

Image-generated physical terrain art for the scenic renderer. These assets are
visual-only: `WorldModel` remains authoritative for tile type, HP, digging,
collision, rewards, and saves.

- `resource-insets-beauty-v1.png` contains ten mineral identities with three
  deterministic 256 px variants each. They are irregular alpha insets, not UI
  icons or square terrain tiles.
- `sky-stars-beauty-v1.png` contains six visible physical rarity states.
- `sky-stars-emissive-v1.png` is derived from the beauty atlas so its glow stays
  pixel-aligned.
- `special-reward-insets-beauty-v2.png` replaces the legacy `+5`, `+50`,
  speed, crit, berserk, combo, and legend emblems with seven physical 256 px
  ore/rune formations and adds the Ancient Relic Cache in frame 7.
- `special-reward-insets-emissive-v2.png` supplies their aligned, softly
  pulsing light response without HTML or Phaser-drawn semantic glyphs.
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
```

Runtime rollback is controlled by the query parameter documented in
`values/worldVisualSemanticAssets.js`.
