# Titan Chambers v3 ImageGen Provenance

**Date:** 2026-07-28  
**Runtime version:** `titan-chambers-v3`  
**Source generation mode:** built-in ImageGen  
**New generation in this pass:** none

The 25 v3 runtime cards preserve the pixels and compositions of the approved
built-in ImageGen masters under `../titan-chambers-v2/sources/`. No Titan,
chamber, prop, lighting motif, or background structure was repainted or
substituted.

The only v3 transformation is a deterministic organic alpha feather applied at
the outer boundary before high-quality transparent WebP encoding. The original
per-Titan prompts remain authoritative in
`../titan-chambers-v2/2026-07-26-imagegen-prompt-manifest-v2.md`.

The build script validates transparent corners, bounded edge opacity, a fully
readable center, exact 1536x848 dimensions, hashes, and complete 25-card
inventory.

