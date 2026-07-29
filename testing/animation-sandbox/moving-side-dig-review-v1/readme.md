# Moving Side Dig Review v1

Review-only comparison for the most common held-input state: moving sideways
while continuously mining sideways.

The builder uses the exact Survivor UAL Jog, Jab and Cross sheets plus their
packed-frame pelvis markers. Options B-D keep Jog as the lower-body authority
and blend a pelvis-aligned punch torso across a feathered hip seam. Punch
contacts are phase-locked to the two planted-foot frames in each Jog cycle.
The active Option C recipe presents 22 upper-body poses over the same 14 Jog
phases and uses seven-frame enter/release envelopes, matching the production
smoothing pass without changing the review sandbox's isolation.

Nothing here imports or mutates the production player profile, mining combo,
cooldown, contact timeline, runtime sheets, or save data. The authoritative
guardrails are `reviewOnly: true` and `productionChanged: false` in
`values/movingSideDigReview.json`.

## Build

```powershell
python testing\animation-sandbox\moving-side-dig-review-v1\build_mockups.py
```

## Review

Serve the repository, then open:

`http://127.0.0.1:8080/testing/animation-sandbox/moving-side-dig-review-v1/`

All four cards share play, speed and scrub time. Option C is the technical
recommendation, but selection is browser-local review state only.
