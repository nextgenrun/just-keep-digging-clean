# Approved audio runtime review - 2026-09-03

This save-free test stage uses the real Phaser `SoundSystem` and mining feedback
dispatcher. It does not simulate gameplay physics, transactions, or save storage.
All 51 earlier source assets preload here for audition; production keeps long
beds lazy. Event methods may also warm the newly approved Freesound banks.

## Current wired orchestra — export (2)

Open `orchestra.html` for the 562-source batch, finite Star sound pockets,
rock muffling, state-driven panic, material contacts and explicit solo audition.
WASD/arrows move the listener, F tests a contact, and 0/Escape stops all audio.
Short direction taps move a quarter-tile; held keys move continuously. Grid
clicks are converted using the displayed canvas bounds, including CSS scaling.
The page does not access saves, change approval decisions or simulate physics.

All 562 IDs are wired; the original catalog's rejected/unreviewed IDs remain
outside this batch. `freesound.html` edits review decisions, not runtime wiring.
Its cards identify inclusion in the frozen batch separately from current ratings.
The approved export is byte-identical in `freesound-approved-decisions.json`.

Current evidence: `freesound-timing-audit.json`, `freesound-volume-audit.json`,
`freesound-rendered-volume-audit.json`, `freesound-focused-regressions.json`,
`freesound-wiring-coverage.json`, and `freesound-orchestra-browser-evidence.json`.
Six reproducible diagnostic WAVs are in `orchestra-renders/`.

For read-only diagnostics inside the actual game, open
`/?jkd_e2e=1&audioReview=1&cinematics=0`. The panel is installed only after the
existing local E2E harness blocks gameplay save writes. F6 uses its existing
semantic Star preview; normal movement/mining remains unchanged. No panel is
created in normal gameplay. Close it or leave the scene to detach its listeners.
See `../../markdown/2026-09-03-freesound-approved-orchestration-audit.md`.

Start canonical `serve.py` from the repository root, then open
`http://127.0.0.1:8080/testing/audio-review-2026-09-03/`.
Enable audio, choose a cue/layer, and inspect the exact keys/gains and event log.
D/S test dirt/stone contacts; 0/Escape stops active sounds and queued contacts.
The master begins at 50%. The speech button simulates ducking, not a voice clip.

## Evidence

- `decisions.json`: unchanged user export; 47 approved, 34 rejected, 1 open.
- `source-measurements.json`: before/after decoding, hashes, onset and peak/RMS.
- `timing-audit.json`: separate timing/lifecycle contract results.
- `volume-audit.json`: separate gain/volume contract results.
- `mix-settings.json`: exact registry and mix settings used by the render audit.
- `rendered-volume-audit.json`: twelve approved-only overlap renders.
- `browser-evidence.json`: visible-DOM snapshots from the live runtime stage.
- `focused-regressions.json`: the final fourteen focused JavaScript contracts.
- `review-inbox-evidence.json`: search/navigation proof with decisions untouched.
- `freesound-catalog-audit.json`: all 4,250 imports, uniqueness, licenses, quality metadata and review-only gates.
- `freesound-browser-evidence.json`: five passing post-fix preview/navigation checks, with earlier observations retained.
- `renders/`: reproducible local WAV evidence; not production assets.

Full integration notes and verification limits are in
`../../markdown/2026-09-03-approved-audio-audit.md`.

## Next review

`freesound.html` is a separate review-only inbox. J/K navigate, A/R/U record
approve/reject/unreviewed, Space plays or pauses the selected preview, and 0 or
Escape stops it. Search covers title, creator, family, source ID and tags.
Decisions persist locally and can be exported/imported. Nothing auto-promotes.

The target is complete: 4,250 distinct imported candidates across 22 families.
The remaining 15 link-only older leads are displayed separately (nine older
leads now match imports), for 4,265 visible cards. Playback is on demand at an
initial 35%; loading/playing/paused/stopped states are explicit. Skipping a
loading clip cancels its pending status update instead of showing a stale error.
No decisions were made during verification, and the page was left stopped.

Review needs no API key. Future imports require permitted API use and a key in
the process environment or a private `--key-stdin` pipe. No key is stored in the
repository. These are metadata-screened previews, not approved shipping masters.
