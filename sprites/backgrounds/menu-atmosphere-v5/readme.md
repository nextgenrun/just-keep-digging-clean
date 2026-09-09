# Calm 60 fps menu scenery

Derived from the retained approved v3 videos, including the corrected grotto.
The camera and scenery composition are unchanged. Each landscape has its own
slower timing, motion-compensated intermediate frames and a short circular join.
The 1280 x 720 output preserves the source resolution at 60 fps. Runtime playback
uses normal speed; it does not lower the delivered frame rate to slow motion.

Configuration: values/menuMotionRefinement.json. Builder:
ai-tools/2026-09-07-build-smooth-menu.py. Evidence:
testing/2026-09-07-menu-atmosphere/smooth-v5-proof.json.

The final 60 fps closure is baked into each file. V5 uses one native-looping
background decoder, avoiding a second video request and readiness timeout.
