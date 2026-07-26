# NPC alive walking v4 — rejected

Rejected on 2026-07-26. The user found merchant walking visually wrong and
replaced it with a larger stand-still idle/activity library.

- `reviewOnly: true`
- `productionChanged: false`
- `rejected: true`
- No file in this folder is imported, preloaded, or registered by Phaser.
- The old frames and boards are retained only as dated failure evidence.
- The page no longer loads or animates the rejected frames.

Replacement:

`http://127.0.0.1:8766/visual-approval-previews/npc-planted-idles-v5/`

Production uses `sprites/npc/npc-v9-planted-idles/`. Merchants are rewritten
to their exact shop anchor every frame and `?npcActivities=0` is the only
feature rollback.
