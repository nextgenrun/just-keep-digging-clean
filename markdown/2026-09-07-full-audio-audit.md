# Full audio audit — 7 September 2026

The current audio stack is usable and already has strong limits on repetition and overlapping effects. The main defects were inconsistent music/dialogue loudness, incomplete cleanup of stopped or failed playback, several settings paths that did not refresh active sounds, and a large DC offset in the Star destruction recording. This audit applies focused corrections within the existing Phaser/Web Audio stack.

[Listen to matched before/after examples](../testing/audio-full-audit-2026-09-07/index.html) · [Native browser checks](../testing/audio-full-audit-2026-09-07/native.html) · [Full measurements](../testing/audio-full-audit-2026-09-07/measurements.json) · [Source gains and edits](../testing/audio-full-audit-2026-09-07/source-mix.json)

## Scope and method

The inventory follows current gameplay registration, every menu playlist entry, Signal voice manifests, session awakening, merchant entrance and both configured cinematic videos. It excludes unused review inboxes. The current gameplay projection contains 753 assets; the extended inventory contains **795 distinct files**, all present and decodable.

| Registered source type | Files |
| --- | ---: |
| Ambience | 289 |
| Music | 144 |
| Short effects | 118 |
| Voices, including Signal | 242 |
| Cinematic soundtracks | 2 |
| Total | 795 |

FFmpeg 8.1.2 / ffprobe measured full-file decode, sample and oversampled true peaks, RMS, EBU R128 integrated loudness, silence, DC, duration and format. SHA-256 identifies every measured recording. The final refresh added six concurrently registered Signal dog recordings and reused earlier results only after matching the current full content hash. Formats: 446 Vorbis, 252 MP3, 95 PCM 16-bit WAV and two AAC video soundtracks.

Short Foley often falls below the duration needed for useful integrated LUFS. Those clips are assessed using peaks, RMS, duration, source windows and the existing mix budgets. A gain projection is not a new lossless master or a calibrated sound-pressure measurement.

## Layering and authority

| System | Responsibility and existing safeguards | Audit result |
| --- | --- | --- |
| SoundSystem / ActiveSfxMixer | Central transient routing, priority, maximum 10 one-shots, 0.45 summed source-peak budget | Retained. Stops and failed starts now free resources and admission slots. |
| ReviewedSfxController | Approval eligibility, semantic groups and cooldowns; one active sound per contact/UI/reward group | Retained. Stop releases the group immediately. Existing attack and footstep windows are preserved. |
| AudioLayerBus / ReviewedAmbienceController | Linear fades, atomic approved composites, depth hysteresis; cave maximum six layers, 0.10 budget | Failed starts are cleaned up and use the existing retry delay. External stop/destroy releases the layer safely. |
| WeatherRecordedAmbienceController | Maximum four recorded layers, 0.14 budget; stable choices, shelter blending and recorded/procedural coverage | Preserved. The duplicate covered-wind setting was removed. |
| WeatherAudioController | Procedural rain/wind fallback and thunder, routed through Phaser's destination | Active rain, wind and thunder now refresh on SFX volume and speech-duck changes, even without a new world update. |
| EarthquakeSystem procedural tones | Short rumble/crack/collapse/settle oscillators after proximity checks | Now use an owned live mix stage, stop on mute/pause/suspension/cancellation, and disconnect on completion. |
| FreesoundAudioDirector / PaletteBank | Approved material choices, bounded decoded residency, stable Star sites and panic bands | Existing authority retained. Star and panic budgets are 0.045 each; timing/volume contracts pass. |
| VoiceLineManager / EventVoiceLineDirector | Shared player/NPC channel, reservations, event priorities and bounded queue | Canceled loads cannot speak later; paused/stopped/failed speech frees the channel and ducking. Suspension also clears queued event speech. |
| VoiceLineVolumeDucker | Music ×0.30 and SFX ×0.50 while audible dialogue owns the mix | Duck requests now have individual owners. Voice at zero no longer lowers music/effects. |
| MusicDirector / MusicStreamController | Context eligibility, cues, streamed current/next tracks and bounded crossfades | Adds measured per-track gain without losing fade envelopes or user volume changes. Failed playback cannot leave the transition busy. |
| SignalVoicePlayer | Shared voice channel, distance, pan, filtering, authored segments and echoes | Connects through the master/mute destination and refreshes live Voice gain. Its concurrent segment-normalization work was preserved. |
| SessionAwakeningAudio | Short owned breath/heartbeat excerpts, finite envelopes and temporary world/music mix factors | Existing bounded design retained. Included in file measurements. |
| CinematicVideoPlayer | HTML video with its own baked soundtrack | Now follows Master × Voice and the existing SFX/voice mute toggle; subscribes/unsubscribes with its lifecycle. |

Boot streams one music seed and one voice seed per library; configured residency is three music tracks and 12 shared dialogue sources. Palette and Signal buffers use their own owners. Broad preloading of the full catalog is unnecessary.

## Levels and source editing

### Music and shared dialogue

A generated source-gain table covers **144 music files and 206 player/NPC dialogue files**. It is separate from user sliders and contextual ducking.

| Pool | Measured input range | Projected range after source gain | Policy |
| --- | --- | --- | --- |
| Music | −18.3 to −10.9 LUFS | −18.9 to −18.0 LUFS | Aim for −18; attenuation only |
| Shared dialogue | −25.0 to −12.4 LUFS | −23.6 to −20.0 LUFS | Aim for −20; boost limited to +2 dB |
| Calibrated source true peaks | Some source files exceeded 0 dBTP | At most −3 dBTP | Conservative source ceiling before category/master gain |

The music spread falls from 7.4 LU to 0.9 LU. Quiet or transient dialogue is allowed to remain below the target when the boost cap or peak ceiling applies. This avoids aggressively amplifying noise or flattening every performance.

The projected LUFS values use full-recording measurements plus constant gain. Silence edits can slightly change the measured integrated value; the audition metrics are fresh measurements of the actual rendered edits.

Calibration lives in `values/audioMastering.js`, `values/musicSourceMix.generated.js` and `values/voiceSourceMix.generated.js`. `project-source-mix.mjs` regenerates the tables from the dated measurements. Changes to source files require new measurements; the mastering contract verifies all 350 source hashes.

### Dialogue timing

Twelve older NPC recordings had more than half a second of leading or trailing silence. Playback windows now retain 120 ms before speech and 180 ms after it, with 3 ms / 12 ms edge fades. The largest removed trailing gap was in “Big Upgrade(1).wav”; the original tail was 2.856 seconds.

The words and original files are retained. Native Phaser completion now follows the shortened buffer, so silence does not hold the dialogue channel and music duck longer than necessary. The thirteenth silence flag belongs to an independently segmented Signal dog recording and is not fed through this second windowing pass.

### Star destruction

The approved Star destruction source measured DC offset **−0.373**, a substantial non-audible bias that wastes headroom and can cause edge clicks. An owned 20 Hz high-pass is inserted only on that sound. The existing 0.18 cue gain and approved recording remain intact.

A browser OfflineAudioContext render measured absolute DC **0.00000219** and raw filtered peak **1.15545**. Removing DC can increase an individual peak, so the mixer now budgets this source conservatively at **1.17**, before the existing attenuation. The high-pass is disconnected on teardown.

Web Audio's low/high-pass Q uses dB. The configured Q is −3.0103 dB, matching the linear Butterworth Q used in the FFmpeg preview. [Web Audio specification](https://www.w3.org/TR/webaudio-1.0/#dom-biquadfilternode-q)

### Other quality findings

Six files have small source true peaks above zero: five music files and the older Star-contact chime. These are source warnings, not evidence that the mixed game output clips. Music calibration provides headroom for the five music files; the chime remains under the existing transient source-peak budget.

Both configured cinematic soundtracks decode successfully, at −16.6 / −16.8 LUFS and −1.5 / −1.4 dBTP. Their dialogue and music are baked together, so independent cinematic music/dialogue sliders would require separate stems.

The existing Freesound material includes preview-derived lossy recordings. Conversion or normalization cannot recover missing source detail. Existing approval decisions, attribution, source hashes, playback rates and short movement/mining windows were preserved.

## Settings and feel

| Control | Default | What it affects |
| --- | ---: | --- |
| Master | 90% | Phaser output; cinematic video now explicitly follows it |
| Music | 40% | Contextual/menu music, with calibrated tracks and bounded fades |
| SFX | 90% | Effects, ambience and procedural weather |
| Voice | 80% | Shared dialogue and Signal; cinematic baked mix |
| NPC multiplier | 70%, internal | NPC/Signal speech after the Voice control |
| Speech headroom | 72%, internal | Shared voice route before Master |
| SFX Enabled | On | Effects and voices; footer now states this behavior |
| Music Enabled | On by default | Music streaming/playback |

The actual saved preferences seen in the live Settings overlay remained Master 28%, Music 40%, SFX 90%, Voice 80%, Music disabled and SFX enabled. Temporary native test settings were restored.

The updated footer fits the existing overlay: “SFX toggle also mutes voices. Changes save instantly.” No new runtime UI system or replacement audio framework was introduced.

From a feel perspective, the existing contact-triggered short footsteps, single primary mining hit/break, resource-arrival pickup timing, stable ambience selections and slow background fades are the right foundations. This change concentrates on preventing loudness jumps, lingering ducking, late canceled speech and stale settings rather than adding more layers.

## Verification

- **17 new focused regression checks pass:** ten original lifecycle reproductions plus seven source-integrity, music and ambience checks.
- **22 native browser checks pass** in Phaser WebAudioSoundManager with real decoded sources. They cover playback, stop/external destruction, muted speech, restored ducking, paused speech cleanup, video volume math, actual NPC buffer trimming, Star high-pass output, live procedural weather/earthquake gain and calibrated music transitions.
- The native test caught recursive Phaser destruction during STOP. Disposal now waits until Phaser finishes its event; slots and dialogue ownership are released immediately. The failing native evidence and passing result are both retained.
- **Eleven existing contracts pass:** reviewed volume, reviewed timing, Freesound volume, Freesound timing, event voice director, merchant voice cycling, runtime streaming, Signal event, audio input/toggle handling, earthquake feedback lifecycle and local earthquake hazards.
- Existing contract assertions are unchanged. Their JSON reports are redirected into this audit directory to preserve historical results.
- Eight before/after PCM 24-bit WAV examples were rendered and decoded again. Their maximum measured true peak is **−11.2 dBTP**. The listening page starts stopped and limits playback to one sample at a time.
- Canonical game smoke coverage: menu, Settings overlay and live surface gameplay with audio running, save writes blocked and no audio diagnostic errors. A fresh tab and balanced render preset recovered an earlier WebGL context loss; movement/mining acceptance is not claimed. Observations are recorded in `game-smoke.json`.

Three broader checks remain outside a clean pass: the September 4 catalog contract compares against an older generated snapshot; the contextual music contract stops at a source-string assertion for the death/revive hook; the cinematic pack contract expects an absent historical marketing MP4. Neither historical catalogs nor marketing assets were rewritten to make these pass. The current inventory and both runtime cinematic files were checked independently.

## Remaining review priorities

1. **Signal dog/human perceptual balance.** The concurrently added dog files range from −24.4 to −3.6 LUFS before their own authored segment, peak-normalization, distance and voice gains. Peak normalization is not loudness matching. The bark is especially dense compared with a quiet human line. Signal is intentionally excluded from the shared dialogue table to avoid stacking two normalization systems. A matched, in-context listening pass should tune segment loudness if it dominates speech.
2. **Long-session mix acceptance.** The measured source and layer budgets are strong evidence of headroom, but this is not a hardware listening test or a complete natural-progression playthrough through every weather/Star/panic combination. The full-scale combination of all user sliders is not protected by a final master limiter.
3. **Independent ambience control.** The current UI couples ambience and action feedback under SFX. An Ambience slider would let players reduce persistent beds without weakening contact sounds. This is a product choice, not a necessary new mixer architecture for these fixes.
4. **Cinematic stem separation and accessibility review.** The film is one recording; Music zero cannot selectively remove its baked music. Wider subtitles/dynamic-range preferences should be considered against the existing dialogue and video presentation before changing settings structure.
5. **Fallback parity.** HTMLAudio can crop the shared windows using markers but cannot render the Web Audio sample fades or the owned Star filter. Real native verification here covers Web Audio.

## Reproduce

Run the current catalog builder, the FFmpeg measurement script, then the source-mix generator. Explicit FFmpeg/ffprobe paths are accepted by the Python scripts. Use `--reuse-unchanged` only with its full content-hash verification.

```text
node testing/audio-full-audit-2026-09-07/catalog.mjs
python -B testing/audio-full-audit-2026-09-07/measure.py --ffmpeg <ffmpeg> --ffprobe <ffprobe>
node testing/audio-full-audit-2026-09-07/project-source-mix.mjs
node testing/2026-09-07-audio-lifecycle-contract.mjs
node testing/2026-09-07-audio-mastering-contract.mjs
python -B testing/audio-full-audit-2026-09-07/render-auditions.py --ffmpeg <ffmpeg> --ffprobe <ffprobe>
```

Serve this checkout with its canonical `serve.py`. The listening page is at `/testing/audio-full-audit-2026-09-07/`; `native.html` runs the standalone audio checks. Game review uses `?jkd_e2e=1`.

No source media was overwritten and no deployment was performed.
