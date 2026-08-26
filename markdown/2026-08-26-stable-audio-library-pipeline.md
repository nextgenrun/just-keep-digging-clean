# Stable Audio Layered Library Pipeline

**Date:** 2026-08-26  
**Scope:** Review-only generation; no Phaser preload, manifest, or gameplay wiring.

## Outcome

The existing 200-row GX prompt corpus now has a guarded Stable Audio API
pipeline. Every event expands into four independently generated layers rather
than one baked composite. Raw WAV files land under
`SoundLibrary_Review/00_INBOX_RAW_EXPORTS/<batch>/` with asset-ID-first names
and the `UNTESTED` tag.

One-shots use onset, body, debris, and tail layers. Loops use low bed, mid
texture, high detail, and sparse accent layers. Each layer receives a stable
seed, complete prompt provenance, generation ID, byte count, and SHA-256 in the
batch manifest.

## Safety gates

- Dry-run is the default.
- Paid generation requires both `--execute` and `--max-credits`.
- The exact estimated credits and USD equivalent print before any API request.
- `STABILITY_API_KEY` is read only from the environment and is never written or
  printed by the pipeline.
- Async generation IDs are persisted before polling, so an interrupted batch
  can resume without knowingly resubmitting the same paid job.
- Existing files are skipped; the tool does not delete or overwrite assets.
- Output remains review-only. Human rating is required before promotion.

## Cost boundary

Stable Audio 3.0 costs 26 credits per successful generation and Stable Audio
2.5 costs 20 credits. At one take and four layers, the complete 200-asset GX
corpus is 800 generations: 20,800 credits, or $208 at the current $0.01 per
credit rate. More takes multiply that total directly.

Use a one-layer pilot first:

```powershell
$python = 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'

& $python pipelines/audio/2026-08-26-generate-stable-audio-library.py `
  --model stable-audio-2.5 --ids GX201 --layers onset
```

After inspecting the dry run, set `STABILITY_API_KEY` in the current terminal
session and repeat with `--execute --max-credits 20`. Do not paste the key into
the command, a JSON file, Git, chat, or project documentation.

## Validation

Run:

```powershell
& $python testing/2026-08-26-stable-audio-pipeline-contract.py
```

The contract validates the complete prompt inventory, layer profiles,
asset-ID-first filenames, deterministic seeds, exact current prices, dry-run
default, paid credit ceiling, environment-only secret handling, and
review-only manifest boundary.
