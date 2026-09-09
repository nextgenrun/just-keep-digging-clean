# Complete Ground-Level Background Review

Review-only Phaser runtime of the fourteen approved 2026-07-28 surface
background chapters. This page now tests backgrounds only.

The Rev 4 overlay approach was invalid. It instantiated archived town houses,
Titan cutouts, portal frames, a mine cutout, hero landmarks, and modular props
independently of the approved landscape. Those assets could not inherit a
reliable ground contact from a flattened reference panel and visibly floated.
Both overlay systems and all of their sandbox preload paths have been removed.
The checked-in source assets themselves were not deleted.

Current truth:

- Merchant Hearth keeps the existing Town Square `town-air` video byte-for-byte;
- Observatory uses its independent generated static base, 900 star IDs, and ten
  separately authored cloud/mist sprites;
- the other twelve chapters show twelve distinct approved library panels as
  static references until each receives an independent background layer pack;
- there are zero legacy prop overlays and zero legacy structure overlays in all
  fourteen chapters;
- unsegmented mountains, forest, terrain, buildings, and props never move;
- there is no shared repeating background, generic mountain shader, or actor
  placeholder.

The next valid segmentation pass is per chapter: generate a clean static base,
then independent masks/sprites only for elements whose motion makes physical
sense. Approved-panel objects remain reference content; they are not cropped
out and pasted back as floating runtime props.

Open:

`/testing/animation-sandbox/2026-08-30-ground-level-world-v1/?chapter=observatory&day=12&hour=22&weather=clear&motion=100&rev=7`

Run:

`node testing/2026-08-30-ground-level-world-v1-contract.mjs`
