# Earthquake Trigger Visibility Fix

## Symptom

Earthquakes appeared not to trigger even though the PlayScene setup and update
hooks were active.

## Root cause

The world-space epicenter rewrite selected each scheduled event uniformly from
the full world. Player feedback was correctly distance-limited, so nearly every
event occurred thousands of tiles away with no visible HUD, shake, flash, audio,
or local hazard.

The scheduler also ignored the existing depth-band cooldown multiplier, and the
mutation-pulse flash required an exact zero timer value after the timer had
already been advanced.

## Resolution

- Scheduled gameplay events select a fixed world-space epicenter within the
  configured player encounter ring. The point does not follow the player.
- Full-world selection remains as the startup fallback when a player tile is
  unavailable.
- Depth-band cooldown values now affect the next-event interval.
- Every due mutation pulse now calls the intended proximity-scaled flash.
- The focused earthquake smoke test covers local readability, world fallback,
  depth scheduling, and pulse feedback.
