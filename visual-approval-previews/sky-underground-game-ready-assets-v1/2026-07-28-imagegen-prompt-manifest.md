# Sky and Underground Game-Ready Assets V1 — ImageGen Prompt Manifest

**Date:** 2026-07-28  
**Generator:** Built-in ImageGen  
**Runtime wired:** No

## Sky flight-corridor far plate

### Reference roles

1. `sprites/backgrounds/world-visual-v2/far/moonlit-mountain-forest-v1.png`
   — style, palette, finish, and mountain-language reference.
2. `visual-approval-previews/sky-air-background-directions-v1/2026-07-26-direction-a-moonlit-alpine-cloud-sea-moonless-v2.png`
   — moonless upper-sky composition reference; its player and platform were
   explicitly excluded.

### Final prompt

```text
Use case: stylized-concept
Asset type: production-ready Phaser 3 scenic-v2 opaque far-parallax environment plate, target canvas 1672x941 landscape
Primary request: create one clean environment-only upper-world flight-corridor sky plate that extends the existing moonlit alpine world into high-altitude airspace
Input images: Image 1 is the current production far plate and is a style, palette, finish, and mountain-language reference only; Image 2 is a moonless upper-sky composition reference only, but remove its flying character and portal platform completely
Scene/backdrop: deep cobalt midnight upper atmosphere, layered cloud ocean across the lower third, distant alpine ridges receding into haze, subtle aurora and sparse stars, a restrained indigo storm bank toward one outer side, and a few extremely distant suspended ruin silhouettes near the periphery
Style/medium: polished painterly realism matching the current game background, crisp high-resolution materials with atmospheric depth, not a gameplay screenshot
Composition/framing: full-bleed wide landscape; reserve a broad, calm, readable open-flight lane through the central 50 percent; keep large cloud and mountain masses low or peripheral; all ruins must be tiny, hazy, distant, and unmistakably non-playable; keep the first and last 8 percent low-contrast and crossfade-friendly; no hard border or vignette
Lighting/mood: moonless cool night illumination, quiet wonder with restrained storm tension, compatible with runtime day-night tinting
Color palette: navy, cobalt, slate blue, muted violet, tiny controlled cyan highlights
Constraints: exactly one clean background plate; environment only; no player, character, HUD, UI, text, logo, watermark, portal gate, foreground platform, close island, collision-looking ledge, town, or baked light source; no mirrored or repeated silhouettes; no obvious central focal object
Avoid: any sun, moon, planet, eclipse disc, complete circular halo, large ring, face-like clouds, rectangular card edges, black empty patches, photobash seams
```

## Shallow-blue underground foreground plate

### Reference roles

1. `sprites/backgrounds/world-scenic-facade-v1/level1-shallow-blue-seamless.webp`
   — current material palette plus negative reference for mirrored symmetry.
2. `visual-approval-previews/underground-terrain-blend-v4/blue-caverns-cobalt-fossil-shale-v4-master.png`
   — asymmetric geology quality reference; the new plate uses a distinct
   arrangement.

### Final prompt

```text
Use case: stylized-concept
Asset type: production-ready Phaser 3 scenic-v2 underground foreground terrain-variation master, target canvas 1536x1024 landscape
Primary request: create one dense, full-bleed, asymmetric shallow-blue cavern geology plate that breaks the current mirrored wallpaper pattern while retaining the game's dark cobalt rock identity
Input images: Image 1 is the current live shallow-blue seamless material and is a palette/material baseline plus a negative reference for the symmetry problem; Image 2 is an existing asymmetric fossil-shale quality reference, but create a new distinct arrangement rather than copying it
Scene/backdrop: no scene and no cave opening; this is a close orthographic material surface containing compacted dark shale, slate chunks, compressed soil, sparse old roots, occasional tiny fossil fragments, subtle cobalt mineral seams, and restrained warm mineral flecks
Style/medium: high-resolution painterly-realistic game terrain texture, coherent physical rock strata, crisp enough for native-density crop and terrain masking
Composition/framing: full-bleed edge-to-edge geology; strongly asymmetric low-frequency structure; two broad irregular diagonal strata with smaller broken stones between them; visual interest distributed unevenly; no centered feature, bilateral symmetry, radial symmetry, kaleidoscope, mirrored quadrants, or repeating motif; outer 6 percent should avoid large unique focal objects so an organic alpha feather can be applied locally
Lighting/mood: neutral low-angle geological relief with subdued underground illumination; no directional spotlight and no baked torch source
Color palette: charcoal, black shale, desaturated cobalt, deep slate blue, sparse muted bone gray and tiny restrained amber flecks
Materials/textures: layered fractured shale, compacted earth, weathered roots, small embedded fossils, mineral dust; feature sizes mainly 12 to 90 pixels
Constraints: exactly one clean opaque material master; no transparency yet; no player, cave tunnel, open void, platform, architecture, beams, rails, resource ore icons, reward symbols, star shapes, skull faces, readable creature skeleton, tile grid, text, logo, or watermark; must remain useful under runtime tint and solid-terrain masking
Avoid: current source's mirrored face-like pattern, obvious seams, repeated fossils, giant gemstones, bright emissive veins, flat noise, sharp rectangular frame, UI or gameplay screenshot
```

The underground export receives only deterministic format conversion and a
soft perimeter alpha feather after generation. No content is repainted during
post-processing.

The sky export receives only deterministic format conversion plus matching
128 px deep-cobalt edge handoffs. This removes the direct-repeat luminance jump
without changing the central flight lane or adding scene content.

## Additive 30-asset expansion

The two prompts above produced the retained `sky01` and `underground01` files.
The remaining 28 assets were generated one at a time with built-in ImageGen.
Nothing in the retained files was regenerated, replaced, or removed.

### Shared reference roles

- `2026-07-28-sky-flight-corridor-far-plate-v1.webp` is the sole visual-family
  reference for `sky02` through `sky20`. It defines painterly finish,
  atmospheric depth, restrained landmark scale, and an open playable center.
- `2026-07-28-underground-shallow-blue-foreground-plate-v1.webp` is the sole
  visual-family reference for `underground02` through `underground10`. It
  defines close geological scale, material density, asymmetric rhythm, and the
  additive foreground role.
- Each reference is style/composition guidance only. Every generated file uses
  a new arrangement and a distinct regional or material identity.

### Shared sky prompt block

```text
Use case: stylized-concept.
Create a production-ready Phaser 3 scenic-v2 opaque far-parallax environment
plate, exact target canvas 1672x941 landscape.

Image 1 is the approved Sky01 family and style reference only; make a genuinely
new composition while matching its painterly realism, atmospheric depth,
restrained detail frequency, and open flight readability.

Environment-only, full bleed. Keep the central 55% broadly navigable and
visually quiet. Put landmark mass mostly in the far distance and toward the
side thirds.

Make the outermost 8% on all four sides low-contrast, low-detail atmospheric
color so it can crossfade into adjacent plates. No hard border, folded-paper
edge, frame, vignette, seam, or cutout edge.

No sun, moon, planet, eclipse disc, complete halo, large circular ring, player,
creature, UI, text, logo, watermark, portal, gate, foreground platform, close
island, town, collision ledge, mirrored layout, or black empty patches. No
obvious central focal icon.
```

Each generated sky used that block plus one scene-specific request:

| ID | Scene-specific request |
|---|---|
| `sky02` | Western lower mist valleys: cool pine valleys, low fog, tiny remote lights, open upper corridor. |
| `sky03` | Western upper aurora shelf: high cloud ocean, subdued aurora, sparse upper atmosphere. |
| `sky04` | Western stormbreak edge: peripheral indigo storm bank and rain curtain, calm center. |
| `sky05` | Level 1 lower cyan approach: tiny distant antenna/ruin spires, cyan haze, no settlement. |
| `sky06` | Level 1 middle cloud reef: bright blue cloud shelves framing a broad clear lane. |
| `sky07` | Level 1 upper ruin beacons: tiny cyan ruin silhouettes at the remote side horizons. |
| `sky08` | Level 1 quiet departure: lavender haze, distant mountains, sparse low-pressure atmosphere. |
| `sky09` | Central lower horizon saddle: low mountain-and-cloud saddle with a wide open upper sky. |
| `sky10` | Central middle open aurora: mostly empty high atmosphere with restrained aurora and low clouds. |
| `sky11` | Central upper star river: diffuse diagonal stellar dust and nebula weather, never a disc or ring. |
| `sky12` | Central transition cloud veil: layered blue-violet vapor and distant ridges, calm passage. |
| `sky13` | Level 2 lower iron-forge haze: remote gothic iron silhouettes and tiny ember lights in a dark sky. |
| `sky14` | Level 2 middle ruin belt: distant suspended ruins and incomplete arches kept outside the center. |
| `sky15` | Level 2 upper chain citadels: tiny side-horizon bastions and thin chains, cobalt-indigo corridor. |
| `sky16` | Level 2 stormbreak corridor: charcoal thundercloud walls split around a broad cobalt passage. |
| `sky17` | Eastern lower expedition overlook: cool dawn cloud sea, remote ridges, tiny side-horizon pennants. |
| `sky18` | Eastern middle thunder sea: teal-blue storm ocean, buried cyan illumination, no visible lightning bolt. |
| `sky19` | Eastern upper Heavenblock ascent: pale vertical cloud strata and remote stone monolith silhouettes. |
| `sky20` | Eastern far crimson atmosphere: diffuse wine-red atmospheric dust behind cobalt vapor, no literal tear. |

### Shared underground prompt block

```text
Use case: stylized-concept.
Create a production-ready Phaser 3 underground foreground material plate,
exact target canvas 1536x1024 landscape, opaque RGB master for later alpha
feathering.

Image 1 is the approved shallow-blue underground foreground plate and style
reference only. Match its painterly material realism, macro-to-micro texture
balance, restrained lighting, organic visual rhythm, and ability to sit
additively over an existing mine renderer, while creating a genuinely new
biome material.

Full-bleed close orthographic terrain cross-section: dense rock, soil,
sediment, mineral inclusions, fine cracks, dust, and small material variations
distributed organically across the whole canvas. It must read as geological
material, not a landscape vista.

Keep the outermost 6% low-contrast and free of unique focal details so a soft
80px alpha feather can blend it without seams. No hard outer border, fold,
frame, vignette, rectangular patch, cut-paper edge, or abrupt color wall.
Avoid mirror symmetry, kaleidoscope, a centered face-like formation, obvious
repeating tiles, and large isolated icons.

No tunnel, cave opening, platform, floor line, architecture, machinery, prop,
chest, resource pickup, reward icon, star symbol, skull, grid, player,
creature, UI, text, logo, or watermark. No single object silhouette.
```

Each generated underground plate used that block plus one material request:

| ID | Material-specific request |
|---|---|
| `underground02` | Weathered Roots: compacted umber loam, weathered stone, roots, mycelial threads, muted moss staining. |
| `underground03` | Amber Depths: ochre clay, fossil sandstone, honeyglass gravel, resin flecks, burnt-gold dust. |
| `underground04` | Silver Core: graphite slate, blue-grey carbonate, embedded silver needles and metallic mica. |
| `underground05` | Core Magma: black basalt, scoria, iron-red breccia, obsidian clinker, sparse dim ember heat. |
| `underground06` | Slagworks: iron slag, clinker, oxidized copper sediment, soot, dull bronze grains; no machinery. |
| `underground07` | Obsidian Catacombs: blackglass shale, violet ash basalt, grey limestone dust, sparse lilac reflection. |
| `underground08` | Pressure Foundry: gunmetal pressure-stone, mineral scale, cyan carbonate, steel grit, rust sediment. |
| `underground09` | Blackglass Abyss: near-black stone, navy glass shale, prism dust, petrol-blue and violet refraction. |
| `underground10` | Starfire Rift: indigo meteorite matrix, violet ash, crushed blue quartz, magenta mineral dust. |

## Deterministic export treatment

- `sky02` through `sky20` are scaled only when necessary to the exact
  `1672x941` contract, encoded as opaque WebP, and receive the same gradual
  128 px RGB handoff to `#081837` as the retained Sky01 plate.
- `underground02` through `underground10` are encoded as alpha WebP and receive
  the same continuous four-sided 80 px alpha feather as the retained
  Shallow-Blue plate.
- The central image content is not repainted during export.
- The contact sheets and transition proof add labels, overlap, and neutral
  review backings only; they are not runtime source images.
