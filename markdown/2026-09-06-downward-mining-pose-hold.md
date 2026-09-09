# Downward mining pose hold â€” 2026-09-06

Holding S + Dig at the level-one 1,500 ms mining cadence now keeps the completed
strike pose between legal hits. The downward sequence alternates the retained
ground strike and reviewed low downward body punch. The wide turning leg-sweep
step is rejected and is no longer registered, selected, or loaded by the runtime.

The source clip and its provenance remain available in the review assets.
`DOWNWARD_DIG_ANIMATIONS.sequence` now drives every downward profile projection,
so an excluded candidate cannot quietly enter the asset catalog or animation map.

The existing recovery selector already held finished actions until the ordinary
cooldown and handoff grace elapsed. Held DOWN also selects the crouch collision
profile; main-world forced-crouch selection and the cave crouch transition then
overrode that recovery. Both presenters now honor an active completed-action
hold before considering crouch. On expiry, normal crouch entry/exit resumes.

Mining damage, cooldowns, combo timing, collision, the running mesh, and running
speed are unchanged by this correction. The independent `?downDigCombo=0`
rollback continues to select the retained ground strike.

## Verification

- `testing/2026-09-06-downward-mining-hold-contract.mjs` reproduced the original
  main-world failure before the fix. It now exercises the real main/cave
  presentation methods for both retained animations, preserving the exact
  completed frame through the cooldown boundary and checking crouch release.
- `testing/2026-09-04-downward-dig-animation-runtime-contract.mjs` verifies the
  two-stage selection, accepted contact/source hashes, and absence of the
  rejected clip from runtime registration and the loading catalog.
- Existing level-one mining rhythm and required jump/Flight contracts pass.
- `testing/2026-09-06-downward-mining-live-smoke.mjs` passed with real S/F input
  in both scenes. Each recorded five contacts, alternated only the retained
  ground strike and low punch, and showed zero crouch frames between hits.
  The main world recorded 145 held frames; the cave recorded 119. Both returned
  to crouch after releasing F and began crouch exit on releasing S.
- The effective cooldown remained 1,500 ms. Observed authoritative action starts
  were 1,501â€“1,502 ms apart in the main world and 1,501â€“1,569 ms in the cave.
  Visual contact times also include each clip's authored windup and frame timing.

The browser uses a high-HP stone floor fixture to keep one target available for
repeated level-one hits without altering damage or cooldown. This is a staged
mining check, not a natural progression playthrough. Saves are disabled with
`?jkd_e2e=1`. The canonical `serve.py` runs on an isolated port with drained
logging because the existing shared server stalled during the initial attempts.

Evidence: `testing/2026-09-06-downward-mining-proof/` contains the main/cave videos,
screenshots, per-frame traces, and `result.json` (no browser page errors).
