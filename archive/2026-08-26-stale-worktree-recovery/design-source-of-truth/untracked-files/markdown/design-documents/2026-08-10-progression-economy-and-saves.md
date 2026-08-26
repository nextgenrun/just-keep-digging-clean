# Progression, economy, and saves

Status: **CANONICAL**

## Progression promise

Progression turns real exploration into durable capability and better choices.
The player mines cargo, returns safely, sells, buys focused upgrades, opens
routes, and discovers persistent world systems. Rewards cannot be injected to
move a tutorial along or granted twice by presentation code.

## Economy

- Tiles produce real resource stacks through `DigSystem`.
- Money Monster converts carried cargo through the real merchant path.
- Wallet, inventory, upgrade ownership, resource totals, portal state, and
  discoveries persist in the selected slot.
- Depth increases yield/value pressure and resource composition. Material HP and
  rarity/yield remain separately tuned.
- Unstuck is a last resort in both modes: typed `YES`, 50% of every carried
  resource stack lost, ten-minute cooldown, wallet and permanent upgrades safe.
- Hardcore paid teleports quote and charge before moving the player.

## Staged progression

| Layer | Function |
|---|---|
| Tutorial route | Teaches Town, mine, Flight, portal, sale, and resume using production state. |
| Merchants and upgrades | Convert earnings into movement, mining, survival, and feature capability. |
| Depth Gates | Stop descent at 100 m, 300 m, and 1000 m until the player explicitly meets/accepts the rule. |
| Milestones | Reward depth achievements and create visible long-term home progression. |
| Stars / Starlight | Turn discoveries into persistent choice-driven talent progression. |
| Titan discoveries | Add clues, chambers, trophies, archive ownership, and world goals. |
| Deep Market and later systems | Widen the economy only after the player understands the base loop. |
| Heavenblocks | Extends progression upward through persistent gates, engines, relics, components, and vaults. |

Only one current action and one next promise should compete for attention. A
new unlock may reveal a route or menu entry without forcing a generic popup.

## Save modes

### Casual

- Persistent world with no lives counter.
- Zero GP disables GP-funded abilities but does not end or delete the run.
- Full authored content and progression remain available.

### Hardcore — recommended

- Selected permanently for the slot, or entered later through Bobo’s typed oath.
- Arms when Flight unlocks; before that, opening setup remains safe.
- Starts with a free-revive protection and two lives.
- First fall consumes only the free revive and leaves two lives.
- Second fall consumes one life and leaves one.
- Third fall consumes the final life and marks the run exhausted.
- Flight and torch stop at the one-GP reserve; stress, hazards, combat abilities,
  rocks, traps, Wurm damage, and other central death sources may consume it.

### One-Life Hardcore — hidden

- Chosen with Shift while confirming the selected Hardcore card.
- Arms on the same Flight boundary.
- One life, no free revive.
- First fall marks the run exhausted.

## Consequence table

| Mode/state before fall | Outcome | Slot state |
|---|---|---|
| Casual | No Hardcore death transaction. | Playable and preserved. |
| Hardcore + free revive | Revive at safe state; free protection removed; two lives remain. | Playable and saved. |
| Hardcore + two lives | Revive at safe state; one life remains. | Playable and saved. |
| Hardcore + one life | Final record/memorial; run becomes exhausted. | Preserved, not playable until explicitly cleared. |
| One-Life + one life | Final record/memorial; run becomes exhausted. | Preserved, not playable until explicitly cleared. |

Automatic slot deletion is forbidden. An exhausted slot routes to an explicit
clear confirmation from the save menu. Run memorials remain append-only outside
the slot and survive a later explicit clear.

## Backup and transfer policy

- Casual saves may use normal export, import, and rotating-backup recovery.
- Hardcore creates durability backups/checkpoints, but they are **OATH LOCKED**:
  they cannot rewind a live risk outcome.
- Hardcore external export/import is refused because editable rollback files
  would bypass the chosen oath.
- Legacy permanent-death purge APIs remain isolated compatibility/safety code;
  the active GP-death path never calls them.
- A failed save must be reported. It must not silently pretend an outcome was
  secured or resurrect an earlier remote copy over a newer local state.

## Persistence contract

Current saves normalize through schema v14 and Hardcore data v4. Persistence
includes exact valid body position, facing, fractional GP, tutorial state,
mode/lives/exhaustion, inventory, wallet, upgrades, world identity and changes,
portal/discovery state, hazards with durable state, and relevant progression.

Rules:

1. Normalize old payloads before systems consume them.
2. Missing new fields receive conservative defaults; old Hardcore v3 saves
   migrate to standard Hardcore with free revive plus two lives.
3. Existing saves never re-enter new-save decisions.
4. Routine writes use the serialized debounce/idle queue; lifecycle exits force
   a fresh save.
5. Main-menu transition awaits the save queue.
6. Exact world/player state wins over fallback spawn when valid.
7. A feature may request a save but cannot create an independent shadow format.

## Balance direction

Hardcore still needs continued pressure tuning, but pressure must come from
legible gameplay—depth, stress, light, travel, resource exposure, hazards, and
return planning—not hidden timers or surprise deletion. Do not change the life
model, GP reserve, or combo-decay timing as an incidental balance adjustment.
