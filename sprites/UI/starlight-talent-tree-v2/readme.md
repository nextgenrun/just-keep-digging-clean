# Starlight Talent Tree V2

ImageGen-authored runtime artwork for the shared ESC and Star Pillar talent
tree. Phaser owns layout, interaction, dynamic text, state tint/alpha, and
motion only; it does not draw visible tree frames, cards, locks, or connectors.

## Runtime assets

- `starlight-tree-panel-v2.png` — landscape constellation-tree foundation.
- `starlight-detail-panel-v2.png` — portrait talent-detail foundation with
  three celestial-engine sockets.
- `starlight-engine-page-v2.png` — spacious landscape Engine selection page
  with three authored portrait bays, empty medallion sockets, copy fields, and
  a shared inner-page navigation rail.
- `starlight-modal-shell-v2.png` — full Star Pillar modal foundation.
- `constellation-crest-v2.png` and `celestial-close-v2.png` — transparent
  generated glyphs for the shell's two round wells; the dedicated Star Pillar
  does not fall back to generic atlas art.
- `node-frame-quickslash-v2.png` — violet Quick Slash talent card.
- `node-frame-thunderstrike-v2.png` — cyan Thunder Strike talent card.
- `node-frame-bobo-locked-v2.png` — sealed bronze/orange talent card.
- `node-selection-halo-v2.png` — selected-card halo.
- `bobo-lock-seal-v2.png` — bespoke celestial Bobo prerequisite lock.
- `star-heart-socket-v2.png` — empty Star Heart socket.
- `connector-quickslash-v2.png` and `connector-thunderstrike-v2.png` —
  authored branch filaments that replace procedural Graphics lines.
- `star-heart-ui-v2.png`, `wayward-star-ui-v2.png`,
  `hollow-sun-ui-v2.png`, and `comet-engine-ui-v2.png` — circular UI
  medallions with transparent outer corners. The black-background V1 cores
  remain world-effect assets and are no longer used in this UI.

`manifest-v2.json` records all 18 dimensions, alpha properties, and SHA-256
hashes.
The retained full-resolution ImageGen sheets live in `sources/`.
