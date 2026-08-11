# Progression, economy, and saves

Status: canonical ownership and final-game progression rules

## Progression philosophy

Progression must shorten a known pain, open a new route, or create a new
decision. The player should feel stronger during the next expedition, not only
see a larger account total.

The economy uses one cargo ledger, one money balance, and one upgrade authority.
Collection systems may display those facts but may not duplicate them.

## Resource ladder

| Layer | Resources | Current role |
|---|---|---|
| Starter | Dirt, Stone, Copper | First cargo, cache resources, early gear/economy |
| Level One advanced | Dark Dirt, Hard Dark Dirt, Steel, Iron, Bronze, Silver, Gold | Deeper value, gear recipes, milestone-era progression |
| Level Two | Lava Dirt, Obsidian, Ember Ore, Magma Crystal | Distinct gated continuation economy |

Exact tile mappings and zero totals live in `values/resourceTypes.js`. Resource
counts are non-negative integers. A missing/unknown imported field sanitizes to
zero and does not become a new resource implicitly.

## Cargo, selling, and money

Mining deposits directly into the authoritative `DigSystem` resource totals.
Town selling converts selected/all supported cargo through merchant pricing and
economy upgrades into `UpgradeSystem` money (`M`). Inventory and resource bars
render the same totals.

Economy upgrades include starter-resource prices, later-resource prices, market
bonus, lucky sales, and Sell All access. These increase return value; they must
not bypass actual cargo ownership or create a second wallet.

Target pacing: a first useful upgrade follows the first complete return without
requiring grind; later upgrades ask the player to choose among safer Flight,
faster mining, stronger mining, ability access, gear, or better sale value.

## Gem Power and Flight

- The Flight Artifact permanently grants `gemPowerUnlock`.
- Guided opening ascent is protected and followed by a 30-second bank that
  pauses while the player is not flying.
- The guided cache currently grants one Gem Power Tank level (+40 capacity).
- Skip grants Flight only; it receives no bank or cache/tank reward.
- Normal Flight consumes GP and grounded recovery refills it according to player
  ability and upgrade values.
- GP also funds torch and supported abilities/hazards. A shared bar must reflect
  the same ability state.

Flight upgrades cover tank capacity, efficiency, regeneration, and speed. GP
must remain a route/risk budget rather than an arbitrary stamina tax.

## Player level and milestone growth

Mining and special XP blocks feed `PlayerLevelSystem`. Level-up choices apply
permanent rewards through the same authority and are saved. The opening cache
guarantees at least Level 2; it does not repeatedly grant levels on reload.

Level One depth milestones run from 100 through 2,000 m, primarily granting GP
capacity, mining speed, or critical chance. A town board exposes the ladder and
the cinematic layer celebrates selected thresholds without changing rewards.

Milestone data and bonus aggregation live in `values/depthMilestones.js`.

## Upgrade families

### Player stats

Agility, Strength, mining cooldown, critical chance, Heavy Punch, and Lucky
Collector make common digging and route handling stronger. Softcaps and maximum
effects remain explicit in definitions/formulas.

### Gear

Pickaxes combine money, resource recipes, material efficiency, level gates, and
one-time ownership. A higher tier should make a new material band practical,
not merely obsolete every prior choice immediately.

### Abilities and utility

Quick Slash, Thunder Strike, torch efficiency/range/visibility, and other Bobo
utility are purchased/revealed progressively. Key hints do not advertise locked
abilities as current tasks.

### World and vehicle unlocks

The Level Two tunnel key, Arc Core, and Omega Arc Core exist in the full design
but are currently removed from the demo upgrade and keybind surface. Their costs
and recipes are non-authoritative for release until the feature gate is lifted
and the whole route passes.

## Session objectives and retention

The session objective is optional and has no streak-loss penalty. Current
examples break tiles, gather cargo, push deeper, or land critical hits for a
bounded money reward. The next-promise HUD shows one objective/detail pair.

The active first-run progression is the single seven-beat Town Square route:
Move → Dig → Flight → Portal → Sell → Upgrade → Resume. Dormant Golden Five
modules are compatibility/reference code only and cannot present a second
tutorial, inject rewards, or overlap the current objective.

Return summaries, discovery cards, and floating text respect settings. They are
presentation over recorded progress, never a second reward transaction.

## Collections and permanent choices

- Ancient Relics are persistent bounded counts and progression thresholds; Arc
  crafting treats them as requirements, not consumed cargo.
- Titan discoveries sanitize to known unique IDs in canonical order.
- Sky stars feed constellation counts and Star Heart charge.
- Ten constellations unlock one permanent normal-play Celestial Engine
  attunement.
- Heavenblocks regions, components, vaults, and Zenith state persist with
  dependency repair during sanitization.

## Mode failure economy

Mode affects lives and Hardcore hazard admission, not cargo prices or basic
world value.

| Mode | Starting lives | First revive | Exhaustion |
|---|---:|---|---|
| Casual | none | always safe | never from life count |
| Hardcore | 2 | free; consumes no life | after two later life losses |
| One-Life Hardcore | 1 | none | after first death |

On death, the run saves the new mode state before revival or menu return. An
exhausted save remains intact and exportable. Clearing it is an explicit player
operation from save management.

## Save contract

The current outer save envelope is version 14. Relevant nested contracts are:

- Retention tutorial state version 6, including choice, seven-beat stage, and
  free-flight bank; dormant Opening Flight v3 data remains compatibility-only;
- Hardcore mode version 4, including mode, armed state, lives, free revive,
  deaths, and exhaustion;
- portal pair/order state;
- dug/rubble tile state and authoritative world identity;
- resources, money/upgrades, level, caves, relics, stars, retention,
  Heavenblocks, Wurm, day/night, and selected player character.

Older or hostile data is normalized at load and again at save. Nested schema
changes do not require an outer-version bump when the versioned sanitizer can
unambiguously migrate the new fields; bump the outer envelope when the transport
or identity contract itself changes.

Each slot supports local persistence, bounded backups, export/import, and an
optional endpoint. A save is not considered proven by writing only: reload and
readback must reproduce its route, rewards, lives, and feature state.

## Transaction rules

- Permanent reward methods are idempotent.
- Resource and money costs validate before any deduction.
- A failed craft/purchase changes nothing.
- A completed transaction requests a save exactly once at the gameplay owner.
- Presentation failures do not roll back a successful authoritative reward, but
  runtime health records the visual failure.
- Save failure blocks a death-flow restart when continuing would lose the new
  life state.

## Balance-change protocol

When changing costs, rewards, rates, lives, depths, or caps:

1. edit the owning `/values/` file;
2. update the relevant table or promise here;
3. add/adjust deterministic economic assertions;
4. test a clean save and an old-save migration; and
5. record the result in the alignment register.
