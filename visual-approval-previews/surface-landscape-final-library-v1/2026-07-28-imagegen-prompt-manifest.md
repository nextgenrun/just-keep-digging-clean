# Surface Landscape ImageGen Prompt Manifest V1

**Date:** 2026-07-28  
**Generator:** built-in ImageGen  
**Mode:** `stylized-concept`  
**Status:** `reviewOnly: true`  
**Production changed:** No  
**Runtime wired:** No

This is the normalized prompt record for the fourteen selected panorama
segments. The complete library covers surface tiles 000-279 in contiguous
twenty-tile views. It is a final-look proposal, not a set of baked runtime
backgrounds.

## Reference roles

- `sources/2026-07-28-approved-full-surface-benchmark.png` is the primary
  quality, density, palette, ground-facade, and natural-spacing benchmark.
- `sources/2026-07-28-panel-04-craftsmen-commons-anchor.png` is the continuity
  anchor used to hold the same camera, player scale, lighting language, and
  rendering finish across the remaining panels.
- Adjacent generated panels were used only as style-continuity references.
  Their landmarks were not copied into later tile ranges.

## Canonical shared prompt

Create one premium painterly-realistic 2D side-scroller environment concept
for the specified twenty-tile surface range. Match the approved cobalt-blue
moonlit mountain forest, restrained warm practical light, material richness,
and handcrafted settlement finish. Use an exact orthographic side view with
no perspective road or vanishing-point gameplay surface.

Keep a single flat, readable walk line at approximately sixty percent of the
image height. Show a deep, continuous, richly built retaining-ground
cross-section below it. Include one approximately 1.75 m miner, about one
sixth of the image height, only as a scale reference. Every usable door or
opening must be physically enterable at that scale.

Compose props as irregular story clusters with intentional size changes,
unequal gaps, foreground/rear offsets, occasional overlap between compatible
small objects, and calm breathing pockets. Never overlap Titan miniatures,
portals, gates, doors, drop seams, or other gameplay-critical silhouettes.
Avoid repeated spacing, repeated scale, decoration grids, fake collisions,
giant ornamental architecture, and empty dead stretches.

Design the scene so it can later be separated into independent far-background,
rear-silhouette, mid-environment, prop, foreground, ground-top,
retaining-facade, emissive, and subtle-motion layers. Do not bake HUD, UI,
text, labels, watermarks, player requirements, or placeholder Phaser/HTML
graphics into the landscape.

## Per-panel authored deltas

| Panel | Tiles | Prompt delta and unique ground identity |
|---|---:|---|
| 01 | 000-019 | **Merchant Hearth.** A welcoming lived-in west village entrance: human-scale timber homes, merchant stall, handcart, bench, planters, bundled supplies, lanterns, chimney smoke, and small work stories. Use worn merchant slate, patched cobble, shallow drainage, roots, and visible foundation repair below the walk line. |
| 02 | 020-039 | **Titan Walk West.** Transition from village life into a ceremonial open-air collection walk. Preserve low individual Titan plinths and unobstructed miniatures; place only restrained benches, lamps, rope boundaries, plaques, clipped plants, and civic stonework around them. Use cool ceremonial black slate with subtle brass seams. |
| 03 | 040-059 | **Titan Walk East and Honor Garden.** Continue the real low-plinth Titan language with unique compact creatures or dormant sockets on every station. End in a modest honor garden that transitions toward warmer village craft materials. Use low ceremonial slate blending into warmer cobble, soil pockets, and fine root lines. |
| 04 | 060-079 | **Craftsmen Commons.** A busy but traversable craft quarter: open forge shelter, sawhorse, stacked timber, repair cart, barrels, crates, tools, drying materials, warm windows, and work lamps in asymmetric clusters. Use cart-scarred work cobble, sawdust pockets, timber braces, drainage cuts, and exposed roots. |
| 05 | 080-099 | **Skywell Market.** A small moonlit market gathered around a practical stone well, with awnings, produce and herb tables, scales, baskets, crates, rain barrels, benches, and a readable sky-portal approach at tiles 93-94. Use damp riverstone, well runoff channels, moss, dark wet joints, and small culverts. |
| 06 | 100-119 | **Three-Relic Gate Grove.** Preserve clear, player-scale interaction lanes for the three distinct Heavenblock gates near tiles 105, 110, and 115. Surround them with a restrained sacred grove, low offering tables, lantern stones, clipped shrubs, root-wrapped masonry, and route-specific celestial detailing. Use celestial slate with fine brass channels and no giant monuments. |
| 07 | 120-139 | **Mine Threshold and Drop Seam.** Turn the protected tunnel, bridge, Arc Core area, Level 1 edge, conditional one-way drop seam around tile 130, and bedrock divider at tile 132 into a convincing engineered transition. Use iron-banded structural stone, heavy timber shoring, mine lamps, warning ropes, survey gear, rail fragments, and an unmistakably clear seam. |
| 08 | 140-159 | **Level 2 Arrival Forge.** Continue directly from the divider into a tougher eastern arrival district: compact forge, ore cart, cooling rack, tool wall, chained supplies, coal sacks, gantry details, and warm ember activity. Use ash-gray flagstone, iron straps, scorched joints, slag, and subtle ember channels. |
| 09 | 160-179 | **Caravan Rest.** A varied traveler pause with one enterable shelter, covered wagon, tether posts, supply piles, folding work surfaces, cooking gear, stacked firewood, and mismatched luggage. Use wagon-rutted packed earth, embedded stones, timber ties, repaired edge boards, and grass between tracks. |
| 10 | 180-199 | **Starwell Herb Court.** Preserve the Level 2 sky portal at tiles 187-188 as the visual center of a low herb and astronomy court. Use drying racks, planters, field tables, glass vessels, herb bundles, low celestial instruments, and quiet lanterns without blocking the portal. Use wet black starwell cobble, narrow culverts, blue mineral glints, and planted drainage beds. |
| 11 | 200-219 | **Timberwright Yard.** A robust but readable construction yard with varied log stacks, half-built frames, pulley rigs, saw benches, braces, wedges, ropes, carts, and sheltered work areas. Use timber-scarred basalt, heavy under-edge braces, sawdust-filled cracks, iron dogs, and reinforced foundation bays. |
| 12 | 220-239 | **Heavenblocks Observatory.** Keep the vertical Heavenblock sight lane around tiles 218-243 open and legible. Build a modest wind-exposed observatory using low instruments, a chart table, flag and streamer motion, stone seats, lens cases, thin brass markers, and sparse alpine plants. Use wind-scoured celestial slate, shallow open joints, pale mineral seams, and minimal visual weight near the sky lane. |
| 13 | 240-259 | **Frontier Survey Garden.** A planted working frontier with survey tripod, map table, sample crates, retaining baskets, seed beds, small orchard forms, irrigation pots, low fencing, and uneven field repairs. Use frontier gravel, planted-soil pockets, gabion reinforcement, exposed roots, and hand-laid edge stone. |
| 14 | 260-279 | **Far-East Expedition Overlook.** A memorable surface finale with a human-scale expedition lodge or shelter, lookout platform, telescope, map cases, packed crates, climbing equipment, signal lantern, wind flags, and a strong open view beyond the last settlement cluster. Use ancient quarry flagstone, buttressed edge construction, deep foundation courses, sparse alpine growth, and a deliberate visual cadence toward the boundary. |

## Panel 03 correction record

`2026-07-28-03-x040-059-titan-walk-east-v1.png` was rejected as the selected
panel because it replaced the established Titan collection with tall generic
rune monoliths. The v2 correction explicitly required:

- the existing low Titan plinth scale and silhouette language;
- one unique, compact miniature or dormant socket per station;
- no prop, plant, lamp, or foreground shape over any miniature;
- no giant runestones, statues, gateways, or repeated hero monuments;
- a quiet honor-garden transition without changing the gameplay walk line.

Only `2026-07-28-03-x040-059-titan-walk-east-v2.png` appears in the selected
manifest and overview sheets. V1 remains solely as rejection evidence.

## Promotion boundary

Approval of a panorama does not approve baking it into the game. Runtime
promotion requires a separate extraction pass, transparent asset review,
physical scale sheet, landmark collision audit, performance budget, state
variants, and an explicit wiring approval.
