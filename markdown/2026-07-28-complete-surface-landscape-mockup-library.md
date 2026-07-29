# Complete Surface Landscape Mockup Library

**Date:** 2026-07-28  
**Scope:** Level 1 and Level 2 surface, tiles 000-279  
**Status:** visual proposal complete; approval pending  
**Review only:** Yes  
**Production changed:** No  
**Runtime wired:** No

## Outcome

The final-look proposal divides the complete 280-tile surface into fourteen
contiguous twenty-tile gameplay views. Together they create one coherent
moonlit mountain settlement without treating the surface as one baked image.
Every view has its own visual story and ground construction while preserving a
shared camera, player scale, palette, material finish, and walk line.

The approved benchmark is used as a quality bar for:

- premium painterly 2D rendering rather than provisional Phaser graphics;
- a convincing continuous surface edge above a deep built ground facade;
- warm, local practical lights against a cobalt mountain night;
- natural asymmetry, varied prop sizes, unequal spacing, and layered depth;
- human-scale structures with enterable doors;
- visually rich coverage without filling every gap with equal-weight clutter.

## Complete surface sequence

| Panel | Tiles | Landscape chapter | Critical gameplay condition |
|---|---:|---|---|
| 01 | 000-019 | Merchant Hearth | Town circulation and enterable doors remain clear |
| 02 | 020-039 | Titan Walk West | Low plinths and every Titan silhouette remain unobscured |
| 03 | 040-059 | Titan Walk East and Honor Garden | Low plinth language continues; no giant monuments |
| 04 | 060-079 | Craftsmen Commons | Craft clutter forms clusters, not a collision wall |
| 05 | 080-099 | Skywell Market | Level 1 portal approach at tiles 93-94 remains readable |
| 06 | 100-119 | Three-Relic Gate Grove | Gate interaction lanes near tiles 105, 110, and 115 stay open |
| 07 | 120-139 | Mine Threshold and Drop Seam | Tunnel/bridge/Arc Core, tile-130 seam, and tile-132 divider stay legible |
| 08 | 140-159 | Level 2 Arrival Forge | Divider transition is continuous and grounded |
| 09 | 160-179 | Caravan Rest | Traversal line remains flat and free of fake obstacles |
| 10 | 180-199 | Starwell Herb Court | Level 2 portal at tiles 187-188 remains unobstructed |
| 11 | 200-219 | Timberwright Yard | Large work props use rear depth and preserve movement space |
| 12 | 220-239 | Heavenblocks Observatory | Vertical sight/travel lane around tiles 218-243 stays open |
| 13 | 240-259 | Frontier Survey Garden | Low planting and survey stories avoid repetitive fencing |
| 14 | 260-279 | Far-East Expedition Overlook | The surface ends with a composed destination, not empty terrain |

## Placement language

The runtime target should use story clusters, not a spacing algorithm that
places one prop every fixed number of pixels.

Each twenty-tile chapter should contain:

- one primary silhouette or activity anchor;
- one or two supporting prop families;
- several small contact details tied to the local material story;
- at least one deliberate breathing pocket for traversal readability;
- size variation within believable physical limits;
- rear, walk-line, and foreground depth positions where collision rules allow;
- ground-contact details that hide seams without covering interactables.

Adjacent objects may overlap when they form one believable activity, such as a
crate under a workbench or sacks against a wagon. Decorative objects must not
overlap Titan statues, portals, Heavenblock gates, doors, the Arc Core,
interaction markers, or the conditional drop seam.

## Continuous ground proposal

The complete top layer needs two coordinated but separable surfaces:

1. A stable traversable ground-top strip that continues across Level 1 and
   Level 2 even when the first diggable tiles below it have been removed.
2. A deeper retaining facade that changes construction and material by chapter
   without changing the true collision or dig state.

The fourteen chapter identities are:

- worn merchant slate and repaired foundation;
- ceremonial black Titan slate;
- honor-garden slate transitioning into root-lined cobble;
- cart-scarred work cobble;
- damp Skywell riverstone;
- brass-channel celestial gate slate;
- iron-banded mine-threshold structure;
- ash and iron arrival-forge stone;
- wagon-rutted caravan earth;
- wet starwell cobble and culverts;
- timber-braced yard basalt;
- wind-scoured observatory slate;
- frontier gravel, planted earth, and gabions;
- ancient quarry flagstone and buttresses.

The visual ground may bridge the top-row holes as a surface facade, but it
must never silently add collision. Conditional down-drop behavior remains a
separate gameplay rule and must read clearly at its authored seam.

## Modular extraction contract

No approved panorama should be exported as one gameplay-sized background.
Promotion should extract and review:

| Layer | Runtime purpose |
|---|---|
| Far background | Mountains, distant cloud fields, and atmospheric depth |
| Rear silhouette | Pine layers, distant roofs, and non-interactive massing |
| Mid environment | Human-scale structures and large anchored scenery |
| Prop modules | Individually placeable carts, benches, stalls, tools, plants, and supplies |
| Foreground accents | Sparse non-blocking depth silhouettes |
| Ground top | Repeatable walk-line caps and chapter transitions |
| Retaining facade | Deep visible surface edge, independent from collision tiles |
| Emissive accents | Windows, lamps, forge embers, portal-adjacent light |
| Motion accents | Smoke, flags, streamers, leaves, dust, and small practical movement |

Every extracted module needs:

- transparent-edge inspection;
- real pixel dimensions and a player-relative scale record;
- an authored ground-contact point;
- allowed depth bands and exclusion radius;
- optional mirror/scale limits;
- day/night and weather behavior where relevant;
- deterministic placement data rather than automatic whole-map population.

## Approval gates before wiring

1. Approve or revise each of the fourteen overview panels.
2. Approve the cross-panel continuity and all unique ground identities.
3. Select which objects become reusable modules and which remain
   chapter-specific.
4. Review transparent cutouts and a 1.75 m player scale sheet.
5. Validate all landmark exclusions and real collision paths in-engine.
6. Approve motion and emissive variants in an isolated comparison scene.
7. Set sprite, texture-memory, streaming, and draw-call budgets.
8. Wire behind an explicit rollback/config boundary only after visual approval.

## Review artifacts

- Complete contact sheet:
  `visual-approval-previews/surface-landscape-final-library-v1/2026-07-28-overview-all-14-surface-segments-v1.png`
- Level 1 contact sheet:
  `visual-approval-previews/surface-landscape-final-library-v1/2026-07-28-overview-level1-segments-01-07-v1.png`
- Level 2 contact sheet:
  `visual-approval-previews/surface-landscape-final-library-v1/2026-07-28-overview-level2-segments-08-14-v1.png`
- Prompt record:
  `visual-approval-previews/surface-landscape-final-library-v1/2026-07-28-imagegen-prompt-manifest.md`
- Hash and dimension manifest:
  `visual-approval-previews/surface-landscape-final-library-v1/2026-07-28-library-manifest-v1.json`

The deterministic overview builder validates the fourteen selected PNGs and
rebuilds the contact sheets without repainting or altering source artwork:
`ai-tools/2026-07-28-build-surface-landscape-library-overviews.mjs`.

## Rollback and production state

The current library is already rollback-safe because no image, manifest, or
overview is imported, preloaded, registered, or referenced by production game
code. Rejecting the proposal requires no runtime rollback. A future promotion
must keep its own versioned asset directory and single configuration disable
path so it can be removed after playtesting without disturbing world state.
