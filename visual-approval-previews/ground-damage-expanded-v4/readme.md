# Expanded Ground Damage V4 Review

Browser-captured WebGL evidence for the production `WorldVisualDamageImagePainter`.

- `01-expanded-v4-exact-profiles.jpg` combines three separately streamed WebGL captures and shows all 33 exact tile/resource profiles at five of the twelve logical damage states and the real 94 px tile scale.
- `01-panel-surface-resources.jpg`, `02-panel-special-tiles.jpg`, and `03-panel-deep-world.jpg` are the original 670 x 1132 WebGL captures.
- `02-layered-v3-rollback.jpg` proves the retained `?groundDamageAtlas=v3` rollback through the same production painter.

The review harness is `testing/2026-08-26-expanded-ground-damage-v4-harness.html`.
