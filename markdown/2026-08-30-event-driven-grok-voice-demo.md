# Event-driven Grok voice demo

> Rejected V1 record: the one-line pilot was too simple and short. It is not an
> active candidate. See `2026-08-30-event-driven-grok-voice-library-v2.md` for
> the 45-clip replacement library.

## Outcome

The V1 demo adds one query-gated Grok Voice TTS bark to a real earthquake
warning and places every voice source behind one non-interrupting channel.
Merchant shop-open speech is reduced from every successful opening to a 35%
roll with a 45-second per-merchant cooldown.

The Grok request is an offline authoring step. The game ships only the generated
MP3; it never exposes an OpenRouter key, waits on network generation, or incurs
runtime speech cost.

## Initial sample

| Field | Value |
|---|---|
| Event | Player-aware earthquake warning |
| Line | `Move! The ceiling is coming down!` |
| Model | `x-ai/grok-voice-tts-1.0` |
| Voice | `rex` |
| Requests | 1 |
| Input | 33 characters |
| Estimated cost | USD 0.000495 |
| Runtime gate | `?eventVoices=1` |
| Runtime default | Off / review only |

The generation ID, byte count, and SHA-256 are stored beside the MP3 in
`sound/voice-lines/event-driven-grok-v1/2026-08-30-event-voice-sample-manifest.json`.

## Arbitration contract

| Source | If channel is busy | Frequency protection | After-line behavior |
|---|---|---|---|
| Ambient random player line | Drop; never queue | Existing 30-200 second schedule | Normal schedule resumes |
| Merchant shop opening | Drop; never queue | 35% roll and 45-second cooldown per merchant | Ambient stays quiet for 12 seconds |
| Gameplay event | Queue only if still timely | 12-second global gate plus per-event cooldown | Ambient stays quiet for 20 seconds |
| Tutorial/narration | Queue with highest priority | Cue ownership remains with tutorial state | No active line is interrupted |

The queue holds at most two lines. Entries expire, duplicate event requests are
rejected, and a 750 ms gap separates queued playback. `VoiceLineManager` also
refuses interruption at the low level, so a bypassing caller still cannot stop
the active random line.

## Proposed trigger set

| Priority | Trigger | Speaker/line family | Admission rule | Suggested cooldown |
|---|---|---|---|---|
| Ship next | First rare material discovery | Player observation | Once per material identity; skip during cinematics | Persistent once-only |
| Ship next | Meaningful shop purchase | Merchant-specific reaction | First tier purchase or spend at least 20% of current wallet; not every item | 90 seconds per merchant |
| Ship next | Return from a deep expedition | Player relief/reflection | Surface return after at least 300 m and five minutes away | Once per expedition |
| Ship next | Hardcore danger episode | Player warning | Enter critical band, not every damage tick | 60 seconds and once per episode |
| Current demo | Earthquake warning | Player urgent warning | Player-aware epicenter only; stale request expires before danger passes | 180 seconds |
| Later | New biome first entry | Player discovery | First visit to named biome; never on border oscillation | Persistent once-only |
| Later | Titan discovery | Player or narrator awe | After the discovery cinematic yields the channel | Persistent once per Titan |
| Later | Repeated unaffordable purchase | Merchant response | Third failure inside one visit, never the first failure | 120 seconds |
| Later | New personal combo record | Player celebration | Beat saved record by a meaningful margin, not fixed combo ticks | Once per run |
| Avoid | Dig, pickup, movement, cooldown-ready, every shop open | None | High-frequency actions stay SFX/UI only | Not applicable |

The recommended content pass is three short variants for each of the first four
rows, generated offline after the actor/voice and writing style are approved.
Selection should remain deterministic within a save/session and use the same
non-repeating catalog cursor already used by merchant libraries.

## Review controls

1. Run the game with `?eventVoices=1`.
2. After audio is unlocked, press `F8`, or call
   `window.__jkdEventVoices.trigger("earthquakeWarning")` to request the real
   generated asset through the runtime streaming path.
3. Inspect `window.__jkdEventVoices.snapshot()` for active owner, queued IDs,
   ambient quiet time, decisions, and drop counts.
4. Trigger the request while a random or merchant line is playing to verify it
   waits instead of stopping that line.

## Rollback

- Omit `?eventVoices=1` to keep generated event speech disabled.
- Set `EVENT_VOICE_CONFIG.merchantOpenChance` back to `1` to restore the former
  every-open merchant behavior.
- Remove the single `EarthquakeSystem` request to detach the demo event without
  changing earthquake gameplay, SFX, or visuals.
