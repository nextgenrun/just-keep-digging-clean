# Arc Core Production v3 ImageGen Prompt Manifest

**Generated:** 2026-07-26  
**Generator:** built-in OpenAI ImageGen  
**Status:** machine and VFX roles approved for production

## Accepted dig effects

Reference the approved round Small Arc and cathedral-scale Omega Arc bodies.
Create one clean 2x2 atlas on solid chroma green with no text and no machine
bodies. Top-left: a compact twin-channel cyan bore beam with two parallel
energy lanes and restrained brass emitters. Top-right: a circular cyan and
gold fracture seal/impact burst. Bottom-left: an enormous eight-lane violet
and gold compression-lattice beam, architecturally distinct from the Small
Arc beam. Bottom-right: a square violet/gold grid-rupture seal. Use high-end
hand-painted dark-fantasy industrial game art, crisp silhouettes, controlled
glow, transparent-effect-ready edges, and readability at gameplay scale.

Accepted source:
`source/2026-07-26-arc-dig-vfx-atlas-v3-chroma.png`.

## Accepted 2026-07-28 impact replacements

Small prompt intent: create a compact cyan electrical rock fracture on chroma
green, with two readable bore channels, sharp mineral debris, transparent-ready
edges, and no machine, portal, ring, or UI silhouette.

Omega prompt intent: create a cathedral-scale obsidian wall rupture on chroma
green, driven by a violet eight-lane compression lattice, with fractured rock,
controlled gold sparks, transparent-ready edges, and no Arc machine duplicate.

Accepted sources:

- `source/2026-07-28-small-arc-impact-v4-chroma.png`
- `source/2026-07-28-small-arc-impact-v4-alpha.png`
- `source/2026-07-28-omega-arc-impact-v4-chroma.png`
- `source/2026-07-28-omega-arc-impact-v4-alpha.png`

Both replacements are centered on the fixed 512 x 512 anchor in
`piskel/arc-core-body-and-fx-v4.piskel` before runtime export.

## Accepted foundry stage

Reference the approved Arc bodies. Create a wide 16:9 underground Arc foundry
chamber with an open central gameplay area. Combine dark gothic rock,
blackened brass machinery, restrained cyan energy on the right, and violet
reactor light on the left. Keep the central silhouette quiet enough for both
Arc forms and effects to read. High-end hand-painted dark-fantasy industrial
game background, cinematic depth, no characters, UI, text, loose tiles, or
green screen.

Accepted source:
`source/2026-07-26-arc-stage-background-v3.png`.

## Rejected stage tiles

Reference the accepted foundry and Omega Arc art. Create a 2x2 atlas on solid
chroma green with four straight-on square gameplay tiles: rich layered dirt;
dark cyan-cracked slate; a blackened-steel and brass Arc floor plate; and
violet crystal bedrock restrained by gold reactor braces. Each tile must fill
its quadrant, tile cleanly at 94px, retain crisp readable material separation,
and match the high-end hand-painted foundry style. No UI, labels, perspective
floor scene, or characters.

This entire generated atlas was rejected as random tile art. It is not a game
world replacement and must not be restored to an active manifest. The source,
alpha derivative, runtime crops, Piskel project, and affected mockups are kept
under `archive/2026-07-26-rejected-arc-review-random-art/`.

## Processing and rejection record

Approved chroma sources were keyed to alpha, centered on fixed canvases,
packed into two editable `.piskel` projects, read back, pixel-hashed, and
exported to `runtime/`. The ornamental purple/gold HUD-border generation was
rejected in full. Its supplied screenshot is preserved at
`archive/2026-07-26-rejected-arc-review-random-art/attachments/`, but it is
absent from source, Piskel, runtime, and the active `.sprite` manifest. It must
not be restored or used as a style reference.
