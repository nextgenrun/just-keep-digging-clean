# Ground Observatory V1 ImageGen Prompts

Built with the Codex built-in image-generation tool. The approved Observatory
panel was a composition and art-direction reference, not a runtime pixel donor.

## Immutable static base

```text
Use case: stylized-concept
Asset type: production-ready 2D game far-background layer for the Heavenblocks Observatory chapter
Input images: Image 1 is the approved composition and art-direction reference only; generate a new clean asset from scratch, do not cut out or directly reuse its pixels.
Primary request: Rebuild only the immutable distant environment from Image 1: the same moonlit alpine valley geography, strong left valley opening, high jagged snowy mountain mass on the right, layered dark pine forest, and deep blue night atmosphere.
Style/medium: premium hand-painted dark-fantasy 2D game environment, crisp detailed materials, matching Image 1's painterly realism and blue-black palette.
Composition/framing: very wide side-on parallax background, 16:9, continuous edge-to-edge environment, horizon and mountain silhouettes aligned closely to Image 1; no perspective road.
Lighting/mood: cold moonlit night, subtle atmospheric depth, controlled contrast. A single moon may remain fixed in the upper-left.
Static base requirement: clear stable sky and stable mountain/forest geometry. Do not include moving-atmosphere content in this base.
Constraints: absolutely no foreground terrace, ground platform, retaining wall, buildings, observatory, telescope, stalls, benches, lamps, fire, emissive windows, flags, ropes, people, characters, props, text, logo, watermark, stars, clouds, fog, smoke, mist, precipitation, or glowing particles. Do not invent new landmarks. Keep all mountains and trees crisp and suitable to remain perfectly stationary while separate runtime layers animate above them.
Avoid: baked lights, baked weather, blurry mountains, giant cloud masses, repeated tiling, foreground objects, visible seams.
```

## Chroma atmosphere atlas

```text
Use case: stylized-concept
Asset type: chroma-keyed 2D game VFX sprite atlas for the Heavenblocks Observatory background
Input images: Image 1 is the approved atmospheric art-direction reference; Image 2 is the new clean static base and defines the exact blue-black palette. Generate new cloud artwork from scratch; do not copy source pixels.
Primary request: Create twelve separate nocturnal atmospheric sprites: six long thin high-altitude cloud wisps, four narrow valley-stream mist ribbons, and two very small mountain-side vapor trails. Each is a distinct isolated piece with generous empty padding and no overlap.
Style/medium: premium hand-painted dark-fantasy 2D game VFX, crisp detailed vapor curls and tendrils, sharp enough for runtime at native size, matching the references.
Composition/framing: exact 4 columns by 3 rows sprite atlas; one complete sprite centered within each equal cell; consistent padding; no clipping. Elongated irregular forms, varied length and density, never large circular blobs.
Lighting/mood: cold moonlight from upper-left, subtle blue-silver rim lighting, translucent-looking interiors.
Background requirement: one perfectly uniform, flat, fully opaque chroma green background color (#00FF00) covering every non-cloud pixel. No checkerboard, shadows, texture, gradient, grid, transparency preview, or green spill on the clouds.
Constraints: clouds and mist only. No mountains, trees, terrain, moon, stars, buildings, props, people, lights, text, labels, logo, or watermark.
Avoid: giant cloud plates, opaque rectangles, blurry smears, repeated silhouettes, left-right wobble, hard cut edges.
```

The generator authored ten usable occupied cells. Two empty cells were rejected
and are absent from the runtime manifest.
