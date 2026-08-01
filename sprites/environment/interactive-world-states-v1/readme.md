# Interactive World States V1 Runtime Candidates

This folder contains 100 high-resolution transparent WebP atlases. Every atlas
contains ten 448-by-448 physical states for one tangible underground object.
Together they expose exactly 1,000 unique candidate sprites.

The complete library remains additive and review-only. Production has one
explicit allowlist in `values/interactiveWorldStates.js`: only `cache` and
`memory-reliquary` atlases may be demand-loaded. Cache art is a presentation
layer over the existing chest authority; memory reliquaries use fixed authored
anchors and the existing Journey journal with no reward calls.

Every other family remains unloaded and unplaced. In particular,
`freight-lift` is available only in the isolated, non-persistent
`testing/animation-sandbox/freight-lift-prototype-v1/` harness. No candidate
family replaces portals, tunnel doors, hazards, backgrounds, terrain, save
authority, or gameplay authority.

State order is:

1. dormant
2. proximity-ready
3. activation-01
4. activation-02
5. activation-03
6. active-loop-a
7. active-loop-b
8. resolved-success
9. depleted-spent
10. damaged-broken

Atlas frame metadata and biome compatibility are authoritative in
`visual-approval-previews/interactive-world-states-v1/2026-07-29-interactive-world-states-manifest-v1.json`.
