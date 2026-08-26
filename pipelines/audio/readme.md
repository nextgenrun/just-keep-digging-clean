# Audio Pipelines

Offline tools for generating, inspecting, and preparing review-only audio assets.
Nothing in this directory may wire audio into the Phaser runtime.

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
