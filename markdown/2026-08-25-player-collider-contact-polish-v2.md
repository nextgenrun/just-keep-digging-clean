# Player Collider and Contact Polish V2

## Outcome

The unified high-resolution Survival character no longer relies on one narrow
upright rectangle for every pose. Runtime collision now uses conservative core
envelopes for upright, locomotion, crouch, airborne and powered-flight states.
This closes the largest torso/leg wall mismatch while retaining tile-based
gameplay and the existing animation/contact timing.

## Runtime contract

- Upright remains the canonical 31x75 body used by saves and teleports.
- Locomotion expands only the protected core to 48x75; fists, tools, coat tails
  and wide kick arcs remain visual-only.
- Crouch contracts to 44x57. Standing expansion is tested against terrain; if a
  ceiling blocks it, the body and crouch visual remain coherent until clear.
- Airborne uses 40x75. Powered flight uses a 66x34 horizontal envelope with a
  measured 22 px anchor offset so tile collision follows the visible flying
  body instead of an empty upright column below it.
- Every normal profile change preserves the visible bottom-center anchor and is
  rejected if it would overlap a solid tile. Flight exit can fall back to the
  current collision floor, preventing a stale flight body at landing.
- Arc Core circle mode captures and restores the active rectangular profile and
  visual offset.
- Moving side-dig stand-off compensates for the wider locomotion core. The
  approved player-center-to-tile-face distance is unchanged, so the pass does
  not create empty strike space or move contact timing.
- Existing WebGL solid-cell occlusion still clips extended limbs exactly at
  authoritative tile faces. The body does not become a per-limb hitbox and
  adjacent-tile mining reach is unchanged.
- Deferred player packs validate their highest requested spritesheet frame, not
  only the texture key. A stale plain-image registration is replaced before
  flight, crouch, Quickslash or Thunder animation creation, eliminating a
  missing-frame/old-frame race found by the live comparison.

## Rollback and proof

Append `?colliderV2=0` to restore the former fixed 31x75 body without disabling
the unified animation render. `testing/2026-08-25-player-collider-contact-polish-v2-contract.mjs`
proves profile dimensions, anchor continuity, unsafe-expansion rejection,
forced-crouch recovery, floor-safe flight exit and vehicle round-tripping.
The production WebGL live QA also boots a fresh PlayScene, records all four
comparison overlays, and rejects browser errors.
