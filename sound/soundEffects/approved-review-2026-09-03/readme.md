# Approved review derivatives - 2026-09-03

Production-owned derivatives of the exact user-approved review sources.
`manifest.json` records the decision-export hash, upstream paths/provenance,
source and output hashes, edit windows, loop treatment, and decoded measurements.
The original review files and original user export are unchanged.

The registry is `values/reviewedAudioAssets.js`; gains and contextual budgets
are in `values/reviewedAudioMix.js`. The 47 approved scenarios resolve to 51
sources, including reused Star, level-up, dig and reference weather assets.
Rejected/open scenarios are not promoted. `caveEerie`, `evilSpell`, `panicTimber`
and `windReference` are authorized only inside their approved composites.

The build only reduces peaks when necessary, trims impact leading silence, and
overlaps loop seams by 40 ms. It does not raise every source to the same RMS.
The retained upstream license/attribution manifests still apply. In particular,
the reused rhodesmas Level Up 01 remains CC BY 4.0; see the adjacent
`approved-sfx-findings-v1/2026-08-31-freesound-approved-sfx-manifest.json`.
Sonniss provenance remains in the source review manifests; no new rights are
created by approval or conversion.

Rebuild using `pipelines/audio/prepareApprovedReviewAudio.py` with a trusted
local FFmpeg installation, then rerun the separate timing and volume contracts.
Audit results: `markdown/2026-09-03-approved-audio-audit.md`.
