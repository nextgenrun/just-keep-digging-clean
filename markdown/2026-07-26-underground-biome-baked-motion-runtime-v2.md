# Underground biome optical-flow motion V2 rejection

Date: 2026-07-26  
Status: rejected; removed from production selection

## Decision

The ten V2 moving-image files are rejected. Their source paintings and painted
keyframe-B images remain valuable, but the optical-flow interpolation produces
choppy movement, deformation, and uneven temporal quality.

Production must not register, preload, stream, or play any V2 WebM.

## Current production state

- All ten biome pools contain five approved 1536x1024 WebP images.
- `values/worldVisualDepthBackdrops.js` contains no `biome-motion-v2` path,
  `.webm` asset, or video entry.
- `WorldVisualDepthBackdropRegionView` creates image cards only.
- Smooth camera response may move the complete finished image card.
- Amber, Slagworks, and Pressure Foundry remain fully anchored.
- No mist, emissive, particle, Canvas, Graphics, or HTML motion layer is added.
- Ground, collision, digging, HP, resources, and saves remain owned by
  `WorldModel`.

## Preserved evidence

The rejected gallery remains available at:

`visual-approval-previews/underground-biome-baked-motion-v2/`

Its values and generated manifest now state:

- `reviewOnly: true`
- `productionChanged: false`
- `status: "rejected"`

The WebMs remain under
`sprites/backgrounds/world-visual-v2/depth/biome-motion-v2/` only so their
hashes, source mapping, and failure can be audited. They are not reachable from
the production module/asset graph.

## Replacement boundary

Any replacement animation is review-only until separately approved. The first
comparison should use one biome, preserve the original painting exactly, avoid
optical-flow morphing, and prove smooth temporal playback before generating all
ten.

## Verification

- `testing/2026-07-26-underground-baked-motion-runtime-contract.mjs`
- `testing/2026-07-26-underground-motion-review.mjs`
- `testing/2026-07-16-scenic-shallow-cavern-smoke.mjs`
- `testing/2026-07-18-production-deployment-smoke.py`
