# Surface living variants V1 QA

Review-only browser measurements at the generated 1280x720 source resolution.
Endpoint comparisons sample each clip at 320x180 using the configured start and
end guards. The warning gate is RGB mean absolute error above 5 or mean luma
delta above 2.

| # | Model | Profile | Endpoint MAE | Luma delta | Gate |
|---:|---|---|---:|---:|---|
| 01 | Seedance 2.0 Mini | Air only | 11.27 | 11.25 | Warning |
| 02 | Seedance 2.0 Mini | Quiet hearth | 7.72 | 7.68 | Warning |
| 03 | Seedance 2.0 Fast | Air only | 1.38 | 0.23 | Pass |
| 04 | Seedance 2.0 Fast | Quiet hearth | 1.39 | 0.23 | Pass |
| 05 | Kling 3.0 Standard | Air only | 0.75 | 0.30 | Pass |
| 06 | Kling 3.0 Standard | Quiet hearth | 0.77 | 0.34 | Pass |
| 07 | Veo 3.1 Fast | Air only | 1.02 | 0.12 | Pass |
| 08 | Veo 3.1 Fast | Quiet hearth | 1.03 | 0.07 | Pass |
| 09 | Wan 2.7 | Air only | 1.72 | 1.39 | Pass |
| 10 | Wan 2.7 | Quiet hearth | 1.97 | 1.78 | Pass |

Candidate 05 was also sampled through 10 seconds of continuous playback: 40
samples, three decoder handoffs, minimum combined opacity 0.9999998, zero black
gaps, and zero media errors. All ten clips loaded as silent 1280x720 video with
durations from 4.00 to 4.06 seconds. Visual review confirmed a single outdoor
surface boundary and uninterrupted two-tile-deep earth in every candidate.

The generation manifest records a $2.90256 catalog estimate and $3.45776 final
provider-reported cost. The generator stopped after the planned ten jobs; no API
key is stored in any output.
