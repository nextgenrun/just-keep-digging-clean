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
| `MusicStreamController.js` | Bounded music rotation and low-priority prefetch |
| `RuntimeAudioAssetManager.js` | Catalog lookup, shared loading, and residency |
| `RuntimeAudioLoadQueue.js` | Serialized frame-and-idle fallback loading |
| `library-v2/` | Sound library definitions (v2-v4) |
| `playlists/` | Background music tracks (.ogg) |
| `soundEffects/` | Sound effect files |
| `voice-lines/` | NPC and player voice recordings |

## History
Audio systems were moved from `systems/audio/` on 2026-06-26 to eliminate the duplicate ownership (code in `systems/audio/` + assets in `sound/`). Now everything audio is in one place.

Meaningful level-ups use `SoundSystem.playLevelUpReward()`: an ascending
two-step cue built from the already approved UI confirmation asset. No retired
reward candidate or additional runtime audio file is admitted.
