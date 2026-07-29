# Wide embedded resource overlays V6

This package contains the approved natural resource language derived from the
V5 common/deep three-ground reference boards.

- Ten resources.
- Six genuinely different authored silhouettes per resource.
- Strict orthographic top-down 2D.
- Transparent overlays with no baked ground square.
- Designed to remain distinct at the native 94 px gameplay size.

`sources/` preserves the accepted built-in ImageGen chroma sheets.
`alpha-sheets/` preserves their locally extracted RGBA counterparts.
`manifest.json` pins frame order, source provenance, outputs, and hashes.

Rebuild the runtime atlases, individual references, and QA boards with:

```powershell
python ai-tools/2026-07-28-build-wide-embedded-resource-overlays-v6.py
```
