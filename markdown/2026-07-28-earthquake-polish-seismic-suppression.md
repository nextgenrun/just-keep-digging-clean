# Earthquake polish and Seismic Suppression

## Player-facing result

- The fixed seismic card is reduced from 480x90 to 320x60.
- Warning, quake, settling, blocked-route, and recap copy use short labels and
  retain finite fade deadlines plus the stalled-tween watchdog.
- Every successful earthquake mutation now immediately refreshes its
  authoritative world tile and plays one of three ImageGen-authored effects on
  that exact cell: fracture, collapse, or rubble return.
- Effects are camera-culled, deduplicated, and limited to a fourteen-image
  Phaser pool.

## Endgame removal

The Player Upgrades merchant now offers **Seismic Suppression** once the player
has reached level 99 and accepted the 1000 m depth milestone. It costs 75,000 M
and is a permanent one-time purchase.

Ownership lives in the existing `UpgradeSystem.upgradeLevels` save payload.
When owned, `EarthquakeSystem.syncSuppression()` cancels the current warning,
quake, cave-ins, falling rocks, queued rubble restoration, screen shake, and
seismic presentation. Future normal and debug earthquake starts are rejected.
Previously changed terrain is not rewritten.

## Asset provenance

Built-in ImageGen used the approved player HUD and the v2 seismic medallion as
style references only. The generated flat-magenta three-effect atlas is retained
under `sprites/UI/earthquake-feedback-v2/sources/`, alpha-cleaned with the
installed ImageGen helper, and split deterministically by
`ai-tools/2026-07-28-build-earthquake-tile-feedback-v1.py`.

## Verification

- `testing/2026-07-13-earthquake-feedback-ui-smoke.mjs`
- `testing/2026-07-13-earthquake-world-epicenter-smoke.mjs`
- `testing/2026-07-26-earthquake-feedback-lifecycle-contract.mjs`
- `testing/2026-07-28-earthquake-polish-and-suppression-contract.mjs`

