# Titan Collection Mockups v1

`reviewOnly: false`  
`productionChanged: true`

This folder records the approved visual direction and its bounded production
promotion for the 25 Cave Titans.

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
- The town receives a physical 25-position Titan Walk with non-collidable
  living display creatures and dormant future plinths.
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

## Production Boundary

The complete direction is now promoted. Production uses 25 unique opaque
1536x848 chamber cards at 15-22 by 8-13 tile discovery scale, compact alpha
creatures for Boot-safe grid thumbnails/underground footprint authority and
rollback, canonical retention ids, an on-demand high-resolution archive
vignette, and the generated 25-position surface walk. The surface walk now uses
the separate production library in
`sprites/backgrounds/titan-surface-stances-v1/`: one 768x768 identity-matched
stance per Titan. Cards stream near the player instead of entering Boot.

The mockup PNGs in this folder remain reference-only and are never loaded by
Phaser. Exact promoted sources, prompts, hashes, runtime WebPs, rollback, and
tests are documented in
`markdown/2026-07-26-titan-chambers-production-v2.md`.
