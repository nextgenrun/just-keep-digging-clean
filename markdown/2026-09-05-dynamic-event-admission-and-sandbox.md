# Dynamic event admission and encounter sandbox — 2026-09-05

The local review is at `/testing/dynamic-event-sandbox/index.html`.
Run `testing/dynamic-event-sandbox/serve-review.py` with the bundled Python.
It invokes the checkout's canonical root `serve.py` on port 8098.

## Rejected legacy events

Blackout Bloom was still in `RANDOM_EVENT_TYPE_ORDER`, enabled by default,
and planned by `RandomEventPlanner`. That explains current-source Bloom starts.
It is now removed from scheduling and planning, and its flag is always false.
The bridge also rejects Bloom even if handed a stale flag object.

Money Monster **Rush Order** was already excluded from the current checkout's
event pool and its feature flag was already false. A current-source Rush start
could not be reproduced. An already-open page or another served revision could
explain an older event; that remains an inference, not a demonstrated cause.
The normal Money Monster merchant and tutorial sale remain legitimate features.

Schema V3 drops saved Rush, Blackout Bloom, Lumen Bloom and unknown active types
without payout. It removes retired rotation history and queues a cleaned save,
including when the serialized active record claims the current version.
It preserves completed Choirs, Sleeping Jackpot, resource history and statistics.
The shared valid-type list rejects direct starts and query forcing.
Existing game tabs need a reload to use the new modules.

## Why the remaining events can look unreliable

| Encounter | Current production admission | What can look like a failed trigger |
| --- | --- | --- |
| Shadowminer | At least 50 terrain rows; initial check after 8 s; subsequent checks every 45 s; baseline chance 18%; a usable, visible player replay trail at an admitted distance | Most random checks intentionally miss. Standing still, short history, offscreen history, or insufficient separation can reject placement. Even force retains placement safety. |
| Graveborer Wurm | Armed Hardcore, Flight unlocked, depth at least 120 m, cooldown expired, noise at least 18 | Casual and pending Hardcore cannot naturally summon it. Mining noise is ignored before the gates open and decays at 0.32/s. The initial cooldown is 18 s and repeat cooldown is 90 s. |
| Earthquake | Hazard introduction unlocked (normally best depth 220 m or a prior earthquake, with legacy-save exceptions), no Seismic Suppression, game update not paused | First cadence is 2–3 minutes and repeats 6–10 minutes, multiplied by depth (1 down to 0.5). The world epicenter is usually 6–10 tiles away, potentially outside the camera. A minor event may queue no cave-in. |

Shadowminer is a visual presence, with no terrain, GP or reward authority.
Torch light adds another major visibility factor: at normal light and standard
depth resistance, repel exposure takes about 190 ms, shorter than its 420 ms
arrival phase. The browser review confirmed a torch-driven transition directly
from spawning to fleeing in about 0.2 simulated seconds. That can easily feel
like an appearance failed. No encounter balance or repel timing was changed.

These systems have separate schedulers. The random ambient-event bridge yields
to active quake/Wurm hazards; it does not schedule Shadowminer, Wurm or quakes.
A forced ambient request also previously could select another eligible type if
the requested type lacked a valid plan; the bridge now keeps the specific
request pending for a retry instead of substituting another encounter.

Shadowminer snapshots now include `lastSpawnAttempt` with time, forced status,
success and a reason: depth, chance, placement, personal space, or missing texture.
The admission and balance rules themselves are unchanged.

## Sandbox

The lab imports the production encounter controllers and authored Shadowminer,
Wurm and earthquake views into a separate Phaser scene. The chamber, test body,
GP fixture and terrain records exist only in memory. Before any game modules
load, document-local memory ports replace both Web Storage objects. The lab
fails closed if those ports are unavailable. No save store or PlayScene is mounted.

- Trigger one event immediately, or run Shadowminer → Wurm → Earthquake twice.
- Review Shadowminer uses a recorded seven-tile fixture to make safe placement
  reproducible; automatic patrol also produces fresh history for natural tests.
- Change depth, Hardcore, Flight, hazard introduction, suppression and torch.
- Exercise normal timers/chance with optional repeated mining noise.
- Pause, reset, and use 1× / 4× / 10× fixed-step review speed.
- Hear optional approved cue samples at a conservative local gain.
- Inspect gate reasons, event phases, terrain/collision counts, asset failures,
  storage isolation, and export a JSON report.

The repeated sequence waits for real completion and earthquake rubble settlement.
A blocked request or timeout fails visibly. Reset cancels views, tweens and sound,
restores the chamber and seeded random stream, and resumes presentation correctly.
Earthquake accepts an optional test clock so accelerated rubble settlement uses
the same simulation clock. Production retains its existing wall-clock default.

The body and terrain are test fixtures, not a replacement movement controller.
Audio uses approved cue previews, not the complete production layered mix.
This proves encounter execution and teardown; it is not a full-game save
playthrough, movement/balance acceptance, or natural-frequency statistical audit.

## Validation

The browser completed two six-encounter runs, at 4× and 10×. The latter recorded
two Wurm hunts, two completed Shadowminers, two completed earthquakes, actual
terrain destruction and collisions, approved cue playback, no failed assets,
no browser warnings/errors, and zero persistent storage reads/writes.
The machine-readable record is
`testing/dynamic-event-sandbox/2026-09-05-browser-proof.json`.
Torch repulsion was also observed in the browser. Gate, clock and retirement
contracts exercise the actual production implementations.

Passing focused checks:
- `2026-09-05-dynamic-event-admission-contract.mjs`
- `2026-07-30-random-world-events-contract.mjs`
- `2026-08-30-shadow-miner-runtime-contract.mjs`
- `2026-08-30-shadow-miner-dynamic-behavior-contract.mjs`
- `2026-08-30-shadow-miner-presence-contract.mjs`
- `2026-07-26-graveborer-wurm-contract.mjs`
- `2026-08-30-earthquake-event-cohesion-contract.mjs`
- `2026-07-26-earthquake-feedback-lifecycle-contract.mjs`

Two older audits remain failing independently of this change:
- `2026-07-28-earthquake-polish-and-suppression-contract.mjs:58` assumes
  `EARTHQUAKE_SUPPRESSION_UPGRADE.requiresLevel`, which the current config lacks.
- `2026-07-28-earthquake-dodge-audit.mjs:215` stubs the old per-tile occupancy
  helper; current rubble restoration uses the occupied-tile-key set.

Both failures were reproduced with a process-local module loader removing only
this turn's optional earthquake-clock change. No live source was reverted.

The final Shadowminer fixture covers the full nine-second history buffer;
27 combinations of personality, depth, and random-boundary values passed.
The final saved sequence recorded 77 destroyed tiles, three collisions, two
completed earthquakes and 21 approved cue previews with zero persistent writes.
