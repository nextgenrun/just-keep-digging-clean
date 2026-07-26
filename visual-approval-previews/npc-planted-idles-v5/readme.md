# NPC planted idles v5

Approved production direction created on 2026-07-26 after the roaming/walking
pass was rejected.

This package keeps the successful v3 profession and personality acting, adds
four more planted activities per merchant, and now drives the versioned v11
runtime pack under `sprites/npc/npc-v11-piskel-motion-idles/`.

All 66 runtime frames round-trip through six editable `.piskel` timelines.
Each merchant has four chronological quiet frames and seven larger activities.
Quiet motion uses a slow 0-1-2-3-2-1 loop, 520 ms dissolves, and a long rest;
activities use 1.2-second preview cross-fades and one-at-a-time scheduling.

## Non-negotiable motion contract

- Every merchant remains at its exact authored shop anchor.
- Runtime X and Y are rewritten to that anchor every frame.
- There is no walk state, roam radius, pacing flag, horizontal offset, whole
  body drift, or walking query parameter.
- Motion comes only from cross-faded authored sprite frames. Runtime transform
  values never animate.
- At most one merchant performs a large ambient activity.
- Player reactions remain proximity-driven and always return to quiet.

## Crop safety

The builder detects all four panel columns and three panel rows from the
source-board gutters. It refuses a board without twelve isolated panels, adds
safe padding before extraction, aligns the main body to one shared per-merchant
baseline, and rejects any alpha touching the canvas edge.

This specifically prevents a Money/Magma head or any other neighboring panel
from entering the Gem merchant sprite. Versioned preview URLs also avoid the
stale cached crop visible in the earlier v3 browser session.

## Files

- `npc-planted-idles-character-extension-v5.png` — four new poses for Player
  Upgrades, Gear Merchant, and Bobo.
- `npc-planted-idles-creature-extension-v5.png` — four new poses for Money,
  Gem, and Magma merchants.
- `npc-idle-loop-character-v11.png` and `npc-idle-loop-creature-v11.png` — four
  chronological rooted quiet frames for every merchant.
- `poses/` — 66 current browser-review exports, plus retained semantic aliases.
- `activity-spec.json` — labels, acting notes, timing, and town rhythm.
- `prompt-manifest.json` — exact built-in ImageGen specifications.
- `idle-loop-prompt-manifest-v11.json` — exact rooted-motion ImageGen prompts.
- `manifest.json` — source hashes, detected panel bounds, and promotion
  provenance.
- `index.html`, `style.css`, `motion.css`, `app.js` — fixed-anchor simulator.

Rebuild the review crops and production pack from the project root:

```powershell
python pipelines/piskel/2026-07-26-build-npc-motion-idle-piskel-package.py
```

The sole runtime rollback is `?npcActivities=0`.
