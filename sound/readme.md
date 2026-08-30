# Sound

Unified sound directory — code, assets, and management.

## Responsibility (per `organisation-policy.md`)
Audio files (.ogg, .wav, .mp3) AND audio system code — co-located for single ownership.

## Structure

| Directory | Purpose |
|-----------|---------|
| `SoundSystem.js` | Sound playback & management |
| `SoundLibraryManager.js` | SFX library loading |
| `VoiceLineManager.js` | NPC voice line scheduling |
| `EventVoiceLineDirector.js` | Single-channel chance, cooldown, queue, and non-interruption arbitration |
| `EventVoiceLineReviewBridge.js` | Query-gated F8 and console review controls for the candidate event library |
| `VoiceLineVolumeDucker.js` | Reversible music/SFX ducking for the active voice owner |
| `MusicStreamController.js` | Bounded music rotation and low-priority prefetch |
| `RuntimeAudioAssetManager.js` | Catalog lookup, shared loading, and residency |
| `RuntimeAudioLoadQueue.js` | Serialized frame-and-idle fallback loading |
| `library-v2/` | Sound library definitions (v2-v4) |
| `playlists/` | Background music tracks (.ogg) |
| `soundEffects/` | Sound effect files |
| `voice-lines/` | NPC and player voice recordings |

Merchant shop-open speech now rolls at 35%, observes a per-merchant cooldown,
and drops while another line owns the channel. Ambient random speech is never
queued. Query-gated gameplay events may use a two-item expiring queue, but no
request can stop the active voice line.

The rejected one-line Grok V1 pilot and V2 casting library remain audition
provenance. The runtime player now uses the 96-clip LEO character catalog in
`values/playerVoiceCharacterLeoV1.generated.js`: sixteen confirmed gameplay
event families, session/context memory, and optional `stress10x` testing. Legacy
random player lines are disabled; NPC and narration playback retain the shared
non-interrupting channel.

## History
Audio systems were moved from `systems/audio/` on 2026-06-26 to eliminate the duplicate ownership (code in `systems/audio/` + assets in `sound/`). Now everything audio is in one place.

Meaningful level-ups use `SoundSystem.playLevelUpReward()`: an ascending
two-step cue built from the already approved UI confirmation asset. No retired
reward candidate or additional runtime audio file is admitted.
