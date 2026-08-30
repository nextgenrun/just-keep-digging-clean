# Thunderstrike Indicator Art v3

Retired ImageGen component library for the former expanded Thunderstrike panel.
The runtime now presents only the interactive rail, target gate, and needle;
none of these v3 milestone, glyph, or copy-backplate assets is preloaded.

Retained historical assets:

- three milestone rings: dormant, gold challenge, and cyan completed;
- one lightning completion seal;
- three authored Roman numerals: I, V, and X;
- prompt, stage, and status backplates for every dynamic copy row.

The three retained `2026-07-28-imagegen-*-source.png` files are the built-in
ImageGen chroma sources. The three matching `*-alpha.png` files are the
soft-matted extraction masters consumed by
`ai-tools/2026-07-28-build-thunderstrike-indicator-v3.py`. That tool crops,
validates transparent corners/coverage, and writes the ten lossless runtime
WebPs.

Final prompt set:

1. Match the v1 obsidian, bronze, cyan, and gold panel; create dormant,
   challenge, and completed hollow milestone rings plus a storm-check seal.
2. Create three empty premium backplates for prompt, stage, and status copy,
   with calm dark centers and no flat rectangle or CSS styling.
3. Create exactly the monumental Roman numerals `I`, `V`, and `X` as isolated
   forged-gold, cyan-edged game-UI glyphs.

All sources used a uniform magenta chroma background and explicitly excluded
extra text, panels, generic primitives, logos, and watermarks. Phaser may swap,
position, scale, fade, and layer these assets. Dynamic key, stage, damage, and
failure strings remain Phaser text for live binding accuracy, but every string
sits on authored ImageGen art and no `Graphics` primitive remains in the timing
indicator.
