# Titan guidance v1

Production HUD art for the Titan resonance locator.

- `titan-resonance-pointer-v1.png` is the 256 x 256 alpha runtime texture.
- `sources/2026-07-28-titan-resonance-pointer-chroma-v1.png` is the built-in
  ImageGen source on a flat green key.
- `sources/2026-07-28-titan-resonance-pointer-alpha-v1.png` is the full-size
  alpha-clean source retained for future sizing passes.
- Runtime registration is owned by
  `TITAN_DISCOVERY_EXPERIENCE.guidance.indicator.pointerAsset`.

The final prompt requested one right-facing, rotation-centered fantasy compass
needle with weathered iron, aged brass, restrained violet resonance crystal
and Titan runes; a clean small-size silhouette; no ring, frame, text, shadow,
watermark, or scene; and a perfectly flat `#00ff00` chroma background.

The runtime combines this pointer with the already approved notification frame.
Phaser only positions, rotates, scales, fades, and typesets the supplied art; it
does not draw fallback pointer geometry.
