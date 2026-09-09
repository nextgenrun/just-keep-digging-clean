# Random world events

This folder owns deterministic, save-safe event state, Jackpot rules, and the
compensating Jackpot save transaction. Phaser orchestration stays in
`world/playScene/RandomEventBridge.js`; active-event behavior is isolated in
`world/playScene/RandomEventActiveRuntime.js`, while rendering stays in
`systems/visual/RandomEventWorldView.js`.

Sleeping Jackpot world cues and invalid-save repair live in
`world/playScene/SleepingJackpotWorldSupport.js`. `JackpotSaveTransaction`
restores wallet, inventory, event state, Journey, retention, and chest ownership
when the authoritative save returns false or throws.

Authoritative tuning, player copy, feature flags, and asset descriptors live in
`values/randomWorldEvents.js`. Crystal Choir and Signal are the schedulable ambient events. Money Monster Rush Order
and Blackout Bloom are retired; old save records are sanitized without payout. Completed Crystal Choir chambers are permanent; Sleeping Jackpot is
persisted separately so it can mature without suppressing ambient events.

signalRiskRules.js resolves solid-rock cover and value-based gift rewards. Save schema V4 also carries bounded Signal choices, serialized trap fuses and sampled fatal results; it rejects unknown or retired active records, removes those types
from recent rotation history, and queues a cleaned save with the normal retry
cooldown. Jackpot, Choir history, scheduler stats, and resource history survive
that migration.

`?randomEvents=0` suppresses all presentation and protects any sealed Jackpot
record.

Admission analysis and the save-free multi-encounter review are documented in
`markdown/2026-09-05-dynamic-event-admission-and-sandbox.md`.
