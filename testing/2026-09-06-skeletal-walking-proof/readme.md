# Original-run-to-walk gameplay verification

The current test explicitly requires `Original_Run_Standard_Walk` during ordinary
walking and `Legacy_Jog_Run` during Ctrl running. The earlier same-jog walking
experiment was rejected; it is not the accepted behavior.

Run `testing/2026-09-06-skeletal-walk-live-smoke.mjs`. It uses this checkout's
canonical `serve.py`, an isolated browser, and saves disabled by `?jkd_e2e=1`.
Real A/D/Ctrl/Space input checks both walking directions at 160 px/s, Ctrl running
at 336 px/s, the two distinct clips, run-only dashes, release to walking and idle,
and jump exclusion. Cave movement uses a small, explicitly staged flat pocket.

The main/cave videos, screenshots, and `result.json` are replaced on each run.
