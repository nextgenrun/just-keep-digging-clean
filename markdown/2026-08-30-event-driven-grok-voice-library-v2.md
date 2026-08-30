# Event-driven Grok voice library V2

## Outcome

V2 replaces the rejected one-line earthquake pilot with a review-only library
large enough to judge voice casting, writing direction, event fit, and
anti-spam behavior before production promotion.

| Field | Result |
|---|---|
| Model | `x-ai/grok-voice-tts-1.0` |
| Voices | Eve, Ara, Rex, Sal, Leo |
| Voice-casting comparisons | 5 matched reads |
| Gameplay event candidates | 40 lines across 10 families |
| Total clips | 45 |
| Input characters | 4,538 |
| Requests | 45 successful, 0 failed |
| Estimated generation cost | USD 0.06807 |
| Local hard ceiling | USD 0.25 |
| User ceiling | EUR 5 |
| Credential state | Process-local and cleared; never stored |
| Runtime state | Query-gated review candidate |

The source text and trigger policies live in
`sound/voice-lines/event-driven-grok-v2/2026-08-30-event-voice-library-v2-source.json`.
The generated manifest records every generation ID, byte count, and SHA-256.

## Library structure

| Family | Variants | Intended trigger | Admission protection |
|---|---:|---|---|
| Voice casting | 5 | Same line rendered by all five voices | Review only; never gameplay |
| Earthquake warning | 4 | Player-aware active fall-zone warning | 180-second cooldown, 7-second queue lifetime |
| Rare material discovery | 4 | First named rare-material discovery | Once per material identity |
| Deep expedition return | 4 | Surface return after 300 m and five minutes | Once per expedition |
| Hardcore danger | 4 | Enter critical danger episode | Once per episode, 60-second cooldown |
| Meaningful purchase | 4 | Tier purchase or at least 20% wallet spend | Drop while busy, 90 seconds per merchant |
| Biome first entry | 4 | First stable named-biome entry | Once per biome; border oscillation ignored |
| Titan discovery | 4 | Discovery cinematic yields the channel | Once per Titan |
| Personal combo record | 4 | Saved record beaten by a meaningful margin | Once per run; never fixed combo ticks |
| Inventory critical | 4 | Cross into final safe capacity band | Edge-triggered, 60-second cooldown |
| Star release | 4 | Release authority confirms a freed Star | Once per Star identity |

## Audition surface

Serve the repository and open:

`/sound/voice-lines/event-driven-grok-v2/review/index.html`

The page provides family, voice, and transcript filters; per-clip playback; an
explicit filtered sequence; trigger-policy details; and a five-request rapid
admission simulation. It uses one audio element and a 750 ms sequence gap, does
not touch saves, and cannot change gameplay state.

## In-game query review

The gameplay bridge remains disabled by default. To hear one family through the
real runtime streaming, ducking, cooldown, queue, and non-interruption path:

1. Start with `?eventVoices=1&eventVoiceFamily=titanDiscovery`.
2. Unlock audio through normal interaction.
3. Press `F8`.
4. Replace `titanDiscovery` with any runtime family ID from
   `values/eventVoiceLibrary.js`.

Only the earthquake has a natural gameplay callsite in V2. The other families
are manual review candidates until specific lines and voices are approved.
Catalog cursors advance only when playback actually starts, so failed loads do
not silently consume a variant.

## Non-interruption and anti-spam contract

- One active voice owns the channel.
- No caller can stop and replace an active line.
- Ambient player speech and merchant shop-open speech drop while busy.
- Merchant shop-open speech remains a 35% roll with a 45-second per-merchant
  cooldown.
- Timely gameplay events can queue, but the queue holds at most two entries.
- Queue entries expire before stale warnings can play.
- Duplicate and cooldown-gated requests are rejected.
- A per-family quiet tail suppresses ambient speech after contextual delivery.
- A successfully played ambient line returns to the ordinary 30-200 second
  schedule; only a genuinely blocked attempt gets a five-second retry.

## Generation and recovery

Run `ai-tools/2026-08-30-launch-event-voice-library-v2.cmd`. It validates the
entire catalog before requesting a key, uses a masked PowerShell secure string
inside the visible CMD session, caps the planned batch at USD 0.25, writes the
manifest after every success, stops immediately on a non-retryable error, and
reuses hash-matching clips on rerun.

## Approval boundary

V2 is not a blanket production approval. Review should select:

1. One player voice direction.
2. Merchant-specific voices where they outperform existing recordings.
3. One or more approved variants per event family.
4. Any transcript edits required for lore, tone, or duration.

Only selected IDs should then receive real gameplay callsites. The other clips
remain a review library.

## Rollback

- Omit `?eventVoices=1` to disable generated event speech.
- Remove `eventVoiceFamily` to return F8 to the earthquake family.
- Detach the `EarthquakeSystem` request to remove the only natural V2 callsite.
- The original merchant and ambient catalogs remain intact throughout.
