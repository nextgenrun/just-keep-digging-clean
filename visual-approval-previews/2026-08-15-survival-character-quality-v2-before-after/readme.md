# Survival Character Quality V2 Before/After

Review-only comparison package. Nothing in `sprites/`, Phaser animation
registration, timing, transitions, collision, movement or gameplay is changed.

## Authority and scope

- `BEFORE` uses the exact active 256 px runtime sheets.
- `AFTER` uses the already motion-locked 1024 px source frames and a consistent
  review compositor for clearer normals, material separation, restrained rim
  response and contact grounding.
- `quality-v2-imagegen-run-target.png` is an illustrative hero-frame target for
  anatomy, face, hair and material fidelity. It is not presented as an exported
  production animation frame.
- Current approved motion, pose order and timing remain authoritative. The
  rejected Blender rollback `MINER_run` is not used.

## Review files

- `01-character-quality-v2-before-after.mp4` or the encoder-fallback
  `01-character-quality-v2-before-after.webp` — synchronized animated comparison
  with run, side/up/down mining and prone-v3 flight, including true-size and
  moving face/hand/hip inspection views.
- `01-character-quality-v2-before-after-poster.png` — first-frame index for the
  video, not the approval evidence by itself.
- `02-motion-qa-samples.png` — six decoded frames sampled across the delivered
  animation to verify the family sequence and presentation layout.
- `quality-v2-imagegen-run-target.png` — ImageGen target keyframe.
- `comparison-qa.json` — exact inputs, frame counts, alpha bounds, hashes and
  explicit review-only flags.

The composited motion is a visual direction mockup. Production still requires
the matching Blender material/normal, corrective-shape and per-family export
work before any runtime promotion.

`reviewOnly: true`  
`productionChanged: false`  
`runtimeWiring: none`
