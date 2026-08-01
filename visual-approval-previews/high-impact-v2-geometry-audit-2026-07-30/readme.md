# High-impact v2 geometry audit — 2026-07-30

Reproducible pixel-geometry evidence for the 1,000 p00 sources and 9,000
first-generation derivatives in `2026-07-29-high-impact-review-library-v2`.

Rebuild from the repository root:

```powershell
python ai-tools/2026-07-30-audit-high-impact-v2-geometry.py
```

The tool reads the library PNGs and manifest, then writes only the dated JSON
and Markdown reports in this folder. It does not rewrite images, manifests,
runtime wiring, gameplay code, or values.
