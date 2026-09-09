# Pickup and footstep follow-up - 2026-09-05

Open http://127.0.0.1:8080/testing/audio-pickup-footstep-2026-09-05/.

The latest local audio cleanup fixes real-body ground detection, lowers footstep and pickup prominence, removes routine XP ticks, uses four short matched coin recordings, and shares repetition limits for loot and shop bursts. The active catalog contains 753 files; 341 Freesound sources remain active out of 562 preserved approvals. Saved decisions and original recordings are retained.

Before snapshots preserve the first cleanup. That implementation sampled width/height on a real collision body that exposes w/h. Both the current regression and listening fixture now use the actual body shape and spatial ground rows. The first-pass generic-body fixture missed this distinction.

Run the following with the configured Node and Python runtimes:

- node --import ./testing/audio-pickup-footstep-2026-09-05/baseline-loader.mjs testing/audio-pickup-footstep-2026-09-05/capture.mjs before
- node testing/audio-pickup-footstep-2026-09-05/capture.mjs after
- python -B testing/audio-pickup-footstep-2026-09-05/render-comparison.py
- node testing/audio-pickup-footstep-2026-09-05/verify.mjs

Source completion times come from source-metrics.json. Re-capture after adding a newly measured source. The renderer uses the trusted installed FFmpeg. It produces 24 current/before WAV sequences plus 2 footstep tone auditions, and 6 short mono 24 kHz OGG candidate assets. All candidates are offline edits of existing recordings and remain review-only. The overly attenuated exploratory pickup edit is withdrawn and identified in withdrawn-pickup-edit.json.

credits.json preserves source references, hashes and exact edit points. final-audit.json distinguishes focused checks, baseline failures, static served-file verification and the lack of manual browser or listening acceptance. No candidate is installed in gameplay.


## Destruction and pickup timing - 2026-09-05

The current timing cleanup and native Phaser proof are in `testing/audio-destruction-pickup-2026-09-05/`; see `markdown/2026-09-05-destruction-pickup-audio-timing.md`. Eleven existing recordings now use short playback windows from `values/coreSfxWindows.js`, including six 90-120 ms footstep contacts. The current page includes a live walk and isolated mining layers; outdated hard-walk/mining composites are withdrawn. Only resource arrival owns pickup audio; XP cannot replay it later. Original files and review IDs are preserved. Prior audio comparisons remain historical snapshots.
