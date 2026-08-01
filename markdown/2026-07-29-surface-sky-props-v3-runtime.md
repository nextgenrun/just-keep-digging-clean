# Surface and Sky Prop Library V3

## Corrected outcome

The upper world owns a 200-object art library, not a 200-object placement
quota. Production now selects a restrained authored subset:

- 140 available Level 2 surface assets, with 38 used as supporting details;
- 60 available sky assets, with 13 used as portal-island bookends and
  Heavenblock gap accents;
- the retained 25-asset surface kit and its 34 approved Level 2 placements
  remain the primary composition;
- Level 1 receives no modular prop layer, preserving the Town, Titan Walk,
  ground portal, Heavenblock gates, tunnel, bridge, and Arc Core silhouettes.

The former one-asset/one-placement generated layout is retained only as build
provenance inside the generated catalog. Runtime does not import it.

## World-building direction

The complete surface is treated as seven connected landscape chapters. Every
chapter has one existing primary anchor, at most three supporting story
clusters, and at least one explicit open range:

| Chapter | Existing focal anchor | New supporting story |
|---|---|---|
| Arrival Forge | Forge Shelter | fuel store and quench station |
| Caravan Rest | Camp Kitchen and wagon | hearth camp and tether stop |
| Starwell Herb Court | Herb Station | west garden and east apothecary |
| Timberwright Yard | Timber Gantry | timber stock, saw bay, and cart load |
| Heavenblocks Observatory | Observatory | one compact instrument court |
| Frontier Survey Garden | Survey Station | trial garden and survey bench |
| Far-East Overlook | Expedition Shelter | wagon load, survey point, and shelter |

Objects overlap only when they form one believable activity. The layout no
longer distributes independent silhouettes at even intervals.

`values/worldVisualSurfacePropCompositionV3.js` is the authored surface source
of truth. `values/worldVisualSkyPropCompositionV3.js` owns the sparse sky
selection. Neither file is generated.

## Static props and authored depth

Props do not pulse, breathe, bob, sway, rotate, drift, fade, or resize at
runtime. The former shared prop-life system was removed. Size is selected
explicitly through authored `small`, `standard`, `large`, and `feature`
variants. `feature` is used only by selected camera-composition supports and is
validated at the exact authored asset/lane scale rather than assumed safe for
the complete 140-object palette.

Depth remains purposeful and static:

- rear/far details use 88% perspective scale and 82% surface opacity;
- mid-distance details use 100% perspective scale and 95% opacity;
- near/front contact details use 108% perspective scale and full opacity;
- selected support features use a 132% size multiplier while remaining below
  the 1.75 m / 0.8-tile player silhouette;
- retained chapter anchors use the quality-safe 110% large variant and mid lane where the
  camera composition calls for a hero, while the Observatory remains standard
  to respect its 2.05 m flight-lane ceiling;
- retained props keep the milder 88/97/100% rear-to-front opacity ladder.

The renderer stores the resolved `far`, `middle`, or `near` distance on each
sprite for inspection. Ground contact always remains authoritative.

## Mockup-driven camera composition

The current five-frame implementation set lives under
`visual-approval-previews/surface-prop-worldbuilding-implementation-v2/`.
Its V3 scale-correct sequence uses the production 0.8-tile player as ruler.
The review images remain unloaded; runtime reproduces their relationships with
existing transparent props and live terrain.

Each chapter now guarantees at least one feature support. Six-support chapters
use an exact 2 rear / 2 mid / 2 front split; four-support chapters use 1 rear /
1 mid / 2 front. Any 14-tile gameplay camera is capped at eleven combined
retained and V3 props. This keeps functional clusters readable while preventing
the former evenly distributed asset-dump look.

## Live sky handoff exposed by comparison

The direct PlayScene comparison found that the normalized sky layer created its
opaque black blend matte before the active camera's streamed sky cards were
ready. On a teleport, the requested sky could also wait behind terrain and
detail assets, hiding the valid far mountain plate for several seconds.

Runtime now keeps the matte and sky cards at zero alpha until every active
camera cell is ready, leaving the complete far plate visible as the fallback.
Sky cohesion has priority 99, above optional backdrop, terrain, structure, and
detail loads. The 28x12 sky grid is fitted exactly to the 280x65 field, so its
last lower card ends at the surface rather than burying its painted horizon
below terrain; each cell's fitted overlap is also its normalized blend feather.

## Protected visual landmarks

Surface placement validation compares complete rendered widths against:

- Town interactions and the calculated 25-statue Titan gallery;
- Level 1 and Level 2 ground portals;
- all three Heavenblock surface gates;
- tunnel, bridge, Arc Core, and the Level 2 flight corridor.

Portal islands use only two small outer-edge bookends each. No floating props
or portal-row accents remain. Each Heavenblock uses exactly one static object
in each safe gap between arrival, return altar, and reward shrine.

## Asset pipeline

Ten checked-in ImageGen 5-by-4 masters supply the 200 transparent assets.
The dated builder extracts and packs ten lossless WebP Phaser atlases, records
hashes and physical dimensions, and renders review sheets:

```powershell
python ai-tools/2026-07-29-build-surface-sky-props-v3.py
```

The builder's generated placements are catalog evidence only. Production
composition is always maintained in the two hand-authored values modules.

## Rollback and inspection

- `?surfaceSkyPropsV3=0`: remove the complete V3 authored selection.
- `?surfacePropsV3=0`: remove the 38 surface details.
- `?skyPropsV3=0`: remove the 13 sky details.
- Existing `?surfaceProps=0` removes the retained 34-placement foundation.

Snapshots are available at `window.__jkdSurfacePropsV3`,
`window.__jkdSkyPropsV3`, and `window.__jkdSurfaceProps`.

## Verification

`testing/2026-07-29-surface-sky-props-v3-contract.mjs` verifies:

- all 200 lossless library assets and ten atlases;
- the 38/13 sparse runtime selections;
- two-to-three story clusters, per-chapter feature silhouettes, balanced lanes,
  and explicit breathing ranges;
- a maximum of eleven combined props per 14-tile gameplay camera;
- player-relative support and hero sizing plus the Observatory flight ceiling;
- static transforms, alpha, and display size at widely separated timestamps;
- authored 82/95/100 opacity distance and rear/mid/front scale;
- complete retained and V3 surface, Titan, portal, pillar, and Heavenblock
  exclusions;
- preload, streaming, query rollback, and lifecycle behavior.

`testing/2026-07-28-sky-underground-cohesion-runtime-contract.mjs` additionally
locks the no-black pending fallback, sky load priority, exact world-edge fit,
and per-cell blend-feather alignment.
