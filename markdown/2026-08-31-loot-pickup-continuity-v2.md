# Loot Pickup Continuity V2

## Outcome

Mined resources, special tiles, and Stars now preserve one visual identity from
the world pickup through the flight into the `I` inventory. The presentation
library resolves 326 authored variants: sixty semantic resource frames, four
soil frames, twelve special-atlas frames (including compatibility/guide art),
and all 250 exact Star identities.

The flight is deterministic but deliberately varied. A shared twenty-four-profile
router excludes the previous four eligible paths, offsets motion perpendicular
to its curve, follows the live inventory target, and guarantees larger route
families for special tiles and rarer Stars. The rare/surge pool now has ten
paths, including slingshot and halo-dive pairs, so its no-repeat window leaves
six fresh choices instead of two. Star rarity selects six escalating
moments from a short tuck through a crown spiral; exact core and dedicated
light frames remain paired throughout the flight. First discovery escalates
one moment tier. Sparse 5.5%-to-11%-alpha soft echoes reuse that exact core/light
frame during travel; reduced motion suppresses them and uses a direct route and
small pulse.

## Assets and ownership

- `sprites/UI/loot-pickups-v2/soil-mini-atlas-v1.png` is the 192x192 RGBA
  runtime atlas for root-bound, dark, reinforced-dark, and lava soil.
- `ai-tools/2026-08-31-build-loot-soil-mini-atlas-v1.py` reproducibly crops,
  centers, and downsamples the retained ImageGen master.
- `RewardPickupVisualResolver` is the shared visual authority used by flight,
  Holdings, and Special Blocks. It selects existing semantic atlas frames and
  returns `null` when authored art is unavailable; it never draws a substitute.
- `RewardPickupContinuityState` holds the latest landed descriptor only for the
  active scene, allowing `I` to reuse the exact resource frame or GP tier that
  flew without creating inventory or save authority.
- `LootPickupFxSystem` and `LootPickupFlightView` own transient motion only.
  `RewardFlightMotionSystem` remains the shared deterministic route authority
  for XP and loot.

## Gameplay boundary

Mining, drop amounts, Star progress, inventory values, GP restoration, and save
state remain authoritative in their existing systems. The new callbacks carry
the exact rendered descriptor and world position only after a confirmed pickup;
the presentation layer neither grants nor duplicates a reward.

## Validation

- `node testing/2026-08-31-loot-pickup-continuity-v2-contract.mjs`
- `node testing/2026-08-26-reward-flight-motion-library-contract.mjs`
- `testing/2026-08-31-loot-pickup-continuity-v2-harness.html`

The contract checks all 326 variants, all 24 route profiles, the four-route
repeat window, rare-tier breadth, semantic rarity floors, exact endpoints,
soft-echo ownership, bridge wiring, and the absence of procedural fallback art
or gameplay writes. The browser harness
exercises ordinary resources, every authored soil family, special/GP/XP
tiles, and common through Astral Star pickup moments against the live bag target.

## Rollback

Remove the loot pickup callbacks from PlayScene setup/gameplay, restore the
previous holdings/special-block icon selection, and restore the earlier loot
flight system. Existing semantic atlases and the legacy pickup textures remain
untouched, so rollback does not require migrating saves or gameplay data.
