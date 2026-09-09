# Foot contacts, destruction and pickups - 2026-09-05

Open `/testing/audio-destruction-pickup-2026-09-05/` through canonical `serve.py`. The page contains the current walk animation with real contact-triggered audio, isolated mining layers, single-clip before/current playback and a native Phaser check.

## Current behavior

- The long hard-ground WAV was an eight-second sequence, not one footstep. `values/coreSfxWindows.js` now also trims all six active footstep variants to one 90-120 ms contact each. The original hard-ground files are 128 and 206 ms; the four dirt files are 220-336 ms. Short fades avoid hard sample cuts.
- The current walk animation owns foot contacts at texture frames 0 and 12. `GroundFootstepFxSystem` still dispatches sound on that contact; no new timer controls footsteps. `SoundSystem` applies the same trimmed buffer to hard-ground fallback contacts and the reviewed controller handles dirt. Idle/airborne gates and repetition limits remain effective.
- Hard-ground variant B was lowered from gain 0.23777 to 0.12945, about 5.3 dB. Trimmed peak output now differs by less than 3% between the two hard-ground variants. Source-peak metadata now measures the original mono channel rather than a stereo conversion.
- The previous five edits remain: earth destruction 320 ms, stone 300 ms, resource pickup 180 ms, crystal A 140 ms and crystal B 155 ms. Material playback rates still apply after trimming.
- Resource visual arrival owns its quiet, bounded pickup cue. XP cannot replay it later, including special XP beyond the pickup cooldown. Removed loot/XP visuals cannot fire stale arrival callbacks.

## Sources, previews and review decisions

`sound/coreSfxWindow.js` creates and caches short AudioBuffers while preserving original source PCM, sample rate and channel count. Native completion follows the short buffer, with no queued replay or stop timer. All eleven cached views together use about 0.64 MB at 48 kHz with their actual channels. HTMLAudio fallback uses a Phaser marker for the interval without sample fades.

`render.mjs` uses the production window function and preserves mono/stereo channels in float32 WAV previews. The earlier renderer forced stereo sources into mono, which changed amplitude. That caused the previously reported above-full-scale samples; the earlier claim that the source OGG files themselves contained those peaks was incorrect. Corrected source decoding has no above-full-scale samples among these eleven recordings. Native browser comparison confirms stereo preview PCM exactly matches the runtime buffers; the two mono codec-decoder differences stay below 0.00012 amplitude.

The active 753-item audit uses all eleven current playback previews while preserving source IDs and original links. Original files, the approval registry and downloaded KEEP/REJECT decisions are unchanged. All nine rejects in the supplied export remain outside the active catalog.

The old `Walking on hard ground` and `Mining with resource and XP arrivals` composites have been withdrawn from the earlier pickup/footstep page and replaced with links here. Their files remain historical evidence. They predated the latest trim edits, and the older Before mining sequence also included the retired XP UI tick. Current mining audition exposes swing (`libDirtSwingA`), earth break (`libDirtBreak`) and pickup (`libResourcePop`) separately. None is marked rejected in the supplied export; identifying any newer rejected layer remains pending the user's answer. Audition switches do not change runtime policy or saved review decisions.

## Verification

- `browser-proof.json`: eleven native WebAudio cases pass duration, completion, source preservation, rate, live gain control, channel count and preview PCM comparison; delayed special XP stays silent.
- `footstep-followup/browser-hard-walk.json` and `browser-dirt-walk.json`: the actual current sprite animation produced nine contacts each at frames 0/12 about 500 ms apart. Every native sound completed before the next contact, including the final sound completing naturally.
- `verify.mjs`: seven focused playback, arrival and identity scenarios pass.
- `footstep-followup/verify.mjs`: four scenarios cover real animation dispatch on both surfaces, duplicate/idle/airborne suppression, comparable hard-ground peaks, review identity/reject exclusion and withdrawal of old composites.
- `footstep-followup/regressions.json`: ten existing audio, timing, volume, pickup and review contracts pass.
- `footstep-followup/served-files.json`: byte-identical checks against canonical HTTP, plus source export preservation.

The walk preview uses the real animation and contact/audio systems with a fixed floor. Mining audition uses scripted arrival timing and current game sound methods. Neither is a full manual gameplay or listening approval. Source windows and taste remain subject to the user's review.

`before/` preserves the prior destruction/pickup baseline. `footstep-followup/` preserves the baseline and evidence for this subsequent hard-ground and stale-preview correction.
