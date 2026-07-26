# NPC v11 rooted motion idles — rejected archive

Review archive for all six town merchants. Its four generated quiet-loop frames
were rejected and this pack is no longer loaded by production. The seven
accepted activities were isolated into `npc-v12-piskel-approved-activities/`.

Every frame is stored in an editable per-merchant `.piskel` document. The build
calibrates generated quiet frames once, then locks the lower-body root to X 256,
the foot baseline to Y 496, and a 512 x 512 canvas. Runtime playback changes
textures and opacity only; position, rotation, and display size remain fixed.

Regenerate with:

```powershell
python pipelines/piskel/2026-07-26-build-npc-motion-idle-piskel-package.py
```

Keep this folder intact only for provenance and comparison.
