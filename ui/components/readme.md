# Components

UI module — components.

`manualSaveFilePicker.js` owns the invisible browser file-input lifecycle used
by the visible Start Menu and Esc-menu save import controls.

`AuthoredLoadingScreenView.js` composes the dedicated ImageGen 16:9 foundation,
logo, two asset-backed progress meters, minigame copy, and authored retry state.
`AuthoredLoadingProgressMeters.js` crops the amber overall lane and cyan
current-phase lane from real progress without drawing visible primitives.
`AuthoredLoadingMiningBoard.js` owns the separated counters, 8 by 4 material
grid, FX pools, hidden-at-rest strike pickaxe, and seven-slot tool rail.
`AuthoredLoadingMiningMinigame.js` owns input, session diagnostics, and teardown;
`LoadingMiningMinigameFx.js` owns hit, drop, debris, and collapse feedback;
`LoadingMiningPickaxeFx.js` owns the strike/contact/rest lifecycle so a swing
cannot leave the pickaxe covering the board.
`LoadingScreenView.js` routes the complete texture-ready pack to that authored
presentation and keeps the previous procedural screen only for missing-art or
`?loadingMine=0` rollback.

`PauseFeatureLoadingView.js` adapts that approved loading language to deferred
ESC tabs without DOM or flat Phaser placeholder shapes. Its split
`PauseFeatureLoadingChrome.js` and `PauseFeatureLoadingProgress.js` components
compose the authored electric frame, constellation crests, animated energy
lane, themed stages, live count, phase and percentage. The view polls
`RuntimeFeatureAssetManager.getGroupProgress()`, eases only toward the real
texture count, holds a 220 ms ready beat, then hands off automatically.
Destroying it stops every poll, tween and completion timer; the pause shell
separately cancels and releases the pending feature request.
