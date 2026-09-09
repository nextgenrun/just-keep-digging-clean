# Starless Scar V3

This authored built-in ImageGen set separates the complete territory effect into
four readable world layers:

- `starless-scar-walkable-ground-v3.png` is the opaque, low-frequency ground
  plane that makes the player's footing readable.
- `../starless-scar-v2/starless-scar-territory-material-v2.png` remains the
  transparent blackglass/vein detail overlay.
- `starless-scar-dead-center-v3.png` marks the exact exhausted Star site.
- `starless-scar-frontier-edge-v3.png` is the true-alpha outer/spreading edge.

The runtime clips the ground, material, and center to code-owned cells. During
the confirmed mining hold that mask grows radially from the Star; after the
Star tile is actually removed, it continues to 36 tiles over 2.6 seconds and
then reveals the complete nearest-Star territory. Saved scars load complete.
The bitmaps never own territory, resource depletion, rewards, Stress, or save
state.

## Kept ImageGen prompts

Mode: built-in ImageGen. The work began as one small sample per asset role.

### Walkable ground

> Use case: stylized-concept
> Asset type: seamless tileable top-down game texture for the walkable floor
> inside a Starless Scar
> Input images: Image 1 is a palette and material-family reference only; create
> a new sibling asset and do not alter or copy its composition
> Primary request: a clearly readable, traversable ground plane made of compact
> charcoal ash, fused blackglass plates, and restrained dead-violet mineral
> seams
> Style/medium: polished dark-fantasy game environment texture, realistic
> material detail, exact orthographic top-down view
> Composition/framing: fully filled square texture with even visual density and
> seamless wrapping on all four edges; broad low-frequency ground plates that
> make a character's footing easy to read
> Lighting/mood: subdued overhead ambient light, clear shallow surface relief,
> no deep holes
> Color palette: charcoal black, smoky graphite, muted wine-violet fissures,
> sparse cool gray wear
> Materials/textures: mostly flat compacted ash and shallow cracked blackglass,
> small embedded grit, restrained seams
> Constraints: opaque full-coverage ground texture; seamless edges; no
> transparent holes; no voids; no cliffs; no tall rocks; no focal center; no
> radial pattern; no border; no objects; no text; no logo; no watermark
> Avoid: noisy high-contrast star specks, giant shards, cavern openings, black
> cutout holes, perspective view, directional sunlight

### Dead-Star center

> Use case: stylized-concept
> Asset type: transparent top-down game decal for the dead center left after a
> Star is mined inside a Starless Scar
> Input images: Image 1 is a palette and material-family reference only; create
> a new sibling asset and do not alter or copy its composition
> Primary request: a clearly recognizable dead-Star impact center: a compact
> central blackglass depression surrounded by two or three concentric fractured
> plates, with restrained wine-violet and dusty magenta fissures radiating a
> short distance outward
> Style/medium: polished dark-fantasy game environment decal, realistic
> material detail, exact orthographic top-down view
> Composition/framing: centered circular-to-irregular silhouette occupying
> roughly 75 percent of a square canvas; strongest identity and darkest value in
> the center; broad readable rings rather than noisy fragments; outermost ash
> wisps feather smoothly into transparency
> Lighting/mood: subdued overhead ambient light, shallow readable relief, dead
> and exhausted rather than glowing or magical
> Color palette: charcoal black, smoked graphite, muted wine-violet, dusty
> desaturated magenta, sparse cool-gray edges
> Materials/textures: compact ash, fused cracked blackglass, small embedded
> mineral grit
> Transparency: true transparent background outside the irregular decal; soft
> alpha feather at the outer boundary; no rectangular backdrop
> Constraints: no active Star, no bright white core, no tall rocks, no
> perspective, no text, no logo, no watermark, no border around the canvas
> Avoid: black square background, opaque corners, deep cave hole, neon purple,
> giant crystals, busy particles, directional sunlight

### Frontier edge

> Use case: stylized-concept
> Asset type: transparent top-down game texture strip for the outer frontier
> edge of a spreading Starless Scar
> Input images: Image 1 is a palette and material-family reference only; create
> a new sibling asset and do not alter or copy its composition
> Primary request: a strong readable horizontal corruption frontier crossing
> through the middle of a square canvas; the lower half is a shallow band of
> compact charcoal ash and fused blackglass, while the upper half rapidly
> feathers to true transparency; splintered blackglass roots and restrained
> dead-violet fissures push irregularly upward across the boundary
> Style/medium: polished dark-fantasy game environment decal, realistic
> material detail, exact orthographic top-down view
> Composition/framing: designed as a modular terrain boundary segment;
> continuous and seamless at the left and right edges; strongest dark material
> immediately along the horizontal frontier; irregular teeth, ash wisps, and
> short mineral roots define the transparent-facing edge; no focal center
> Lighting/mood: subdued overhead ambient light, shallow readable relief,
> threatening but exhausted
> Color palette: charcoal black, smoky graphite, muted wine-violet, dusty
> desaturated magenta, sparse cool gray wear
> Materials/textures: compact ash, thin cracked blackglass plates, embedded
> grit, short fractured roots
> Transparency: true transparent background over most of the upper half and
> outside the irregular frontier; soft alpha feather only at the
> transparent-facing tips
> Constraints: exact top-down; horizontally tileable at left and right;
> transparent upper region; no rectangular opaque backdrop; no circle; no
> central crater; no active Star; no tall rocks; no text; no logo; no watermark
> Avoid: black square background, opaque corners, vertical wall or cliff, side
> view, neon glow, giant crystals, isolated floating object, busy particles,
> directional sunlight

The frontier delivery painted a neutral checker despite the alpha instruction.
Its exact source is retained at
`source/imagegen-frontier-checker-source.png`; run
`tools/2026-08-31-build-starless-scar-v3-frontier.mjs` to remove only connected
neutral checker regions, clean the fringe, cap stray highlights, and rebuild
the 1254 x 1254 RGBA runtime decal. The two later alpha retry outputs were
rejected and are not runtime assets.
