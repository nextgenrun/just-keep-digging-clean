# First five minutes runtime profile

Date: 2026-07-30

## Outcome

The production tutorial now closes the repeated Fnab/Kimmo failure chain:

`unclear goal → Dig not discovered → descend too early → cannot explain return → external coaching`

The change is a default-on profile over the existing production systems. It is
not a separate demo fork and it does not replace movement, mining, merchants,
saves, Flight, or the notification system.

## Player-facing sequence

1. The existing Next Promise strip persistently says where to walk and shows
   the player's current Move/Dig binding.
2. A normal-HP Dirt block at town x11 is marked inside the opening camera.
   Aiming at protected town floor explains that the floor is protected and
   redirects the player to the marked block.
3. The Money Monster opens directly in SELL during the sell step.
4. The Player Upgrades merchant temporarily shows only **Miner's Grip**.
   Starter money plus one sold Dirt pays its fixed 4 M price.
5. Miner's Grip raises soft-tile damage from 16 to 24. Shallow 45 HP Dirt
   therefore changes from 3 hits to 2.
6. The one-way surface drop is blocked while the four training steps are
   active. Completion grants the existing 30-second Flight bank, and the player
   must produce one real Flight frame before descending.
7. A second normal-HP Dirt block at x12 is marked so the player immediately
   feels the 3-hit to 2-hit result before the prompt changes to "go deeper."

Tutorial stage, rewards, the remaining Flight bank, and the purchased upgrade
already use production persistence. Flight practice is inferred from the saved
bank dropping below its full 30,000 ms value, so no save-schema migration was
added.

## Rollback

Use:

```text
?firstFive=0
```

The aliases `off`, `false`, and `legacy` are also accepted.

That one switch restores:

- transient tutorial cards instead of persistent Next Promise guidance;
- the former x24 one-HP tutorial block;
- unrestricted tutorial surface drop-through;
- the former default shop mode and full upgrade list;
- completion after any upgrade instead of only Miner's Grip;
- the previous pickaxe damage calculation;
- no Flight-practice or post-upgrade payoff prompt.

If a save already owns Miner's Grip, rollback hides the item and ignores its
effect; it does not delete or rewrite the saved level. Re-enabling the profile
restores it.

The switch is intentionally independent from:

- `?surfaceDrop=0` — diagnostic global drop-through disable;
- `?randomEvents=0` — focused onboarding test isolation;
- `?loadingMine=0` — loading-minigame isolation;
- `?npcActivities=0` — optional NPC activity isolation.

## Automated proof

- `testing/2026-07-30-first-five-onboarding-contract.mjs`
- `testing/2026-07-30-first-upgrade-breakpoint-contract.mjs`
- `testing/2026-07-28-town-tutorial-position-persistence-contract.mjs`
- `testing/2026-07-26-retention-systems-contract.mjs`
- `testing/2026-07-28-natural-surface-and-drop-through-contract.mjs`
- `testing/2026-07-26-shop-ui-uptime-contract.mjs`
- `testing/2026-07-28-ui-notification-carousel-contract.mjs`
- `testing/2026-07-26-opening-flight-artifact-contract.mjs`

## Manual acceptance

Use a fresh save and give no coaching:

1. Wait at least 60 seconds; the current objective must remain visible.
2. Confirm the marked Dirt is visible from spawn.
3. Attempt Down before completing training; descent must be refused and the
   persistent detail must explain why.
4. Mine with a remapped Dig key and verify the displayed label changes.
5. Sell one Dirt without changing merchant tabs.
6. Buy Miner's Grip as the only tutorial upgrade.
7. Attempt Down again; it must remain blocked until one real Flight input.
8. Fly, descend, and break the marked payoff Dirt in exactly two hits.
9. Reload during MOVE, DIG, SELL, UPGRADE, the Flight check, and after payoff.
10. Repeat once with `?firstFive=0` and verify the former behavior returns.
