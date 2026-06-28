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
| `library-v2/` | Sound library definitions (v2-v4) |
| `playlists/` | Background music tracks (.ogg) |
| `soundEffects/` | Sound effect files |
| `voice-lines/` | NPC and player voice recordings |

## History
Audio systems were moved from `systems/audio/` on 2026-06-26 to eliminate the duplicate ownership (code in `systems/audio/` + assets in `sound/`). Now everything audio is in one place.