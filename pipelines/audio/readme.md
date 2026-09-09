# Audio Pipelines

Offline tools for generating, inspecting, and preparing audio assets.
Discovery/generation stays review-only. Explicitly approved exports may produce
measured local assets and immutable data; runtime hooks are implemented and
audited separately, never inferred from a discovery or generation result.

## Approved Freesound export (2) — 2026-09-03

`prepareFreesoundApprovals.py` freezes the exact 562 approvals, downloads only
their public catalogued HQ previews, and delegates PCM preparation to
`freesoundApprovedPreparation.py`. It records hashes, edit points, normalized
levels, decoded duration/onset/peak/RMS, loop seams and complete source credits.
These are preview-derived OGG assets, not claimed lossless originals.

Use `--execute --decisions <exact-export>` to prepare/resume, or add
`--project-only` to rebuild gain/role metadata from verified local derivatives
without FFmpeg or network access. Configuration lives in
`values/freesoundAudioPreparation.json`; generated runtime projections are in
`values/generated/approved-freesound/`. Preparation refuses a changed export
hash or incomplete approval set.

Run `testing/2026-09-03-freesound-audio-timing-contract.mjs` separately from
`testing/2026-09-03-freesound-audio-volume-contract.mjs`. Then run
`auditFreesoundOrchestra.py --ffmpeg <trusted-executable>` for a fresh 4x decode
of all 562 derivatives and six conservative source-overlap renders. This audit
excludes music/speech/procedural waveforms and does not claim perceptual or
calibrated speaker acceptance. No keys or API account access are needed.

## Stable Audio library pipeline

- `2026-08-26-generate-stable-audio-library.py` reads the existing GX prompt
  CSV, expands each event into isolated layers, estimates the exact Stability
  credit cost, and writes approved API results only to the raw review inbox.
- `stableAudioApi.py` owns the small standard-library HTTP client for Stable
  Audio 3.0 and 2.5. It supports both asynchronous and immediate responses.
- `2026-08-26-stable-audio-pipeline.json` is the single pipeline configuration
  for endpoints, prices, layer profiles, durations, and output locations.

The generator is a dry run unless `--execute` and a sufficient
`--max-credits` ceiling are both supplied. It reads `STABILITY_API_KEY` from
the environment and never stores or prints the key.

```powershell
$python = 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'

# Inspect one four-layer event without spending credits.
& $python pipelines/audio/2026-08-26-generate-stable-audio-library.py --ids GX201

# Generate one inexpensive Stable Audio 2.5 onset after setting the key.
& $python pipelines/audio/2026-08-26-generate-stable-audio-library.py `
  --model stable-audio-2.5 --ids GX201 --layers onset `
  --execute --max-credits 20
```

Generated files retain the asset ID first:

```text
GX201_robot_power_on_clean_01__onset__take01__UNTESTED.wav
```

Human review remains mandatory. Promote only explicitly rated-good candidates
through the existing `SoundLibrary_Review` workflow.

## ElevenLabs layered SFX mockup

- `2026-08-26-generate-elevenlabs-sfx-mockup.py` creates a bounded audition
  pack from eight representative GX prompts.
- Every asset receives one complete reference mix and four isolated layers.
- `elevenLabsSoundApi.py` owns the sanitized standard-library API client.
- `elevenLabsReviewPage.py` creates a local browser sampler with simultaneous
  layer playback and browser-local ratings.

The command is dry-run by default. Live execution requires both generation and
estimated-credit ceilings, and reads `ELEVENLABS_API_KEY` only from the process
environment.

```powershell
& $python pipelines/audio/2026-08-26-generate-elevenlabs-sfx-mockup.py

& $python pipelines/audio/2026-08-26-generate-elevenlabs-sfx-mockup.py `
  --execute --max-generations 40 --max-credit-units 2880
```

## ElevenLabs prompt contrast V3

The V3 contrast lab is the follow-up when the layered mockup sounds too
synthetic or too similar. It reuses the same eight sound families for a fair
A/B comparison, but generates only complete candidates with hand-authored,
material-specific prompts. It does not attempt to make an imagined transient,
body, detail, and tail independently.

- The original six one-shot families receive three physical-source directions,
  and the two ambience families receive two sparse loop directions.
- Twenty-six additional families receive two deliberately contrasting prompts,
  covering robot movement, Flight, special tiles, core mining, UI, rewards,
  discovery, deep danger, torch response, void, and Star material.
- One-shots use `0.36`–`0.42` prompt influence and loops use `0.32`, leaving
  more room for variation than the original `0.72` / `0.62` mockup.
- Each prompt bans the likely family-specific failure sounds instead of sharing
  one generic suffix across the entire library.
- The review page compares every new candidate with its previous reference mix,
  stores ratings per candidate, and exports the decisions as JSON.

Preparing the page is free and makes no network requests:

```powershell
& $python -B pipelines/audio/2026-08-26-generate-elevenlabs-prompt-contrast-v3.py --prepare
```

A small dirt-versus-stone first pass is six requests, 8.4 seconds, and uses a
conservative 336-unit ceiling:

```powershell
& $python -B pipelines/audio/2026-08-26-generate-elevenlabs-prompt-contrast-v3.py `
  --ids GX261,GX270 --batch elevenlabs-prompt-contrast-v3-dirt-stone-2026-08-26 `
  --execute --max-generations 6 --max-credit-units 336
```

The complete expanded plan is 74 requests and 117.8 seconds. The conservative
fixed-duration estimate is 4,712 credit units. Current cost assumptions follow the official
[ElevenLabs Sound Effects documentation](https://elevenlabs.io/docs/overview/capabilities/sound-effects);
actual account billing and returned cost headers remain authoritative.

The completed batch returned 74 ready files and zero failures. It contains
1,951,749 bytes of MP3 audio with 74 unique SHA-256 hashes; the API response
headers reported 1,178 total cost units. All files remain `UNTESTED` until the
expanded listening review is complete.

## ElevenLabs material-stem V4 anti-glass gate

V4 keeps the ElevenLabs API but treats it as a raw-source generator. Eight
representative events are split into 24 physical stems, with short positive-only
prompts and prompt-influence takes at `0.2`, `0.3`, and `0.4`. The natural cave
loop uses two takes per stem. A prompt linter rejects negation and the recurring
V3 trigger vocabulary before any request is sent.

`elevenLabsAudioQc.py` decodes every result through FFmpeg and auto-quarantines
category-specific excessive brightness, high-band energy, narrow ringing,
stationary hum, clipping risk, and cross-family near-duplicate spectra. The
review page hides quarantined rows by default. Automated passing means only that
a stem is eligible for listening; it is never runtime approval.

```powershell
# Free dry run and review-page preparation.
& $python -B pipelines/audio/2026-08-26-generate-elevenlabs-material-stems-v4.py

# Local QC-only rerun; this makes no API requests.
& $python -B pipelines/audio/2026-08-26-generate-elevenlabs-material-stems-v4.py --recheck

# Masked key entry with plan-derived request and credit ceilings.
& pipelines/audio/2026-08-26-run-elevenlabs-material-stems-v4.ps1 `
  -PythonExecutable $python
```

The completed pilot returned 69 unique files and zero API failures. Response
headers reported 774 cost units. The strict gate quarantined 38 results and left
31 for listening. Those survivors have median spectral centroid 596 Hz and
median energy above 4 kHz of 1.4%, compared with 4,162 Hz and 40.1% across V3.

Human listening review rejected the entire V4 batch: the candidates still read
as robotic, metallic, high-pitched, glass-like, and too similar across intended
materials. The automated gate therefore did not predict perceptual usefulness.
ElevenLabs is retired as a production Foley source for this library. The files
remain review-only failure evidence; zero are runtime-eligible or runtime-wired.

## Recorded-source replacement: Sonniss GameAudioGDC

The replacement pilot uses professionally recorded library audio rather than a
different generative model. `sonnissRemoteZipSearch.py` reads remote ZIP directory
tables through byte ranges, locates exact material recordings, and extracts only
selected entries. This avoids downloading the complete 200+ GB community archive.

The first focused 2019 mining pilot contained 31 candidates: 27 direct source
recordings and 4 explicitly labelled designed-library samples. Human listening
approved all 31 as useful sources on 2026-08-27. That verdict does not make a
whole recording game-ready or runtime-eligible.

`2026-08-27-expand-sonniss-recorded-library.py` adds a bounded 87-candidate
contrast batch from the same archive, bringing the page to 118 sources. It adds
mechanisms/UI, machine metal, air/Flight, surface contacts, ice/glass,
wood/doors, weather/water, electrical, chain, and thermal/fire coverage. The
expansion contains 68 direct recordings and 19 clearly labelled designed
library samples. Human listening approved all 118 sources on 2026-08-27.

```powershell
# Search archive filenames without downloading the archive payloads.
& $python -B pipelines/audio/sonnissRemoteZipSearch.py --year 2019

# Rebuild the transparent previews, manifest, and review page.
& $python -B pipelines/audio/2026-08-26-build-sonniss-mining-review.py

# Inspect the exact bounded expansion without downloading payloads.
& $python -B pipelines/audio/2026-08-27-expand-sonniss-recorded-library.py

# Extract the selected files using byte ranges and CRC verification.
& $python -B pipelines/audio/2026-08-27-expand-sonniss-recorded-library.py --extract
```

The GameAudioGDC license permits commercial game use and modification without
attribution, while prohibiting AI/ML use. These files are source candidates only;
human approval, editing, and in-game mix validation remain required before any
runtime promotion. The manifest separately records source approval and
`implementationHandling`. Long files, loops, sequences, and likely multi-event
recordings are marked `slice_required`; they must receive explicit edit points
and an isolated derivative before they can be considered for gameplay.

## Sonniss in-game sound-stage mockup V1

`2026-08-27-build-sonniss-ingame-mockup.py` turns 38 approved sources
into 55 timed event placements across mining, robot/Flight, UI/reward, and deep
cave danger scenarios. `audioWavMixer.py` performs deterministic PCM decoding,
48 kHz conversion, explicit slicing, peak normalization, gain, stereo pan,
anti-click fades, and final ceiling attenuation. It applies no pitch shifting,
EQ, synthesis, or AI processing.

```powershell
& $python -B pipelines/audio/2026-08-27-build-sonniss-ingame-mockup.py
```

The output includes four separate WAV mixes, one continuous sequence, every
derived slice, exact timing/provenance in `manifest.json`, and a local review
page. It remains review-only and is not imported by the game.

## Approved export and Freesound discovery - 2026-09-03

`2026-09-03-approved-review-input.json` freezes the user's 47 approved scenarios.
`prepareApprovedReviewAudio.py` prepares only those sources and records hashes,
decoded levels and edits in the production asset manifest. Its `--inspect-only`
mode measures without replacing production assets, but refreshes the measurement
report. Do not run it on unreviewed discoveries.

Run the timing and volume contracts independently:

```powershell
node testing/2026-09-03-reviewed-audio-timing-contract.mjs
node testing/2026-09-03-reviewed-audio-volume-contract.mjs
python -B pipelines/audio/auditReviewedAudioMix.py
python -B testing/2026-09-03-freesound-review-import-contract.py
```

The render audit needs `FFMPEG_BINARY` pointing to a trusted local executable.
It reads the exact mix settings exported by the volume contract and reports
approved-only sample peaks, 4x-resampled true peaks and clipping separately.

`crawlFreesoundReview.py` is a paced, resumable API importer, not a page scraper.
The default dry run makes zero network requests. A live run requires either
`FREESOUND_API_KEY` in the process environment or a private inherited pipe with
`--key-stdin`, plus `--execute --api-use-authorized`; the last flag confirms the
credential permits the intended use. Never put a key in a command argument,
the repository, frontend code, or chat. Interactive/echoing key input is refused.
The 107-query / 22-family plan targets 4,250 distinct candidates with CC0/CC BY
metadata, format screening and ID/hash deduplication. Human listening and
source/license verification are still required before runtime promotion.

The inbox at `testing/audio-review-2026-09-03/freesound.html` streams one selected
preview and keeps approval decisions separate from gameplay. The completed pull
contains 4,250 distinct IDs/hashes from 1,271 creators across all 22 families:
2,521 CC0 and 1,729 CC BY declarations, collected in 48 cached search pages.
Nine older leads now match imports; the remaining 15 are labelled link-only.
No original masters or extra gameplay assets were downloaded/promoted.

The importer resumes from cached pages, skips exhausted searches, and tolerates
brief Windows reader locks during atomic catalog saves. Authentication/rate
errors still stop the run without retries. An already full catalog returns
complete without a key or a network request. The registered API credential was
used through a one-time encrypted, memory-only handoff and was not persisted.
See the catalog/browser audit JSON files in `testing/audio-review-2026-09-03/`.
