# Sky and Underground Game-Ready Assets V1

**Date:** 2026-07-28  
**Status:** `reviewOnly: true`  
**Production changed:** No  
**Runtime wired:** No  
**Game-ready image count:** 30

This additive approval package expands the two accepted source plates into a
complete visual-cohesion library without replacing or removing any existing
game art:

- 20 opaque upper-world sky far plates at `1672x941`.
- 10 alpha underground foreground plates at `1536x1024`.
- Two labeled contact sheets for visual review; these are review aids and are
  not part of the 30 game-ready image count.

## Visual review

- `2026-07-28-sky-20-plate-contact-sheet-v1.jpg`
- `2026-07-28-underground-10-plate-contact-sheet-v1.png`
- `2026-07-28-sky-crossfade-transition-proof-v1.jpg`

The sky sheet is ordered from the retained base corridor through western,
Level 1, central, Level 2, and eastern/Heavenblock atmosphere. The underground
sheet is ordered from Shallow Blue through Starfire Rift and is composited over
a neutral slate backing so the soft alpha handoff is visible.
The transition proof deliberately tests the four largest neighboring sky
palette jumps with an overlap wider than both paired edge handoffs, so the
dark endpoint pixels cancel instead of forming a vertical fold. It is not an
instruction to butt-join the full cards.

## Sky library: 20 opaque far plates

| # | Coverage role | File |
|---:|---|---|
| 01 | Retained base flight corridor | `2026-07-28-sky-flight-corridor-far-plate-v1.webp` |
| 02 | Western lower mist valleys | `2026-07-28-sky-02-western-lower-mist-valleys-v1.webp` |
| 03 | Western upper aurora shelf | `2026-07-28-sky-03-western-upper-aurora-shelf-v1.webp` |
| 04 | Western stormbreak edge | `2026-07-28-sky-04-western-stormbreak-edge-v1.webp` |
| 05 | Level 1 lower cyan approach | `2026-07-28-sky-05-level1-lower-cyan-approach-v1.webp` |
| 06 | Level 1 middle cloud reef | `2026-07-28-sky-06-level1-mid-cloud-reef-v1.webp` |
| 07 | Level 1 upper ruin beacons | `2026-07-28-sky-07-level1-upper-ruin-beacons-v1.webp` |
| 08 | Level 1 quiet departure | `2026-07-28-sky-08-level1-quiet-departure-v1.webp` |
| 09 | Central lower horizon saddle | `2026-07-28-sky-09-central-lower-horizon-saddle-v1.webp` |
| 10 | Central middle open aurora | `2026-07-28-sky-10-central-mid-open-aurora-v1.webp` |
| 11 | Central upper star river | `2026-07-28-sky-11-central-upper-star-river-v1.webp` |
| 12 | Central transition cloud veil | `2026-07-28-sky-12-central-transition-cloud-veil-v1.webp` |
| 13 | Level 2 lower iron-forge haze | `2026-07-28-sky-13-level2-lower-iron-forge-haze-v1.webp` |
| 14 | Level 2 middle ruin belt | `2026-07-28-sky-14-level2-mid-ruin-belt-v1.webp` |
| 15 | Level 2 upper chain citadels | `2026-07-28-sky-15-level2-upper-chain-citadels-v1.webp` |
| 16 | Level 2 stormbreak corridor | `2026-07-28-sky-16-level2-stormbreak-corridor-v1.webp` |
| 17 | Eastern lower expedition overlook | `2026-07-28-sky-17-eastern-lower-expedition-overlook-v1.webp` |
| 18 | Eastern middle thunder sea | `2026-07-28-sky-18-eastern-mid-thunder-sea-v1.webp` |
| 19 | Eastern upper Heavenblock ascent | `2026-07-28-sky-19-eastern-upper-heavenblock-ascent-v1.webp` |
| 20 | Eastern far crimson atmosphere | `2026-07-28-sky-20-eastern-far-crimson-atmosphere-v1.webp` |

Sky contract:

- Opaque WebP, exact `1672x941`.
- Broad calm flight lane; landmarks remain remote, peripheral, and visibly
  non-collidable.
- No baked sun, moon, planet, eclipse disc, complete halo, portal, player, UI,
  foreground platform, or gameplay-looking ledge.
- A gradual 128 px handoff converges on the shared deep-cobalt background at
  every outer edge. Adjacent cards should overlap/crossfade through this band,
  never be placed as two hard butt-jointed rectangles.

## Underground library: 10 alpha foreground plates

| # | Material band | File |
|---:|---|---|
| 01 | Retained Shallow Blue | `2026-07-28-underground-shallow-blue-foreground-plate-v1.webp` |
| 02 | Weathered Roots | `2026-07-28-underground-02-weathered-roots-foreground-v1.webp` |
| 03 | Amber Depths | `2026-07-28-underground-03-amber-depths-foreground-v1.webp` |
| 04 | Silver Core | `2026-07-28-underground-04-silver-core-foreground-v1.webp` |
| 05 | Core Magma | `2026-07-28-underground-05-core-magma-foreground-v1.webp` |
| 06 | Slagworks | `2026-07-28-underground-06-slagworks-foreground-v1.webp` |
| 07 | Obsidian Catacombs | `2026-07-28-underground-07-obsidian-catacombs-foreground-v1.webp` |
| 08 | Pressure Foundry | `2026-07-28-underground-08-pressure-foundry-foreground-v1.webp` |
| 09 | Blackglass Abyss | `2026-07-28-underground-09-blackglass-abyss-foreground-v1.webp` |
| 10 | Starfire Rift | `2026-07-28-underground-10-starfire-rift-foreground-v1.webp` |

Underground contract:

- Alpha WebP, exact `1536x1024`.
- Full-frame embedded geology with an 80 px continuous transparency feather on
  all four sides; there is no opaque rectangular card edge.
- Additive visual material only. These plates do not define terrain, collision,
  tile state, resources, rewards, cave openings, or world generation.
- No tunnel, architecture, machinery, player, UI, text, collectible silhouette,
  star symbol, skull, or repeated tile grid.

## Package files

- `2026-07-28-library-manifest-v1.json` is the machine-readable 30-file index.
- `2026-07-28-imagegen-prompt-manifest.md` records the built-in ImageGen
  reference roles, shared constraints, and all 30 visual identities.

## Review boundary

All 30 WebPs are final-size candidates, but none is registered, preloaded,
referenced by values, or rendered by Phaser. Approval authorizes a separate
wiring pass only; it does not approve runtime placement, opacity, parallax,
streaming range, memory budget, overlap distance, or rollback values.
