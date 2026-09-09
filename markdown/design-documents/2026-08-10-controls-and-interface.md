# Controls and interface

Status: canonical interaction contract

## Control principles

- Basic actions have a clear primary binding and a natural fixed alias.
- User-remappable bindings remain authoritative; fixed aliases are safety and
  accessibility additions, not duplicate settings rows.
- Control hints read live labels from `UserSettings` whenever the action is
  remappable.
- Space performs one fixed, non-variable jump exactly 1.2 tiles high. Jump
  and Dig are separate remappable actions; holding Jump does not repeat it.
- Flight is momentum-based: Shift powers it, A/D steer horizontally, and W/S
  accelerate or brake upward/downward movement.
- Pointer controls expose important menus without requiring keyboard knowledge.
- An overlay consumes input before gameplay. Closing the top overlay never also
  triggers mining, movement, or another menu.

## Default controls

| Action | Primary | Fixed alias / pointer | Notes |
|---|---|---|---|
| Move / aim left | A | Left Arrow | Horizontal movement and directional aim |
| Move / aim right | D | Right Arrow | Horizontal movement and directional aim |
| Aim up | W | Up Arrow | Used by directional mining and abilities |
| Aim down / controlled descent | S | Down Arrow | Shift + Down descends during Flight |
| Dig | F | none | Hold on an adjacent authoritative target |
| Jump | Space | remappable | One fixed 1.2-tile jump per press; no GP cost |
| Flight | Shift | none | Momentum-based; steer with A/D and accelerate/brake with W/S; requires Flight unlock |
| Interact | E | contextual prompt | NPCs, portals, gates, campfires, pillars, cave mouths |
| Inventory | I | approved inventory-bag HUD button | Opens the same inventory authority |
| Pause / controls / settings | Esc | approved `ESC MENU` HUD chip | Esc always remains a safety close key |
| World map | M | map overlay UI | Discovery and activity markers |
| Quick Slash | Q | remappable | Only shown as available when unlocked |
| Thunder Strike | C | remappable | Only shown as available when unlocked |
| Torch | T | remappable | GP cost and range use upgrade values |
| Celestial Engine | X | remappable | Only after Star Heart attunement |
| Arc Core board/exit | B | remappable | Hidden while Arc Core feature is gated |
| Resolve death / return | R | Enter on death surface | Works in death flow outside debug mode |
| Music / SFX | U / N | approved HUD audio buttons | Persisted settings |

Inventory and ESC targets passed 1280×720 pointer routing with exact hit
dimensions on 2026-08-11. The 2026-09-04 documentation correction aligns Space
with the existing Jump action. Run `testing/2026-08-20-player-jump-flight-motion-contract.mjs`
after movement/input changes; ALIGN-006 retains the remaining browser checks.

## Teaching controls

The opening teaches one control relationship at a time:

1. Move or look toward the starter shaft.
2. Aim down.
3. Hold Dig.
4. Hold Flight to ascend and steer horizontally.
5. Use Interact on the guaranteed portal.
6. Open Inventory or Pause only when the player requests more detail.

The Town Square tutorial's world marker and single Next Promise own current
teaching. A ghost demonstrator remains a conditional target, not a requirement
to stack alongside successful guidance.

## HUD interaction rules

- The inventory bag and ESC Menu chip use approved bitmap frames and live text.
- Invisible Phaser zones or hit areas may provide interaction plumbing; they
  must not become visible placeholder rectangles.
- Hover may tint or gently brighten an existing bitmap. Avoid competing pulses.
- The Inventory button acts only while playing. The ESC Menu chip closes an open
  Inventory first, resumes an existing pause, or opens Pause while playing.
- Mode and lives must be visible at new-run choice, save selection, and failure.
  A persistent Hardcore lives chip is a **TARGET** only if playtests show those
  surfaces are insufficient; do not add permanent HUD noise pre-emptively.

## Overlay priority

Highest priority closes first:

1. key-capture or destructive confirmation;
2. level-up choice;
3. shop/campfire/milestone/pillar interaction;
4. Inventory or Map;
5. Pause and Settings;
6. gameplay.

Routine level, discovery, objective, and return information uses bounded
notifications or the next-promise HUD. Lore or collection detail opens only on
player request.

## Accessibility and settings

- Keyboard rebinding covers gameplay, menus, audio, abilities, and supported
  system actions.
- Esc cannot be removed as the emergency close path.
- Floating feedback offers Full, Reduced, and Off; gameplay authority is
  unchanged by the choice.
- Reduced motion must shorten or remove decorative transit/pulse motion without
  shortening gameplay telegraphs.
- Renderer density and visual rollback flags may change presentation, never
  collision, mining, rewards, or saves.
- Every critical tutorial action must be understandable without relying only on
  color, sound, or an emoji.

## Interface definition of done

An interaction is shipped only when keyboard, pointer, focus/close behavior,
overlay input consumption, 1280x720 layout, approved-art visibility, and scene
cleanup all pass. Text presence in source does not prove that a button is
clickable or visually readable.
