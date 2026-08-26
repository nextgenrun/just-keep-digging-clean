# Controls and interface

Status: **CANONICAL**

## Input principle

Basic actions use natural fixed aliases in addition to remappable primary keys.
A player should not need the Settings screen to discover movement, digging,
inventory, or pause. Remapping may add a preferred key but cannot remove the
fixed accessibility/safety aliases listed below.

## Gameplay controls

| Action | Default/remappable key | Fixed or additional input | Rule |
|---|---|---|---|
| Move / aim left | A | Left Arrow | Both paths are always active. |
| Move / aim right | D | Right Arrow | Both paths are always active. |
| Aim up | W | Up Arrow | Aims mining and abilities upward. |
| Aim down / surface drop | S | Down Arrow | Drop uses the same downward intent. |
| Dig | F | Space; adjacent primary mouse click | Hold behavior and target stability match the main dig path. |
| Flight | Shift | Remappable primary binding | Hold to fly while unlocked and funded by GP. |
| Interact | E | Remappable primary binding | Talks, uses gates, boards, pillars, campfires, and special tiles. |
| Quickslash | Q | Remappable primary binding | Only acts after unlock. |
| Thunderstrike | C | Remappable primary binding | Only acts after unlock. |
| Torch | T | Remappable primary binding | Uses the current light rules. |
| Board / exit Arc Core | B | Remappable primary binding | Contextual vehicle action. |

Mouse digging is adjacent and line-safe. It cannot reach through the player,
mine at range, or override a fresh arrow-key aim. Arrow input immediately
returns aim ownership to the keyboard.

## Menus and utility controls

| Surface | Keyboard | Pointer | Required behavior |
|---|---|---|---|
| Inventory | I by default | Click the existing Inventory HUD affordance | Opens/closes the same inventory instance. |
| Pause / ESC menu | ESC by default; hard ESC remains a close key | Click `ESC MENU` in the HUD | Opens Pause; when Inventory is topmost it closes Inventory first. |
| World map | M by default | Menu route where available | Uses one shared map state. |
| Settings / Controls | ESC menu | Click its tab/action | Shows current bindings and remapping. |
| Fullscreen | F10 | Settings route where available | Fixed browser-safe key. |

The HUD’s `ESC MENU` affordance uses approved bitmap chrome, dynamic Phaser
text, and an invisible pointer hit region. It is not a visible HTML button or a
new generic panel.

## Modal priority

Only the topmost interaction layer owns input:

1. Typed consequence modal or death recap.
2. Focused lore, merchant, gate, settings, or inventory view.
3. Pause menu.
4. World interaction.
5. Movement/mining.

Escape closes the topmost closable view. The same key press must not close one
view and reopen Pause underneath it. Pointer-down on UI cancels held mouse dig
before world input can consume the event.

## Prompt rules

- Display the player’s active remapped key label in normal tutorial copy.
- Use fixed-alias wording only when explaining that an alias is guaranteed.
- Consequences requiring typed confirmation accept an exact normalized word;
  clicking alone is insufficient.
- Attach decision-overlay keyboard listeners on the next scene tick so Enter or
  Space cannot cascade through two choices.
- Routine information never pauses the game.
- Use concise verbs: Move, Dig, Fly, Interact, Sell, Return, Resume.

## Interface composition

- Production chrome is approved authored bitmap art plus Phaser text.
- Dynamic data—money, GP, resources, lives, stress, depth, slot state—remains
  readable text and is not baked into art.
- Every pointer action has a keyboard route; every critical keyboard menu has a
  visible pointer affordance.
- UI remains inside the 1280×720 safe-area contract and reflows on resize.
- Hover, selected, disabled, warning, and exhausted states must be visually
  distinct without relying only on hue.
- No emoji, visible DOM overlays, generic placeholder cards, or cheap CSS
  substitutes may enter the production canvas.

## Current acceptance checks

- Arrows and WASD move/aim in the main world and compact caves.
- Space and F enter the stable mining path and Living Drill path.
- Pointer inventory and `ESC MENU` routes work without a double-open race.
- Escape routing preserves topmost-modal ownership.
- Tutorial prompt labels follow remapped keys while fixed aliases remain active.
