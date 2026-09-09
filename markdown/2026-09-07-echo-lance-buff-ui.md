# Echo Lance buff timer and Hardcore alignment

Completed 2026-09-07.

The permanent apex Echo Lance uses a long-lived engine internally. The HUD
ignored its existing passiveEcho flag and printed the never-expiring duration
as trillions of seconds. The chip and description now identify ECHO LANCE /
PERMANENT without a countdown. Real Stellar Lance activations retain their
configured countdown and return to the passive label after expiry.

The shared buff view now fits chip text, tooltip titles and wrapped bodies into
the existing artwork. Tooltip placement clears a visible Hardcore status panel
and clamps to the viewport. No gameplay lifetime, cost or damage changed.

## Final browser proof

A fresh normal game entry used the local E2E save-write block and controlled
mastered-talents / Hardcore fixtures. The Hardcore fixture loads the normal
presentation assets and fills GP before enabling the mode.

- [Hardcore + permanent tooltip](../testing/2026-09-06-baked-copy/buff-hardcore-passive.png):
  status bounds (12,206,336,56), tooltip bounds (6,270,320,92). The gap is 8 px;
  both remain within the 1280x720 logical viewport.
- The permanent chip text measures 58x15 px inside its 131x30 px frame. The
  title is 142.2x18 px and the body 169.125x44 px inside separate authored wells.
- [Actual timed activation](../testing/2026-09-06-baked-copy/buff-timed-active.png):
  the production action-bar button showed a normal countdown, starting at
  14.8 seconds. The same active tooltip was also observed below Hardcore status
  at 0.6 seconds. After expiry, ECHO LANCE / PERMANENT returned automatically.
- [Runtime evidence](../testing/2026-09-06-baked-copy/buff-hardcore-runtime.json)
  retains the passive, active and expiry samples. The final run recorded no
  runtime errors or review failures.

## Focused checks

[Four focused contracts passed](../testing/2026-09-06-baked-copy/buff-fix-tests.txt):
Lance VFX/HUD (including passive/timed transitions), shared tooltip fitting and
Hardcore clearance, celestial apex authority, and Hardcore panic feedback.
The layout contract covers 1280x720, 740x416 and 1024x768 bounds; browser proof
above covers the real 1280x720 game. Scoped git diff --check passed.
