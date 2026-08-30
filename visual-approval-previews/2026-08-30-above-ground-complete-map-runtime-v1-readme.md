# Above-ground complete map runtime review

Review-only Phaser composition built from checked-in production assets. It does not change gameplay, production world wiring, or the Town Square video.

## Runtime composition

- 90 V11 background manifest entries audited; 57 terrain chunks remain runtime-streamed after the obsolete sky cards are replaced by the cohesion layer.
- 20 authored sky-cohesion backgrounds plus the shipped atmosphere foundation.
- 253 prop instances: 140 generated surface props, 60 generated sky props, 46 retained authored placements, and 7 hero landmarks.
- The shipped moonlit scenic far plate fills the former above-ground empty band. Cohesion cards own the high-altitude backdrop, avoiding the duplicate scenic-band edge.
- Town Square remains `town-air`, sourced from `sprites/backgrounds/start-zone-scenic-v1/living-background-v1/surface-town-air-v1.mp4`.

Town video SHA-256: `1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6`

## Review files

- `2026-08-30-above-ground-complete-map-town-v1.png`
- `2026-08-30-above-ground-complete-map-observatory-v1.png`
- `2026-08-30-above-ground-complete-map-far-east-v1.png`
- `2026-08-30-above-ground-complete-map-high-sky-v1.png`

Open `testing/2026-08-30-above-ground-complete-map-runtime-mockup.html` through the local server for chapter, altitude, drag, keyboard, and zoom controls.
