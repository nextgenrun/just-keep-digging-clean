# Arc Core ImageGen Prompt Manifest

**Updated:** 2026-07-26

## Shared source role

`sprites/vehicles/arc-core-v1/arc-core.png` was supplied only as a reference for
the premium dark-gunmetal, aged-brass, luminous-energy rendering finish. The
generated silhouettes were explicitly instructed not to preserve the original
round badge body.

## Small Arc

Generated as a regular four-column by two-row pose sheet on a flat green
chroma-key background.

- Top row: four consecutive quick idle poses.
- Bottom row: brace, charge, needle contact, and recoil.
- Silhouette: compact asymmetric three-fin gyroscope with a right-facing needle
  aperture.
- Palette: dark gunmetal, restrained brass, cyan lens and energy seams.

## Omega Arc

Generated as a separate regular four-column by two-row pose sheet on a flat
green chroma-key background.

- Top row: four consecutive slow tidal-suspension poses.
- Bottom row: deploy, collapse, lattice ignition, and mass recoil.
- Silhouette: four separated cathedral bastions around a square-black central
  star aperture.
- Palette: black-violet forged metal, brass ribs, violet and magenta energy.

## Runtime treatment

The generated boards are background-keyed locally, divided into eight fixed
cells, normalized to 512 px frames, and loaded only by the tanktest review
scene. Phaser adds cadence, directional rotation, energy lanes, and reversible
cloud boarding effects.
