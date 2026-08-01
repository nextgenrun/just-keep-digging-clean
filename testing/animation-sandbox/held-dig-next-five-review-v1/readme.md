# Held Dig Size + Anchor Review v2

Review-only Before/After mockups for the visible attack-size pulse around SIDE
Dig. The earlier micro-handoff comparison was rejected as too subtle and is not
a wiring candidate.

Measurement shows that Jog is presented at 123 px while standing Jab/Cross use
109 px, and the moving compositor therefore reduces the attack torso to 88.6%
inside a full-size Jog lower body. The proposed side uses one 123 px family and
one 100% skeletal scale. Its frames are rebuilt with the shared production
compositor as a preview of the eventual Piskel pipeline change.

The root baseline remains within 1 px and the derived contact marker follows the
new silhouette envelope, reducing contact-driven sprite displacement without
changing the tile, collider, 750 ms cadence or damage/contact frames. Nothing in
this folder edits runtime sheets, active Piskel sources, selectors, gameplay or
save data.

Runtime decision (2026-07-29): the proposed uniform 123 px / 100% attack scale
was rejected after in-game testing because it enlarged the authored body and
contact envelope, making apparent size drift and skating worse. Production
restores the stable 109/123 normalization, keeps this page as comparison
evidence, body-locks moving contacts, and gives moving Quickslash its own
phase-retimed run-strike route.

## Build

```powershell
python testing\animation-sandbox\held-dig-next-five-review-v1\build_mockups.py
```

## Review

Serve the repository and open:

`http://127.0.0.1:8080/testing/animation-sandbox/held-dig-next-five-review-v1/`

Nothing is approved or production-wired until the user selects a lane
explicitly.
