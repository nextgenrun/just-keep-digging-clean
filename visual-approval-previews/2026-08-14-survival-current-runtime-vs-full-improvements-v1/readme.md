# Current Runtime vs Full-Quality Candidate V1

Review-only, side-by-side animated comparison. Phaser/runtime wiring is
unchanged.

## Motion authority

- Left: exact sheets from active profile
  `survival-blender-v2-promoted-animation-polish-v4-20260803`.
- Right: the same named walk/Jog, mining and prone-v3 flight source motions,
  with object travel removed exactly as the root-centered runtime sheets do.
- Pose order, source timing, mining direction, and flight identity are retained.
- The rejected Blender rollback `MINER_run` is absent.
- The two-frame start/stop bridge is exact on the left. The right uses adjacent
  high-resolution walk-source poses as a target; a production bridge must be
  rebuilt from the exact two Piskel poses before any promotion.

## Candidate quality pass

- 1024 px Eevee source renders; every shown candidate size is downsampled
  directly once from that source.
- Four `SurvivalCinematic` lights, AgX Medium High Contrast, Non-Color normals.
- Four-influence normalization targeted to fingers, wrists, elbows, pelvis and
  thighs; preserve-volume and corrective smoothing enabled.
- Review-only corrective shapes for fists, wrists, elbows, hips and jacket.
- Root centering, planted-foot ground continuity, and stabilized pelvis travel.
- Valid `Eye_BaseColor.png` relink with corneal roughness/IOR/coat tuning.
- Subtle separate jacket and backpack secondary shape motion.
- Full dark-glove material assignment on finger-weighted polygons.
- Current 123 px and separate 145 px scale checks.

These procedural correctives are approval mockups, not final hand-sculpted
pose-space shapes. If the direction is approved, each family still needs manual
contact-frame inspection and exact bridge reconstruction before production
export.

## Animated comparisons

- `01-walk-transitions-current-vs-quality.mp4`
- `02-mining-current-vs-quality.mp4`
- `03-flight-current-vs-quality.mp4`

`comparison-qa.json` records all candidate alpha bounds and frame counts. No
candidate frame touches a render edge.

`reviewOnly: true`  
`productionChanged: false`  
`runtimeWiring: none`
