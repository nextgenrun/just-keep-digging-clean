# Titan Collection Mockups v1

`reviewOnly: true`  
`productionChanged: false`

This folder explores the approved visual direction for the 25 Cave Titans
before any additional Phaser wiring.

## Review Scope

- Each underground titan is colossal scenery, approximately 15–22 blocks wide
  and 8–13 blocks tall.
- Every titan owns a distinct environmental chamber rather than reusing one
  backdrop with a different tint.
- Foreground terrain continues to mask the titan until the player clears the
  surrounding blocks.
- The reveal is purely visual: rim glow, expanding light rings, falling grit,
  environmental light response, and one slow creature movement.
- The ESC menu gains a practical `TITANS` archive concept with 25 slots,
  discovered/locked states, one large living vignette, and short lore.
- The town receives a physical 25-position Titan Walk with smaller,
  non-collidable living miniatures and dormant future plinths.
- Ambient motion stays restrained: breathing, head turns, wing shimmer, tail
  sway, floating drift, localized motes, and gentle glow pulses.

## Mockups

1. `2026-07-26-01-massive-titan-reveal-v1.png`
   - Mossback Wanderer at full environmental scale during the unlock pulse.
2. `2026-07-26-02-esc-titan-archive-v1.png`
   - Proposed ESC `TITANS` tab, 5×5 archive, selected vignette, and lore.
3. `2026-07-26-03-surface-titan-walk-v1.png`
   - Proposed town-edge physical collection with seven discovered miniatures.
4. `2026-07-26-04-five-titan-background-families-v1.png`
   - Five distinct chamber families proving that titan backgrounds are authored
     compositions, not palette swaps.

## Sources

- Current runtime references are preserved under `sources/`.
- Titan designs come from
  `sprites/backgrounds/titan-discoveries-v1/` and
  `ai-tools/2026-07-26-titan-runtime-contact-sheet.png`.
- Existing scenic composition references come from
  `visual-approval-previews/underground-biome-variation-library-v1/`.
- Exact generation prompts and input roles are recorded in
  `2026-07-26-imagegen-prompt-manifest.md`.

## Approval Gate

Nothing in this folder is game-loaded, preloaded, registered, or referenced by
the runtime. Approval of individual mockups is required before changing titan
placement, the pause menu, town scenery, save data, or animation systems.
