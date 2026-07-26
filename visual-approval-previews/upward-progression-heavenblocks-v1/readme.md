# Upward Progression Heavenblocks v1

**Date:** 2026-07-26
**Status:** Approved visual provenance
**Production changed:** Yes, visual layers only

## Review scope

This set explores how upward progression could remain recognizably part of the
current side-view tile-mining game:

1. `2026-07-26-lower-sky-cloud-reef-mockup-v1.png`
   - First ascent biome.
   - A bright floating mine with a readable underside entry, carved upward
     route, cloudstone shell, dark inner rock, and cyan resource seams.
2. `2026-07-26-angel-heavenblock-mockup-v1.png`
   - Ordered high-altitude biome.
   - Ivory celestial blocks, Halo Glass, gold veins, symmetrical formations,
     and a buried sanctuary reached by mining upward.
3. `2026-07-26-devil-eclipse-scar-mockup-v1.png`
   - Corrupted upper-sky biome.
   - Inverted obsidian formation, ember seams, Bloodglass-like pockets, chains,
     and a crimson Eclipse Scar.

## Visual references

- `ai-tools/2026-07-17-steam-screenshot-01-surface.png`
  - Current painterly environment and approved HUD language.
- `ai-tools/2026-07-17-steam-screenshot-04-torchlit-depths.png`
  - Player scale, side-view cutaway, and excavation readability.
- `visual-approval-previews/v11-split-sky-islands-wired-2026-07-13.png`
  - Existing broad sky-island/world-layout direction.

## Generation approach

Generated with the built-in image-generation tool as three separate,
reference-guided 16:9 concepts. The shared prompt required:

- a small one-tile-scale miner;
- readable square destructible terrain;
- a visible upward excavation route;
- the current dark iron-and-brass HUD framing;
- high-detail painted 2D rendering;
- no runtime wiring, logos, title cards, or watermarks.

The biome-specific prompts then supplied the Cloud Reef, Angel Heavenblock, and
Devil/Eclipse materials, lighting, and structures described above.

## Runtime derivation

The three original `*-mockup-v1.png` files remain visual discussion artifacts
and are not loaded by Phaser. Clean HUD/player-free masters are retained beside
them as the direct provenance used to create the split production assets.

The six game-loaded backdrop/façade images live under
`sprites/backgrounds/heavenblocks-v1/`. Their positions and keys are owned by
`values/heavenblocksVisualConfig.js`, and they are rendered by the existing
`V11SkyIslandVisualSystem`.

The production change is visual-only. TMX, world generation, collision,
relic-based access, biome progression, and Arc Core crafting remain untouched.
