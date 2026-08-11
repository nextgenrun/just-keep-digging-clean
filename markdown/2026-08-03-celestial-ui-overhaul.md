# Celestial UI Overhaul

## Player-facing contract

- The bottom-center actionbar contains Quick Slash, Thunder Strike, Wayward
  Star, Hollow Sun, and Comet Engine.
- Slots activate with mouse click or keys 1 through 5.
- Slots can be dragged to swap positions. The order is saved per save slot.
- Locked slots remain visible and show their real unlock condition on hover.
- Quick Slash and Thunder Strike continue to use the existing PlayerAbilities
  GP costs and existing mining-damage path. The actionbar owns no combat values.
- The bottom-left currency HUD displays Money and spendable Star Points only.

## Stars and talents

- Collected sky stars grant spendable Star points by rarity:
  Common 1, Uncommon 2, Rare 4, Epic 8, Legendary 15, Astral 30.
- Celestial talents unlock at player Level 20.
- Each Engine branch begins with its root ability at the bottom and fans upward
  into an 11-node, three-path lattice with three alternate capstones.
- Root abilities are free. Upgrade nodes cost Star Points and have level,
  prerequisite, and branch-completion gates.
- Completing any capstone in one Engine branch permits selecting the next root ability. All
  three Engines can eventually be owned.
- Talent-owned Engines do not use the retired hidden Star Heart charge gate.
  Their existing one-active-Engine and bounded-impact protections remain.

## Star Pillar access

- The sky-island Star Pillar remains available.
- A second Star Pillar is placed at town tile X 20, the midpoint between the
  Money Monster and campfire.
- Star Pillar interaction participates in the shared current-frame distance
  arbitration, so its E input does not also open a merchant, portal, relic,
  milestone, or event.
- The talent tree is available only through a physical Star Pillar, not the
  Escape menu.

## Loading and persistence

- The actionbar and currency HUD art are eager because they are always visible.
- The large talent-tree foundation, authored connectors, and node halo are
  deferred until the Star Pillar is used.
- Save schema v14 appends celestialOverhaulData after every older positional
  field. It stores Star Points, purchased nodes, migration version, and actionbar
  order.
- Pre-v14 saves migrate owned Celestial Engines into root nodes and convert
  their persisted rarity counts into spendable Stars once.

## Focused verification

Run these files with the bundled Node runtime:

    testing/2026-08-03-celestial-action-bar-contract.mjs
    testing/2026-08-03-celestial-actionbar-input-contract.mjs
    testing/2026-08-03-celestial-currency-hud-contract.mjs
    testing/2026-08-03-celestial-overhaul-save-contract.mjs
    testing/2026-08-03-celestial-pillar-access-contract.mjs
    testing/2026-08-03-celestial-runtime-wiring-contract.mjs
    testing/2026-08-03-celestial-save-v14-contract.mjs
    testing/2026-08-03-celestial-talent-effects-contract.mjs
    testing/2026-08-03-celestial-talent-progression-contract.mjs
    testing/2026-08-03-celestial-talent-tree-ui-contract.mjs
