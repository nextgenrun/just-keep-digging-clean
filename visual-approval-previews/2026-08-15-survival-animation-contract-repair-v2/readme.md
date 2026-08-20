# Survival animation contract repair v2 review

Animated, fixed-cell comparison of the rejected quality-v1 runtime against the
restored motion-authority runtime.

- Left: rejected quality-v1 pixels captured before repair.
- Right: restored legacy frame, rig, anchor, contact, and facing contract.
- Both panes use identical fixed 256 px cell geometry; per-frame subject fitting
  is deliberately disabled so drift and scale changes stay visible.
- The cyan box is the unchanged 31 x 75 gameplay collider projected into source
  cell space. The orange line is the grounded 248 px anchor and the magenta line
  is the 128 px authored center.
- Shader/material improvements are retained in production but omitted here so
  the animation geometry can be compared without lighting noise.

`before-vs-after-fixed-cell.gif` is the approval artifact.
