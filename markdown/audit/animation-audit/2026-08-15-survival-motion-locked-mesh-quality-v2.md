# Survival motion-locked mesh quality V2

## Outcome

The restored runtime motion remains production authority. A separate Blender
candidate recovers the approved lighting/material quality without repeating the
rejected V1 bone, weight, pelvis, hand, camera, or secondary-motion edits.

The source mesh is already high density at about 83k vertices and 119k
polygons. Subdivision would add deformation risk without solving the visible
problem. The material/export path was the useful quality lever: 2K textures,
Non-Color normals, repaired eye response, four-light AgX rendering at 2048 px,
and one final downsample to 256 px.

The V2.1 amendment restores the benchmark's material-only full-glove override.
Finger-group polygons now use `Gloves1`, removing the rejected green/skin finger
fragments without changing finger weights, poses, silhouettes, or motion.

## Motion gate

| Family | Result | Minimum alpha IoU | Max centroid | Max bounds |
|---|---:|---:|---:|---:|
| Walk | Pass | 0.959 | 0.64 px | 1 px |
| Run | Pass | 0.962 | 0.51 px | 2 px |
| Mining side | Pass | 0.974 | 0.52 px | 1 px |
| Mining up | Pass | 0.957 | 0.69 px | 1 px |
| Mining down | Pass | 0.956 | 0.58 px | 2 px |
| Flight | Pass | 0.994 | 0.17 px | 1 px |

Run and the two UAL mining sources reproduce their historical 0.95 export
scale. It is constant for the whole family. Registration is integer-only.
There is no per-frame scale, warp, camera correction, or pose modification.
The packed candidate receives the exact restored alpha channel after passing
the pre-lock silhouette gate.

## Approval boundary

The animated A/B and candidate sheets are under
`visual-approval-previews/2026-08-15-survival-motion-locked-mesh-quality-v2/`.
Nothing in that directory is wired to Phaser. Promotion requires visual
approval and must continue to preserve the restored frame selection, facing,
timing, collider, contacts, transition sizes, and rollback hashes.
