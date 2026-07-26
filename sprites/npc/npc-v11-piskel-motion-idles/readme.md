# NPC v11 rooted motion idles

Production pack for all six town merchants. Each merchant has four chronological
quiet-loop frames plus seven larger planted activities: 66 lossless WebPs total.

Every frame is stored in an editable per-merchant `.piskel` document. The build
calibrates generated quiet frames once, then locks the lower-body root to X 256,
the foot baseline to Y 496, and a 512 x 512 canvas. Runtime playback changes
textures and opacity only; position, rotation, and display size remain fixed.

Regenerate with:

```powershell
python pipelines/piskel/2026-07-26-build-npc-motion-idle-piskel-package.py
```

The previous `npc-v10-piskel-idles/` static pack remains intact for comparison.
