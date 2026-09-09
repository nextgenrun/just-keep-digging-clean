/** Approved V2 appearance on the existing animation keys, timings and anchors. */
export const CHARACTER_DEFINITION_RUNTIME_V2 = Object.freeze({
  enabled: true,
  version: "character-definition-v2-20260906",
  runtimeRoot: "sprites/character/survival-character-definition-v2/runtime",
  frameSizePx: 512,
  sheetType: "multiatlas",
  // Native Jog composites fill more of the cell than the old Piskel crops.
  movingDisplaySizePx: 117,
  movingOrigin: Object.freeze({ x: 0.5, y: 0.916015625 }),
  calibratedAnimationPrefixes: Object.freeze([
    "survival-ual-player-v1-moving-side-dig-",
    "survival-ual-player-v1-moving-diagonal-",
  ]),
  clothEnabled: false,
});

export function applyCharacterDefinitionRuntimeV2(profile, enabled = CHARACTER_DEFINITION_RUNTIME_V2.enabled) {
  if (!enabled || !profile.unifiedAnimationRuntime) return profile;
  const config = CHARACTER_DEFINITION_RUNTIME_V2;
  const calibrated = Object.keys(profile.displaySizePxByAnimation || {}).filter(key =>
    config.calibratedAnimationPrefixes.some(prefix => key.startsWith(prefix)),
  );
  return Object.freeze({
    ...profile,
    version: config.version,
    basePath: config.runtimeRoot,
    frameWidth: config.frameSizePx,
    frameHeight: config.frameSizePx,
    frameSizePxBySheet: Object.freeze(Object.fromEntries(
      profile.requiredSheets.map(key => [key, config.frameSizePx]),
    )),
    displaySizePxByAnimation: Object.freeze({
      ...profile.displaySizePxByAnimation,
      ...Object.fromEntries(calibrated.map(key => [key, config.movingDisplaySizePx])),
    }),
    visualOriginByAnimation: Object.freeze({
      ...profile.visualOriginByAnimation,
      ...Object.fromEntries(calibrated.map(key => [key, config.movingOrigin])),
    }),
    sheetType: config.sheetType,
    characterDefinitionRuntime: config,
    sheetFiles: Object.freeze(profile.sheetFiles.map(entry => Object.freeze([
      entry[0], `${profile[entry[0]]}.json`, entry[2], config.runtimeRoot,
    ]))),
  });
}
