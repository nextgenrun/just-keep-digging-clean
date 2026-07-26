# Village Prop Expansion Mockups

**Created:** 2026-07-26  
**Status:** Variant C approved and promoted as a modular runtime prop language; Variants A and B rejected; review panoramas remain non-runtime composition masters; `productionChanged: true`  
**Related deferred scope:** [AAA Visual-Only Candidates 301–350](2026-07-26-aaa-visual-only-candidates-301-350.md)

## Problem being solved

The approved cabin, chimney smoke, and warm light make the left side of the starter village visually interesting. The unbreakable surface across the center-right is currently dominated by empty forest and a long undecorated ground line. This mockup set tests three ways to add authored village life without adding another HUD surface, mechanic, merchant, or collision layer.

## Shared invariants

All three variants preserve:

- the current camera, player scale, player position, target tile, terrain grid, dug cells, resources, HUD, tutorial, cabin, forest, and ground line;
- a readable central traversal and mining lane;
- world-space props on or behind the authoritative unbreakable surface;
- the approved blue moonlight and restrained amber practical-light language;
- no visible player gear or pickaxe, no extra characters, no readable signs, and no new UI;
- high-quality ImageGen art only; no HTML/CSS, primitive Phaser graphics, debug shapes, or placeholders.

## Comparison

[Open the full comparison sheet](../visual-approval-previews/2026-07-26-village-props-mockup-comparison-v1.png)

## Variant A — Working Mine Yard

**Decision:** Rejected. Do not promote or reuse as the production composition.

[Open full-resolution Variant A](../visual-approval-previews/2026-07-26-village-props-mockup-a-working-mine-yard-v1.png)

Primary props:

- timber ore-hoist and pulley;
- restrained decorative rail and ore cart;
- crates, barrels, covered supplies, rope, braces, and firewood;
- one practical hanging lantern;
- varied vertical silhouettes with a clear player lane.

Assessment:

- clearest connection to digging and the core game;
- strongest low-risk reusable prop library;
- easiest to split into independent authored prop anchors;
- fills the right side without becoming another building façade.

## Variant B — Craftsmen's Commons

**Decision:** Rejected. Do not promote or reuse as the production composition.

[Open full-resolution Variant B](../visual-approval-previews/2026-07-26-village-props-mockup-b-craftsmen-commons-v1.png)

Primary props:

- open timber-and-stone workshop;
- covered forge/brazier and repair bench;
- water trough, cart, cut stone, timber, barrels, jars, and lanterns;
- roofed notice structure without readable text.

Assessment:

- strongest hero-image transformation and warm-light contrast;
- gives the village a convincing production center;
- densest option and therefore the most likely to compete with the forest, tutorial arrow, or future merchants;
- better suited to a dedicated village section than repeating across every surface screen.

## Variant C — Village Rest Yard

**Decision:** Approved as the authoritative above-ground prop language.

[Open full-resolution Variant C](../visual-approval-previews/2026-07-26-village-props-mockup-c-rest-yard-v1.png)

Primary props:

- old stone well with timber canopy;
- canvas-covered supply wagon;
- bench, handcart, firewood, barrels, pergola/drying frame, rope fence, and hardy plants;
- multiple smaller scenic clusters with deliberate gaps.

Assessment:

- most convincing everyday village identity;
- strongest variety of quiet props and silhouettes;
- preserves more visual breathing room than the workshop;
- the wagon should be reduced slightly in a production composition so it does not dominate the right edge.

## Approved direction

Extend Variant C's grounded rest-yard language across the complete top-surface
composition for both Level 1 and Level 2:

1. use wells, wagons, benches, handcarts, firewood, barrels, pergolas, rope/fence rhythm, hardy plants, lanterns, and deliberately open gaps;
2. vary prop clusters by region instead of repeating the exact approved screenshot;
3. preserve every authored merchant, entrance, pillar, portal, bridge, and playable lane;
4. adapt materials and practical-light color to each level while retaining the same handcrafted visual family;
5. keep approximately one-third of every gameplay camera visually open;
6. animate only a few meaningful details: well-rope settle, lantern micro-sway, wagon-canvas movement, smoke, plants in wind, and rare loose-cloth motion.

Level 1 should retain moonlit mountain-village wood, slate, rope, canvas, and
restrained vegetation. Level 2 should translate the same prop grammar into
heat-aged timber, blackened iron, basalt, ash-stained canvas, ember glass, and
sparse heat-resistant plants without turning into the rejected forge/workshop
composition.

## Whole-surface extension review

For this pass, **top layer means the complete playable surface band** in both
levels, not the underground depth backgrounds. These panoramas show the visual
rhythm across several gameplay camera widths; they are not literal map
dimensions or production-ready flattened backgrounds.

[Open the Level 1 and Level 2 comparison sheet](../visual-approval-previews/2026-07-26-level1-level2-whole-surface-panorama-comparison-v1.png)

### Level 1 — Moonlit village surface

[Open the full-resolution Level 1 panorama](../visual-approval-previews/2026-07-26-level1-whole-surface-village-panorama-v1.png)

- extends the approved cabin/rest-yard identity across the full village surface;
- alternates cabin, reserved town/merchant space, small commons, well, wagon,
  pergola, firewood, and overlook clusters;
- keeps a continuous readable route and open authored pads for existing
  entrances, merchants, milestones, portals, and interactions;
- retains the existing blue mountain night, warm practical lights, timber,
  slate, canvas, rope, and restrained vegetation.

### Level 2 — Magma frontier surface

[Open the full-resolution Level 2 panorama](../visual-approval-previews/2026-07-26-level2-whole-surface-village-panorama-v1.png)

- translates the approved Variant C silhouettes into basalt, blackened iron,
  heat-aged timber, ash canvas, chain/rope, and ember lanterns;
- keeps the bridge/arrival and future authored landmark or NPC pads visually
  open;
- uses the existing pipework, lava, smoke, and heat as supporting biome texture
  below and behind the route;
- deliberately avoids the rejected ore-hoist yard and the rejected
  forge/workshop-district composition.

### Production interpretation

If both panoramas are approved, the implementation pass should treat them as
composition masters. Generate or isolate the well, wagon, bench, handcart,
barrels, fuel stacks, pergola, fences, plants, and lanterns as separate
high-quality assets, then place them through editable authored anchors. Do not
wire either panorama as one flattened screenshot.

## Future implementation boundary

The user deferred candidates 301–350 so they can be implemented with this broader above-ground prop pass. When that combined package begins:

- generate or extract each production prop as a separate approved asset; never wire a flattened review screenshot;
- keep authored placement editable and deterministic;
- do not mutate the hidden grid, unbreakable surface, collision, merchants, entrances, or saves;
- group props into independently disableable presentation slices;
- retain a direct comparison/rollback switch to the current approved surface;
- validate the complete starter camera at normal gameplay scale before promotion.

## ImageGen execution record

Mode: built-in ImageGen edit and reference-guided generation workflows.

- Variant A prompt: preserve the supplied gameplay frame and populate only the empty center-right unbreakable surface with a layered working mine yard.
- Variant B prompt: preserve the supplied gameplay frame and create a warmer, denser craftsmen's commons with one open workshop anchor.
- Variant C prompt: preserve the supplied gameplay frame and create a more open village rest yard anchored by a well and supply wagon.
- Level 1 whole-surface prompt: use approved Variant C as the sole prop-language
  reference and extend it into one continuous moonlit surface panorama with
  varied clusters and reserved gameplay pads.
- Level 2 whole-surface prompt: use approved Variant C for prop grammar and the
  current Level 2 surface/depth art for basalt, lava, pipework, soot, and ember
  materials; exclude the rejected mine-yard and workshop compositions.

All five generated composition images remain review targets only and are not
runtime assets. Production uses separately generated and alpha-extracted prop
cutouts.

## Production outcome

The approved direction is implemented as 18 independent live assets and 68
deterministic anchors, not as either whole-surface panorama. All placement,
scale, protected zones, streaming, terrain contact, quality checks, and
rollback controls are recorded in
[Modular Surface Props Runtime V1](2026-07-26-modular-surface-props-runtime-v1.md).

Candidates 301–350 remain deferred; this pass promotes only the approved
above-ground prop foundation and its verification tooling.
