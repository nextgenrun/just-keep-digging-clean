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
`values/randomWorldEvents.js`. Only one of the three ambient events may be active
at a time. Completed Crystal Choir chambers are permanent; Sleeping Jackpot is
persisted separately so it can mature without suppressing ambient events.

Save schema V2 rejects unknown or retired active records, removes those types
from recent rotation history, and queues a cleaned save with the normal retry
cooldown. Jackpot, Choir history, scheduler stats, and resource history survive
that migration.

`?randomEvents=0` suppresses all presentation and protects any sealed Jackpot
record.
