# Focused Talents review

Completed 2026-09-07 in the local checkout. Production UI modules are updated;
the screenshots and fixtures below use the save-blocked review harness.

## Result

Talents opens on three complete baked tree cards: Wayward Star, Hollow Sun and
Stellar Lance. Choosing a card shows only that branch's twelve nodes and rails.
ALL TREES returns to the selector. Hidden branches cannot receive input.

Selecting a node inspects it in the stationary right-hand dossier. The complete
description card, rank plate, availability captions, action labels, branch
titles and bottom instructions are authored bitmap artwork. Only changing
balances, upgrade prices and numeric requirements use live text in fixed wells.
There are no floating hover tooltips or text labels attached to each node.
The original art proportions are preserved and the underlying generic pause
frame stays hidden while Talents is open.

The action button or Enter purchases through the existing progression owner.
A successful transaction plays one short chime, an authored light burst around
the fixed node, and a stationary TALENT AWAKENED or RANK UP plaque. Feedback
lasts 680 ms; reduced motion uses the plaque for 420 ms without the flash/ring.
Closing, switching trees and destruction cancel feedback and its tracked sound.

## Browser evidence

Final browser captures use the current source, the normal game entry flow and
the existing save slot. Review fixtures are applied only after save writes are
blocked. These are controlled level-80 fixtures, not natural-progression proof.

- [Tree selection](focused-selector-final.png): complete three-card artwork.
- [Wayward Star](focused-wayward-final.png): twelve visible nodes, mastered root.
- [Hollow Sun](focused-hollow-final.png): real ALL TREES navigation and matching dossier.
- [Stellar Lance](focused-lance-final.png): Echo Arsenal apex icon and current copy.
- [Compact layout](focused-talents-compact.png): 740-pixel iframe; proportional
  art, twelve nodes and bottom instructions stay inside the frame. Copy is
  smaller at this size; this is alignment evidence rather than a mobile redesign.
- [Talent awakening](focused-talent-unlock-final.png): native 2560x1440 canvas
  captured 133.48 ms after a successful root unlock.
- [Keyboard rank-up](focused-talent-rank-up-final.png): native canvas captured
  133.47 ms after Enter upgraded the selected root.

The root unlock changed rank 0 to 1 and Talent Points 78 to 77, with Stars
unchanged at 9,999,999. Enter changed rank 1 to 2 and Stars to 9,999,899, with
Talent Points still 77. The next price changed from 100 to 200 inside the same
measured painted well. Feedback play count advanced exactly once per purchase;
both real audio admissions used levelUpShort at rate 1.12 and effective gain
0.27. Feedback was inactive by the 684 ms settled samples. Audio admission was
verified technically; no separate subjective listening review is claimed.

[Runtime diagnostics](focused-talents-runtime.json) retain all three final
branches, the compact view, before/after balances, capture states, geometry,
missing-texture arrays and runtime errors. The final branches report twelve
visible nodes and no missing textures. The physical Star Pillar uses the same
view but was not separately visited in this browser pass.

## Artwork and checks

Seven PNGs were generated/edited using the built-in ImageGen tool and copied
unchanged to [the artwork pack](../../sprites/UI/celestial-focus-v1/readme.md).
[Exact prompts](../../sprites/UI/celestial-focus-v1/prompts.json) and
[source hashes](../../sprites/UI/celestial-focus-v1/manifest.json) are retained.
The controls, feedback and FREE variant have real alpha. Existing V2 complete
talent faces and descriptions are reused. No generated output was redrawn,
resampled or composited into a replacement source file.

All nine focused suites pass; [the test log](focused-talents-tests.txt) records
each command and result. Coverage includes asset provenance, current ability
copy, Star UI regression, actual progression and effect authority, action-bar
input, focused navigation, inspect-before-purchase behavior, rejected purchases,
God Mode's baked FREE state, proportional fitting, measured price containment,
reduced motion and listener/display cleanup. Scoped git diff --check passed.
This is focused validation, not a whole-game regression or a new Star Codex audit.
