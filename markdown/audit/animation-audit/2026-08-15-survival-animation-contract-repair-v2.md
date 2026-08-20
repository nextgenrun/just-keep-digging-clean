# Survival animation contract repair v2

Date: 2026-08-15  
Status: locally repaired and contract-verified; browser boot remains unverified
because the page's public Phaser CDN dependency did not initialize in the local
browser session.

## Confirmed regression

The 2026-08-14 quality-v1 promotion replaced six animation families while
retaining the prior runtime timing, origins, contact definitions, rig markers,
and facing assumptions. Matching only the alpha box did not preserve the old
motion contract. The promotion report records run-frame source translations up
to 38 px and a fixed 20 px horizontal flight translation. This explains the
reported silhouette drift, contact/hitbox mismatch, clipping impression, and
incorrect flight-facing response.

## Repair

- Restored walk, run, side mining, up mining, down mining, and prone flight from
  the byte-exact pre-quality rollback.
- Restored both matching runtime manifests so frame bounds and rig/contact data
  describe the active pixels again.
- Preserved the approved animation sequences, frame counts, FPS, transition
  routing, 1.12-tile run stride, and 31 x 75 gameplay collider.
- Preserved material-lighting and shader improvements; no gameplay authority,
  progression, saves, damage, or collision logic was rolled back.
- Kept the locomotion size lock and recalibrated the restored run to 122 px,
  producing a 101/119/104/122/123 px idle/start/walk/run/stop sequence.
- Captured the rejected quality-v1 files in
  `archive/2026-08-15-survival-animation-contract-repair-v2/`.

## Verification

Passing contracts:

- survival animation contract repair v2
- survival animation global polish
- survival-over-UAL profile and registration
- UAL locomotion transition selector
- UAL action contact timeline
- player animation polish production
- material lighting polish

The repaired profile registers 78 animations and 1,617 referenced frames. The
animated fixed-cell comparison lives in
`visual-approval-previews/2026-08-15-survival-animation-contract-repair-v2/`.

## Remaining gate

The local HTTP server served the repaired checkout, but the browser page could
not create its Phaser canvas because `phaser.min.js` is sourced from a public
CDN that was unavailable in that browser session. No browser console warnings
or errors were captured, but visual gameplay boot is therefore not claimed as
verified. A checked-in Phaser build or an available CDN connection is required
for the final interactive flight/mining playthrough.
