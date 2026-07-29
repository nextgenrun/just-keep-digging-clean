# NPC v13 polished baselines

Versioned copies of the approved calm merchant visuals with baked chroma-green
leakage removed. Motion, timing, canvas size, and identity remain unchanged.

- `static/` contains the six browser-compatible fallback sprites.
- `video/` contains the five transparent VP9 calm-idle loops.
- `manifest.json` records source paths, hashes, alpha verification, silhouette
  measurements, and before/after chroma counts.

Regenerate from the preserved approved sources:

```powershell
python pipelines/piskel/2026-07-28-build-npc-polished-baselines.py
```
