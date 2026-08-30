# Surface background loops V2 QA

## Outcome

Three real-surface Seedance Mini takes are presented as separate upper-world
videos over one static production floor/ground image. The final animated crop
is 1470 x 436 and contains no ground. Candidate 02 is the recommended balance.

| Candidate | Duration | Scene drift | Wrap MAE | Largest normal frame step | Motion from start |
| --- | ---: | ---: | ---: | ---: | ---: |
| 01 Soft canopy | 17.96 s | 0.00 px | 0.98 | 1.28 | 4.66 |
| 02 Town air | 17.96 s | 0.00 px | 0.99 | 1.33 | 5.11 |
| 03 Layered night | 17.96 s | 0.00 px | 1.05 | 1.27 | 7.19 |

The wrap delta is lower than the largest ordinary frame-to-frame step in every
candidate. Phase correlation over the rigid scene anchor reports zero global
translation at 0, 4.5, 9, 13.5, and 17.96 seconds.

## Loop correction

The direct 15-second crops were rejected: their first-to-final frame MAE values
were 8.10, 8.61, and 10.85. The final V3 edit overlaps three seconds of the
forward-moving tail with the forward-moving head, then slows the closed cycle
to approximately 18 seconds. It never reverses the source and therefore avoids
both a hard reset and the midpoint direction change of palindrome playback.

## Browser playback

- All three selector buttons loaded their expected 1470 x 436 H.264 video at
  `readyState` 4, active muted playback, native looping, and no media error.
- Browser-reported duration is 17.958333 seconds for all three clips.
- Candidate 02 was observed through two complete browser wraps while playback
  remained active.
- The static lower image reported 1680 x 222 and occupies a distinct DOM layer;
  the animated and static regions meet only at their one-pixel divider.
- The tested desktop viewport reported zero horizontal overflow.

## Provenance and boundary

The first generation batch cost $1.3712412 according to OpenRouter usage. A
one-candidate endpoint retry was rejected before generation because the
throwaway key had reached its total limit, so it incurred no additional known
cost. The key is not stored in scripts, manifests, HTML, or media metadata.

All work remains under `testing/animation-sandbox/` and `ai-tools/`. Production
surface assets, renderers, world values, and gameplay remain untouched.
