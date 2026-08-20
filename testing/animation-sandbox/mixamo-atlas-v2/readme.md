# Mixamo Atlas V2

Review-only browser atlas containing exactly 130 game-role candidates: ten
times the 13-row focused locomotive audit. Every candidate is paired with the
current runtime reference for its role.

- `V4 character proof` means the motion is retargeted onto the approved
  Survival V4 character and uses the full glove, matched PBR materials,
  four-light stage, 1024 px render and one 256 px downsample.
- `Source scout` means the animated Mixamo source preview is useful for motion
  selection but is not evidence for brightness, materials or deformation.
- `Gate failed` means a V4 retarget was attempted but rejected by the existing
  quality gates. The card retains only its source preview.

Accept/Maybe/Reject choices are stored in browser local storage. No verdict is
runtime promotion authority. Jump-only material is explicitly reference-only.
The page does not import production code and never changes animation
registration, contacts, hitboxes, timing or gameplay.

