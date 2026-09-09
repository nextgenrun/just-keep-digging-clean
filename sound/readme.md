# Sound

Unified sound directory — code, assets, and management.

## Freesound approved batch (2) — 2026-09-03

562 explicitly approved candidates are now local, measured gameplay derivatives;
the previous 51-source registry and Star destruction/level-up cues are preserved.
`FreesoundAudioDirector` shares the existing music-context snapshot and routes
contact/footstep/Flight/UI/reward events, sparse structural strain, and aware
threat rumbles. `FreesoundPaletteBank` keeps small matched variation banks and a
bounded on-demand cache. Menus may finish warming their short UI banks even
while world ambience is inactive; true pause/mute/teardown cancels pending work.

`StarSoundPocketController` selects one intact Star, applies stable site identity,
distance/pan/rock filtering, and bounds two-site handovers. Pocket calibration
happens before distance attenuation so the peak cap cannot flatten tracking
cues. `PanicSoundscapeController` follows warning/critical/recovery, not a random
timer. Cave interiors use their live scene/world/clock and no stale overworld
threat context. No progression, damage, movement or refuge-radius authority changes.

Tuning: `values/freesoundAudio.js`, `values/freesoundAudioPreparation.json`.
Assets/credits: `soundEffects/approved-freesound-2026-09-03/`.
Review: `testing/audio-review-2026-09-03/orchestra.html`.
Rollback: `?approvedFreesoundAudio=0` restores earlier audio routing; it does not
remove files or change review decisions. These assets are HQ-preview derivatives,
not lossless originals. See the companion orchestration plan/audit in `markdown/`.

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
| `MusicDirector.js` | Stable gameplay-context priority, cue arbitration, and track history |
| `musicTrackCatalog.js` | Filename-semantic catalog classification and menu seed selection |
| `MusicStreamController.js` | Directed bounded rotation, crossfade, and low-priority prefetch |
| `RuntimeAudioAssetManager.js` | Catalog lookup, shared loading, and residency |
| `RuntimeAudioLoadQueue.js` | Serialized frame-and-idle fallback loading |
| `library-v2/` | Sound library definitions (v2-v4) |
| `playlists/` | Complete background-music inventory (`.ogg` and `.mp3`) |
| `soundEffects/` | Sound effect files |
| `voice-lines/` | NPC and player voice recordings |

Merchant shop-open speech now rolls at 35%, observes a per-merchant cooldown,
and drops while another line owns the channel. Ambient random speech is never
queued. Query-gated gameplay events may use a two-item expiring queue, but no
request can stop the active voice line.

Music is no longer selected from one global random pool. The director follows
the authoritative menu/tutorial, day/weather, biome, earthquake, Wurm, and
Hardcore snapshots; discovery, progression, death, and ending authorities can
request higher-priority one-shot cues. The 143-track catalog remains streamed
and bounded rather than eagerly resident.

The rejected one-line Grok V1 pilot and V2 casting library remain audition
provenance. The runtime player now uses the 96-clip LEO character catalog in
`values/playerVoiceCharacterLeoV1.generated.js`: sixteen confirmed gameplay
event families, session/context memory, and optional `stress10x` testing. Legacy
random player lines are disabled; NPC and narration playback retain the shared
non-interrupting channel.

## History
Audio systems were moved from `systems/audio/` on 2026-06-26 to eliminate the duplicate ownership (code in `systems/audio/` + assets in `sound/`). Now everything audio is in one place.

Meaningful level-ups use `SoundSystem.playLevelUpReward()`: each explicit level
event selects one of the two approved Freesound cues without repeating the
previous choice. A new level event replaces any still-playing level cue, so a
multi-level award remains one audio event instead of a stack of one-shots.

The final mining hit on a Sky Star uses the approved Shockwave cue by itself.
Non-final Star hits retain the quieter existing Star chime; the generic tile
break cue is not stacked on the final Star hit.

## Approved review integration - 2026-09-03

The user export authorizes 47 scenarios / 51 source assets. The approval registry
and source gains live in `values/reviewedAudioAssets.js`; layered budgets and
context thresholds live in `values/reviewedAudioMix.js`. Rejected/open material
is not imported into gameplay. Composite-only stems cannot play independently.

`ReviewedSfxController` owns cooldowns, variants and transient admission;
`ActiveSfxMixer` bounds overlapping SFX; `AudioLayerBus` handles atomic loading,
fades and measured peak budgets. `ReviewedAmbienceController` owns deep beds,
sparse detail and genuine landing feedback. Recorded weather retains its
existing controller and suppresses duplicate procedural coverage.

Source gain flows through category/speech duck and then Phaser master exactly
once. Changing settings updates active sounds without overwriting preferences.
Shelter reduces outdoor wind; deep cave, pause, mute and scene teardown clear
ineligible layers. Long sources remain lazy in production.

See `markdown/2026-09-03-approved-audio-audit.md` for the two separate audits,
known validation limits, and the save-free live review stage. New Freesound
discovery remains in a separate inbox and has no runtime connection.

The ultra-rare Crown bypasses the rotating level-up family through
`SoundSystem.playLegendReward()` and plays the exact approved epic level-up cue.
The normal level-up handler suppresses its same-frame replacement, leaving one
unmistakable reward sound instead of two stacked cues.

## Approved review integration - 2026-09-03

The user export authorizes 47 scenarios / 51 source assets. The approval registry
and source gains live in `values/reviewedAudioAssets.js`; layered budgets and
context thresholds live in `values/reviewedAudioMix.js`. Rejected/open material
is not imported into gameplay. Composite-only stems cannot play independently.

`ReviewedSfxController` owns cooldowns, variants and transient admission;
`ActiveSfxMixer` bounds overlapping SFX; `AudioLayerBus` handles atomic loading,
fades and measured peak budgets. `ReviewedAmbienceController` owns deep beds,
sparse detail and genuine landing feedback. Recorded weather retains its
existing controller and suppresses duplicate procedural coverage.

Source gain flows through category/speech duck and then Phaser master exactly
once. Changing settings updates active sounds without overwriting preferences.
Shelter reduces outdoor wind; deep cave, pause, mute and scene teardown clear
ineligible layers. Long sources remain lazy in production.

See `markdown/2026-09-03-approved-audio-audit.md` for the two separate audits,
known validation limits, and the save-free live review stage. New Freesound
discovery remains in a separate inbox and has no runtime connection.

## Core action cleanup - 2026-09-05

`values/coreActionAudio.js` owns the physical-contact shortlist and movement/mining mix.
The full source approval registry is preserved; active banks and the re-audit use a
separate runtime projection. Mining plays one primary hit or break per contact.
Landing uses immediate pre-contact speed. Before/after listening sequences and
the original unfinished review export are in `testing/audio-design-cleanup-2026-09-05/`.


## Pickup and footstep follow-up - 2026-09-05

The latest local mix and footstep tone auditions are in `testing/audio-pickup-footstep-2026-09-05/`. The foot-material probe now uses the real collision body dimensions, routine XP ticks are removed, and pickup/shop repetition is bounded. `values/coreActionAudio.js` owns runtime tuning; `values/audioPickupFootstepReview.json` owns the six offline footstep edits, which remain audition-only.


## Destruction and pickup timing - 2026-09-05

The current timing cleanup and native Phaser proof are in `testing/audio-destruction-pickup-2026-09-05/`; see `markdown/2026-09-05-destruction-pickup-audio-timing.md`. Eleven existing recordings now use short playback windows from `values/coreSfxWindows.js`, including six 90-120 ms footstep contacts. The current page includes a live walk and isolated mining layers; outdated hard-walk/mining composites are withdrawn. Only resource arrival owns pickup audio; XP cannot replay it later. Original files and review IDs are preserved. Prior audio comparisons remain historical snapshots.


## Flight landing follow-up - 2026-09-06

Fast landings now use one material-matched 90-120 ms foot contact, capped at 80% of normal walking gain. The heavy dirt-destruction/rubble branch is removed from landing. The shared contact gate prevents duplicate walking/landing cues without cutting off an already admitted step. The existing review page includes hard-ground and dirt landing auditions. See markdown/2026-09-06-flight-landing-audio.md and testing/audio-landing-2026-09-06/ for scoped evidence; new native landing checks remain pending because the browser connection timed out.

### Merchant welcome blend (2026-09-07)

SoundSystem.playMerchantWelcome plays the preloaded coin/rustle/muted-chime composite once during the brief merchant shop acknowledgement. It uses the normal UI, SFX and master volumes, active SFX mixer, mute and cancellation paths. Configuration: values/merchantShopAudio.js. Source attribution and build measurements: sound/soundEffects/merchant-entrance-2026-09-07/readme.md and manifest.json.

`SessionAwakeningAudio` layers short excerpts of approved sounds 410390 and 418788 during session entry and bed awakenings. Dozing uses one quieter breath excerpt while the world/music mix gradually fades. It owns only its instances and temporary mix factors, restoring them on completion, skip, or teardown. Timing and gain live in `values/sessionAwakening.js`.

SignalVoicePlayer shares the existing voice channel and ducking, with local human speech and CC0 dog recordings, distance filtering, stereo direction, normalized gain and occasional short echoes. Clips live in voice-lines/signal-v1 and voice-lines/signal-dog-v1; no runtime API credentials.


## Full audio audit — 2026-09-07

See [the full audit](../markdown/2026-09-07-full-audio-audit.md) and [the listening page](../testing/audio-full-audit-2026-09-07/index.html). The existing stack now applies measured music/shared-dialogue gains, safe NPC silence windows and an owned Star DC filter. Stopped/failed sounds release channels and slots; native Phaser disposal avoids reentrant STOP teardown. Weather, Signal and cinematic audio follow live settings. Source recordings and prior approvals remain intact.

Procedural earthquake tones also use an owned live mix stage. SFX/duck changes refresh them immediately, and mute, pause, suspension or hazard cancellation stops and disconnects their nodes.
