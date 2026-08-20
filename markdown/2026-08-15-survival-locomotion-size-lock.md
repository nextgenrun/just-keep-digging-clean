# Survival locomotion size lock — 2026-08-15

## Symptom

The approved Survivor appeared to grow when idle/startup entered the promoted
run loop, then shrink again during slowdown. Motion, timing and collision were
correct; the visual cell calibration was stale after the quality-v1 sheet
promotion.

## Cause and correction

The current run alpha envelope is 169 px high, while its profile still used the
old 123 px presentation inherited from the pre-promotion source. That rendered
the run at a median visible height of 81.199 px beside the approximately 75 px
idle and transition family.

The runtime now uses measured display cells of 101/119/104/114/123 px for
idle/start/walk/run/stop. This changes presentation scale only. All 78 animation
keys, 1,617 referenced frames, frame timing, the 1.12-tile run cadence, source
pixels, origins, contacts and the 31x75 collider remain unchanged.

## Measured result

| Handoff | Before extent jump | After extent jump |
|---|---:|---:|
| Idle → start | 2.481 px | 0.050 px |
| Start → run | 4.324 px | 0.843 px |
| Run → slowdown | 5.285 px | 0.727 px |
| Slowdown → idle | 0.402 px | 0.402 px |

The largest locomotion handoff size jump fell from 5.285 px to 0.843 px.

## Verification

- `testing/2026-08-14-survival-animation-global-polish-contract.mjs`
- `ai-tools/2026-08-14-export-survival-animation-audit.mjs`
- `ai-tools/2026-08-14-analyze-survival-animation-audit.py`

The final pixel audit measured all 78 animations from all 22 loaded sheets with
no missing source. No spritesheet or gameplay-authority file was rewritten.
