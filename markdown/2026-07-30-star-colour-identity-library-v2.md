# Star Colour Identity Library V2

## Dedicated-light amendment

The 62.5 MiB package documented below remains the crisp crystal/phenomenon
library. It no longer doubles as the illumination texture. Every identity now
has a separate matched light-only frame in `star-identity-lights-v1`; see
`2026-07-30-star-identity-dedicated-light-library.md`.

## Outcome

The authored Star-light library now contains 250 identities instead of 50.
Each identity has its own name, primary and secondary colour, flavour line,
light phenomenon, motion signature, and exact ImageGen frame. Reward rarity
still controls Sign XP, material multiplier, Engine charge, depth gates, and
spawn weight.

This is an expansion of the existing system, not a parallel Star mechanic.
World Stars, darkness lighting, mined releases, discovery popups, floating
copy, the I-key Star Atlas, and health checks all resolve the same identity
record.

## Distribution

| Rarity | V1 | V2 total | Atlas layout |
|---|---:|---:|---:|
| Common | 12 | 60 | 10x6 |
| Uncommon | 10 | 50 | 10x5 |
| Rare | 10 | 50 | 10x5 |
| Epic | 8 | 40 | 10x4 |
| Mythic | 6 | 30 | 10x3 |
| Astral | 4 | 20 | 10x2 |

The original global indices `0-49` are unchanged. New identities append at
`50-249`, so existing saved/tile identities still point to the same art and
copy. A `Uint8Array` holds the value safely because the maximum identity index
is 249; health rejects any library above 256 entries.

## Art package

Fourteen built-in ImageGen contact sheets provide the 200 new lights. The
original six V1 source sheets provide the first 50. The V2 builder converts
black-backed additive art to straight alpha and assembles six 256 px atlases.

The runtime package decodes to exactly 65,536,000 bytes (62.5 MiB), below its
64 MiB cap. The manifest pins every source and output by SHA-256 and records
frame coverage, dimensions, offsets, and decoded memory.

Rarity has visible escalation:

- Common: quiet halos, mist, motes, petals, and soft rays.
- Uncommon: layered tides, ribbons, currents, comets, and chorus waves.
- Rare: coronas, nova facets, prisms, solar arcs, and lightning.
- Epic: infernos, plasma, void lenses, tempests, ruptures, and vortices.
- Mythic: abstract dragonlight, phoenix featherfire, oracle geometry, ancestral
  flame, and time echoes.
- Astral: genesis rays, singularity lenses, event horizons, and eternal
  spectra.

Runtime tinting is forbidden. Colour and phenomenon are authored pixels.

## Star Atlas readability

The I-key `STAR ATLAS` keeps the approved 1536x800 ImageGen foundation and the
large dossier. It never shrinks 250 entries into one view:

- a rarity tab selects one pool;
- only twelve identities render at once in a 4x3 selector grid;
- authored previous/next arrow images cycle pages;
- the page label reads `LIGHTS n / total`;
- arrows move sideways briefly on click and do not chase the pointer;
- selecting another rarity or page still routes through the existing selected
  identity state, so no duplicate persistence is required.

The dossier continues to show colour, rarity, flavour, light style, first
depth, Sign XP, material multiplier, and Engine charge.

## Wiring and health

`values/starIdentityExpansionV2.js` generates the additive metadata and exact
source-page plan. `values/starIdentityLibrary.js` remains the runtime SSOT.
Existing generic consumers required no duplicate branches: they resolve
identity atlas/frame/light data from the expanded library.

Focused checks guard:

- exactly 250 unique IDs, primary colours, and light styles;
- exact 60/50/50/40/30/20 rarity counts;
- V1 index stability and V2 endpoint IDs;
- all source/output hashes, dimensions, frame offsets, and alpha coverage;
- the 64 MiB decoded-art cap and byte storage capacity;
- deterministic within-rarity world selection;
- twelve-selector pagination with authored arrows;
- a newly appended Astral frame through the real pooled light renderer;
- mining, popup, release, Boot preload, and Star Atlas routes.

## Rollback

No V1 source or runtime atlas was overwritten. The narrow rollback restores
the V1 atlas definitions and base identity list in
`values/starIdentityLibrary.js`, removes the V2 expansion import, and leaves
the V2 package dormant for comparison.
