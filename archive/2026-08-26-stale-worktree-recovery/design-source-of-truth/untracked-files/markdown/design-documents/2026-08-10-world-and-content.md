# World and content

Status: **CANONICAL**

## World promise

The world is one continuous authored mining adventure connected by persistent
routes. Town, surface, depth, compact caves, Titan spaces, sky islands, and
Heavenblocks are parts of the same save—not unrelated demos selected by the
launcher.

## Topology

| Region | Role | Current production identity |
|---|---|---|
| Town Square / Level 1 | Safe home, onboarding, selling, merchant identity, Milestone and return infrastructure. | Authored Town backdrop, facades, grounded NPCs, protected tutorial space, portal access. |
| Level 2 surface | Wider authored horizon and exploration chapter. | Continuous edge, sparse modular props, seven hero landmarks, protected portal/Titan footprints. |
| Main descent | Core mining, economy, danger, and discovery curve. | Ten-biome authored scenic/terrain/detail library with depth-driven resources, light, hazards, gates, and streaming. |
| Compact caves | Optional concentrated excursions. | Six identity routes, real mineable terrain and rewards, one continuous authored interior per cave, correct left entrance. |
| Titan spaces | Major discoveries and long-term collection. | Twenty-five unique Titan identities, clues, footprints, chambers, grounding, trophies, and archive pages. |
| Sky routes and islands | Portal travel and vertical contrast. | Paired portal destinations, authored sky composition, protected transit. |
| Heavenblocks | Persistent upward endgame world. | Native world model, gates, engines, relic projection, transit, components, vaults, and staged presentation. |

## Opening geography

- The new player begins inside Town Square, never in the rejected shaft/demo
  spawn.
- Guided tutorial stages repair the Bedrock doorway at x66. The barrier restores
  any changed cells while active and relinquishes them on completion or skip.
- The practice site is x12 and contains one normal-HP Dirt block. The raw draft’s
  contradictory “3 / 2 Dirt plus Copper” note is archived and not canonical.
- Every new route—Tutorial, Skip, Casual, Hardcore, or One-Life—has a portal at
  x12 and exactly 15 m below the configured surface air rows.
- The portal system repairs that tile if generation or a legacy save omits it.

## Surface composition

Surface art must read as a deliberate place at gameplay scale. Props are sparse,
physically grounded, and suppressed around Town navigation, portals, Titans,
drop routes, and tutorial markers. Hero landmarks establish chapters without
turning the surface into a wall of generated images.

Level 1 merchant facades and start chunks may preload. Remaining facade chunks,
optional feature packages, and large scenic assets stream as the camera needs
them. The player must not wait for the full art library before entering Town.

## Underground composition

- Biome selection follows depth and stable world identity.
- Backdrops form broad coherent areas; terrain plates, structures, details, and
  enhancers reinforce the same material family.
- Neighboring cards use complementary overlap/masks so joins do not reveal the
  viewport or a repeating grid.
- Mineable typed-array terrain remains gameplay authority. Scenic art is
  masked/grounded against it and never creates hidden collision.
- Resource value and material HP rise independently; deeper does not simply
  mean every tile is a larger health bar.
- Streaming preserves full-quality authored sources within memory bounds and
  releases obsolete optional packages safely.

## Caves

A cave is one readable interior, not a repeated panorama strip or giant Meshy
shell prop. Its entrance remains on the left, ordinary Dirt/Stone rows remain
mineable, and material runs avoid checkerboard noise. Main-world resources,
movement, abilities, hazards, and save handoff remain authoritative inside the
compact controller.

## Titans

All twenty-five Titan identities must be discoverable through world evidence,
not a developer list. Nearby resonance is brief and directional; purchased
clues provide exact help without auto-collecting the discovery. Underground
stances ground to current terrain, chambers stream only when relevant, and the
archive preserves readable portraits and lore after discovery.

## Heavenblocks

Heavenblocks is a persistent upward world with its own topology, not a visual
overlay on the main mine. Gates, engines, relics, components, vaults, and transit
write to stable state and return the player through explicit routes. Presentation
may stage-load, but gameplay authority cannot depend on optional visual review
assets.

## Art and texture contract

- Production assets are approved authored rasters, spritesheets, atlases, and
  videos registered through values manifests.
- Preserve native aspect ratio and display at safe source density.
- Review boards, prompts, source chroma, Piskel/Blender projects, alpha masters,
  and rejected variants are tooling or archive inputs—not Boot assets.
- Prefer a small authored motif over showing the whole library simultaneously.
- Do not mirror assets whose light, text, geography, or silhouette is authored.
- Missing production art fails visibly in development; it must not silently fall
  back to colored squares, emoji, visible DOM, or generic cards.
- Query rollbacks restore a known prior production layer, never the obsolete
  demo renderer.

## Content placement tests

Every new landmark or feature must prove:

1. No overlap with Town, portal, Titan, tutorial, gate, cave entrance, or player
   spawn safety footprints.
2. Correct physical scale, terrain contact, and draw depth.
3. Deterministic placement for a stable world identity.
4. No collision or reward authority in the visual layer.
5. Conditional preload/streaming and complete cleanup.
6. A real browser view at gameplay zoom, not only a contact sheet.

## Remaining target

The optional ghost tutorial player is **TARGET**, not world content yet. It may
be admitted only as a deterministic, non-colliding demonstration actor with
approved art and measured usability benefit.
