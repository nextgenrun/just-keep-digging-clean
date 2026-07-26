# NPC sprites

Versioned NPC art lives here. Production preload code must reference immutable
version folders and retain the prior version as an explicit rollback path.

- `npc-v5-generated/` contains the static merchant fallback portraits.
- `npc-v6-animated/` contains the transparent VP9 merchant idle loops.
- `npc-v7-level-two/` contains the Level 2 Magma merchant.
- `npc-v8-activities/` retains the superseded four-state activity-pose pack.
- `npc-v9-planted-idles/` retains the previous clean fixed-anchor pack.
- `npc-v10-piskel-idles/` is production: six editable Piskel timelines and 48
  root-locked, single-scale runtime exports with no whole-character wobble.
