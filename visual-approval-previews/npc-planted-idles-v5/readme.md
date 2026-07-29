# NPC planted idles v5

Approved production direction created on 2026-07-26 after the roaming/walking
pass was rejected.

This package keeps the successful profession and personality acting and now
drives the versioned v13 runtime pack under
`sprites/npc/npc-v13-piskel-polished-activities/`.

All 42 accepted activity frames round-trip through six editable `.piskel`
timelines. Each merchant uses its chroma-clean approved calm baseline between
seven larger activities. Activities use slow cross-fades and one-at-a-time
scheduling.

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

The v13 builder matches each activity timeline to its real calm-baseline
silhouette and lower-body root using one fixed scale per merchant. It removes
large chroma components, forces zero RGB beneath transparent WebP pixels, and
rejects any alpha touching a canvas edge.

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
python pipelines/piskel/2026-07-28-build-npc-polished-baselines.py
python pipelines/piskel/2026-07-28-build-npc-polished-activity-piskel-package.py
```

The sole runtime rollback is `?npcActivities=0`.
