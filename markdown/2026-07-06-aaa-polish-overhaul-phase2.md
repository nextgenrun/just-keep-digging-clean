# AAA Polish Overhaul — Phase 2 (2026-07-06)

Continuing the low-effort / high-impact "triple-A feel" pass.
All tunables live in `/values/` per the Single Source of Truth policy.

## What shipped this phase

### 1. Depth milestone cinematics ⭐
Cinematic "moment" system for major depth thresholds — the single biggest
"this feels like a real game" upgrade in this phase.

- **Trigger depths:** 100m, 300m, 500m, **750m** (new milestone), 1000m, 1500m, 2000m
- **Sequence:** letterbox bars slide in → golden vignette flash → title card
  slides up (milestone name + reward + depth) → hold → fade out → bars slide out
- **System:** `systems/visual/DepthMilestoneCinematic.js`
- **Config:** `values/depthCinematicConfig.js` (timing, bar height/alpha, fonts, colors, guards)
- **Data:** `values/depthMilestones.js` — added 750m "The Descent" milestone
- **Wiring:** Created/destroyed in `PlaySceneSetup.js`; triggered from
  `PlaySceneUpdate.js` inside the existing `checkDepthMilestone` block
- **Guards:** Won't trigger during overlays (shop, level-up, campfire, etc.),
  has a 5s cooldown, FPS guard (skips below 25fps), and per-depth one-shot tracking
- **Design decision:** Camera zoom + time-scale slow were intentionally omitted
  (zooming the main camera breaks HUD layout per existing code comments; time-scale
  would desync tween timing). These are Phase 3 items pending a two-camera system.
  The letterbox + title + flash alone feel distinctly AAA.

## Verification
- All 16 changed/new files pass bracket/string sanity check
  (`ai-tools/2026-07-06-js-sanity-check.py`)
- Import direction respected: values ← systems ← world. No circular deps.

## Remaining Phase 2 backlog
2. **HUD 2.0 micro-juice** — count-up ticks on resource gain, combo meter bar
3. **UI sound pass** — hover/click sounds on all PhaserUiKit buttons
4. **Scene transition language** — unified fade/iris transitions
5. **Adaptive audio layers** — depth-based music ducking + ambience crossfade