# Animated UNDERSTAR brand logo

2026-09-07. User-approved Seedance loop is now used by Boot, regular loading
screens, MainMenuScene and StartMenuScene through ui/components/BrandLogoView.js.

The helper preserves the static texture's intrinsic size, existing scene scale,
position and fades. It streams the silent 15-second VP9-alpha WebM on demand,
then hides the poster only after playback is ready. The shared configuration is
BRAND_CONFIG.animation in values/branding.js.

Reduced motion, data-saving mode, ?menuMotion=0 (the existing scenery policy)
or ?logoMotion=0 keeps the poster. A video error also retains the approved static
logo. Scene pause/sleep, document visibility, scene shutdown and explicit view
destruction are handled; the owned dynamic texture is released.

The approved MP4 remains unchanged. The runtime derivative is cropped to its
logo viewport and keyed with a clean per-frame matte. An eroded core from the
approved static alpha protects dark rock from disappearing. Authoring settings
are values/understarLogoVideoMatte.json; the offline builder is
ai-tools/2026-09-07-logo-animation/2026-09-07-build-alpha.py.
OpenCV is an offline tool dependency only; it is not shipped or imported by the
game. The runtime clip is understar-logo-loop-alpha-v2.webm in the V4 package.

Validation: animated-runtime-verification.json in the V4 package records actual
main/save-menu playback, fixed bounds across the loop seam, reduced motion,
pause/resume, transition cleanup, explicit view cleanup, failed-request fallback
and browser errors. Runtime screenshots are animated-main-menu.png and
animated-save-menu.png. The first basic chroma key was replaced after light
background review showed rough fringes; alpha-v2-light.png records the refined
matte. Existing save and gameplay logic were unchanged. No deployment occurred.

