# Survival unified animation runtime v1

## Outcome

The rejected mixed animation presentation was replaced as one atomic runtime
package. All 175 active animation keys and 281 transition edges remain, but all
43 referenced sheet keys now resolve to one Survival V4 character render
contract. Default runtime rollback is `?unifiedAnimation=0`.

## Before and after

| Contract | Before | Unified v1 |
|---|---:|---:|
| Active animation keys | 175 | 175 |
| Transition edges | 281 | 281 |
| Unique runtime sheets | 43 | 43 |
| Display sizes | 101, 103, 104, 109, 119, 122, 123 px | 101 px |
| Moving-combat physical atlas frames | 528 proxies/frames | 960 real frames |
| Moving-combat phase variants | 80 | 80 |
| Source render | mixed 2D/3D generations | one 1024 px V4 render |
| Runtime origins | mixed | one grounded origin, ledge excepted |

The new runtime contains 2,667 physical frames and 41,212,750 bytes of
lossless WebP imagery. The 1,152-frame reduction in animation references comes
from replacing repeated 22/44-frame moving-combat proxies with direct 10/20
frame actions; no gameplay state or transition was removed.

## Motion and anchoring corrections

- Removed source action root travel along the camera axis.
- Used persistent foot locking for grounded motion and evaluated-mesh floor
  locking for rolls, death silhouettes and moving combat.
- Preserved Jog phase frame-for-frame beneath SIDE attacks.
- Rebuilt transition and diagonal sheets after their first strict pack pass
  exposed inherited object transforms.
- Preserved both contacts in Jab-Elbow and Elbow-Uppercut across all eight run
  phases.
- Disabled the old crop-space rig marker manifest. All 124 active contacts are
  body-locked; gameplay contact/cooldown data is unchanged and footsteps fall
  back to the physics floor.

## Visual contract

- Survival V4 body and the production 160-bone rig.
- Full glove coverage; no green fingertip material.
- Full-resolution PBR textures and restored eye/corneal response.
- One camera, light and color response for Blender, UAL and Mixamo motion.
- Subtle jacket and backpack secondary motion.
- 1024 px 16-bit RGBA source, one downsample, lossless WebP output.
- Minimum measured raw-frame edge margin: 27 px.
- Maximum suspicious green pixels in any frame: 0.

## Verification

- `2026-08-25-survival-unified-animation-runtime-contract.mjs`: pass.
- `2026-08-25-survival-unified-animation-rollback-contract.mjs`: pass.
- Player ability and deferred animation asset contracts: pass.
- Python renderer, packer, comparison builder and pose helper compile: pass.
- Live `127.0.0.1:8080` surface save: unified player visible at 1280 by 720,
  with no new unified sheet or rig-manifest load warning after correction.
- Strict package gates: 43/43 sheets, no blank frames, no clipped raw alpha,
  no green contamination, one downsample per sheet.
- The 2.13 GB raw 1024 px render cache was removed after verification; it is
  reproducible from the source `.blend`, renderer and unified JSON contract.

Historical contracts that pin the old mixed sizes, origins, Piskel file names
or 528-frame proxy atlas remain unchanged as rollback evidence and therefore
fail against the intentionally changed default profile.

## Animated approval evidence

- `renders/review/2026-08-25-unified-animation-locomotion-before-after.webp`
- `renders/review/2026-08-25-unified-animation-mining-combat-before-after.webp`
- `renders/review/2026-08-25-unified-animation-flight-landing-crouch-before-after.webp`
