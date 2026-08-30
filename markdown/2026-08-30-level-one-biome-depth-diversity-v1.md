# Level One biome depth diversity V1

Date: 2026-08-30

Scope: Level One only, X0-131 and 0-2000 m

Authority: presentation only

## Outcome

Level One now has 639 production media files and 1109 effective selectable
visual pieces. The new pass contributes exactly 156 independent ImageGen
sources: fifty tertiary ground materials, thirty four-piece identity atlases,
fifty scenic alternatives, fourteen boundary alternatives, and twelve rare
landmarks. No source is a tint-only duplicate.

The fifteen experimental hard swaps are intentionally blunt rather than small
variations. Their palettes include acid lime against indigo peat, vermilion
ironbark against petrol stone, near-white stormglass against royal blue,
turquoise/magenta prism kelp, chrome/cyan quicksilver, black/ultraviolet
reflectory stone, rose-gold/teal molten chains, and oil-slick blackglass. Every
swap keeps the existing side-view silhouette, grounded edges, restrained
lighting, and painterly material detail so it still belongs to UNDERSTAR.

## Runtime routing

- Fifty named territories remain selected by the same one hundred warped
  X/depth sites. Their measured vertical interior runs retain an 83 m median
  and 130 m maximum.
- The existing 400 generated-role spatial anchors are unchanged. Deterministic
  substitution uses all fifty scenic alternatives, all 120 atlas crops, and all
  twelve rare landmarks. Sixty-four restrained foundation layers now retain
  the base role art that those substitutions previously made unreachable, so
  all 200 base generated-role files participate without adding map sites.
- True ground expands from 96 to 146 concepts. Each family receives a tertiary
  plate; expanded families retain their two prior dedicated plates.
- Boundary density remains 481 spatial anchors. Seven material joins each own
  three authored cutouts. The single Cobalt/Silver contact now composes its two
  alternatives beside the retained anchor, making all 21 boundary files active
  through 483 lightweight rendered layers.
- The M map uses the same resolver and gives all fifty identities unique colors,
  including the fifteen experimental palettes.

All art remains clipped by the authoritative terrain mask and demand-streamed.
`WorldModel` still owns tiles, digging, HP, collision, resources, rewards,
progression, and saves. Level 2 and deeper levels are untouched.

## Image generation and provenance

Generation used the built-in ImageGen workflow in one independent call per
source. Exact prompts and job routing are recorded in:

- `visual-approval-previews/level-one-biome-depth-diversity-v1/2026-08-30-level-one-biome-depth-prompts-v1.md`
- `visual-approval-previews/level-one-biome-depth-diversity-v1/2026-08-30-level-one-biome-depth-imagegen-jobs-v1.json`
- `visual-approval-previews/level-one-biome-depth-diversity-v1/2026-08-30-level-one-biome-depth-diversity-specs-v1.json`

Two first-pass identity atlases failed the central-gutter crop contract. They
remain in `sources/identity-kits/rejected/`; corrected independent generations
are the only versions promoted to runtime.

## Review evidence

- `2026-08-30-level-one-biome-hard-swap-experiments-contact-v1.jpg`
- `2026-08-30-level-one-biome-ground-material-contact-v2.jpg`
- `2026-08-30-level-one-biome-identity-contact-v1.jpg`
- `2026-08-30-level-one-biome-scenic-contact-v1.jpg`
- `2026-08-30-level-one-biome-boundary-contact-v1.jpg`
- `2026-08-30-level-one-biome-landmark-contact-v1.jpg`

The contract `testing/2026-08-30-level-one-biome-depth-diversity-v1-contract.mjs`
guards exact source and runtime hashes, dimensions, alpha/coverage rules,
selection reachability, map colors, unchanged spatial anchor counts, and
visual-only authority. The complete cross-library matrix is guarded by
`testing/2026-08-30-level-one-biome-library-alignment-v1-contract.mjs`; literal
639/639 production-media reachability is guarded by
`testing/2026-08-30-level-one-production-media-reachability-v1-contract.mjs`.

## Rollback

- `?levelOneSourceFamilies=0` restores the five shared family selectors and
  removes generated role substitutions.
- `?undergroundTerrainVariation=0` removes family-specific ground plates and
  retained terrain variation together.
- `?levelOneBiomeField=0` restores horizontal material selection for Level One.
