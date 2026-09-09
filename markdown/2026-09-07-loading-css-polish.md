# Loading screen polish — 2026-09-07

The shared boot, world and portal loader now has a compact CSS foreground using
the approved HUD XP-frame artwork. The normal state has no outer card or badge.
Warm serif text, a restrained percentage and the existing main-menu button art
for retry match the game's asset library. Scenery and logo retain their existing
owners. The earlier rounded-card treatment was rejected and replaced.

Useful loading tips remain visible: both the heading and explanatory text render
around the meter. BootScene still uses the unchanged LOADING_MESSAGES catalogue
and eight-second rotation. The preview uses an actual gameplay tip from that
catalogue. Text and panel width adapt together on smaller canvases.

The visible phase is OPEN BETA DEMO, shared through values/releasePresentation.js
by boot, loading views, main-menu footer/credits and save selection. The document
title uses the same release wording.

Progress follows the existing loader calls. CSS transitions only ease changes
to progress width and button feedback; reduced motion disables them. No new
framework, CDN, fake-progress timer or recurring foreground animation is added.

MenuLoadingPanel.js aligns its DOM layer with the measured canvas bounds. A
Phaser container carries parent alpha into CSS, including the portal fade.
Pause disables controls, sleep hides the panel, and destruction removes the DOM,
resize observer and scene/game listeners. LoadingScreenView's existing API and
retry admission remain intact. Layout, asset references and theme values live in
values/menuLoadingPresentation.js and values/menuLoadingTheme.css.

## Verification

- Changed JavaScript syntax checks and existing menu-first loading-order and loading archive contracts passed.
- Final asset/tip preview at 640 × 800: heading and detail visibly render without clipping or horizontal overflow. Failure layout also fits; keyboard retry restores one loading panel with the useful tip.
- Final desktop preview at 1280 × 720: existing HUD frame and OPEN BETA DEMO label render with the full useful tip.
- Asset revision: 0%, 64%, 100%, failure and keyboard retry checked; retry uses the authored main-menu art.
- Initial integration: normal and parent portal fades removed all CSS panels; parent fade drove intermediate CSS opacity. Pause/resume, destroy/recreate and canvas alignment passed.
- Initial integration: save-disabled real boot, save selection and slot 2 entry reached gameplay after observed 30% world loading, with no remaining loading panels or captured console errors.
- Final asset/tip revision: real boot displayed a useful Ember Charges tip and its explanation at 89%, then reached the main menu with zero loading panels and no captured browser errors. Main-menu and save-selection footers visibly read OPEN BETA DEMO.
- No full portal traversal was repeated; its parent fade was checked using the production component in the review fixture.

Evidence is in testing/2026-09-07-loading-css/. after.png and
quiet-beta-preview.png show the current compact design with visible tips.
card-rejected.png and browser-proof.json retain the initial integration evidence.
The existing atmosphere review accepts loadingUiReview=1 for progress/fade
controls and loadingUiReview=clean for a clean fixed-64% production-component
preview. menuMotion=0 keeps scenery still for comparison.
