# Village Floor Concepts V1 — ImageGen Prompt Manifest

**Generator:** built-in ImageGen  
**Intent:** precise-object-edit  
**Status:** Option A approved; Options B/C remain `reviewOnly: true`  
**Runtime:** `productionChanged: true` through an isolated Option A derivative

## 01 — Worn Mountain-Slate Market Street

```text
Use case: precise-object-edit
Asset type: review-only 2D side-scroller game environment mockup, Option A — Worn Mountain-Slate Market Street
Input image: Image 1 is the exact current UNDERSTAR gameplay screenshot and is the edit target.
Primary request: Replace ONLY the visible Town Square floor/foundation band directly beneath the houses and player, from the existing level walking line down through the blue-gray rectangular unbreakable blocks. Turn it into an appealing continuous hand-laid mountain-slate village street.
Floor design: irregular interlocking slate and fieldstone paving; varied organic stone sizes; subtle worn center path; shallow rain grooves and a few tiny restrained moss seams; dark blue-gray stone catching faint warm amber reflections from the house windows. The front/side facade below the walkable surface should read as one cohesive old masonry foundation with irregular courses, chipped edges, small buttress stones, and a natural broken transition into the existing underground rock. Hide the obvious square tile grid and repeated rectangular blocks.
Gameplay geometry: keep the top walking line perfectly level and at exactly the same vertical position. Keep the foundation thickness within the same visible band and stop before the darker diggable underground/resource area.
Scale: preserve the exact 1.80 m player and 2.00 m doorway proportions from Image 1.
Style/medium: polished painterly-realistic 2D game environment art matching the current moonlit mountain village, detailed but readable at gameplay zoom.
Lighting/mood: cool moonlit slate with restrained warm window-light accents; grounded, welcoming, premium fantasy-mining village.
Invariants: preserve the screenshot's houses, player, milestone sign, sky, mountains, trees, HUD, all UI text, camera framing, door scale, underground blocks, ores, resource icons, and every element outside the floor band. Change only the Town Square floor/foundation band.
Avoid: no flat blocks, no visible square tile grid, no checkerboard, no new props, no new characters, no stairs, no slopes, no holes in the walking surface, no labels, no extra text, no watermark, no UI redesign.
```

## 02 — Timber-and-Stone Miner Boardwalk

```text
Use case: precise-object-edit
Asset type: review-only 2D side-scroller game environment mockup, Option B — Timber-and-Stone Miner Boardwalk
Input image: Image 1 is the exact current UNDERSTAR gameplay screenshot and is the edit target. Do not use or modify the previously generated slate option.
Primary request: Replace ONLY the visible Town Square floor/foundation band directly beneath the houses and player, from the existing level walking line down through the blue-gray rectangular unbreakable blocks. Reimagine it as a crafted mining-village boardwalk built over a reinforced stone foundation.
Floor design: a continuous level path made from broad weathered dark-oak planks laid in believable short sections, broken up by irregular flagstone landings in front of doorways; recessed iron edge bands, compact riveted braces, and narrow drainage slots integrated into the path. Beneath it, show a cohesive dry-stone retaining wall with heavy timber cross-bracing and occasional iron anchor plates, merging naturally into the existing underground rock. The structure should feel hand-built, durable, warm, and inhabited—not industrial sci-fi. Eliminate the obvious square tile grid and repeated rectangular blocks.
Gameplay geometry: keep the top walking line perfectly level and at exactly the same vertical position. Keep the foundation thickness within the same visible band and stop before the darker diggable underground/resource area. No raised platforms or steps.
Scale: preserve the exact 1.80 m player and 2.00 m doorway proportions from Image 1.
Style/medium: polished painterly-realistic 2D game environment art matching the existing moonlit medieval mining village, detailed but readable at gameplay zoom.
Lighting/mood: cool moonlight on damp wood and stone, restrained amber reflections from windows, inviting working settlement.
Invariants: preserve the screenshot's houses, player, milestone sign, sky, mountains, trees, HUD, all UI text, camera framing, door scale, underground blocks, ores, resource icons, and every element outside the floor band. Change only the Town Square floor/foundation band.
Avoid: no flat blocks, no visible square tile grid, no minecart rails, no new props, no new characters, no stairs, no slopes, no holes in the walking surface, no labels, no extra text, no watermark, no UI redesign, no steampunk machinery.
```

## 03 — Star-Forged Basalt Plaza

```text
Use case: precise-object-edit
Asset type: review-only 2D side-scroller game environment mockup, Option C — Star-Forged Basalt Plaza
Input image: Image 1 is the latest UNDERSTAR gameplay mockup and is the edit target.
Primary request: Replace ONLY its Town Square floor/foundation band directly beneath the houses and player. Remove the timber boardwalk treatment and reimagine the same band as a distinctive but restrained star-forged basalt village plaza.
Floor design: broad irregular polygonal basalt flagstones fitted into one continuous level plaza, with worn softened corners and a subtle hand-crafted radial/star geometry that is visible only in the stone layout—not a giant symbol. Add very thin muted silver-blue mineral seams and occasional dark bronze inlay pins, mostly unlit, catching tiny hints of moonlight and warm window reflection. Beneath the walkable surface, create a cohesive reinforced basalt foundation with interlocking wedge-shaped stones, natural fractured lower edges, and sparse metal tie-bars that disappear organically into the existing underground rock. It must feel ancient, durable, premium, and specific to UNDERSTAR while remaining grounded medieval mining architecture. Hide all obvious square cells and repeated block rectangles.
Gameplay geometry: keep the top walking line perfectly level and at exactly the same vertical position. Keep the foundation thickness within the same visible band and stop before the darker diggable underground/resource area. No raised platforms, steps, or gaps.
Scale: preserve the exact 1.80 m player and 2.00 m doorway proportions.
Style/medium: polished painterly-realistic 2D game environment art matching the current moonlit mountain village, detailed but readable at gameplay zoom.
Lighting/mood: cool moonlit basalt, restrained silver-blue glints, warm amber house-light reflections; mysterious but welcoming, not sinister.
Invariants: preserve the screenshot's houses, player, milestone sign, sky, mountains, trees, HUD, all UI text, camera framing, door scale, underground blocks, ores, resource icons, and every element outside the floor band. Change only the Town Square floor/foundation band.
Avoid: no flat blocks, no square tile grid, no timber boardwalk, no neon glow, no bright runes, no giant star emblem, no sci-fi, no new props, no new characters, no stairs, no slopes, no holes, no labels, no extra text, no watermark, no UI redesign.
```

## Production promotion — clean Option A facade

The approved full-screen mockup remains review evidence. Built-in ImageGen used
it as a material reference to create a clean project-bound raster:
`sprites/backgrounds/start-zone-scenic-v1/town-square-slate-facade-v1.png`.

```text
Use case: precise-object-edit
Asset type: production 2D side-view game environment facade for a Phaser village floor
Primary request: Using Image 1 strictly as the approved Option A material and lighting reference, create a clean isolated horizontal village-floor asset: irregular worn blue-gray mountain slate paving along the walkable top, supported by one continuous course of rounded old dark fieldstone masonry with restrained moss in a few joints. Preserve the quiet natural handmade look of Option A.
Composition/framing: a very wide uninterrupted side-on orthographic strip running fully from the left edge to the right edge; the top walking edge is continuous and nearly level with only subtle hand-laid irregularity.
Background: perfectly flat uniform solid #ff00ff chroma-key everywhere above and below the isolated floor strip.
Constraints: isolated floor/foundation only; horizontally edge-compatible; no buildings, doors, people, player, NPCs, props, UI, text, soil, underground blocks, resources, square tile grid, damage cracks, or watermark.
```

One targeted refinement reduced the retaining wall to the approved gameplay
band without changing its material language:

```text
Change only the vertical thickness of the isolated floor strip. Keep the exact approved slate material, full left-to-right width, flat top walking edge, chroma color, and clean isolation. Make the visible floor plus retaining-foundation silhouette approximately 145 pixels tall in the same canvas, using a shallow slate top and two compact rounded-fieldstone courses. Keep the strip touching both horizontal edges; add no new objects.
```

The installed ImageGen chroma helper removed the flat magenta background. Local
deterministic post-processing trimmed that result to 2172x139 and baked a 129 px
right-edge alpha handoff. User review found that separately regenerated v1
strip too different from the approved mockup, so it remains unloaded.

## Production fidelity correction — exact Option A pixels

`2026-07-26-build-exact-town-square-ground.py` now crops only source rows
468–606 from the approved 1672x941 Option A image. Those 1672x139 pixels are
neither resized nor repainted. The tool appends a 129 px mirrored alpha handoff
after the approved frame and writes the 1801x139 RGBA v2 runtime asset plus
hash provenance. No house, NPC, background, HUD, resource, or deeper
underground pixels are part of the runtime ground.
