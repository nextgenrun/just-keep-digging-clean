# NPC v10 Piskel idles

Production planted-idle pack for the six merchants. Every merchant has one
editable eight-frame `.piskel` source in `piskel/`; all 48 runtime WebPs in
`singles/` are exported from those sources.

The Piskel pass uses one uniform scale for each merchant, a 512 x 512 canvas,
lower-body root X 256, and foot baseline Y 496. Per-frame resizing is forbidden.
Runtime rendering adds no whole-character translation, rotation, or scale.

Regenerate with:

```powershell
python pipelines/piskel/2026-07-26-build-npc-idle-piskel-package.py
```

The previous `npc-v9-planted-idles/` pack remains intact for comparison.
