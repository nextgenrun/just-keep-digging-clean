# NPC alive walking v4

Review-only follow-up created after the approved v8 activity runtime was wired.
It explores full leg-and-prop walk cycles for a later art pass; this folder is
not imported by production code.

Open:

`http://127.0.0.1:8766/visual-approval-previews/npc-alive-walking-v4/`

Regenerate the review frames and manifest with:

```powershell
python ai-tools/2026-07-26-build-npc-alive-walking-review.py
```

The live implementation remains controlled by `?npcActivities=0` and
`?npcWalking=0`. Approving this mockup would authorize a separate future frame
promotion, not change interaction coordinates or shop ownership.

