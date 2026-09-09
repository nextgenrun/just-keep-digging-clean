# Startup recovery, compact assets and readable loading logo — 2026-09-08

The reported online failure was an `assets failed` loading screen that did not
recover after waiting. In the current source, BootScene retained failed image
keys in `_queuedImagePaths`; its Retry path reset the Phaser loader but left that
map intact, so `queueImage` skipped the missing files on subsequent attempts.
The map is now cleared per full-preload attempt. Resident textures remain cached.
Two bounded automatic retries precede the existing visible Retry loading button.
The global Phaser loader explicitly permits two per-file retries and a 120-second
request timeout. This does not treat a permanently missing asset as successfully
loaded and does not silently enter gameplay with required textures absent.

Loading views now reserve bandwidth for game assets: their logo and scenery use
static artwork while boot/world downloads run. Menu motion resumes normally in
the menu scenes. The existing logo faces were brightened in Blender, preserving
geometry and alpha, and the loading logo fits 600 x 180 logical pixels. Loading
copy and OPEN BETA DEMO have stronger contrast. The compact stone backing remains.

## Delivery changes

`StartupImageVariants` swaps only mapped Phaser image-file URLs at queue time;
texture keys, source dimensions and frame layouts are unchanged. All 224 exported
images passed exact dimension and alpha comparisons. WebP quality is 90 for
scenery and 95 for UI. The original PNGs remain in their authored locations.

- Selected image set: 222,742,708 -> 42,615,976 bytes (80.9% smaller).
- Opening cinematic: 58,525,651 -> 9,139,777 bytes (84.4% smaller), same cinematic
  and audio, H.264/AAC with the MP4 index at the front for streaming.
- OpeningCinematicScene loads only the selected poster and shared UI. The selected
  video streams through its existing player; other discovery clips do not preload.
- Image, video and readable-logo authoring settings live in
  `values/startupCompression.json`; rebuild scripts are dated 2026-09-08 in ai-tools.

## Browser and package evidence

`testing/2026-09-08-startup/measure.cjs` disables cache and uses Chromium network
emulation at 7,000,000 bits/s with 80 ms latency. This is approximately 0.875 MB/s,
more constrained than a connection described as 7 MB/s.

| Run | Transfer | Result |
| --- | ---: | --- |
| Original local baseline | 285,925,246 bytes | Reached opening cinematic; harness did not hold the skip key, so its total elapsed time is not a menu-time comparison. |
| Optimized source, 7 Mbps | 103,165,623 bytes | 3 forced failures, missing image re-requested, automatic recovery to menu; 226.1 seconds; no page errors. |
| Production candidate, 7 Mbps | 86,077,553 bytes | 9 forced failures exhausted automatic retries; real Retry button click succeeded; menu in 139.9 seconds; no page errors or preview API warnings. |

The production run first showed the loading UI at 24.5 seconds. Different random
scenery/music selections and compression delivery mean transfer totals are
representative measurements rather than a strict same-scene comparison. The
production recovery trace confirms ten requests for the deliberately failed
image and four full-preload attempts; successful assets were retained.

Candidate: `dist-startup-20260908`, build `9ed9ed4a7893`, 4,824,322,345 bytes on disk.
The installed package size includes all later game content and originals; it is
not the startup download size. Production deployment smoke, HTTP compression/
range canary and the 5 GB package-size contract all passed. At candidate review time, the public URL encountered the hosting provider's
security challenge. The local results do not identify the exact failed file on
the friend's connection. Deployment results are recorded below.

Captures and JSON evidence are in `testing/2026-09-08-startup/`.


A separate unthrottled, save-free WorldLoad fixture reached PlayScene with 682 textures and no page errors. The town/HUD capture was visually reviewed (optimized-world-smoke-town.png). This confirms the changed startup textures render in gameplay; it is not a full progression run or a throttled world-load timing claim.

## Approved public deployment and capacity update

Published build `9ed9ed4a7893` to `https://www.nextgen.run/diggame-beta-1/` after
explicit approval. The SSH plan compared 8,502 package files against the live
tree: 6,801 unchanged, 1,701 uploads totaling 189,411,836 bytes, no deletions,
and no player backend changes. Apply and finish independently verified every
package hash and PHP syntax; maintenance was removed and the original checked
`.htaccess` restored. Final directory size: 4,824,322,627 bytes including config.

User subsequently authorized more than 5 GB. The current packaging setting and
new release helpers now allow 10 GB, retaining peak/final guards and adding a
free-space check for growth, a temporary file, and a 1 GB reserve. This is a
project release allowance, not a hosting-account quota change. The filesystem
reported about 501 GB available; account quota was not reported. The deployed
candidate is unchanged and its historical manifest records the prior build
allowance. The updated size contract passes against it and checks the current
10 GB boundary and one-byte overflow rejection.

Fresh public browser and ordinary HTTP checks encountered SiteGround HTTP 202
security challenges, including manifest, JavaScript, logo and video URLs.
Therefore deployed hashes are proven, but post-release public startup, HTTP
compression and video range delivery could not be confirmed from this client.
This challenge could be relevant to the reported asset failures; the friend's
network has not been diagnosed. No security controls were bypassed or changed.
See `testing/2026-09-08-startup/live.json`, `live-http.json` and
`.tmp/startup-production-deploy-20260908/` for evidence.
