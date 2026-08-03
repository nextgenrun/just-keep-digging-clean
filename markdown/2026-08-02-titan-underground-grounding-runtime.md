# Titan underground grounding runtime

Status: production wiring approved on 2026-08-02.

## Outcome

All 25 underground Titans now use the approved grounded presentation without changing discovery or progression authority. Each stance is bottom-anchored to a fixed contact baseline, the large circular dais is reduced to a mostly buried support, authored foreground rubble overlaps the feet, and the Titan is mixed into the active depth grade.

Unlock presentation no longer sends the creature across the chamber. It uses a short bottom-origin compression, 10 px lift with a 6 px directional weight shift, and a settle to the original foot position. The only burst graphic is the authored `titan-unlock-resonance-v1.png`; Phaser-drawn rings, dust circles, and echo copies were removed.

## Existing library reuse

`TitanEnvironmentEnvelopeStream` resolves three existing V7 backdrop-enhancer families for every Titan:

1. `side-arches`
2. `ceiling-crown`
3. `hanging-network`

Region assignment is identity-authoritative rather than inferred only from depth:

- Titan 1: `surface-entry`
- Titans 2-5: `level1-blue`
- Titans 6-9: `level1-amber`
- Titans 10-14: `level1-silver`
- Titans 15-17: `level1-magma`
- Titans 18-19: `level2-slagworks`
- Titans 20-21: `level2-obsidian`
- Titan 22: `level2-foundry`
- Titans 23-24: `level2-blackglass`
- Titan 25: `level2-starfire`

That produces 75 deterministic Titan-to-layer mappings and uses 30 existing transparent 1536x1024 assets across the ten biomes.

## Streaming and layer contract

Only the nearest two Titan envelopes are resident. Their assets use the shared runtime load coordinator and release after the player leaves the chamber range, while avoiding removal of a texture still used by the wider scenic runtime.

Back to front:

1. Faint chamber card and chamber glow.
2. Biome arches, crown, and hanging veil.
3. Authored unlock resonance while active.
4. Bottom-anchored Titan stance and Titan glow.
5. Mostly buried dais.
6. Authored ground-contact foreground and its restrained glow.

## Rollback and health

- `?titanEnvironment=0` disables only the localized biome envelope.
- `?titanChambers=0` still disables the faint chamber cards.
- `?titans=0` disables the complete Titan presentation.

`__jkdTitanDiscoveries` now reports grounding readiness, missing shared assets, all environment mappings, resident environment layers, load failures, and all existing progression/surface/chamber data. Healthy runtime requires all 25 zones, all 75 mappings, the two grounding assets, the existing stance inventory, and the cover-resonance system.

The 50 percent creature-footprint threshold, remaining-tile auto-clear through `WorldModel`, trophy admission, saves, archive order, clues, and surface gallery behavior are unchanged.

