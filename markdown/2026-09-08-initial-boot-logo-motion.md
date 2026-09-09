# Initial boot and loading logo motion

The first optimized release deliberately disabled logo animation on loading
screens. Its main entry also imported the entire scene graph before Phaser
could draw the loading artwork. The new launch scene renders approved art
before fetching that graph and keeps its presentation visible until Boot has
created the regular loading screen.

## Presentation

- Loading-only logo bounds grow from 600x180 to 740x220, with the edition line
  moved below the larger bronze/stone backing.
- The poster gets a 1.45 brightness grade; the loading background receives a
  0.48 contrast veil. Authored geometry, letter forms and menu styling remain.
- Loading uses the existing approved light overlay encoded to H.264 CRF 28,
  960x284, 30 fps and faststart: 152,691 bytes versus 1,579,791 bytes. Duration
  and playbackRate 1 remain unchanged. This optional video is outside the
  required asset queue and respects reduced motion and data saver preferences.

## Startup boundary

`LaunchScene.js` loads three compact art images, displays the shared loading
view and then imports `RuntimeScenes.js` after the first rendered frame. The
latter registers the original eight scenes and the admin health panel. Boot
stops Launch after its own UI exists. An early import failure shows Retry,
which reloads the document so failed ES module requests can be attempted again.
UI font readiness no longer delays the logo-only first screen.

The lightweight `menuAssetKeys.js` shares the existing keys without pulling the
world atlas catalog into the launch graph. The static main graph decreased
from 1,101 modules / 12,167,943 raw bytes / 2,657,099 gzip bytes to 55 modules /
295,601 raw bytes / 91,859 gzip bytes. Phaser, art, styles and HTML imports are
additional; these counts are not total startup transfer.

## Packaging regression found by browser testing

The first candidate reached the menu but exposed a 404 for the concurrent
browser-controls module imported by inline HTML. The production collector now
includes local HTML imports and versions them with the build ID. The controls
implementation itself was preserved. Deployment smoke and HTTP canary now
check that this entry dependency is included and served, and the admin panel
check follows its deferred module rather than assuming it lives in main.js.

## Evidence

Evidence and scripts are in `testing/2026-09-08-startup/`.
The first candidate recovery run showed animated art at 6.191 seconds under
7 Mbps / 80 ms / cache disabled (previous release test: 24.511 seconds), then
recovered after nine forced asset failures and a real Retry click. That run
had the browser-controls 404 and is retained as
`motion-v2-first-candidate-recovery.json`; it is not a clean release pass.

The early-graph failure test passes: two deliberate import failures across a
real Retry reload, with zero logo-video requests under reduced motion.
A separate local save-free fixture reached PlayScene with 682 textures and no
page errors. It is not a full progression or slow-network world-load test.

The corrected candidate is `dist-startup-motion-fixed-20260908`, build
`35b25aa356da`, 8,510 files, 4,824,482,126 bytes. Deployment smoke, HTTP canary
and the 10 GB size contract pass. This candidate was published after the user requested the latest build over SSH; see below.

The final corrected candidate passes the cold 7 Mbps / 80 ms regression:
first authored loading frame at 6.195 seconds with video already playing;
menu at 140.184 seconds, 88,478,532 transferred bytes, nine injected failures,
ten attempts for that asset, a real manual Retry click, and zero errors or
preview API warnings. Motion samples advance and wrap throughout Launch and
Boot. This improves the time to first presentation; total download time remains
approximately the prior 2 minutes 20 seconds. The initial animation was delayed
by the uncompressed local source-server request load in the separate gameplay
fixture, so the compressed candidate is the authoritative startup preview.

## Approved SSH publication

Published build `35b25aa356da` to `https://www.nextgen.run/diggame-beta-1/`.
The exact live-tree plan required 1,464 changed files / 7,490,265 upload bytes,
with no deletions, no player backend changes and no replacement of existing
non-text media. Both apply and finish verified all 8,510 package file hashes
and PHP syntax. Maintenance is disabled and the checked original server
configuration restored. Total deployed bytes including config: 4,824,482,408.

The public in-app browser reached the game without a security challenge on
this check. DOM-observed entry script URLs carry `v=35b25aa356da`; the larger,
brighter loading logo and OPEN BETA DEMO line were visually inspected while
progress advanced. No browser console errors or warnings were reported at
that checkpoint. This live check is separate from the earlier isolated
7 Mbps timing and recovery proof.

Release evidence: `.tmp/startup-motion-production-deploy-20260908/`.
