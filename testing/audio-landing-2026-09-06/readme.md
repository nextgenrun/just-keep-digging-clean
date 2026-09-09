# Flight-to-ground landing audio - 2026-09-06

Fast landings previously crossed a speed threshold of 600 and switched from a sole contact to dirt destruction or a 1.245-second rubble recording. That abrupt source and gain change caused a much heavier impact than walking.

SoundSystem.playLanding now uses the existing foot-contact bank for the material under the collision body at every speed. The six approved playback windows are 90-120 ms. Landing strength follows immediate pre-contact speed smoothly and is capped at 0.8 times the selected source's normal walking gain. The minimum strength and cap live in values/coreActionAudio.js.

The existing airborne-duration, minimum descent speed and teleport gates are unchanged. The shared 240 ms ground-contact gate prevents a landing and walk contact from stacking. A walk contact already admitted in the same frame is allowed to finish instead of being stopped by a subsequently suppressed landing. Physics, flight and animation timing were not edited.

## Review

The current destruction/pickup review page has a Landing from flight section with hard-ground and dirt buttons. Each calls the production landing method at maximum strength and reports its native source, duration, gain and completion. This is a sound audition, not a flight animation or gameplay recording.

Review URL: http://127.0.0.1:8080/testing/audio-destruction-pickup-2026-09-05/#landings

Original source files, approval entries and saved KEEP/REJECT decisions remain intact. The old rubble asset remains available to the source audit but is no longer chosen by the gameplay landing route.

## Evidence and limits

- testing/audio-landing-2026-09-06/verification.json records eight focused checks: materials, speed range, short windows, the old/new route, real motion observation, duplicate contacts in both orders, mute/suspension/airborne gates, and cold-load behavior.
- The existing core-action, pickup, destruction and footstep suites pass 32 additional scenarios. The older reviewed timing fixture now loads the short footstep bank and checks its selected source; its original airborne and teleport assertions remain.
- regressions.json records the existing reviewed/Freesound timing and volume contracts plus syntax checks. served-files.json records byte identity against the canonical local server.
- Stored PCM measurements and the actual solo mixer gain provide estimated before/after peak levels in verification.json. These estimates are not perceived loudness or listening approval.
- Native landing verification is pending: the browser connection timed out, including a minimal connection check. The extended native test is ready on the review page, but its new landing cases have not been run. The page's older browser-proof.json remains the prior eleven-window/XP result.

The flattened files in testing/audio-landing-2026-09-06 preserve the scoped pre-change baseline. This is a local audio correction, not a completed manual playthrough.
