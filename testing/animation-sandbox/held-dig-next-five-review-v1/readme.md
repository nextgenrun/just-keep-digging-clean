# Held Dig Next Five Review v1

Review-only Before/After mockups for the five highest-impact animation seams
remaining around held moving Dig.

The builder uses the real Survival UAL runtime manifest, Jog, Jab, Cross,
moving-side composites, phase atlas and moving-diagonal atlas. Proposed frames
are assembled only inside this sandbox. It does not edit the Piskel sources,
runtime sheets, selectors, gameplay timing, collision, contact events or save
data.

The default preview uses the production 750 ms base mining cadence rather than
the misleading maximum-speed review cadence. Both sides share identical
collider travel, targets and contact timing so only the visual handoff changes.

## Build

```powershell
python testing\animation-sandbox\held-dig-next-five-review-v1\build_mockups.py
```

## Review

Serve the repository and open:

`http://127.0.0.1:8080/testing/animation-sandbox/held-dig-next-five-review-v1/`

Nothing in this review is approved or production-wired until the user selects a
lane explicitly.
