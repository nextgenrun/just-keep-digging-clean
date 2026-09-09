# Expedition Setup V2

`new-expedition-foundation-v2.png` is the regenerated New Expedition
foundation. Its four icon sockets and choice bays are carved into one authored
panel so runtime cards no longer sit on top as separate opaque plates.

`new-expedition-selection-v2.png` is the transparent selected-state rim. The
center, icon socket, labels, descriptions, and input zones stay live in Phaser;
the bitmap contains no text, choice icon, or gameplay state.

The untouched built-in ImageGen outputs are retained under `sources/`.
`ai-tools/2026-08-31-build-dynamic-ui-shells-v2.py` preserves the selection
rim's end caps while retargeting only its quiet center span to the live bay.
