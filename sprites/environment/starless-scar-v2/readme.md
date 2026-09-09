# Starless Scar V2

`starless-scar-territory-material-v2.png` is the authored transparent material
used by `StarlessScarView`. The runtime tiles it in world space and clips it to
the complete nearest-Star territory; the bitmap never owns gameplay coverage,
territory assignment, Panic, rewards, or save state.

The source was generated as one bounded built-in ImageGen sample on 2026-08-30.
Prompt intent: a seamless top-down field of charcoal ash, blackglass mineral
bloom, muted wine-violet fissures, and sparse dead-starlight specks, with even
density, transparent breakup, no focal circle, no radial spokes, no text, and
no watermark.

Do not replace the area mask with the bitmap's silhouette. Complete territory
ownership and the 14-tile no-territory fallback remain authoritative in
`values/starSanctuary.js`.
