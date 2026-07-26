# Village Floor Concepts V1

**Date:** 2026-07-26  
**Status:** Option A approved; Options B/C remain `reviewOnly: true`  
**Runtime:** `productionChanged: true` through a separate production asset

These three gameplay-screen mockups explore a continuous scenic Town Square
floor that hides the authoritative unbreakable tile grid. They preserve the
level walking line, current scenic village, and existing diggable underground.
The concepts retain their original 1.80 m / 2.00 m review provenance; the
approved runtime promotion uses the later 1.75 m midpoint / 2.10 m calibration.

## Options

1. `01-worn-mountain-slate-street.png`
   - Irregular slate paving over rounded old masonry.
   - Most natural, quiet, and compatible with the existing village.
   - **Approved and promoted.**
2. `02-timber-stone-miner-boardwalk.png`
   - Weathered oak and flagstone over timber-braced retaining stone.
   - Strongest mining-settlement identity and clearest constructed silhouette.
3. `03-star-forged-basalt-plaza.png`
   - Broad polygonal basalt with restrained mineral and bronze detailing.
   - Strongest UNDERSTAR identity, but also the most monumental treatment.
4. `04-option-a-wired-runtime.png`
   - Centered live Phaser verification of the promoted Option A facade.
   - Shows all five surface merchants together at their new square positions.

## Promotion boundary

- None of these full-screen concept images is loaded by the Phaser runtime.
- Runtime loads the isolated production derivative
  `sprites/backgrounds/start-zone-scenic-v1/town-square-slate-facade-v1.png`.
- `WorldVisualTownFloorView` aligns that 2172x139 alpha facade to the approved
  village and borrows the authoritative terrain mask.
- No collision, tile type, HP, saving, digging, or unbreakable rules changed.
- Options B and C remain review-only and have no runtime references.

See `2026-07-26-imagegen-prompt-manifest.md` for the exact generation prompts.
