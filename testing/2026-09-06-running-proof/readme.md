# Running proof

Captured from the canonical serve.py runtime on http://127.0.0.1:8080/ with
an isolated browser context and jkd_e2e=1 (save-disabled).

The test uses real keyboard movement for walking, Ctrl running, reversal, stopping,
jumping, empty-GP fallback and reduced-motion behavior. A compact cave is entered
through an existing cave-zone fixture to validate its shared presenter and cleanup.
result.json contains the measured snapshots and JavaScript errors.
running.webm shows the live game run and reversal, without synthetic animation frames.
Re-run: node testing/2026-09-06-skeletal-run-live-smoke.mjs.
