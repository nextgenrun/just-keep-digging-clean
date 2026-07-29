# ESC Starlight Talent Tree mockup v1

Approved proposal that established the production direction for bringing the
missing Star Pillar constellation overview into a permanent `TALENTS` tab in
the ESC menu.

## Review scope

- Preserve the current pause-menu shell, typography, navy surfaces, cyan edge
  light, and brass selected-state language.
- Show all ten existing constellation signs as two readable ability branches:
  five Quickslash mutations and five Thunderstrike mutations.
- Make mastered, in-progress, and locked states understandable without opening
  the Star Pillar.
- Converge both branches on the single Star Heart capstone and preview the three
  bounded Celestial Engine choices: Wayward Star, Hollow Sun, and Comet Engine.
- Keep normal-mode Engine ownership permanent. The first Heart is earned after
  all ten constellations; Hearts two and three arrive at 20 and 50 capped Engine
  activations so a late-game player can own all three.

## Source references

- Current pause shell: `world/playScene/PlaySceneUI.js`
- Constellation definitions: `values/starConstellations.js`
- Existing talent effects: `values/constellationBuffs.js`
- Celestial Engine rules and copy: `values/celestialEngines.js`
- Sign art: `sprites/constellations/star-signs-v2/`
- Engine art: `sprites/celestial-engines/`

## Files

- `2026-07-28-esc-starlight-talent-tree-mockup-v1.png` — proposed final ESC
  `TALENTS` view.
- `2026-07-28-current-esc-shell-reference.png` — current UI baseline.
- `2026-07-28-project-art-reference-board.png` — exact in-project symbol art.
- `asset-reference-board.html` — deterministic source for the art board.
- `2026-07-28-imagegen-prompt-manifest.md` — generation prompt, checksum, and
  approval boundary.

`reviewOnly: true`; `productionChanged: true`. Nothing in this folder is
preloaded or registered by the game runtime; production recreates the approved
direction with native Phaser UI and the exact project sign/Engine assets.
