# Titan Surface Stances v1 — ImageGen Prompt Manifest

`generationMode: built-in ImageGen`  
`reviewOnly: false`  
`productionChanged: true`

One independent built-in ImageGen call produced each Titan stance. Every call
used the matching compact 256x256 Titan as **Image 1: authoritative silhouette
and material reference** and its matching high-resolution chamber card as
**Image 2: authoritative identity and detail reference**.

## Shared production prompt

```text
Use case: stylized-concept
Asset type: production 2D Phaser surface-gallery Titan cutout
Primary request: Create a new individual surface-unlock display stance while
preserving the exact creature identity from both references. Do not copy the
compact atlas pose or underground chamber composition.
Style/medium: polished cinematic painterly realism matching premium UNDERSTAR
scenic-v2 2D art; crisp game-readable silhouette, tactile geological materials,
and controlled localized emissive detail.
Composition/framing: isolated complete creature in a three-quarter side
presentation; every defining extremity inside frame; generous even padding;
grounded visual baseline but no floor or shadow.
Backdrop: one flat chroma-key color for local alpha removal.
Constraints: creature only; no player, combat pose, generic redesign, scenery,
props, plinth, pedestal, floor, shadow, particles, UI, text, frame, logo, or
watermark.
```

## Individual pose set

| # | Titan | Surface stance |
|---:|---|---|
| 01 | Mossback Wanderer | Head-lifted guardian walk with one advancing forefoot and full root canopy |
| 02 | Bellhorn Grazer | Planted resonant stance with raised, unobscured bell horns |
| 03 | Lantern Jaw | Banking hover with open lantern jaw, spread fins, and curled tail |
| 04 | Archwalker | Measured bridge-step with one arched leg lifted |
| 05 | Shale Mother | Protective outward brace with crystal ridges fanned |
| 06 | Ribbon Wyrm | Upright S-curve with layered jaw ribbons |
| 07 | Crowned Mole | Raised-claw quarry stance with exposed crystal crown |
| 08 | Hammerhead Pilgrim | Solemn forward stride with level hammer head |
| 09 | Cathedral Stag | Regal turn with one raised hoof and full antler spread |
| 10 | Hollowback Bear | Slow rising step exposing the hollow back ridge |
| 11 | Silver Strider | Precision crossing stride with open four-leg negative space |
| 12 | Mirror Ray | Banking glide with opposed horn-wing arcs |
| 13 | Needlecrown | Listening step with the complete backward needle fan |
| 14 | Moon Shell | Lunar turn presenting the spiral shell and both feelers |
| 15 | Veilwing | Asymmetric four-wing ceremonial hover |
| 16 | Ember Tusk | Stately mammoth step with separated tusks |
| 17 | Furnace Drake | Calm half-open wing mantle with curled tail |
| 18 | Ash Colossus | Asymmetric knuckle-planted sentinel lean |
| 19 | Magma Whale | Rising bank with spread fins and an open tail curve |
| 20 | Cinder Centipede | Upright heraldic S with visible staggered leg rhythm |
| 21 | Obsidian Sleeper | Waking crescent with lifted head and extended forelimb |
| 22 | Rift Heron | Folded-leg poised S with lowered beak |
| 23 | Star Eater | Open cosmic spiral with a majestic jaw display |
| 24 | Deep Crown | Regal border-march with lifted foreleg and curled tail |
| 25 | Worldroot Titan | Asymmetric rooted stride with one branch-arm raised |

The built-in ImageGen outputs were retained as dated chroma masters under
`sources/`, converted with the installed ImageGen chroma-removal helper, and
then normalized into transparent 768x768 runtime WebPs by
`ai-tools/2026-07-28-build-titan-surface-stances-v1.py`.
