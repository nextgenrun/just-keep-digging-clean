# Approved audio integration and next review - 2026-09-03

## Approval boundary

Input: user-supplied understar-audio-library-review-decisions.json,
exported 2026-09-02T22:33:30.742Z; SHA-256 f75b9ceee77ba998a9f98ef11c51a906a5f98751c431926732ffd3918c238cc4.
47 approved scenarios, 34 rejected, 1 open. The frozen import is retained in
`testing/audio-review-2026-09-03/decisions.json`. New Freesound discoveries stay
review-only. No deployment or commit.

An approved composite authorizes its exact mixed use, not all stems independently:
deepCave contains rejected standalone caveEerie and evilSpell, plus panicTimber.
Those sources are mix-only. digSequence authorizes the existing dig takes and
restrained variation, never a fixed demo timer in live gameplay.

## Piecemeal batches

1. Freeze approvals, measure every referenced source, and prepare a small
   production-only registry/asset directory with source hashes and processing.
   Reuse existing approved Star, level-up, rain reference, and dig assets.
2. UI/reward: quiet hover, distinct click/confirm, one menu-open cue; purchase
   after transaction success; manual-save after persistence success; one resource
   arrival cue per pickup group. Preserve one Star destruction and one level cue.
3. Mining/movement: actual contact-frame impact, dirt versus hard-material break,
   restrained tool/swing layer; debris only on genuine downward landing, no
   initial spawn/teleport/standing spam. Preserve movement authority and cadence.
4. Cave/danger: depth-gated core bed, sparse nonrepeating distant detail, at most
   one vocal detail; speech suppresses creepy voices. Approved warning/rumble
   use existing stress/seismic events, never an independent danger scheduler.
   Wet torch reaction needs a real extinguish/wet transition, not ambient spam.
5. Weather: extend the existing weather controller, not a second rain player.
   Contextual rain variants, shelter/interior coverage, day/night wind, stable
   selection, bounded crossfade, no surface weather at deep depth.

## Audit 1 - timing and lifecycle (separate result)

Check contact ownership; cooldowns; no repeat until alternatives exhausted;
muting; scene shutdown/pause/restart; async-load cancellation and stale cues;
max concurrent layers; transition settling; no false landing, duplicate rewards,
autosave sounds, unapproved candidates, or rejected standalone stems.
Run focused audio contracts plus jump/flight motion contract where applicable.
Verify live source runtime through serve.py, not stale dist.

## Audit 2 - volume (separate result)

Decode and measure duration, peak, RMS, onset, true peak where available.
Avoid blind equal normalization: transient/body/details have different weights.
Master applies once; category gains remain independently adjustable.
Maintain headroom for contact + break + distant bed, rain + wind, and UI + speech.
Apply controlled attenuation/fades where needed; document source-to-runtime gain.
Probe live browser mix state; measurements do not replace human listening.

## Freesound review expansion

Baseline: 85 unique playable sources; target: 4,250 unique review candidates.
Use the documented API, cached/resumable pages, conservative rate limits and
ID deduplication. Search missing material impacts, loops, mechanisms, traversal,
UI, reward, hazard, deep ambience, water/fire/weather, Star and portal families.
Filter CC0/CC BY; retain author, license URL, source URL, duration, source format,
sample rate, channels, previews, query provenance and approval status.
Stream only the selected preview; never preload thousands of files. Quality is
candidate metadata plus human audition, not a blanket claim of approved masters.
API access was subsequently registered and the 4,250-candidate pull completed.
The key was used in memory only, not persisted in the project or frontend.
Do not scrape disallowed search pages or bypass login/rate-limit challenges.

## Handoff status

The five approved integration batches are implemented. Timing/lifecycle and
volume have separate passing reports: 12 and 11 checks respectively, with
twelve unclipped approved-overlap renders. A save-free live Phaser stage
verifies actual mining dispatch, composite entry, speech ducking, shelter,
night wind and mute. Full gameplay transaction/save/physics coverage and a
subjective listening pass are still outside this proof.

The Freesound expansion now contains 4,250 distinct candidate IDs/hashes across
all 22 families, from 1,271 creators: 2,521 CC0 and 1,729 CC BY declarations.
Forty-eight cached search pages reached the global target. The 15 remaining
link-only older leads are labelled separately; nine older leads match imports.
All new candidates remain unreviewed and never auto-promote into runtime.
Metadata safety checks and five post-fix browser checks pass. Original-master
QC, loop suitability and subjective approval remain future review work.

See `2026-09-03-approved-audio-audit.md` for evidence, exact boundaries and the
next authorized step. Nothing was committed or deployed.
