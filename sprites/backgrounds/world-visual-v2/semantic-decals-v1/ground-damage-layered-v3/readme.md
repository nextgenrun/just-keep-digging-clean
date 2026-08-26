# Layered ground damage V3

Production provenance for the persistent pre-break damage library promoted on
2026-08-26. The runtime atlases live one directory above so Boot can keep its
existing semantic-decal path.

- `fracture-library-alpha-v3.png` is the alpha-clean 4x4 authored fracture
  source. The builder converts its sixteen silhouettes into twelve cumulative
  states without changing their registered center.
- `manifest.json` pins source/output hashes, dimensions, frame order, alpha
  coverage, material-family order, and the built-in image-generation mode.
- `sources/` retains the generated chroma source used by the deterministic
  alpha extraction.

The production mixer combines one structural family with one of seventeen
material-response families. Exact tile/resource identity then supplies the
response tint through `values/tileDestructionFx.js`; the same authority is used
by the destruction burst, so persistent damage and final breakage agree.

Rebuild from the repository root:

```powershell
python ai-tools/2026-08-26-build-layered-ground-damage-v3.py
```

This package is presentation-only. Tile HP, destruction, rewards, collision,
and save data remain owned by `WorldModel`.
