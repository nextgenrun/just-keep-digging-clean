const VERSION = "survival-unified-animation-runtime-v1-20260825";
const RUNTIME_ROOT = "sprites/character/survival-character-unified-v1/runtime";
const DISPLAY_SIZE_PX = 101;
const FRAME_SIZE_PX = 256;
const MOVING_COMPLEX_FRAME_SIZE_PX = 192;
const GROUNDED_ORIGIN = Object.freeze({ x: 0.5, y: 0.890625 });
const TRANSITION_COHESION = Object.freeze({
  enabledByDefault: true,
  rollbackQuery: "transitionCohesion",
  disabledValues: Object.freeze(["0", "off", "false"]),
  // These three families are used directly by ordinary traversal. Keeping
  // them resident prevents a first-use idle flash while an on-demand sheet is
  // decoded. Abilities and rare reactions remain deferred.
  preloadDeferredPackIds: Object.freeze([
    "crouch",
    "flight",
    "locomotion-polish",
  ]),
});
const PRESENTATION_CONTINUITY = Object.freeze({
  enabledByDefault: true,
  rollbackQuery: "presentationContinuity",
  disabledValues: Object.freeze(["0", "off", "false"]),
  proceduralBodyLanguageScaleEnabled: false,
});

export const SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1 = Object.freeze({
  version: VERSION,
  runtimeRoot: RUNTIME_ROOT,
  displaySizePx: DISPLAY_SIZE_PX,
  frameSizePx: FRAME_SIZE_PX,
  movingComplexFrameSizePx: MOVING_COMPLEX_FRAME_SIZE_PX,
  groundedOrigin: GROUNDED_ORIGIN,
  rollbackQuery: "unifiedAnimation",
  disabledQueryValue: "0",
  transitionCohesion: TRANSITION_COHESION,
  presentationContinuity: PRESENTATION_CONTINUITY,
});

export function resolveSurvivalUnifiedAnimationEnabled(search = null) {
  const query = search ?? (typeof window !== "undefined" ? window.location.search : "");
  return new URLSearchParams(query).get("unifiedAnimation") !== "0";
}

export function resolveSurvivalTransitionCohesionEnabled(search = null) {
  const query = search ?? (typeof window !== "undefined" ? window.location.search : "");
  const value = new URLSearchParams(query)
    .get(TRANSITION_COHESION.rollbackQuery)
    ?.trim()
    .toLowerCase();
  return TRANSITION_COHESION.enabledByDefault
    && (!value || !TRANSITION_COHESION.disabledValues.includes(value));
}

export function resolveSurvivalPresentationContinuityEnabled(search = null) {
  const query = search ?? (typeof window !== "undefined" ? window.location.search : "");
  const value = new URLSearchParams(query)
    .get(PRESENTATION_CONTINUITY.rollbackQuery)
    ?.trim()
    .toLowerCase();
  return PRESENTATION_CONTINUITY.enabledByDefault
    && (!value || !PRESENTATION_CONTINUITY.disabledValues.includes(value));
}

function runtimeFileName(sheetKey) {
  return `2026-08-25-${sheetKey}.webp`;
}

function uniformValues(source, value) {
  return Object.freeze(Object.fromEntries(
    Object.keys(source || {}).map((key) => [key, value]),
  ));
}

export function applySurvivalUnifiedAnimationRuntimeV1(profile, enabled = true) {
  if (!enabled) return profile;

  const ledgeSheet = profile.ledgeAssistEnabled ? profile.ledgeClimbSheet : null;
  const presentationContinuityEnabled = resolveSurvivalPresentationContinuityEnabled();
  const frameSizePxBySheet = Object.freeze(Object.fromEntries(
    profile.requiredSheets.map((sheetKey) => [
      sheetKey,
      sheetKey === profile.movingComplexDigSheet
        ? MOVING_COMPLEX_FRAME_SIZE_PX
        : FRAME_SIZE_PX,
    ]),
  ));
  const visualOriginBySheet = Object.freeze(Object.fromEntries(
    profile.requiredSheets.map((sheetKey) => [
      sheetKey,
      sheetKey === ledgeSheet
        ? (profile.visualOriginBySheet?.[sheetKey] || GROUNDED_ORIGIN)
        : GROUNDED_ORIGIN,
    ]),
  ));
  const visualOriginByAnimation = Object.freeze({
    ...uniformValues(profile.visualOriginByAnimation, GROUNDED_ORIGIN),
    ...(profile.ledgeAssistEnabled ? {
      [profile.ledgeHangAnim]: profile.visualOriginByAnimation?.[profile.ledgeHangAnim]
        || profile.visualOriginBySheet?.[ledgeSheet]
        || GROUNDED_ORIGIN,
      [profile.ledgeClimbAnim]: profile.visualOriginByAnimation?.[profile.ledgeClimbAnim]
        || profile.visualOriginBySheet?.[ledgeSheet]
        || GROUNDED_ORIGIN,
    } : {}),
  });
  const sheetFiles = Object.freeze(profile.sheetFiles.map((entry) => Object.freeze([
    entry[0],
    runtimeFileName(profile[entry[0]]),
    entry[2],
    RUNTIME_ROOT,
  ])));

  return Object.freeze({
    ...profile,
    renderPipeline: "survival-unified-animation-runtime-v1",
    version: VERSION,
    basePath: RUNTIME_ROOT,
    coreAnimationPolicy: "One Survival V4 mesh, rig, material, light, camera, scale and grounded-origin contract across every runtime animation; gameplay keys and contacts are preserved",
    frameWidth: FRAME_SIZE_PX,
    frameHeight: FRAME_SIZE_PX,
    frameSizePxBySheet,
    displaySizePx: DISPLAY_SIZE_PX,
    displaySizePxByAnimation: uniformValues(profile.displaySizePxByAnimation, DISPLAY_SIZE_PX),
    visualOriginX: GROUNDED_ORIGIN.x,
    visualOriginY: GROUNDED_ORIGIN.y,
    visualOriginBySheet,
    visualOriginByAnimation,
    sheetFiles,
    preloadDeferredAnimationPackIds: resolveSurvivalTransitionCohesionEnabled()
      ? TRANSITION_COHESION.preloadDeferredPackIds
      : Object.freeze([]),
    proceduralBodyLanguageScaleEnabled: presentationContinuityEnabled
      ? PRESENTATION_CONTINUITY.proceduralBodyLanguageScaleEnabled
      : profile.proceduralBodyLanguageScaleEnabled,
    preferAuthoredActionRecovery: presentationContinuityEnabled,
    // The legacy marker manifest was projected through several rejected crops
    // and origins. Unified actions are body-locked, so retaining those stale
    // coordinates would reintroduce sprite/hitbox drift; footsteps safely use
    // the physics-body floor fallback until unified markers are authored.
    rigManifestKey: null,
    rigManifestFile: null,
    rigMarkerPolicy: "body-locked contacts with physics-floor footstep fallback",
    unifiedAnimationRuntime: SURVIVAL_UNIFIED_ANIMATION_RUNTIME_V1,
  });
}
