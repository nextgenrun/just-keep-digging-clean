# Core action audio cleanup - 2026-09-05

Implementation audit and before/after listening sequences using the actual SoundSystem and mining dispatchers. These fixtures do not constitute a manual playthrough or subjective listening approval. Original assets and the unfinished review export are preserved.

Open `http://127.0.0.1:8080/testing/audio-design-cleanup-2026-09-05/`.
Run `node --import ./testing/audio-design-cleanup-2026-09-05/baseline-loader.mjs testing/audio-design-cleanup-2026-09-05/capture.mjs before`, then `node testing/audio-design-cleanup-2026-09-05/capture.mjs after` and `render-comparison.py` with the bundled Python. `verify.mjs` writes the focused behavioral report. `final-audit.json` records validation and limits. See `markdown/2026-09-05-core-action-audio-cleanup.md` for findings and provenance.

The WAVs and final-audit.json preserve the first cleanup snapshot. The latest mix and corrected real-body floor probes are in `../audio-pickup-footstep-2026-09-05/`. Its predecessor fixture used generic body dimensions and missed the ground-material bug.
