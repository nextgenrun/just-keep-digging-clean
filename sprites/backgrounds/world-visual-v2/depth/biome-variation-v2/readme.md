# Biome Variation V2 Runtime Backdrops

Runtime WebP derivatives of the 50 approved background-only ImageGen source
plates in
`visual-approval-previews/underground-biome-background-production-v2/`.

- Every card is exactly 1536x1024.
- Cards render at `backwallDepth: -6.4`.
- The solid terrain facade remains authoritative at `terrainDepth: 0.1`.
- Architecture, bridges, machinery, roots, rails, and ruins are scenic only.
- Runtime selection is deterministic per world-space card.
- Only active regional cards and the configured neighbor envelope are streamed.
- Use `?biomeBackdropVariants=0` to restore the previous backdrop pool.
- Use `?biomeBackdropMotion=0` to disable ambient background animation only.

Do not use these plates for collision, tile ownership, resource state, or saves.

