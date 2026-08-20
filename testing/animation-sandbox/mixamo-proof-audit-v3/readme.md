# Mixamo proof audit v3

Clear first-audit-style comparison of current runtime animations against only
V4-retargeted Mixamo motions on the approved Survival mesh and rig. Generic
Mixamo character previews are deliberately excluded from auditable rows.

Every candidate preview in `previews/` is regenerated for infinite replay.
The page reuses the current runtime sprite renderer on the left and preserves
the Atlas V2 browser-local verdict key. It does not register, preload or
promote animations into the game.

