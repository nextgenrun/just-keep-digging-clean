# Downward mining verification

Local isolated Playwright gameplay with saves disabled by `?jkd_e2e=1`.
The actual checkout is served through canonical `serve.py` on port 8096.

The fixture clears a small pocket and places a high-HP stone floor so real
S + F input exercises the unmodified 1,500 ms level-one cooldown and damage.
This is a staged timing fixture, not a natural progression playthrough.

- `main-down.webm` / `cave-down.webm`: continuous real gameplay recordings.
- Matching PNGs and `*-trace.json`: visible frames, contacts and action times.
- `result.json`: five contacts in each scene, zero crouch frames between hits,
  two retained variants, and normal crouch/release after Dig is released.
- `server.log`: isolated canonical server request log.

The initial shared-server captures failed during startup. `failure.png` and
`before-result.json` are diagnostics, not gameplay baseline evidence. The focused
hold contract separately reproduced the real presentation bug before patching.
