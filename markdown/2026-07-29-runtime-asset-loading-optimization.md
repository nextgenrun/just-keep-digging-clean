# Runtime Asset Loading Optimization

**Date:** 2026-07-29

## Outcome

Expanded scenic libraries no longer decode and activate several large images
inside the same frame. PlayScene now has one shared, prioritized runtime asset
lane covering all seven scenic caches, continuous world-facade materials,
Titan chamber cards, and the six Heavenblocks layers. Existing image pixels,
animation, placement, gameplay, collision, and save state remain unchanged.

This is scheduling and residency work, not an art downgrade or lossy
recompression pass.

The follow-up audio audit found the larger live bottleneck: Boot queued 144
music tracks plus every voice line, about 700 MiB of compressed media that
WebAudio could decode into several GiB. The complete 292-entry catalog remains
registered, but default Boot now queues only 15 files (one random music seed,
eight core SFX, and one seed for each of six voice categories). Against the
current catalog this is 7.7 MiB. Source audio files and quality are unchanged.

Boot also queues only the one randomly selected menu background used for the
whole menu session instead of decoding the other five unused 4-5 MiB PNGs.
The semantic bedrock layer now shares the canonical `tile-bedrock` texture
because its former source file is byte-identical; this avoids a second 2.61 MiB
transfer and duplicate GPU allocation while retaining the alternate source file
for provenance and rollback. Neither change alters a rendered pixel.

## Compression audit

A pixel-exact lossless WebP trial on the five non-selected menu PNGs reduced
their combined transfer size from 21.79 MiB to 16.14 MiB (25.9%) with identical
decoded RGBA. It was not promoted: selected-only loading now fetches one source,
decoded GPU memory would be unchanged, and retaining both formats would enlarge
the package. A future canonical format replacement remains safe once manifests
move atomically and superseded runtime copies are removed.

Audio was not transcoded. Existing OGG/WAV fidelity remains untouched; bounded
loading prevents the bulk WebAudio decode and residency spike instead.


## Runtime path

1. Camera-visible owners request only the assets their existing demand windows
   need. Requests for the same type/key are deduplicated.
2. Material fields, facade bands, Titan chambers, and near-depth backdrops lead
   the priority order; distant Heavenblocks use the background end of the lane.
3. Exactly one runtime asset is active. Images fetch from the browser cache and
   decode through `createImageBitmap` with premultiplied alpha at their complete
   original dimensions.
4. Texture creation waits for the shared Phaser loader, a completed render, and
   an idle window. The next asset cannot activate in the same frame.
5. Unsupported bitmap decode, failed bitmap fetch/decode, and video use a
   serialized Phaser loader path. Global Phaser parallel downloads are capped
   at four while the coordinator is enabled.
6. Owners cancel obsolete queued requests and release textures when their
   existing residency rules say they are no longer needed. Decoded bitmap
   sources close after their Phaser texture is removed.

Runtime audio uses the same lane in PlayScene. Current music starts from the
random Boot seed; one next track prefetches after 15 seconds at lower priority
than every visual owner. Voice catalogs rotate from a ready seed and prefetch
one additional line only after the current line finishes. A standalone menu
fallback keeps the same one-file-at-a-time, render-frame-plus-idle contract.
Music residency is capped at three catalog entries and streamed voice residency
at twelve; the full catalog remains available on demand.


Heavenblocks still appears as one complete authored composition: its six files
load independently, but presentation waits until every request settles. Titan
cards retain their two-card residency cap and archive pins while abandoning
queued cards when the player leaves their demand range.

## Operations and telemetry

`window.__jkdPerformance.streaming.assetLoads` reports the live queue, active
key/owner/backend, maximum queue depth, completed/failed/cancelled/deduplicated
counts, bitmap fallbacks, and recent total/decode/activation last, p95, and
maximum durations. The same performance snapshot now reports browser long
tasks. The admin health panel surfaces queue depth, active asset/backend,
decode p95, GPU-activation p95, browser stalls, registered/Boot audio counts,
pending audio, and resident music/voice counts. Runtime audio state is also at
`window.__jkdPerformance.streaming.audio`.

The queue changes timing only. It does not select smaller files, resize sources,
reduce frame counts, lower alpha quality, or change the authored layouts.

## Rollback

- `?runtimeAssetBitmap=0` keeps the shared one-at-a-time priority lane but uses
  Phaser's normal image decode path.
- `?runtimeAssetQueue=0` removes the coordinator and loader cap, restoring the
  previous cache-local and direct Phaser loading behavior.
- Existing scenic selectors such as `?scenicAssetScheduler=0` remain available
  for their narrower comparisons.
- `?runtimeAudioQueue=0` restores the complete 292-file eager Boot audio preload
  for direct A/B comparison.

## Regression coverage

`testing/2026-07-29-runtime-asset-load-coordinator-contract.mjs` guards global
serialization, priority, cancellation, exact source dimensions, decode options,
activation spacing, fallback behavior, release, Heavenblocks staging, Titan
queue cancellation, telemetry, and rollbacks. Existing scenic-streaming,
performance-foundation, Heavenblocks-layout, Titan-chamber, and release-safety
contracts remain authoritative for their prior behavior.

`testing/2026-07-29-runtime-audio-streaming-contract.mjs` executes the real
playlist and voice manifests. It guards complete catalog registration, the
15-file/under-40-MiB Boot ceiling, eager rollback, serialized fallback and
shared-coordinator audio, ready-first voice rotation, post-line prefetch, and
delayed low-priority next-track loading. It also guards selected-only menu art
loading and verifies that both bedrock consumers use the same byte-identical
canonical texture.

