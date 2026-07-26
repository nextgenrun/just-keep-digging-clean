# Arc Core ImageGen Prompt Manifest

**Updated:** 2026-07-26

## Shared source role

`sprites/vehicles/arc-core-v1/arc-core.png` was supplied only as a reference for
the premium dark-gunmetal, aged-brass, luminous-energy rendering finish. The
generated silhouettes were explicitly instructed not to preserve the original
round badge body.

## Small Arc

### V1 pointed — rejected

The original asymmetric three-fin/needle sheet was rejected on 2026-07-26
because rotating its arrow-like outline caused ship-like and inconsistent
directional visuals. It is retained only as review evidence and is not loaded.

### V2 round — current review

Regenerated as a regular four-column by two-row pose sheet on a flat green
chroma-key background with one fixed circular outer boundary in all frames.

- Top row: four internal gyro-ring counter-precession poses.
- Bottom row: internal shutter brace, compression charge, twin-channel
  ignition, and recoil.
- Silhouette: compact round gyro core with no nose, fins, wings, baked beam, or
  directional protrusions.
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
scene. Phaser adds cadence, energy lanes, and reversible cloud boarding
effects. Small Arc `v2` stays visually safe under directional rotation because
its exterior is circular.
