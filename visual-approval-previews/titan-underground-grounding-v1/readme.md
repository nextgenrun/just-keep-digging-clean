# Titan underground grounding v1

Status: **approved and promoted** on 2026-08-02. The comparison remains the visual approval record; production wiring is documented in `markdown/2026-08-02-titan-underground-grounding-runtime.md`.

## Comparison

- `2026-08-02-01-current-detached-diagnostic-v1.png` deliberately recreates the current visual problem: a bright cutout, crisp circular dais, weak chamber context, visible feet, and no terrain overlap.
- `2026-08-02-02-library-grounded-unlock-proposal-v1.png` is the proposed direction: bottom-anchored weight, foreground earth occlusion, biome-matched framing, shared depth grade, and a fading authored resonance seam.

## Existing library leveraged

- `sprites/backgrounds/titan-chambers-v3/01-mossback-wanderer-chamber-v3.webp`
- `sprites/backgrounds/titan-surface-stances-v1/01-mossback-wanderer-surface-stance-v1.webp`
- `sprites/backgrounds/world-visual-v2/depth/biome-backdrop-enhancers-v7/weathered-roots-ceiling-root-crown-v7.webp`
- `sprites/backgrounds/world-visual-v2/depth/biome-backdrop-enhancers-v7/weathered-roots-twin-rootstone-arches-v7.webp`
- `sprites/backgrounds/world-visual-v2/depth/biome-backdrop-enhancers-v7/weathered-roots-mycelial-lace-curtain-v7.webp`

## Proposed layer contract

1. Chamber painting as the local environment.
2. Existing biome arch/crown assets breaking the chamber-card silhouette.
3. Titan bottom-anchored to one fixed contact baseline.
4. Terrain-tinted dais reduced to a mostly buried sub-layer.
5. Irregular foreground rubble crossing the claws and lower legs.
6. Authored mineral resonance behind the Titan only during unlock.

Motion direction is a short compression, 6-10 px lift/weight shift, and settle back to the same foot baseline. It removes long lateral travel and idle horizontal drift while leaving unlock authority and the 50 percent footprint threshold unchanged.

## Promotion boundary

The approved presentation was promoted for all 25 Titans. Runtime changes are limited to authored visual assets, anchoring, tinting, local environment streaming, motion, preload/health reporting, and tests. Save schema, discovery threshold, rewards, collision, and progression remain unchanged.

