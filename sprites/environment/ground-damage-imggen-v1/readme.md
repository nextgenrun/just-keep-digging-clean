# ImageGen Ground Damage V1

Review-first ImageGen artwork for a material-neutral, no-hole ground-damage
system.

- `2026-07-29-ground-damage-fissure-atlas-source-v1.png` is the built-in
  ImageGen chroma-key master containing twelve cumulative fissure states.
- `2026-07-29-ground-damage-fissure-atlas-rgba-v1.png` is its locally extracted
  transparent review atlas; it is not yet registered by production.
- The source uses a uniform green background solely for local alpha extraction.
- Runtime promotion remains blocked until the extracted decals have been
  composited over every current ground material at 94 px and visually approved.

The decals may add surface fissures, abrasion, and tiny flat fragments. They
must never paint a square tile, crater, cavity, rubble mound, or material colour.
