# Original SIDE punches restored

The active Survival SIDE sequence keeps the ten current Mixamo moves, then adds
the original Jab and Cross as stages 11 and 12. Both directions share this order.
Jab registers independently of Quickslash, which now uses its own ability sheet.

The restoration reuses the current unified artwork, fixed animation scale,
floor origin, body-locked contacts and authored recoveries. Moving entries use
the existing gait-matched punch variants. The shared main/cave SIDE prewarm also
loads the original moving-punch pack before those stages can be selected.

Validation:

- Legacy punch contract: both directions, all eight moving entry variants,
  zero-speed planted poses, stale contact-offset clearing and wall-pressure stability.
- Complex mining contract: twelve SIDE stages, unchanged UP sequence and authored contacts.
- Full jump/flight controller contract: 33 cases passed.
- Save-disabled gameplay: full twelve-stage cycle and wrap in both directions,
  original Jab/Cross contact captures, moving Jab right and moving Cross left.
  Across 551 sampled legacy frames, the sprite stayed on its body anchor;
  animation scale, origin and facing checks passed. No browser page errors.

The interactive comparison remains at
`testing/2026-09-06-sideways-dig-review.html`; the originals are numbered 11 and 12.
