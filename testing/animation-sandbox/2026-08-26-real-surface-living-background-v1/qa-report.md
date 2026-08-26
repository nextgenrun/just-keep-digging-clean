# Real surface Seedance V1 QA

## Outcome

All four final loops use the exact real-surface reference, preserve one outdoor
surface boundary with continuous earth below it, and show clearly readable
motion across the forest, smoke, clouds, and surface vegetation. Candidate 04
is the default review choice because it has the strongest upper-world motion
relative to unwanted earth movement.

| Candidate | Upper-world motion MAE | Earth drift MAE | Encoded seam MAE |
| --- | ---: | ---: | ---: |
| 01 Fast, traveling gust | 13.79 | 9.44 | 0.97 |
| 02 Fast, forest pulse | 8.00 | 4.48 | 0.83 |
| 03 Mini, traveling gust | 12.76 | 6.63 | 0.91 |
| 04 Mini, forest pulse | 13.54 | 5.43 | 0.89 |

Motion is measured between the supplied calm reference and the generated peak
frame. The seam is measured between the first and final encoded frames after
the deterministic forward/reverse build. Lower seam and earth values are
better; higher upper-world motion is better for this review.

## Browser playback

- All four selector buttons loaded the expected 1280 x 720 H.264 clip.
- Every clip reported an 8.041667 second duration, `readyState` 4, active
  playback, native looping enabled, and no media error.
- Candidate 04 was observed across a complete browser wrap from 7.629 seconds
  to 0.067 seconds. Playback stayed active with `readyState` 4 and no error.
- The review page has no horizontal overflow at its tested desktop viewport.

## Remaining limitation

The palindrome post-process removes the harsh endpoint reset by making the
second half the exact reverse of the first. It also means the wind direction
turns around at the midpoint. Some model-made global light and earth drift is
still visible, especially in candidate 01. These clips are suitable for visual
direction review, not production wiring yet.
