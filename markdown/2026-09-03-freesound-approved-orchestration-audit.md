# Approved Freesound orchestration — completion audit

All **562 approved candidates** from export (2) are prepared, attributed and
connected to reachable runtime roles. The batch is enabled by default. The 775
rejections and all unreviewed catalog entries remain outside this runtime batch.
The earlier 51-source audio integration, including the approved Star destruction
and level-up cues, is preserved; its source-hash contracts still pass.

## Authority and provenance

- Export: `understar-freesound-review-decisions (2).json`,
  `2026-09-03T11:04:38.073Z`.
- SHA-256: `9968a81d2fb652b749543e7e3c18bcf105975ab1952a533c31b5dab94ec62ed7`.
- Frozen copy: `testing/audio-review-2026-09-03/freesound-approved-decisions.json`.
- Prepared output: 562 OGG files, 24,855,089 bytes, zero preparation failures.
- Source material is the catalogued public HQ MP3 preview, **not a lossless
  original**. Original downloads have not been substituted or claimed.
- The asset manifest records creators, source/license links, source and output
  hashes, processing and decoded measurements. All 562 attribution entries are
  in `sound/soundEffects/approved-freesound-2026-09-03/CREDITS.txt`, also linked
  from the game's Credits panel. No API keys or account tokens are included.

## Runtime placement and coverage

| Approved family | Count | Runtime role and trigger |
| --- | ---: | --- |
| Star texture | 80 | 8 site hums, 13 close textures, 59 sparse accents around intact Stars |
| Danger/panic | 84 | 5 recovery, 35 warning and 10 critical pulses; 34 aware seismic rumbles |
| Earth mining | 4 | Real earth-contact feedback |
| Stone mining | 19 | Real stone-contact feedback |
| Metal mining | 91 | Real metal-contact feedback |
| Ice/crystal mining | 79 | Crystal fracture feedback |
| Footsteps | 32 | Actual soft-ground floor contacts |
| Flight/air | 10 | Flight onset and meaningful direction transitions |
| Reward/economy | 15 | 7 pickup and 8 transaction/reward variants |
| Tactile UI | 56 | Interface clicks through the existing UI sound path |
| Wood/supports | 92 | Sparse structural creaks in appropriate deep wood/root contexts |
| **Total** | **562** | Every approved ID has a reachable consumer |

The full mapping is in `freesound-wiring-coverage.json`. Coverage means every
variant is available to its consumer, not that all variants play in one session.
There were no approvals classified as UI-mechanical; its existing fallback is
retained. Review ratings and this frozen wiring decision remain separate: new
ratings in the inbox require another explicit wiring/unwiring pass.

## Coherent layering and restraint

- Pack/creator-matched banks normally expose 2–6 variants, with no immediate
  repetition and gradual rotation after the time/use gates. Loading warms a
  future event and cannot replay a past contact late.
- Star pockets acquire within 10 tiles and release beyond 12, with smooth
  distance attenuation, left/right panning and rock attenuation/low-pass
  filtering. One dominant site has stable identity; a handover may overlap two
  sites, up to four voices. Near texture enters within 3.4 tiles. Consumption
  removes the emitter immediately and leaves the approved destruction cue intact.
- The nominal Star peak budget is calibrated **before** distance/rock gain, so
  limiting cannot flatten the distance cue. Browser QA caught and corrected
  this interaction. Steady measured contribution rose from 0.028394 at six
  tiles to 0.044949 at two tiles in the controlled review.
- Panic follows the existing authoritative stress band, not an independent
  alarm timer; recovery and two-voice crossfades are bounded. Seismic details
  require actual threat awareness. Structural accents have a 45-second gap.
- Refuge, speech and busy/danger states suppress optional detail. Essential
  warning/reward cues have admission priority over decorative one-shots.
- New Star and panic buses each reserve a 0.045 source-peak budget. The shared
  one-shot budget is 0.45 with ten maximum voices; category and master gains
  apply once. These are digital mix limits, not calibrated speaker loudness.
- Loading is bounded to four pending requests, 48 resident assets and 32 MiB
  of decoded audio. All 562 assets are not preloaded at startup.
- World inactivity stops world layers while allowing menu UI banks to warm.
  Cave updates use the cave's player/world/clock, not paused overworld Stars or
  threats. Pause, mute, scene shutdown and visibility lifecycle contracts pass.

No damage, movement cadence, rewards, panic accumulation, world generation,
Star refuge radius or save authority was changed. Tuning is in `values/`.
For a reversible comparison, `?approvedFreesoundAudio=0` disables this new batch.

## Audit 1 — timing and lifecycle

**Passed: 12 focused checks, covering all 562 approvals.** Exact export/asset
hashes, reachable banks, actual mining dispatch, no late loading replay,
distance/direction/rock behavior, stable site handover and consumption, panic
recovery, Flight threshold crossings, loading/priority bounds, menu warming,
context-gated detail, soft-floor footsteps and cave context ownership are covered.

Report: `testing/audio-review-2026-09-03/freesound-timing-audit.json`.

## Audit 2 — volume and decoded audio

**Passed: 8 focused checks, covering all 562 derivatives.** Preparation onset,
duration, seam, clipping, attribution and role levels are checked independently
from timing. Role loudness spread is under 4 dB before spatial attenuation and
shared bus limiting. One-shot source/category/master gain is applied once;
Star handover, distance calibration, panic crossfades, speech ducking and local
rock filtering respect the configured budgets.

Fresh native-channel decoding with 4x resampling checked all 562 files and six
conservative overlap renders: **zero clipped samples**. Maximum measured 4x
source peak was 0.8223264; maximum rendered overlap peak was 0.152728.
These renders omit fades/filtering/panning reductions, but also exclude existing
music, speech and procedural waveforms; they are not a full final-output capture.

Reports: `freesound-volume-audit.json`, `freesound-rendered-volume-audit.json`,
and six WAVs in `testing/audio-review-2026-09-03/orchestra-renders/`.

## Regression and browser evidence

All **16 focused regression contracts** pass, including the earlier audio,
weather, music, voice, earthquake, Hardcore feedback and 15-case player movement
contract. The separate catalog import check still passes all 4,250 catalog IDs.
This is focused validation, not a claim of full-repository health.

The browser evidence records 15 passing assertions across the listening stage,
inbox and actual game. It covers distance/pan/rock changes, panic, consumption,
out-of-range silence, isolated solo, mute, short keyboard taps, CSS-scaled grid
clicks, Escape stop, the 562/775 decision baseline and observed error checks.
Short-tap and grid interaction behavior was checked in the review stage.

Actual-game evidence, using the existing save-write-blocked local E2E harness:

- Intact Star at tile **75,68** emitted approved hum **423221** and near texture
  **522116**. Actual player distance was 3.15705 tiles, pan +0.5623, rock
  occlusion 0.4 and local filter cutoff 6520 Hz.
- A real mining contact played approved earth source **213005** after warming.
- The runtime used the real player, biome/weather and gameplay context, with
  no observed runtime/load errors. The game Credits link was visually checked.

Reports: `freesound-focused-regressions.json` and
`freesound-orchestra-browser-evidence.json` in the review folder. Earlier
pre-fix observations are retained and labelled; final assertions use corrected
calibrated/control observations.

## Listening handoff and limits

Open [the orchestration review](http://127.0.0.1:8080/testing/audio-review-2026-09-03/orchestra.html).
Start the world mix; use WASD/arrows or grid clicks, change material/panic/rock
conditions, inspect currently playing titles, or isolate any approved source.
0/Escape stops audio. The page does not access saves or change approvals.
[The inbox](http://127.0.0.1:8080/testing/audio-review-2026-09-03/freesound.html)
starts from the applied export while preserving local rating overrides.

This pass does not claim a full subjective listen to all 562 processed sounds,
long-session annoyance acceptance, headphone/mobile/speaker coverage or every
biome/cave browser playthrough. A short actual-game Escape attempt did not prove
the game pause transition and is explicitly excluded from browser acceptance;
pause lifecycle behavior is covered by focused contracts. Gameplay save writes
were blocked for the actual-game check, not all pre-existing menu/storage activity.

The next acceptance step is listening to the contextual mix at the user's normal
game volume. No additional candidate was approved during verification.
