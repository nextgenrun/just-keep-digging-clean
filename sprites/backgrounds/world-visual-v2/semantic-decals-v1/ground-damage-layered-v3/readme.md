# Layered ground damage V3

Rejected comparison provenance for the persistent pre-break damage library
promoted on 2026-08-26. Universal V2 replaced this resource-specific direction
as the production default on 2026-08-27. The V3 atlases are not normally
preloaded; `?groundDamageAtlas=v3` is retained only for local comparison.

- `fracture-library-alpha-v3.png` is the alpha-clean 4x4 authored fracture
  source. The builder converts its sixteen silhouettes into twelve cumulative
  states without changing their registered center.
- `manifest.json` pins source/output hashes, dimensions, frame order, alpha
  coverage, material-family order, and the built-in image-generation mode.
- `sources/` retains the generated chroma source used by the deterministic
  alpha extraction.

The rejected V3 mixer combines one structural family with one of seventeen
material-response families. Exact tile/resource identity then supplies the
response tint through `values/tileDestructionFx.js`; the same authority is used
by the destruction burst, so persistent damage and final breakage agree.

Rebuild from the repository root:

```powershell
python ai-tools/2026-08-26-build-layered-ground-damage-v3.py
```

This package is presentation-only. Tile HP, destruction, rewards, collision,
and save data remain owned by `WorldModel`.
