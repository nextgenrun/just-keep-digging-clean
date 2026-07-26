# NPC v8 activities — superseded

Former production transparent cutouts promoted from
`visual-approval-previews/npc-idle-activities-v3/`. Production now uses
`sprites/npc/npc-v9-planted-idles/`.

The v6 WebM loops remain the calm baseline where VP9 is available. These v8
poses are cross-faded in for profession work, rare signature actions, and
player reactions. `quiet` is the non-video fallback. All visuals remain
bottom-anchored on a 512 x 512 canvas.

Regenerate with:

```powershell
python ai-tools/2026-07-26-promote-npc-activity-assets.py
```

`manifest.json` records hashes, alpha bounds, source review hashes, and the
checkerboard QA sheet. The folder is retained as immutable rollback evidence;
it is no longer preloaded and the former pacing path has been removed.
