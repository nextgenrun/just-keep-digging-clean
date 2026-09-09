# Ground-Level Background Placement and Merge Map

This map records background authority only. Tile ranges are continuous and
exclusive at the right edge. Nothing in the `reference content` column is a
runtime prop overlay.

## Non-negotiable rendering rules

- No archived town houses, Titan stance cutouts, portal cutouts, mine cutouts,
  hero-landmark sprites, or generic modular surface props are instantiated.
- Existing objects visible inside an approved panel stay baked and static until
  that chapter is regenerated as a clean independent layer pack.
- A future layer may animate only its own authored pixels. Cropping a flattened
  reference object and floating it over the same panel is forbidden.
- Merchant Hearth alone retains the existing Town Square video authority.
- Mountains, cliffs, permanent architecture, and ground geometry never drift.

## Piecemeal chapter plan

| # | Tiles | Chapter | Current background authority | Reference content kept static | Valid future authored motion |
|---:|:---:|---|---|---|---|
| 1 | 0-19 | Merchant Hearth | unchanged Town Square video | town buildings and ground | existing video only until separately approved |
| 2 | 20-39 | Titan Walk West | approved panel 02 | Titans, plinths, gate, mountains | valley cloud, spirit flame, gate emissive |
| 3 | 40-59 | Titan Walk East | approved panel 03 | Titans, garden, forest, mountains | valley cloud, foliage, independent distant lights |
| 4 | 60-79 | Craftsmen Commons | approved panel 04 | workshop, carts, ground | chimney smoke, forge smoke/flame, lantern masks |
| 5 | 80-99 | Skywell Market | approved panel 05 | market buildings/stalls, well, ground | well water, portal light, thin mist, cloth |
| 6 | 100-119 | Three-Relic Gate Grove | approved panel 06 | three gates, wagon, grove, ground | three independent gate lights, low mist, foliage |
| 7 | 120-139 | Mine Threshold | approved panel 07 | mine, bridge, cliff, ground | threshold mist, warning lights, distant cloud |
| 8 | 140-159 | Arrival Forge | approved panel 08 | forge architecture, bridge, ground | forge smoke/flame, embers, lantern masks |
| 9 | 160-179 | Caravan Rest | approved panel 09 | wagons, shelters, ground | campfire, smoke, cloth, lantern masks |
| 10 | 180-199 | Starwell Herb Court | approved panel 10 | court, planters, ground | water, portal light, herbs, low mist |
| 11 | 200-219 | Timberwright Yard | approved panel 11 | yard, crane, timber, ground | sawdust, smoke, rope/cloth, lantern masks |
| 12 | 220-239 | Heavenblocks Observatory | independent segmented pack v1 | moon, mountains, forest, terrain | 900 star IDs and 10 forward atmosphere sprites |
| 13 | 240-259 | Frontier Survey Garden | approved panel 13 | pavilion, walls, garden, ground | foliage, survey cloth, lantern masks, thin mist |
| 14 | 260-279 | Far-East Overlook | approved panel 14 | buildings, crane, wagons, ground | flags, brazier flame/smoke, snow/cloud layer |

## Merge order

1. Accept composition and ground contact in each approved panel.
2. Generate a clean static base from that chapter's own reference, not from a
   neighboring panel or the generic runtime backdrop.
3. Author only physically movable layers with transparent edges and offscreen
   reset space.
4. Author emissive masks separately for individual windows, lanterns, portals,
   fires, and stars; never brighten a whole building sprite.
5. Browser-test source identity, zero legacy overlays, zero mountain motion,
   loop/reset behavior, and Town video hash before promoting the next chapter.
