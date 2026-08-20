# Celestial Overhaul V1 UI Assets

Production-ready bitmap package generated on 2026-08-03. No runtime asset
keys or UI consumers are changed by this package.

- `celestial-actionbar-v1.png` — actionbar-chroma, 1575x474, SHA-256 `f02c90d775bd8a9208dd028ec3a934658bf66b0b0052dc4826c25662a1fd745c`.
- `celestial-currency-hud-v1.png` — currency-chroma, 1589x314, SHA-256 `8dccf88362ddb7d1fe2450c229e0b68d98688291251e69b9888aa7566708deb8`.
- `celestial-talent-foundation-v1.png` — talent-foundation-opaque, 1672x941, SHA-256 `d261a12083388290d43bbc6c22c3e6481135550bdc0d3962aac5bc75038c2843`.

The actionbar and currency HUD were processed with the installed ImageGen
chroma helper, then cropped to nonzero alpha bounds plus 24 px padding. Cropping
uses no resampling. The opaque talent foundation is a byte-identical copy.

Rebuild from the repository root:

```powershell
python ai-tools/2026-08-03-package-celestial-overhaul-v1.py
```

See `manifest-v1.json` for production hashes and `provenance-v1.json` for the
source and exact chroma-removal commands.

## Resident talent icons

The 2026-08-14 extension adds 33 distinct 256x256 RGBA glyphs named
`talent-icon-<node-id>-v1.png`: one authored runtime texture for every Wayward
Star, Hollow Sun, and Comet Engine node. Rebuild and validate them with:

```powershell
python ai-tools/2026-08-14-build-celestial-talent-icons-v1.py
```

See `talent-icons-manifest-v1.json` for per-node geometry and hashes, and
`talent-icons-provenance-v1.json` for source-sheet and alpha-processing records.
