# Player journey

Status: **CANONICAL**

## New-save decision flow

The sequence is fixed:

1. Select an empty save slot.
2. Choose whether to play the tutorial.
3. If **No**, show a second confirmation and require the exact typed word
   `YES`; Escape returns to the tutorial choice.
4. Choose save rules. Hardcore is selected by default and labelled recommended;
   Casual remains equally reachable.
5. Load the selected character and current authored world.

Existing saves bypass tutorial and mode questions and use persisted state.
Cancelling mode selection returns to tutorial choice instead of creating a
partial save.

The hidden One-Life Hardcore path is **Shift + Enter** or **Shift + Space**
while confirming the selected Hardcore card. It is intentionally not drawn as
a third visible card.

## Guided first five minutes — LIVE

The player spawns in Town Square. During every active tutorial stage, the x66
doorway is repaired with unbreakable Bedrock so the player cannot accidentally
leave the lesson space. Progress comes only from real production actions.

| Stage | Player action | Completion promise |
|---|---|---|
| 1. Move | Travel at least two tiles using A/D or arrows. | Movement and facing feel immediate. |
| 2. Dig | Break the marked normal-HP Dirt block at x12. | Mining uses the real tile, damage, and reward path. |
| 3. Flight | Hold Shift and lift off after Flight training is granted. | Flight is local recovery, not long-distance travel. |
| 4. Return gate | Descend the starter route and interact with the guaranteed portal at x12, 15 m. | Portals are permanent long-distance return routes. |
| 5. Sell | Return to Money Monster and sell a real carried stack. | Cargo becomes spendable value through the real economy. |
| 6. Resume | Use the surface gate, enter its paired sky gate, and resume at 15 m. | A completed loop naturally leads back underground. |

After completion, the barrier and tutorial markers disappear, the learned state
persists, and the HUD changes from a current lesson to the next meaningful goal.

The tutorial does not inject a wallet, fake a sale, bypass an upgrade, or mark a
stage complete because a timer expired.

## Skipped first five minutes — LIVE

Skipping removes guided objectives and containment after the typed confirmation.
It does not remove safety or core capability:

- Flight is unlocked.
- The x12, 15 m portal is guaranteed and repaired if missing.
- Normal Town, merchants, inventory, HUD, and controls remain available.
- The player owns the consequences of discovering the loop without scripted
  steps, but is never placed in an obsolete demo world.

## Guidance policy

- Show one current action and one Next Promise.
- Keep routine help in a persistent objective surface or world marker.
- Use the player’s current remapped key labels in instructional copy.
- Never re-show completed tutorial stages on reload.
- Never let an input that opened one decision also accept the next decision in
  the same frame.
- A requested lore interaction may open a focused dialog; routine discovery,
  level, combo, or Star information must not force one.

### Ghost tutorial player — TARGET

An authored ghost demonstration may be added only after it proves clearer than
the existing marker and copy. It needs approved character art, exact grounding,
deterministic containment, input-independent playback, and a strict admission
rule so it appears only when the player is genuinely stuck. It must never roam,
collide, mine authoritative tiles, or become another popup source.

The raw draft’s fixed 20-second ghost and extra ten-second Flight popup are not
live. They remain target hypotheses, not implementation facts.

## First two hours

The opening should widen in layers, not all at once:

1. Learn the Town–mine–return–sell loop.
2. Buy a first meaningful upgrade from real earnings.
3. Meet the first Depth Gate and understand that preparation controls access.
4. Encounter stronger resource composition and a new environmental risk.
5. Discover at least one authored side promise: cave, Titan clue, Milestone,
   Star progression, merchant unlock, or surface landmark.
6. Return with a specific next-session goal.

No fixed timer should force this order. Gates, depth, resources, and player
choices stage the systems naturally.

## Returning player journey

- Save-slot dossiers expose mode, exhaustion state, progress, and safe actions.
- Loading restores exact valid body position, facing, GP, progression, tutorial
  state, and world changes.
- The current objective/Next Promise resumes without a recap popup queue.
- Main-menu exit waits for the serialized save path before shutting down.
- An exhausted Hardcore slot remains inspectable until the player explicitly
  clears it.

## Acceptance criteria

- A fresh player reaches and uses the 15 m portal in the production world.
- Tutorial completion requires all six real actions and survives reload.
- Typed skip cannot be confirmed with an empty or partial word.
- All new-save choices survive WorldLoad retry.
- Existing saves receive no new-save prompts.
- No active route loads the obsolete tutorial, old textures, or prototype world.
