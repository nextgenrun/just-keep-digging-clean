# Additive Surface Props V2 Runtime Review

**Date:** 2026-07-28  
**Status:** production assets wired; review sheet not game-loaded

`2026-07-28-existing-plus-additive-prop-scale-sheet-v2.png` shows the nine
retained Level 2 props and seven additive ImageGen chapter anchors at the same
physical scale, with a 1.75 m ruler on every card.

The sheet is visual QA only. Phaser loads the seven isolated lossless-alpha
WebPs from `sprites/environment/surface-props-v2/`; it never loads this PNG,
the chroma sources, alpha masters, mockup panoramas, or any baked background.

The additive set deliberately contains no landscape, terrain strip, sky, moon,
celestial body, player, text, or UI. The existing background and day/night sky
remain authoritative.
