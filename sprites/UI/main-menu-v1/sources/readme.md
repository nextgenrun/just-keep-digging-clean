# Main Menu V1 Sources

- `2026-08-03-main-menu-button-source-v1.png` is the original ImageGen master.
- `2026-08-03-main-menu-button-alpha-v1.png` is the alpha-clean production
  source produced with the ImageGen chroma-key helper using a soft matte and
  despill pass.

The deterministic builder preserves both decorated end caps, extends only the
neutral center span to the exact 5:1 runtime geometry, and writes the runtime
PNGs plus SHA-256 provenance to `../manifest-v1.json`.
