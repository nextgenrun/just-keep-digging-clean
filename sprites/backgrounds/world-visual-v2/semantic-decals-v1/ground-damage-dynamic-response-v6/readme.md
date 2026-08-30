# Dynamic ground damage response V6

Rejected comparison package for Stone-specific persistent-damage
diversification. V6
reuses the fixed-registration V5 fracture atlas and replaces its response atlas
with a profile-major layout that gives Stone ten deterministic response
variants across six cumulative tiers.

The Stone library combines twenty authored dark-slate fragment sprites into ten
stable layouts. Coordinate-seeded selection and the existing eight safe
right-angle/mirror transforms yield 80 Stone response combinations without
changing tile HP, damage thresholds, or save data.

Runtime assets:

- `../ground-damage-fracture-aligned-v5.png`: reused byte-for-byte from V5.
- `../ground-damage-response-dynamic-v6.png`: 252 frames, 3384 x 2632,
  profile-major order (`frameOffset + tier * variantCount + variant`).

Stone owns 60 frames (`10 variants x 6 tiers`). The other 32 response profiles
retain their 192 V5 frames pixel-for-pixel. Structural plus response atlases
decode to 76,343,040 bytes (72.8 MiB), below the 76 MiB package budget.

Universal V2 replaced this direction as the production default on 2026-08-27.
V6 is not normally preloaded; `?groundDamageAtlas=v6` is retained only for
local comparison and audit.

This package remains presentation-only. `WorldModel` and the existing mining
systems remain authoritative for HP, collision, rewards, destruction,
generation, and saves.
