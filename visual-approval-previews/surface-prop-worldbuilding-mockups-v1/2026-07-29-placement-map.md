# Surface Prop Worldbuilding Placement Map

This map turns the six direction boards into bounded runtime composition work.
The exact production coordinates remain authoritative in
`values/worldVisualSurfacePropCompositionV3.js` and
`values/worldVisualSkyPropCompositionV3.js`.

| Chapter | Tile range | Composition | Keep open |
|---|---:|---|---:|
| Arrival Forge | `151.5..162.5` | fuel store, shelter workface, quench station | `161.1..162.5` |
| Caravan Rest | `162.5..180` | camp hearth, wagon stop | `169.2..170.2`, `176.8..178.1` |
| Starwell Herb Court | `180..200` | west garden and east apothecary around the portal | `185.5..190.5` |
| Timberwright Yard | `200..219` | timber stock, saw bay, cart load | `200..201.35`, `215.8..216.9` |
| Heavenblocks Observatory | `219..243` | one compact instrument court | `219.5..222.4`, `232.2..234`, `240..242.5` |
| Frontier Survey Garden | `243..260` | trial garden, survey bench | `250.8..252.2`, `254..256.2` |
| Far-East Overlook | `260..280` | wagon load, survey overlook, expedition shelter | `265.5..266.6`, `274..275.3` |

## Protected world regions

- Level 1 receives no V3 prop placements. Titan Walk, the Level 1 portal,
  Town Square, and the surface Heavenblock gates remain visually dominant.
- Each V11 portal island receives exactly two low outer-edge bookends.
- No portal-island prop rectangle may overlap a portal slot, arrival pad, or
  sky pillar.
- Each Heavenblock receives one object in each authored safe gap only.
  Arrival, return altar, reward shrine, and their interaction radii stay clear.

## Layer recipe

- Size variants: `small 0.86`, `standard 1`, `large 1.18`.
- Distance perspective: `far 0.88`, `middle 1`, `near 1.08`.
- Surface opacity: `far 0.74`, `middle 0.92`, `near 1`.
- Sky opacity: `far 0.78`, `middle 0.93`, `near 1`.
- Props remain transform-static. Depth is communicated through scale, opacity,
  overlap, tint response, and terrain contact.
- A chapter uses one dominant retained anchor, one or two supporting families,
  several low contact details, and real negative space.
