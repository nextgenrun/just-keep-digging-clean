# AAA Polish Overhaul — Phase 1 (2026-07-06)

Low-effort / high-impact "triple-A feel" pass built on the existing framework.
All tunables live in `/values/` per the Single Source of Truth policy.

## What shipped

### 1. Material identity pass (biggest feel win)
Every material now sounds and feels distinct when hit/broken.
- **Data table:** `values/materialFeedback.js` — per-tile `digRate`, `breakRate`,
  `breakVolume`, `particleScale`, `particleSizeScale`, `shakeScale`, `glint`.
- Soft dirt = quick + high pitch, stone = neutral, metals = heavy + low pitch +
  chunkier bursts + stronger shake, silver/gold/sky = bright ringing pitch +
  additive star-sparkle **glint burst** (`GLINT_CONFIG`).
- **Hooks:** `world/playScene/PlaySceneGameplay.js`
  (`playMineFeedbackAudio`, `_applyMineShake`, `_applyDestroyParticles`,
  new `_applyGlintBurst`).
- **Audio plumbing:** `sound/SoundSystem.js` — `playSfx(key, vol, {rate})`;
  `playDig(options)` / `playTileBreak(options)` accept rate/volume.
  Varied pitch also kills the "same sample" fatigue on rapid digging.

### 2. Player body language (squash & stretch)
`systems/visual/PlayerBodyLanguageSystem.js` + `values/gamefeel.js → bodyLanguage`.
- Landing squash scaled by fall velocity (Back.easeOut recovery).
- Subtle fall stretch while dropping fast.
- Tiny scale pop on every dig impact (bigger on tile break) — called from
  `applyMineFeedback`.
- Applied on `POST_UPDATE` recomputing base scale from the asset profile, so it
  composes safely with the game's `setDisplaySize` calls. Living drill is
  excluded by default (`affectLivingDrill: false`) — it has its own bite visuals.

### 3. Cinematic PostFX stack
`systems/visual/PostFxSystem.js` + `values/postFxConfig.js`.
- Soft camera vignette that closes in slightly with depth.
- Depth-based color grading: warm/neutral at surface → desaturated + darker
  in the deep (ColorMatrix saturate/brightness lerp).
- WebGL-only, smoothing lerp, and **auto-disables on sustained low FPS**.

### 4. Ambient atmosphere particles
`systems/environment/AmbientParticleSystem.js` + `values/ambientParticleConfig.js`.
- Floating additive dust motes underground + occasional falling grit.
- Hard particle cap (26), spawn interval, FPS guard, only below 4m depth.

### 5. Combo momentum (gameplay)
`values/comboConfig.js → momentum` + `systems/mining/DigSystem.js _getCooldown`.
- Mild dig-speed reward for keeping combos alive: ramps from combo 5 → 60,
  max **8% faster** digging. Makes flow-state mining physically felt without
  breaking economy balance.

## Wiring
- Created + destroyed in `world/playScene/PlaySceneSetup.js`
  (`postFxSystem`, `playerBodyLanguage`, `ambientParticleSystem`).
- All three systems self-subscribe to scene UPDATE/POST_UPDATE events —
  no changes to PlaySceneUpdate needed.

## Verification
- All 12 changed/new files pass bracket/string sanity check
  (`ai-tools/2026-07-06-js-sanity-check.py`).
- Import direction respected: values ← systems ← world. No circular deps.

## Phase 2 backlog (flagged, not yet implemented)
1. **Depth milestone cinematic moments** — slow zoom + letterbox + title card
   at 100m/300m/500m (values/depthMilestones.js already exists as data source).
2. **HUD 2.0** — micro-juice on resource gain (count-up ticks, icon pops),
   combo meter bar with decay indicator.
3. **UI sound pass** — hover/click sounds on all PhaserUiKit buttons
   (SoundSystem.playUiSelect/playUiConfirm already exist — wire them in).
4. **Scene transition language** — unified fade/iris transitions between
   Menu → StartMenu → WorldLoad → Play.
5. **Adaptive audio** — depth-based music ducking + ambience crossfade layers.