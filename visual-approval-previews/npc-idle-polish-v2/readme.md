# NPC Idle Polish v2

Review-only animation-direction package created on 2026-07-26. It analyzes the exact merchant assets currently loaded by Phaser and proposes stronger character-specific idle beats.

## Boundary

- `reviewOnly: true`
- `productionChanged: false`
- No file under `sprites/`, `values/`, `ui/`, or `world/` is changed by this package.
- The four-pose proposal reels are timing/acting animatics, not production animation frames.

## What to review

Open `index.html` through the project server. Each NPC card shows:

- twelve exact phase samples from the current game-loaded loop, or the current static sprite;
- the proposed neutral, anticipation, character beat, and settle poses;
- shared play/pause, restart, scrub, and speed controls;
- a 138 px gameplay-scale toggle;
- the current weakness, proposed acting beat, and secondary-motion order.

The two ImageGen director boards preserve the current identities while exploring clearer poses. Derived pose crops remove the visible neon-green chroma remnants behind Player Upgrades and Gear Merchant. The current assets remain unchanged so the A/B is honest.

The current side uses twelve exact normalized samples extracted from each live v1 review loop. This keeps pause and scrub deterministic even through a simple local HTTP server that does not expose byte-range seeking for the alpha WebMs.

## Primary animation finding

The present pack is polished technically but under-directed dramatically. Player Upgrades, Gear Merchant, and Gem Power Merchant are still images deformed as a whole, while Money Monster and Bobo use supplied loops with little readable character business at gameplay scale. All five share a four-second rhythm. Magma Money Monster has no idle video at all.

The v2 rule is: quiet planted breathing, one profession/personality-specific event, delayed secondary motion, and an exact settle back to the neutral silhouette.

## Files

- `npc-idle-director-board-character-v2.png`
- `npc-idle-director-board-creature-v2.png`
- `npc-idle-polish-v2-contact-sheet.png`
- `poses/` — four review poses per NPC
- `current-poses/` — twelve exact normalized samples per current animated loop
- `review-spec.json` — single source of truth for labels, findings, and proposed acting beats
- `manifest.json` — current hashes, runtime contract, findings, and proposal beats
- `prompt-manifest.json` — the two final ImageGen prompt specs
- `index.html`, `style.css`, `app.js` — synchronized browser review

Rebuild derived pose crops, the contact sheet, and the manifest from the project root:

```powershell
python ai-tools/2026-07-26-build-npc-idle-director-review.py
```
