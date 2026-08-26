# Surface living background mockup V1

Review-only proof for a calm AI-generated moving world background. It does not
change the production renderer, background manifests, saves, collision, tiles,
or gameplay.

## Accepted review lane

- `2026-08-26-surface-two-row-reference-v2.png` is the corrected ImageGen still.
  It has one outdoor surface boundary and one uninterrupted two-tile-deep soil
  cross-section. There is no underground floor, shelf, ledge, or interior seam.
- `2026-08-26-surface-living-loop-v2.mp4` is the silent four-second 720p
  OpenRouter Veo 3.1 Lite candidate conditioned on that still as both its first
  and last frame.
- `index.html` presents the exact two-tile-deep crop and overlaps two muted
  decoders for 700 ms at the loop boundary. This protects review playback from
  a harsh browser-video restart while keeping the camera locked. It opens on
  candidate 05, the lowest-drift loop in the recorded browser QA pass.
- `generation-manifest-v2.json` records the exact prompt, model, seed, known
  cost, file size, and hashes. No API key is stored.

V1 of the still and clip is retained only as rejected provenance. Its straight
underground divider read as a second floor and must not be used or wired.

The active review page now loads the ten candidates in `variants-v1/`. Five
current video models each receive the same `air` and `hearth` motion profiles.
Only the selected candidate owns the two soft-loop video decoders, keeping the
comparison lightweight. Number keys `1` through `9` select matching candidates;
`0` selects candidate 10.

## Run

```text
python serve.py 8080
http://127.0.0.1:8080/testing/animation-sandbox/2026-08-26-surface-living-background-mockup-v1/
```

The page exposes `window.surfaceLivingVariants.getSnapshot()` for non-mutating
loop diagnostics. `variants-v1/qa-report.md` records the all-candidate endpoint
and continuous-playback checks. Approval of this mockup would still be required
before any production background or streaming integration.
