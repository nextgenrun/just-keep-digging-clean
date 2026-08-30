# Survival held-torch rig V1

Blender source candidate for the rejected flat held-torch presentation. Its
approved grip and torch pose are now baked into the unified Survival runtime;
the `.blend` itself remains an authoring source and is not loaded in-game.

- `survival-held-torch-rig-v1.blend` retains the accepted Mixamo unarmed-idle
  carrier in `DG_MIXAMO_SOURCE`, retargets it onto `SurvivalPolishRig`, and
  bakes the right arm through the rig's real `MINER_UNARMED_IK` chain.
- `DG_TorchRoot_weapon_r` is real modeled geometry bone-parented to `weapon_r`.
  Its bone-local offset is calibrated from the actual right-hand and finger-base
  bones so the shaft crosses the closed glove instead of sitting at the wrist.
- The flame has scale/emission breathing only. It has no lateral translation
  animation, random shake, sprite plane, or HUD-art overlay.
- `held-torch-fullbody.png`, `held-torch-grip-closeup.png`, and
  `held-torch-three-quarter.png` are the fixed review views.
- `held-torch-soft-burn.gif` is the 24-frame motion proof.
- `build-report.json` records source hashes, action provenance, attachment bone,
  arm displacement, palm-grip drift, mesh count, and the review-only boundary.

## Runtime promotion - 2026-08-27

- Approved pose is baked across idle, walk start/loop/stop, airborne, falling,
  flight, hard landing, and crouch enter/idle/exit.
- The old cropped HUD torch and separate flame are suppressed while the Blender
  variants are active; light volume, rays, fuel, and eye adaptation remain.
- Fixed 101 px display sizing matches the unified character package.
- `?heldTorch3d=0` restores the legacy 2D presentation for comparison.
