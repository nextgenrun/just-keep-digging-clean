# Session awakening — 2026-09-07

New and resumed play sessions, and waking after a town-bed rest, now use one of three restrained awakenings. The world appears through authored feathered eyelids, with approved breath/heartbeat audio, soft camera settling, and a delayed HUD/music return. Session entry also includes a short arrival-pose hold.

## Three rhythms

- **First breath:** one continuous opening after a quiet hold, about 2.32 seconds.
- **Sleepy blink:** a first glimpse, slight reclose, then a full opening, about 2.52 seconds.
- **Finding focus:** a hesitant half-opening with stronger odds of soft focus, about 2.46 seconds.

The previous variant is excluded using the current game's registry. Durations vary by ±5.5%. Blur is optional on every normal awakening, with probabilities of 25%, 50%, and 85% for the three profiles. The focus and camera envelopes return exactly to neutral. No persistent save field is introduced.

## Ownership

- `values/sessionAwakening.js` owns timing, curves, approved sound selection, mix, artwork, and preload settings.
- `world/playScene/SessionAwakeningController.js` owns the presentation lifecycle and input handoff. `startRun` begins the session reveal once; `TownRestBridge` starts dozing and subsequent awakenings for each completed bed rest. Ordinary portal transitions do not trigger it.
- `world/playScene/sessionAwakeningPresentation.js` computes selection and smooth presentation frames.
- `ui/components/SessionAwakeningView.js` renders the generated matte in Phaser, reveals the existing HUD, and restores the temporary camera effect.
- `sound/SessionAwakeningAudio.js` owns short sound instances and reversible mix factors. It respects current SFX/master settings without overwriting saved volumes.
- `WorldLoadScene` preloads the matte, two approved sounds, and the existing teleport animation sheet.

The arrival animation receives a 50 ms pose hold, then eases from 0.65 to normal speed within 650 ms. At session entry, gameplay waits while the view is closed; normal control returns at 80% of the sequence. World rendering continues throughout. Phaser's global scene/tween clocks are not scaled.

After 320 ms, a key press or tap skips through a 240 ms fade. Reduced motion uses a 750 ms fade without blur, camera drift, or animation slowdown. Suspend, interruption, missing art, effect failure, scene exit, and shutdown restore owned effects. Shutdown tolerates Phaser having already destroyed the player animation and camera.

## Dozing and waking at the town bed

The bed sequence has three distinct stages: a 1.6-second doze, a 4.2-second outdoor time-lapse, and a varied awakening. The eyelids grow heavy and flutter before closing, accompanied by a quieter excerpt of the approved breath recording and a gradual world/music fade. Optional soft blur belongs to dozing and awakening; reduced motion uses simple eye fades.

`TownRestSystem` supplies the presentation clock. After the eyes close, the camera cuts under full cover to a fixed, native-scale composition of the above-ground mountains and Worldroot. The eyelid and blur effects clear completely for the outdoor shot. Two 320 ms fades surround the visible time-lapse; the authoritative clock advances exactly eight game hours only while that shot is fully visible. The existing weather simulation advances with it. Bedtime determines the ending time, including any midnight/season rollover.

At the end of the outdoor shot, full cover returns before `TownRestView.prepareWake` restores the actual player and camera. The controller then chooses a fresh wake profile, excluding the preceding awakening. Bed wakes do not replay the teleport animation.

The existing rest suspension owns controls through the awakening, Ember refill effect, blessing selection and checkpoint. After the awakening, the original 700 ms Ember feedback runs before the blessing panel. Skipping the awakening does not bypass the blessing or save. The eight-hour duration replaces the previous next-morning rule. Refill authority, blessings and checkpoint behavior remain with their existing owners. Leaving during dozing or waking clears owned audio, mix, eyelids and camera effects.

## Assets

The matte is `sprites/fx/session-awakening-v1/eyelids-v1.png`; its neighboring manifest records dimensions/hash, and its readme preserves the exact generation prompt.

Audio reuses current approved registry entries without downloading or importing new sounds:

- `freesound-410390`: PANTIGNY_JeanLoup_2017_2018_heartbeatBreath.wav, univ_lyon3, CC-BY-4.0.
- `freesound-418788`: heartbeat single, .name, CC-BY-4.0.

Original source links and license attribution remain in `values/generated/approved-freesound/danger-panic.js`. Breath uses a short excerpt; each heartbeat uses a bounded marker. Owned sounds fade and are destroyed at completion or cancellation. The world mix returns ahead of the music.

## Camera compatibility fix

The live comparison exposed a bundled Phaser behavior: the offscreen atmosphere Shader returns to the default framebuffer after rendering its texture. With camera post-FX active, later scenery, actors, and HUD then bypassed the camera texture and disappeared under the final blur pass.

`ShaderSystem._createLayer` now restores the framebuffer that was active before the offscreen shader draw, including on an exception. The weather layer and complete world continue through the same camera pass. Normal rendering retains its default target.

## Validation and review

`testing/2026-09-07-session-awakening-contract.mjs` verifies 300 deterministic selections, no immediate repeats, curve endpoints, the sleepy reclose, optional blur, reduced motion, approved local assets, controls, audio/mute/mix restoration, skip, interruption, missing-art/effect failure, destroyed-player teardown, and the shader framebuffer regression.

`testing/2026-08-20-player-jump-flight-motion-contract.mjs` passes all 33 traversal input regressions.

`testing/2026-09-07-session-awakening-live-qa.mjs` drives canonical `serve.py` in isolated Chrome with `?jkd_e2e=1`, which disables save writes. Ten gameplay cases cover all three forced variants, actual D movement and Space jump, keyboard skip, reduced motion, mute and resize, scene exit during entry, rollback, and pointer skip. The recordings capture the actual game canvas and master audio output; screenshots confirm the complete scenery and actors remain visible under blur. This is a fresh-save gameplay fixture, not a campaign playthrough.

Open `testing/2026-09-07-session-awakening-qa/preview.html` to compare the three session recordings. Final per-frame traces and request/runtime findings are in the adjacent `evidence.json`.

The awakening contract also covers repeated doze/wake cycles with the real scene suspension controller, cleanup, no teleport during bed wakes, and input ownership until the rest token is released. `testing/2026-09-07-town-rest-contract.mjs` and `testing/2026-09-07-town-rest-live.mjs` pass with the integrated presentation.

`testing/2026-09-07-sleep-awakening-live-qa.mjs` records two complete bed sleep-to-wake cycles with canvas and master audio, using an isolated browser and an in-memory checkpoint writer. It verifies distinct consecutive awakenings, eyelid flutter and full closure, no early movement or GP changes, day advancement, controls after blessing/save, actual movement and jump, reduced motion with resize/skip, and scene exit during dozing. Browser errors and failed requests are empty. The revised review also verifies a fully exposed outdoor shot with no blur/post-FX, steady framing, changing sky color, an exact eight-hour advance, and scene exit during the time-lapse. Blur is forced on for the dozing/waking portions of these two review recordings; normal gameplay selects it randomly. Open `testing/2026-09-07-sleep-awakening-qa/preview.html` for the recordings and adjacent evidence.

## Local review switches

- `?awakening=0` disables the presentation and its extra preload.
- With `jkd_e2e=1`, `awakeningVariant=first-breath|sleepy-blink|finding-focus` selects a profile and `awakeningBlur=0|1` fixes the blur choice for comparison.
- Normal gameplay uses the varied selection. These review overrides do not alter saves.
