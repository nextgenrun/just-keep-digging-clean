# Survival animation contract repair v2

Recoverable snapshot created before reverting the 2026-08-14 quality-v1 frame
promotion. The promotion changed animation silhouettes while retaining legacy rig
markers, contacts, origins, and facing assumptions.

- `rollback-quality-v1/` mirrors the six promoted sheets and two promoted manifests.
- The active runtime is restored from
  `archive/2026-08-14-survival-quality-runtime-promotion-v1/rollback/`.
- Shader and material-response improvements are intentionally outside this rollback.
- Gameplay collision, timing, movement authority, saves, and progression are unchanged.

To restore the rejected quality-v1 state, copy the mirrored files from
`rollback-quality-v1/` back to their repository-relative locations.
