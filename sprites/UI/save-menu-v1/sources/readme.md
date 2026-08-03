# Save Menu V1 Sources

`2026-08-03-save-menu-ui-kit-chroma-v1.png` is the untouched ImageGen source
sheet. The build script owns the fixed quadrant crops, chroma cleanup, cap-safe
horizontal retargeting, selected-choice derivation, runtime PNGs, and manifest.

The chroma crops and alpha-clean intermediates are retained so the final assets
remain auditable and reproducible. Do not wire the source sheet directly into
Phaser.
