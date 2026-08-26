# Player Animation Transition Cohesion V3

## Outcome

The unified Survival render remains the visual authority. This pass removes
the remaining runtime seams without replacing approved clips or changing
movement, mining, contact, cooldown, GP, or collision reach rules.

## Changes

- Crouch, Flight, and locomotion-polish packs now load with the selected player
  in WorldLoad and stay resident. Eight high-frequency unified sheets can no
  longer insert an idle or previous-pose frame on first use or after eviction.
- Deferred animation readiness rechecks immediately after a framed texture
  recreates its Phaser animation, removing the former one-frame fallback.
- Jog start and stop routing now follows resolved horizontal displacement with
  the selector's 24/10 px-per-second hysteresis. Releasing movement keeps the
  stride matched through the 90 ms slowdown and begins the planted stop only
  once travel is effectively finished.
- Collider V2 retains its locomotion envelope down to the same 10 px-per-second
  release boundary, so the physical core does not shrink early during the
  visual slowdown.
- World, cave, teleport, and combat paths apply the selected display geometry
  and immediately resync the animation-specific origin before the next render.

## Memory and rollback

The traversal preload adds eight sheets and brings the estimated resident
decoded character package to about 432 MiB, below the existing 640 MiB runtime
watermark. Rare reactions, death, teleport, and non-owned abilities remain
deferred.

Use `?transitionCohesion=0` to restore the previous on-demand traversal packs.
`?colliderV2=0` and `?unifiedAnimation=0` remain the broader independent
rollbacks.

## Verification

- `PLAYER_ANIMATION_TRANSITION_COHESION_V3_CONTRACT_OK`
- `PLAYER_COLLIDER_CONTACT_POLISH_V2_CONTRACT_OK`
- `SURVIVAL_UNIFIED_ANIMATION_RUNTIME_CONTRACT_OK`
- `PLAYER_LEDGE_ASSIST_CONTRACT_OK`
- runtime asset coordinator contract: ok
- A disposable-port 1280x720 browser run reached PlayScene; every one of the
  eight traversal-resident unified sheets returned HTTP 200 before gameplay.
  Browser diagnostics contained no errors. The only warnings were unrelated
  pre-existing Reliquary anchor safety omissions.
