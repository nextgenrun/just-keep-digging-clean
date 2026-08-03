# Components

UI module — components.

`manualSaveFilePicker.js` owns the invisible browser file-input lifecycle used
by the visible Start Menu and Esc-menu save import controls.

`LoadingScreenView.js` owns the regular pre-minigame Boot and WorldLoad
presentation, including real progress, failure, retry, and teardown behavior.
The retired interactive loading board, authored two-column presentation, and
their dedicated assets live under
`archive/2026-08-03-loading-mining-minigame/` for rollback.

`PauseFeatureLoadingView.js` adapts that approved loading language to deferred
ESC tabs without DOM or flat Phaser placeholder shapes. Its split
`PauseFeatureLoadingChrome.js` and `PauseFeatureLoadingProgress.js` components
compose the authored electric frame, constellation crests, animated energy
lane, themed stages, live count, phase and percentage. The view polls
`RuntimeFeatureAssetManager.getGroupProgress()`, eases only toward the real
texture count, holds a 220 ms ready beat, then hands off automatically.
Destroying it stops every poll, tween and completion timer; the pause shell
separately cancels and releases the pending feature request.
