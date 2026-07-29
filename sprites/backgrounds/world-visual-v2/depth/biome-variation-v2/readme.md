# Biome Variation V2 Runtime Backdrops

Runtime WebP derivatives of 60 approved background-only ImageGen source plates:
50 base-variation plates from
`visual-approval-previews/underground-biome-background-production-v2/` plus ten
motion-direction plates from
`visual-approval-previews/underground-biome-motion-mockups-v1/`.

- Every card is exactly 1536x1024.
- All 60 static cards are production-selected. Each live biome has six static
  choices: five base variations plus one promoted concept composition. The
  renderer adds its matching V3 MP4 as a seventh choice.
- Cards render at `backwallDepth: -6.4`.
- No procedural signature, mist, particle, or emissive overlay is attached.
- The solid terrain facade remains authoritative at `terrainDepth: 0.1`.
- Architecture, bridges, machinery, roots, rails, and ruins are scenic only.
- Runtime selection is deterministic per world-space card.
- Only active regional cards and the configured neighbor envelope are streamed.
- Use `?biomeBackdropVariants=0` to restore the previous backdrop pool.
- Use `?biomeBackdropMotion=0` to freeze video and disable complete-card camera
  response.

Rebuild the ten `*-motion-v1.webp` derivatives with
`ai-tools/2026-07-26-build-underground-biome-motion-runtime-v1.py`.

Do not use these plates for collision, tile ownership, resource state, or saves.

The package remains immutable and fully live. `../biome-expansion-v3/` adds
fifty new static choices without replacing these sixty images, while
`../biome-ground-structures-v3/` adds a separate terrain-masked alpha layer.
