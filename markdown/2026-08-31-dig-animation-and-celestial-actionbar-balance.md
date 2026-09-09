# Dig Animation and Celestial Action-Bar Balance

## Outcome

The level-one mining cooldown remains 1500 ms, but a normal UAL dig no longer
stretches its authored attack across that entire interval. Normal swing
playback is capped at the previously validated 750 ms window; the unused half
of the cadence is recovery before the next gameplay-authoritative hit.
Quick Slash keeps its separate cadence tuning.

The Celestial powers on action-bar keys 3, 4, and 5 now use one comparable
power envelope again:

| Key | Ability | Base | Full talents | Theoretical full target budget |
|---:|---|---|---|---:|
| 3 | Wayward Star | 1 star, 8 bounces, 8 sec | 5 stars, 29 route + 24 supernova targets each | 265 |
| 4 | Hollow Sun | 3 holes, 4 pulses, 7.2 sec | 6 holes, 6 pulses, 122 pulse + 30 implosion targets each | 912 |
| 5 | Stellar Lance | 5 tiles, 1 lane, 0.75x damage, 5 sec | 8 tiles, 3 lanes, 1.5x damage, 8 sec | 216 damage-equivalent tile hits at level-one cadence |

Stellar Lance retains its new purple projectile atlas and three distance-based
visual forms. Those forms no longer multiply damage; progression comes from
the explicit range, lane, duration, and damage talent nodes.
This player-directed second pass keeps Hollow Sun deliberately much stronger
than Wayward Star, while applying the substantial correction to the overtuned
third projectile ability.

## Validation

- The animation contract proves a one-second source action resolves to a
  750 ms visual swing under the 1500 ms gameplay cooldown.
- The production animation lab reads `MINING_CONFIG.mineCooldownMs`; rendered
  telemetry shows the 31-frame Cross at 1.38x and 750 ms.
- Celestial effect, full-rebalance, projectile/black-hole, HUD/VFX, and
  all-abilities polish contracts cover the restored caps.
- The rendered Celestial harness reports no missing textures or runtime errors
  for Wayward Star, Hollow Sun, or Stellar Lance.
