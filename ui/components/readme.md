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


Menu atmosphere (2026-09-07): `values/menuAtmosphere.js` owns the shared six-scene
configuration. `ui/components/MenuBackgroundView.js` owns silent video playback,
poster fallback, reduced motion, visibility and teardown. Tailwind 4.3.3 builds
`css/menu-shell.css`; the local Radash 12.1.1 module debounces resize work.

Baked Save Slots (2026-09-07): BakedSaveMenuView.js renders complete ImageGen cards and instruction plaques. It clips original atlas frame silhouettes, aligns changing values to source-pixel wells, and shares the existing save-menu asset lifecycle.

Menu loop refinement (2026-09-07): `MenuBackgroundView.js` uses two instances of the same selected clip. It primes the hidden head, dissolves before the visible tail ends, then rewinds the hidden copy. Combined video opacity stays constant; both textures, timers and listeners are released with the view. Scene selection remains unchanged during repetition.

Menu atmosphere visibility refinement (2026-09-07): the same-scene dissolve compensates for container alpha at render time. Buffer priming waits for the native play promise before pausing, preventing an intermittent AbortError. Review options can override the media path and mix without changing the selected painting.

CSS loading foreground (2026-09-07): MenuLoadingPanel.js owns the visible DOM
loading panel, canvas alignment, parent fade and teardown. LoadingScreenView.js
retains scenery/logo ownership and its existing loading/retry API. Both loading
tip text fields remain visible; the compact foreground reuses approved HUD and
menu assets.


Animated brand logo (2026-09-07): BrandLogoView.js shares the approved silent 15-second alpha-video logo across boot, loading and menus. It preserves existing layout/fades, respects reduced motion, retains a static error fallback, and owns playback/texture cleanup. See markdown/2026-09-07-animated-brand-logo.md.

`SessionAwakeningView` animates generated feathered eyelid art in Phaser, applies temporary camera focus, and reveals the existing HUD. Its factory fails open when art is unavailable; exit restores the camera and native fullscreen control.


Compact logo glass (2026-09-07): BrandLogoView.js places the generated glass texture behind both logo modes within the existing bounds. BRAND_CONFIG.backing owns the frame/opacity, and animation.playbackRate slows the logo to 0.67 for the menu scenery tempo.


Logo material correction (2026-09-07): BrandLogoView now uses the generated matte stone and bronze backing at existing bounds. This supersedes the glass style. Both menu footer labels use the shared high-contrast RELEASE_PRESENTATION.footer values.

Motion readability (2026-09-07): BrandLogoView keeps the sharp static letter faces
visible and adds H.264 colored-light motion at 60 fps. MenuBackgroundView uses
the selected version's loop strategy; v5 uses one native decoder for already
closed 60 fps clips. Earlier versions retain their buffered overlap. See
markdown/2026-09-07-menu-motion-smoothing.md.


Loading network/readability (2026-09-08): LoadingScreenView uses static scenery and the brighter, larger shared logo while assets load. Menu scenes retain their animation. See markdown/2026-09-08-startup-recovery-and-size.md.

Loading presentation (2026-09-08): the logo uses a lightweight copy of its approved moving-light layer, larger bounds and a poster-only brightness grade. Loading backgrounds use their own stronger contrast veil; menus keep their existing presentation. Reduced-motion and data-saver preferences retain the static poster.
