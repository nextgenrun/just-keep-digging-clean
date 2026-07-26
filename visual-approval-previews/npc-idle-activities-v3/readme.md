# NPC Idle Activities v3

Review-only activity-direction package created on 2026-07-26. It keeps the
approved-looking v2 planted idle direction and adds short profession,
personality, and player-reactive actions.

This remains the approved acting-language reference. The expanded, smoother,
production-wired replacement is `../npc-planted-idles-v5/`. V3 pose URLs now
carry a cache version so the earlier stale Gem crop cannot reappear.

## Boundary

- `reviewOnly: true`
- `productionChanged: false`
- No Phaser loader, animation registry, NPC behavior, runtime asset, or game
  configuration is changed.
- The generated poses and browser transitions are direction animatics, not
  production animation frames.

## What changed from v2

V2 answered how each merchant should breathe, anticipate, act once, and settle.
V3 adds an activity library around that base:

- quiet/ready is still the dominant state;
- work actions explain each merchant's profession through an existing prop;
- rare actions expose personality with a stronger silhouette change;
- player reactions make proximity feel acknowledged;
- no more than two large town actions run together in the simulator;
- every activity settles back onto the authored standing anchor.

Open `index.html` through the project server. The preview automatically
staggers the six merchants, supports pause/reset/forced activity, offers a town
energy control, and can display the actors at the exact 138 px game height.
Each card also exposes all four poses for manual review.

## Files

- `npc-activity-director-board-character-v3.png` — Player Upgrades, Gear, Bobo
- `npc-activity-director-board-creature-v3.png` — Money, Gem, Magma
- `npc-idle-activities-v3-contact-sheet.png` — labeled all-NPC comparison
- `poses/` — four browser-review crops per NPC
- `activity-spec.json` — activity names, acting notes, timing, and town rhythm
- `prompt-manifest.json` — final built-in ImageGen prompt specifications
- `manifest.json` — hashes, dimensions, provenance, and safety boundary
- `index.html`, `style.css`, `motion.css`, `app.js` — staggered activity timing mockup

Rebuild pose crops, contact sheet, and manifest from the project root:

```powershell
python ai-tools/2026-07-26-build-npc-activity-review.py
```

## Production direction

Keep each NPC's quiet loop separate from short one-shot activities. A town
scheduler should apply per-NPC cooldown jitter, cap simultaneous large actions,
and reserve player reactions for proximity or interaction. Production v9 uses
only planted activity states and rewrites every visual to its original anchor
on every update; walking and half-step translation are not permitted.
