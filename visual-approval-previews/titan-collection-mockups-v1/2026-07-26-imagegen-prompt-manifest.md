# Titan Collection Mockups v1 — ImageGen Prompt Manifest

`reviewOnly: true`  
`productionChanged: false`  
`generationMode: built-in ImageGen`

## Shared Direction

- Preserve current UNDERSTAR scenic-v2 framing, darkness, terrain authority,
  UI language, and player scale.
- Underground titans are harmless distant scenery, not bosses.
- Surface miniatures and archive entries are purely visual.
- No rewards, stats, currency, loot, combat UI, or claim interactions.
- Motion is slow and ambient rather than attention-demanding.

## 01 — Massive Titan Reveal

Output:
`2026-07-26-01-massive-titan-reveal-v1.png`

Inputs:

1. Weathered Roots Root Cathedral gameplay mockup — base composition and
   scenic environment.
2. `sprites/backgrounds/titan-discoveries-v1/01-mossback-wanderer.png` —
   creature-design reference.
3. `sources/2026-07-26-current-underground-reference.png` — current darkness,
   terrain, and HUD reference.

Prompt:

```text
Use case: compositing
Asset type: review-only 16:9 Phaser gameplay mockup
Primary request: Show the exact visual moment when the player finishes digging
every block in a huge hidden titan chamber and reveals the Mossback Wanderer.
This titan must feel colossal, not like a collectible icon: approximately 18
game tiles wide and 11 game tiles tall, filling most of the distant chamber
while the miner remains tiny for scale.
Scene/backdrop: Give this titan its own unique environmental stage: an ancient
root amphitheater shaped around its sleeping body, immense woven roots cradling
its shell, compacted-earth strata, a few tiny amber lantern remnants, deep teal
recesses, and sparse falling grit. The backdrop must clearly belong to this
titan and remain visually behind the mine tiles.
Composition/framing: Preserve a real side-view gameplay screenshot. The player
has cleared a broad irregular rectangular reveal window spanning many visible
blocks. Keep thick authoritative terrain and individual square block edges
around the opening, with several foreground blocks still occluding the titan's
legs, shell edges, and tail. The titan extends beyond the opening and behind
the surrounding facade. Keep the player very small in the foreground.
Unlock visual: Capture the peak reveal instant with a restrained cyan-green rim
glow tracing the titan, three enormous faint expanding circular light rings
behind it, a brief pulse traveling through nearby roots, drifting luminous
dust, and falling grit. The titan itself only makes a slow head lift and
breathing motion, implied through one subtle translucent motion echo.
Style/medium: polished cinematic painterly realism matching UNDERSTAR's current
scenic-v2 game art, tactile soil and roots, high contrast, readable at gameplay
scale.
Lighting/mood: hard-black unexplored edges, warm player torch pool, cool teal
titan glow, ancient wonder and awe.
Constraints: preserve the existing HUD language and framing; no new text; no
titan nameplate; no health bar; no boss arena; no combat pose; no loot; no
reward popup; no traversal platforms in the backdrop; no watermark. The titan
is harmless distant living scenery and the effect is purely visual.
```

## 02 — ESC Titan Archive

Output:
`2026-07-26-02-esc-titan-archive-v1.png`

Inputs:

1. `sources/2026-07-26-current-esc-menu-reference.png` — authoritative pause
   panel frame and layout.
2. `ai-tools/2026-07-26-titan-runtime-contact-sheet.png` — exact 25 titan
   designs.
3. Massive Titan Reveal mockup — selected environmental vignette reference.

Prompt:

```text
Use case: ui-mockup
Asset type: shippable-looking review-only 16:9 game UI mockup
Primary request: Redesign only the inner content of the current ESC pause panel
to show a new selected TITANS tab: an explorable visual collection of 25
colossal cave titans with a lore detail view. It must feel native to the
existing UNDERSTAR pause UI.
Layout: Preserve the outer PAUSED header, close button, dark navy/slate panels,
thin antique-gold borders, and compact uppercase tab styling. The top row must
read exactly: "GENERAL", "STATS", "TITANS", "SETTINGS", with TITANS visibly
selected.
Main content: In the left 56 percent, show a clean 5 by 5 grid of 25 recessed
square titan slots. Seven discovered slots contain small full-body colored
silhouettes with faint individual glow and a tiny biome-color underline. The
other eighteen slots are tasteful nearly-black embossed silhouettes with a
small lock rune, not question marks. The selected first slot has a brighter
cyan-gold outline.
Right detail panel: Show a large living vignette of the Mossback Wanderer,
framed inside its root-cathedral background. Suggest subtle movement with
softly drifting dust, a few glowing root motes, and one extremely faint
displaced motion echo behind the head; do not use arrows or animation diagrams.
Text (verbatim): "TITAN ARCHIVE"; "7 / 25 DISCOVERED";
"MOSSBACK WANDERER"; "FOUND • WEATHERED ROOTS"; and the two-line lore:
"Older than the first tunnel, it carries a sleeping forest through the roots."
Hierarchy: title and discovery count at top, grid left, selected visual and lore
right. Keep text large enough to read at 1280 by 720 gameplay resolution.
Style/medium: polished practical Phaser game interface, ornate but restrained,
tactile metal and slate, existing gold/cyan accents.
Constraints: no rewards, no stat bonuses, no currency, no progress XP, no
combat rating, no boss health, no claim button, no extra tabs, no watermark.
This is purely visual collection and lore.
```

## 03 — Surface Titan Walk

Output:
`2026-07-26-03-surface-titan-walk-v1.png`

Inputs:

1. `sources/2026-07-26-current-town-reference.png` — current town art, player
   scale, HUD, cobbles, lighting, and forest skyline.
2. `ai-tools/2026-07-26-titan-runtime-contact-sheet.png` — exact titan
   miniatures and color families.

Prompt:

```text
Use case: compositing
Asset type: review-only 16:9 Phaser town gameplay mockup
Primary request: Show what the physical TITAN COLLECTION looks like on the
surface in town: a beautiful explorable open-air Titan Walk displaying smaller
living versions of discovered titans, with an interact point that opens the
Titan Archive UI.
Scene/backdrop: A quiet town-edge clearing directly connected to the existing
cobbled street, under the same blue night forest and timber lanterns. Build a
low, long crescent memorial from dark slate, ancient roots, brass trim, and five
subtly different biome sections. It should feel like part of the town, not a
shop or separate magical dimension.
Physical collection: Arrange 25 clearly readable collection positions as five
groups of five along the crescent. Seven discovered positions contain small
full-body living titan miniatures, each roughly 0.7 to 1.4 times the player's
height depending on body shape. They stand or hover just above low rune plinths
and remain non-collidable visual projections. The other eighteen positions are
dormant dark stone silhouettes or empty rune impressions with only a faint
ember.
Motion language: Suggest gentle ongoing movement using extremely subtle
translucent pose echoes, drifting motes, slow breathing, a tiny head turn, wing
shimmer, tail sway, or floating bob depending on the creature. Each discovered
miniature has a soft localized glow matching its biome color.
Composition/framing: Side-view gameplay screen with the miner standing near the
center foreground for scale. Keep the authoritative cobbled ground, current
HUD, backpack, dark forest skyline, and torch-lit atmosphere. The collection
spans most of the midground horizontally but stays below the skyline.
Text (verbatim): "[E] TITAN ARCHIVE" and "7 / 25".
Style/medium: polished cinematic painterly game art matching current UNDERSTAR
scenic-v2 town assets, practical at 1280 by 720, readable silhouettes,
restrained antique-gold and cyan ornament.
Constraints: no NPC merchant, no currency, no reward chest, no loot, no stats,
no trophy room interior, no giant underground titan here, no combat pose, no
health bars, no additional UI panels, no watermark. The surface miniatures are
purely visual and smaller than their underground originals.
```

## 04 — Five Titan Background Families

Output:
`2026-07-26-04-five-titan-background-families-v1.png`

Input:

1. `ai-tools/2026-07-26-titan-runtime-contact-sheet.png` — exact titan designs.

Prompt:

```text
Use case: stylized-concept
Asset type: review-only five-scene game environment direction sheet
Primary request: Create a polished 16:9 comparison board proving that every
titan gets its own massive authored background chamber, not one reused cave
with palette swaps. Show five representative titans as colossal distant living
scenery, each filling an environment and spanning many foreground mine blocks.
Layout: Five large cinematic side-view gameplay panels in a clean 3-over-2
arrangement. Every panel includes the same tiny miner and chunky square
foreground mine blocks for unmistakable scale. Each titan is approximately
15 to 22 blocks wide and 8 to 13 blocks tall, partly occluded by solid
foreground tile silhouettes.
Panel 1: "MOSSBACK WANDERER — ROOT CATHEDRAL". Use titan 01. Environment:
immense woven-root amphitheater, compacted soil strata, damp teal recesses,
ancient lantern remnants, breathing roots.
Panel 2: "CATHEDRAL STAG — AMBER SANCTUM". Use titan 09. Environment: vaulted
fossil ribs and translucent amber-resin columns shaped around its antlers, slow
drifting pollen, warm honey light.
Panel 3: "MIRROR RAY — SILVER TIDE VAULT". Use titan 12. Environment: flooded
mirror cavern behind the blocks, vertical silver-vein curtains, inverted
reflections, slow gliding light caustics.
Panel 4: "FURNACE DRAKE — EMBER FORGE". Use titan 17. Environment: ruined
furnace nave and suspended chains, basalt ribs, thin lava fractures, restrained
slow ember exhale.
Panel 5: "STAR EATER — STARFIRE RIFT". Use titan 23. Environment: impossible
blackglass void window, ancient orrery rings, tiny star particles bending
toward the creature, subtle violet spatial ripples.
Style/medium: cinematic painterly realism matching a premium dark 2D mining
game, tactile materials, high contrast, readable gameplay silhouettes,
localized emissive accents only.
Motion language: Each scene implies one slow ambient loop through a faint
secondary pose echo or environmental trail: breathing roots, antler sway, ray
drift, wing settling, or spatial ripple.
Constraints: five genuinely different environmental compositions, not palette
filters; no boss arenas; no health bars; no combat; no loot; no platforms or
doors suggesting background traversal; no reward UI; no watermark. Labels
should be small, clean, and rendered exactly once with no extra text.
```
