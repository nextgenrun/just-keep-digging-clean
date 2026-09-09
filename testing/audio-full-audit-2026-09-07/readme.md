# Full audio audit - 2026-09-07

Current-source catalog, FFmpeg measurements, behavioral regression evidence and
browser checks for the existing audio stack. Original recordings and approval
decisions are preserved. Generated measurements describe digital audio, not
human listening acceptance or calibrated speaker volume.

Run `node testing/audio-full-audit-2026-09-07/catalog.mjs`, then the local
`measure.py` with `--ffmpeg` and `--ffprobe`. Results stay in this directory.

Open index.html through the canonical serve.py server for matched A/B listening.
Native.html uses real Phaser Web Audio without a world renderer; run its button to
verify playback, source edits and settings. The complete findings and limits are
in markdown/2026-09-07-full-audio-audit.md.

project-source-mix.mjs generates the music/shared-voice tables from measurements.
measure.py --reuse-unchanged reuses results only after exact full SHA256 matching.
render-auditions.py writes eight before/after WAV examples with fresh measurements.
run-existing-contract.mjs redirects only report outputs and preserves assertions.

New regression entrypoints: testing/2026-09-07-audio-lifecycle-contract.mjs and
testing/2026-09-07-audio-mastering-contract.mjs.
