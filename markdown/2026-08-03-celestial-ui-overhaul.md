# Celestial UI Overhaul

## Player-facing contract

- The bottom-center actionbar contains Quick Slash, Thunder Strike, Wayward
  Star, Hollow Sun, and Stellar Rage.
- Slots activate with mouse click or keys 1 through 5.
- Slots can be dragged to swap positions. The order is saved per save slot.
- Locked slots remain visible and show their real unlock condition on hover.
- Quick Slash and Thunder Strike continue to use the existing PlayerAbilities
  GP costs and existing mining-damage path. The actionbar owns no combat values.
- The bottom-left currency HUD displays Money and spendable Star Points only.

## Stars and talents

- Collected sky stars grant spendable Star points by rarity:
  Common 20, Uncommon 50, Rare 100, Epic 250, Mythic 750, Astral 2,000.
  Rarity weights increasingly favor valuable tiers through the first 2,000m.
- Celestial talents unlock at player Level 3.
- Each Engine branch begins with its root ability at the bottom and fans upward
  into an 11-node, three-path lattice with three alternate capstones.
- Root abilities are free. Upgrade nodes cost Star Points and have level,
  prerequisite, and branch-completion gates.
- Completing any capstone in one Engine branch permits selecting the next root ability. All
  three Engines can eventually be owned.
- Talent-owned Engines use the visible Star Heart charge bank: 100 charge per
  cast, 200 maximum, and 100 initial charge on first root selection. Their
  one-active-Engine and bounded-impact protections remain.
- Wayward talents grow one activation from one to five simultaneous independent
  stars. Hollow Sun is a long-lived wide gravity field that pulls destroyed
  block fragments into its core. Stellar Rage replaces the former Comet tunnel:
  it clears Stress and briefly empowers mining damage and attack speed.
- Existing saves retain the stable `comet-engine` branch and `comet-*` node IDs
  internally, but no Comet name or tunnel behavior remains player-facing.

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
