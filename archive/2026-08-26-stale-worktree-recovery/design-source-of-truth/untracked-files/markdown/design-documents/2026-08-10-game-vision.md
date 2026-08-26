# Game vision

Status: **CANONICAL**  
Game: **Dig Game**  
Runtime: JavaScript + Phaser

## Product promise

Dig Game is a handcrafted risk-and-reward mining adventure. The player leaves
a memorable safe town, digs through an authored world, turns discoveries into
power, and repeatedly decides whether to press deeper or secure a route home.
The world should feel mysterious and generous without becoming mechanically
noisy or visually disposable.

The recommended experience is Hardcore because consequences make depth,
resources, light, Gem Power, hazards, and return routes matter. Casual keeps the
same world and progression for players who want exploration without run-ending
pressure.

## Experience priority

**First five minutes > first two hours > long tail.**

This is both a craft and commercial constraint. A player should understand the
fantasy, basic controls, first risk, first reward, and the promise of a larger
world before deciding whether to continue. Long-tail content must never be used
to excuse a confusing opening.

## Pillars

### 1. Learn by doing

The opening asks for six real actions—move, dig, fly, use the return gate, sell,
and resume—inside the production world. It does not award fake resources or
complete goals on behalf of the player. Guidance shows one current action and
one next promise.

### 2. Depth creates decisions

Deeper terrain yields stronger resources and stranger discoveries, but return
distance, darkness, stress, hazards, and Hardcore consequences rise with it.
Depth must change what the player considers, not only enemy health or numbers.

### 3. Home and the unknown reinforce each other

Town Square is readable, safe, and worth returning to. Portals, merchants,
Milestones, Star progression, Titans, caves, and Heavenblocks turn exploration
into lasting ownership and give the next descent a purpose.

### 4. Authored worlds, not placeholder abundance

Every major surface, biome, cave, landmark, character, HUD shell, and modal uses
approved authored bitmap art at safe density. Procedural selection may compose
the library, but it cannot turn the world into repetitive cards, giant props,
visible seams, or colored-square prototypes.

### 5. Consequence without betrayal

Hardcore must feel dangerous and legible. The player can see lives, stress, Gem
Power, and irreversible save rules before committing. A fall consumes the
documented protection. It never silently deletes the only evidence of a run.

### 6. Quiet confidence

Routine information belongs in the HUD, world markers, menus, and persistent
objective surfaces. Forced popups are reserved for choices with real
consequences. Lore requested by the player may use a focused dialog.

## Core loop

1. Choose a goal in Town or from the current Next Promise.
2. Prepare upgrades, light, route, and risk tolerance.
3. Dig and navigate through increasingly valuable terrain.
4. Read hazards and decide whether to continue or return.
5. Discover resources, caves, Titans, Stars, portals, or world systems.
6. Secure value through a route home, sell, upgrade, and choose the next goal.

Each loop should make at least one later decision richer. Pure spectacle can
support a decision, but cannot replace it.

## Modes

| Mode | Promise | Consequence |
|---|---|---|
| Casual | Relaxed persistent exploration with the full world and progression. | Zero GP disables abilities; the save remains playable. |
| Hardcore — recommended | Primary risk/reward experience. It arms when Flight unlocks. | First fall is free, then two lives; exhausted state is preserved. |
| One-Life Hardcore — hidden | Secret uncompromised challenge for players who deliberately discover it. | One life, no free revive; exhausted state is preserved. |

All modes share the authored game. Casual must not feel like a content-reduced
demo, and Hardcore must not rely on surprise deletion to create tension.

## Presentation standard

- Use Phaser-native scenes, images, sprites, bitmap-backed chrome, and text.
- Keep art at or below safe source density; stream large optional packages.
- Preserve recognizable silhouettes and physical grounding.
- Avoid visible DOM UI, emoji, generic gradient panels, and production
  placeholders when approved art exists.
- Motion supports state and contact. It must not change collision, damage,
  progression authority, or save outcomes.
- Audio should clarify material, danger, place, and feedback without masking
  important cues.

## What the game is not

- A June prototype with colored tiles and disconnected stubs.
- A tutorial slideshow or popup queue.
- A collection of impressive systems with no moment-to-moment choices.
- A roguelike that erases saves without explicit, pre-communicated rules.
- A visual asset dump where every generated image is shown at once.
- A linear content tour that removes the decision to return, prepare, or risk.

## Final-result test

The vision is succeeding when a new player can describe, without external help:

- how to move, dig, fly, interact, open inventory, and open the ESC menu;
- why the 15 m portal matters;
- what they gain by going deeper and what can make them turn back;
- the exact consequence of their selected mode;
- what they want to pursue in the next session.
