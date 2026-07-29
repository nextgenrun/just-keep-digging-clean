# Background Rendering Regression Restoration

Date: 2026-07-29

## Outcome

Scenic-v2 again renders its sky and cave art as world scenery, matching the
Town Square composition model:

- a retained continuous base is always present;
- additive artwork is world anchored above that base;
- camera motion only reveals different world coordinates;
- transparent foreground art never substitutes for an opaque background.

No existing image, video, plate pool, or rollback path was removed. The twenty
sky cohesion plates and ten underground cohesion paintings remain active.

## Root cause

The four-by-four backdrop mask texture was cropped to one alpha frame, but its
atlas `x/y` remained in Phaser's rendered crop geometry. The mask was therefore
shifted away from its world card. At the surface this exposed a uniform strip
between the Town Square cap and the first roots backdrop; at depth it made
loaded scenic cards appear black, faded, or missing. Sky cover crops had the
same offset risk.

The depth renderer now registers a real mask frame before scaling, so its alpha
begins at the exact card coordinate, including partial tail cards and
cross-biome transitions. A second transition correction removes the
double-feather composition: the retained card stays opaque and only the
incoming left/top edge fades over it. Sky uses the same policy on complete,
uncropped native-scale frames.

## Layer ownership

The twenty sky assets form a complete 18x8 native-density overlap field
organized by five semantic chapters and four altitude bands. Balanced
seven/eight-use repetition is the minimum required to cover the 280x65-tile
sky without enlargement. Incoming-only left/top feathers, opaque outer edges,
and deterministic micro-depth order keep every join covered; cards never use
`setScrollFactor(0)` or viewport-centered placement.

The ten underground cohesion assets use one dedicated, complete 0.88
source-density masked placement per biome. Their ten distinct horizontal
anchors keep Level 1 cards in Level 1 and all five deep cards inside the
playable Level 2 corridor. They remain outside the random opaque/material
`plates` pool. Existing opaque backdrops, five V4 terrain plates, V5 additions,
cap atlases, and ground structures continue to render normally. A preloaded
roots scenic card also covers the first underground row while a requested
biome card streams.

## Verification

- Live Town Square QA showed the roots backdrop meeting the surface cap with no
  clear-color strip.
- Live Level 1 QA showed the scenic cave plate inside the player light while
  normal darkness remained outside the visibility radius.
- Live Level 1 and Level 2 Sky Island QA showed crisp native-density sky art
  without viewport attachment or hard rectangular borders.
- Live surface comparison at the western card edge showed the feather merging
  into the retained far base without a visible rectangular cut.
- The crop-origin, incoming-edge composition, fallback, thirty-asset,
  gap-free native-density placement, and whole-world V5 contracts pass.
