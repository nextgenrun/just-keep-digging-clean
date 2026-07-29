# Thunderstrike Timing Components v2

Production transparent timing components for the ten-slam Thunderstrike panel.
They replace the former procedural yellow target, white needle, and related
placeholder treatment while retaining the approved v1 obsidian-and-bronze
backing frame. The v3 indicator package separately replaces the remaining
milestone, check, glyph, and copy-backplate primitives.

- `thunderstrike-target-gate-v2.webp` is the runtime bronze, cyan, and gold
  lightning target gate. Phaser stretches its visible width to the exact
  authoritative timing window, so the art and accepted input area coincide.
- `thunderstrike-needle-v2.webp` is the runtime moving lightning spear. Phaser
  changes only its position, scale, alpha, and visibility.
- `2026-07-28-imagegen-thunderstrike-target-source.png` and
  `2026-07-28-imagegen-thunderstrike-needle-source.png` are the retained
  full-resolution sources.
- Missing target or needle art disables the timing panel instead of falling
  back to a cheap procedural substitute.

Both sources were created with the built-in image-generation workflow using
the v1 production frame as the style reference. The source prompts requested
isolated 2D game-UI components, dark forged bronze, electric cyan and warm-gold
lightning, strong silhouette, no labels or text, and a solid magenta
chroma-removal background. The target prompt specified a wide symmetrical
energy gate with ornate end brackets and a readable luminous center. The
needle prompt specified a slender vertical thunder spear with a bright core,
small bronze fittings, and no surrounding panel. Chroma was removed and the
results were tightly cropped before lossless WebP export.

An experimental generated progress-strip draft was rejected for visual
artifacts and is intentionally not retained or loaded.
