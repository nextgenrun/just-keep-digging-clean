# Active game-time audio re-audit — 2026-09-04

This is a fresh, review-only KEEP/REJECT and volume pass over every physical
audio clip reachable from the default game-time audio path. It does not change
prior approvals, runtime routing, saves, assets, or player settings.

## Included

- current Freesound role banks;
- reviewed SFX, composite stems, weather, and retained fallback cues;
- event-driven Miner voice lines and active merchant/NPC voice lines;
- every music track routed to a gameplay context or gameplay cue.

Duplicate paths are merged into one card with every live key/route shown.
Menu-only music, disabled legacy-random player lines, cinematics, archives, and
review-inbox candidates are excluded.

## Run

Start canonical `serve.py` from the repository root and open:

`http://127.0.0.1:8080/testing/audio-runtime-reaudit-2026-09-04/`

The first listen uses a conservative suggested gain. `Current runtime gain`
provides the A side, `Suggested gain` provides the B side, and V switches
between them without restarting a playing clip. `Your tuned gain` follows the
per-clip slider; changes save in separate browser-local storage. `Solo
inspection` raises very quiet layers for source-quality diagnosis. Only one
clip plays at a time.

Suggestions are starting points, never automatic increases. They trim the
current normalized/runtime gain by role and overlap risk: music starts at 0.30,
player callouts at up to 0.42, merchants at up to 0.34, and very loud legacy
hit/break cues at 0.26–0.30. Repeating ambience, UI, movement, and stress layers
use lower role-specific caps. Each card shows the current value, suggestion,
dB change, rationale, measured peak/active RMS when available, and final tuned
value.

Controls: H/J previous/next, N next unreviewed, K KEEP, R REJECT, U clear, V
current/suggested A/B, Space play/pause, and 0/Escape stop. Verdicts and volume
overrides stay in browser-local storage and can be exported/imported. The export
contains every clip's current, suggested, and final tuned gain plus the relative
dB changes. Exports explicitly remain `reviewOnly: true` and
`runtimeWired: false`.

## Refresh and verify

Regenerate after an audio-routing change:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  testing/audio-runtime-reaudit-2026-09-04/catalog-builder.mjs
```

Then run:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  testing/2026-09-04-active-gametime-audio-reaudit-contract.mjs
```

## Core action cleanup - 2026-09-05

`values/coreActionAudio.js` owns the physical-contact shortlist and movement/mining mix.
The full source approval registry is preserved; active banks and the re-audit use a
separate runtime projection. Mining plays one primary hit or break per contact.
Landing uses immediate pre-contact speed. Before/after listening sequences and
the original unfinished review export are in `testing/audio-design-cleanup-2026-09-05/`.


## Pickup and footstep follow-up - 2026-09-05

The latest local mix and footstep tone auditions are in `testing/audio-pickup-footstep-2026-09-05/`. The foot-material probe now uses the real collision body dimensions, routine XP ticks are removed, and pickup/shop repetition is bounded. `values/coreActionAudio.js` owns runtime tuning; `values/audioPickupFootstepReview.json` owns the six offline footstep edits, which remain audition-only.


## Destruction and pickup timing - 2026-09-05

The current timing cleanup and native Phaser proof are in `testing/audio-destruction-pickup-2026-09-05/`; see `markdown/2026-09-05-destruction-pickup-audio-timing.md`. Eleven existing recordings now use short playback windows from `values/coreSfxWindows.js`, including six 90-120 ms footstep contacts. The current page includes a live walk and isolated mining layers; outdated hard-walk/mining composites are withdrawn. Only resource arrival owns pickup audio; XP cannot replay it later. Original files and review IDs are preserved. Prior audio comparisons remain historical snapshots.
