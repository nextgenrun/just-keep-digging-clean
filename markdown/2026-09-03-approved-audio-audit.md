# Approved audio integration audit - 2026-09-03

## Outcome and approval boundary

Five planned integration batches are implemented in the source checkout.
The user export contains 47 approved scenarios, 34 rejected, and 1 open; the
approved scenarios resolve to 51 source assets. The original export is unchanged:
SHA-256 `f75b9ceee77ba998a9f98ef11c51a906a5f98751c431926732ffd3918c238cc4`.
The frozen copy is `testing/audio-review-2026-09-03/decisions.json`.

Rejected/open scenarios are not promoted. Approval of a composite authorizes
its mixed use, not a rejected standalone stem. `caveEerie`, `evilSpell`, and
`panicTimber` are restricted to the approved deep-cave composite; `windReference`
is restricted to approved reference rain. All new Freesound discoveries remain
review-only. No commit, deployment, or change to the original decision file.

## Layer structure and event ownership

| Layer | Owner and trigger | Boundaries |
| --- | --- | --- |
| Contact / material / landing | Existing mining result and genuine downward landing | No cooldown/empty-target impact; no spawn or teleport landing cue; no generic break stacked on final Star destruction |
| UI / success / reward | Existing activation and successful purchase/manual-save/resource-arrival callbacks | Click at activation; no generic delayed confirm; one arrival cue per pickup group |
| Cave bed / creepy detail | Depth-gated controller and existing stress/seismic authorities | Enter at depth 300, exit below 260; sparse nonrepeating details; vocal detail fades out during speech |
| Approved creepy composite | One cave bus | Three core loops plus one entry accent start atomically; no isolated late stem; accent shares cave fade/headroom |
| Rain / shelter / wind | Existing recorded-weather controller | Stable 90-second variants; interior rain under cover; covered wind at 20%; reference rain replaces the extra wind bed |

Runtime configuration is in `values/reviewedAudioAssets.js` and
`values/reviewedAudioMix.js`. Source gain passes through category/speech duck
and then Phaser master once. The one-shot/cave/weather peak budgets are
0.50 / 0.10 / 0.14 before user category/master gains. Voice has explicit 0.72
headroom. Long reviewed assets load on demand in production; the audition stage
preloads its 51 sources for immediate comparison. The next 4,250-candidate
review catalog is never preloaded or imported into gameplay.

## Audit 1 - timing and lifecycle

`testing/2026-09-03-reviewed-audio-timing-contract.mjs`: 12 checks passed.
Independent result: `testing/audio-review-2026-09-03/timing-audit.json`.

Coverage includes exact approval/source hashes; real contact/material dispatch;
one Star cue; UI cooldown/tail bounds; stale-load dropping; composite-only gates;
nonrepeating variant bags; active CaveScene clock; contact-source onset no later
than 30 ms; atomic four-stem loading; genuine landing detection; pause/mute/
teardown cleanup; success-only hooks; and silent recovery to calm stress.

The CaveScene uses its active loader and clock while the origin scene is paused.
A missing transient warms the next event, rather than replaying a stale impact.
Weather fades an obsolete outdoor layer while its replacement loads; procedural
coverage can fill that gap. Cave composites retain their previous valid bed until
all new stems are ready.

## Audit 2 - volume and headroom

`testing/2026-09-03-reviewed-audio-volume-contract.mjs`: 11 checks passed.
Independent result: `testing/audio-review-2026-09-03/volume-audit.json`.

All 51 decoded production sources are unclipped. New impacts have leading
silence trimmed and short edge fades; new loops receive a 40 ms seam overlap.
One reference-rain source with minor overshoot was attenuated. There is no
blanket equal-RMS normalization: quiet details remain behind contacts and cues.

The dense Star cue is at 0.18 gain. Level-up variants are at 0.20 / 0.50 and
match within 1.4 dB by active RMS. Cave detail, UI feedback, heavy rain and
sheltered rain retain distinct roles. The source-level report is nominal solo
gain before context, overlap caps and speech ducking, not perceived loudness.

The audit also verifies single-master routing, live tracked-SFX gain changes,
music crossfade envelopes, retained user preferences during speech ducking,
voice/NPC gain, bounded SFX/cave/weather overlaps, reference-rain wind ownership,
covered-wind attenuation, and mute. The shelter wind issue was found in the live
pass and corrected before the final audit.

`pipelines/audio/auditReviewedAudioMix.py` rendered 12 approved-only overlap
cases. All passed with zero clipped samples. The highest 4x-resampled true peak
was 0.1889957, or -14.47 dBFS, in the full-master/full-SFX overlap case.
Placements, gains, bus scaling and WAV paths are in
`testing/audio-review-2026-09-03/rendered-volume-audit.json`.

## Browser proof and focused regressions

Canonical `serve.py` served the current checkout on port 8080. The save-free
stage uses real Phaser SoundSystem and the real mining-feedback dispatcher:
`http://127.0.0.1:8080/testing/audio-review-2026-09-03/`.

The live pass loaded 51/51 sources with no recorded browser/load errors. Dirt
and stone dispatch differed from scheduled contact by 3.6 and 3.5 ms respectively
(render-frame quantization, not hardware latency). It verified atomic composite
entry, seven overlapping effects at full master, speech ducking from 0.90 to
0.45 with vocal detail cleared, rain/shelter/night selection, and mute/stop.
Covered wind settled to exactly 20% of its outdoor gain. No clipped frames were
observed; the session meter peak was 0.1755. Evidence is retained in
`testing/audio-review-2026-09-03/browser-evidence.json`.

The preview volume was restored to 50% and confirmed on a fresh click preview,
then all sounds were stopped. Phaser's AudioParam getter can retain its previous
reported value during silence, so the volume restoration was checked during
playback rather than relying on an idle readout.

Fourteen focused JavaScript contracts passed: the two new audio audits plus
streaming, Star/level-up, recorded weather, contextual music, event voice,
merchant voice cycle, jump/flight controls, both prior audio review contracts,
earthquake feedback lifecycle, earthquake event cohesion, and Hardcore panic.
The streaming fixture now includes the current music-director API and the
approved short preload set; Boot remains 41 audio seeds / 12.7 MiB, with long
review beds excluded. The importer safety contract passed without network calls.
Scoped syntax and whitespace checks also passed.
The final contract run is retained in
`testing/audio-review-2026-09-03/focused-regressions.json`.

These are focused contracts and a save-free runtime stage, not whole-repository
health or a full gameplay playthrough. Actual shop/save/loot callbacks were
checked by routing/source assertions, not real purchases or writes to a save.
The offline renders exclude existing music, speech and procedural waveforms.
Legacy raw procedural tails are not all governed by the new tracked-SFX budget
or live gain refresh. No calibrated hardware/SPL or subjective listening approval
is claimed. A gameplay listening pass remains appropriate before release.

## Freesound 50x review expansion - completed review import

Target reached: 4,250 distinct candidate IDs and source hashes from an 85-source
baseline, across all 22 families and 1,271 creators. The 48 cached search pages
contain 2,521 CC0, 1,497 CC BY 4.0, and 232 CC BY 3.0 catalog candidates.
Nine of the 24 older leads now match imports; the other 15 remain link-only and
do not count toward the target. The inbox consequently shows 4,265 cards.

`pipelines/audio/2026-09-03-freesound-review-searches.json` defines 107 queries
across 22 gaps: earth/stone/metal/ice mining, wood/supports, footsteps, landings,
Flight/air, mechanisms, robot power, tactile UI, economy/rewards, Star impacts
and texture, portals, danger/panic, cave beds/details, water, fire, rain/shelter,
and wind/town. This is a search plan, not a claim that all candidates are good.

`pipelines/audio/crawlFreesoundReview.py` uses the documented API with caching,
pacing, ID/hash deduplication, creator/pack caps, explicit CC0/CC BY declarations,
format/duration screening, and on-demand HQ preview links. No originals are
downloaded. It stops on access/rate/response errors and never logs a credential.

The user-authorized API application `Understar Private SFX Review` was
registered through the signed-in account. Windows runner isolation required a
one-time encrypted, in-memory credential handoff. No plaintext key was printed,
written to a file, put in command arguments, or added to the frontend. Temporary
key references were cleared after completion; no persistent key setting was made.
For another permitted pull, supply the process environment or a private
`--key-stdin` pipe with `--execute --api-use-authorized --max-requests 200`.
API credentials and commercial API permission are separate from each sound's
reuse license; registration is not commercial clearance. See the
[official API documentation](https://freesound.org/docs/api/) and
[API terms](https://freesound.org/help/tos_api/). No disallowed search-page scrape
or login/rate-limit bypass was attempted.

A transient Windows reader lock interrupted an atomic catalog save. A bounded
local-save retry was added and the run resumed from cached responses without
refetching them. Exhausted searches are skipped; HTTP access/rate errors still
stop without retries. A complete catalog returns with zero further requests,
even when no key is configured.

`testing/audio-review-2026-09-03/freesound-catalog-audit.json` verifies every
candidate's ID/hash uniqueness, approved-license declaration, HTTPS source and
preview hosts, sample rate, channel/duration bounds, and review-only flags.
Largest creator/pack contributions are capped at 100/40. The global target
is not a claim that every gap is filled: landing/movement (15) and earth digging
(52) remain the thinnest pools and should lead a future focused search.

Five post-fix browser checks are retained in `freesound-browser-evidence.json`
in the same review folder: skip-during-load cancellation without a stale error,
250-item creepy-family search, real cave-preview playback at 35%, stop/unload,
and the completed inbox restored with zero decisions and no autoplay. A dig
preview also reached its playing state. Earlier observations retain the stale
warning that prompted the fix; they are not presented as passing final checks.
Only sample previews were exercised, not all 4,250 audio files. No new runtime
audio integration, original-master QC, loop validation, or listening approval
is implied by this import.

The new inbox is `testing/audio-review-2026-09-03/freesound.html`. It provides
single-preview playback status, search/filters, J/K navigation, A/R/U decisions,
and import/export. Changing items stops the old preview. Approval there is for
a future wiring pass; it never automatically changes production eligibility.
