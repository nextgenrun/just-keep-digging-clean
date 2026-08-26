# Surface living background variants V1

Ten review-only OpenRouter video comparisons generated from the same corrected
ImageGen frame. The matrix uses five current models and two controlled motion
profiles per model. Every request is four seconds, 720p, silent, camera-locked,
and supplies the same reference as both first and last frame.

The `air` profile restricts motion to a few smoke, window, and cloud regions.
The `hearth` profile adds only one tiny grass region and three stationary
underground glints. Neither profile permits an underground floor, geometry
motion, whole-frame exposure changes, or cinematic camera movement.

`variants-manifest.json` records prompts, models, outputs, hashes, and costs.
`model-catalog-snapshot.json` records the current capability/pricing metadata
used before submission. `qa-report.md` records the browser endpoint and soft-loop
checks. No API key is stored.
