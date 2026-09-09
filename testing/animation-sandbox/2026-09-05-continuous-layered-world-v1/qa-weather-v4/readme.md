# Level 1 weather V4 evidence

The local audit page runs the real canonical serve.py game through the existing
review wrapper, with saves disabled. Its visible buttons exercise weather,
clock, locations and cloud evolution; captures come from actual postrender
frames. No production world/save state is edited. Generated JSON, gallery and
motion recordings are review evidence, not a default-renderer promotion.

The completed gallery has 27 decoded PNG frames and a 26-second 1080p motion
recording. verification.json is the in-app run; export-verification.json is
the isolated capture replay after the in-app automation kernel failed during
large media export. Both observed a complete 84-second cloud front. The
recorded WebM is retained; the MP4 uses constant 30 FPS for broad playback.
visual-contract.json and geometry-checks.json hold the focused source checks.
