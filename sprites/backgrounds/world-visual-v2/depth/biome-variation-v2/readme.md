# Biome Variation V2 Runtime Backdrops

Runtime WebP derivatives of 60 approved background-only ImageGen source plates:
50 base-variation plates from
`visual-approval-previews/underground-biome-background-production-v2/` plus ten
motion-direction plates from
`visual-approval-previews/underground-biome-motion-mockups-v1/`.

- Every card is exactly 1536x1024.
- Each live biome has six deterministic cards: five base variations plus one
  promoted motion-direction composition.
- Cards render at `backwallDepth: -6.4`.
- Pooled signature animation renders separately at `signatureDepth: -5.66`.
- The solid terrain facade remains authoritative at `terrainDepth: 0.1`.
- Architecture, bridges, machinery, roots, rails, and ruins are scenic only.
- Runtime selection is deterministic per world-space card.
- Only active regional cards and the configured neighbor envelope are streamed.
- Use `?biomeBackdropVariants=0` to restore the previous backdrop pool.
- Use `?biomeBackdropMotion=0` to disable ambient background animation only.

Rebuild the ten `*-motion-v1.webp` derivatives with
`ai-tools/2026-07-26-build-underground-biome-motion-runtime-v1.py`.

Do not use these plates for collision, tile ownership, resource state, or saves.
