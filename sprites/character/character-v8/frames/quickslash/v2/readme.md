# Quickslash V2 Curated Source

The loose PNG files are the authoritative animation selection. Frames 10-33 and 45-60 are intentionally retained; the removed frame ranges must not be restored automatically.

`Video Frame Extractor 2026-07-13 14_29_22 EEST.zip` is a source backup only. The V8 builder ignores ZIP files and processes the curated loose PNGs with:

```powershell
python tools/build_legacy_miner_v8_runtime.py --ids quickslash-v2
```
