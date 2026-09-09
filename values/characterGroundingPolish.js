import { CHARACTER_GROUNDING_CONTACTS, CHARACTER_GAIT_TRANSFERS } from "./characterGroundingContacts.generated.js";

export const CHARACTER_GROUNDING_POLISH = Object.freeze({
  enabled: true,
  rollbackQuery: "characterGrounding",
  version: "character-grounded-v3-20260907",
  runtimeRoot: "sprites/character/survival-character-grounded-v3/runtime",
  displaySizePx: 101,
  sourceSizePx: 1024,
  frameSizePx: 512,
  locomotionFrameRate: 24,
  minimumTimeScale: 0.08,
  maximumTimeScale: 4,
  handoffTimeScale: Object.freeze({ start: 2.4, stop: 2.3 }),
  appearance: Object.freeze({ dayTop: 1, dayBottom: 0.96, nightTop: 0.90, nightBottom: 0.84, responsePerSecond: 3 }),
});

export function applyCharacterGroundingPolish(profile, enabled = CHARACTER_GROUNDING_POLISH.enabled) {
  const disabled = ["0", "false", "off"].includes(new URLSearchParams(globalThis.location?.search || "").get(CHARACTER_GROUNDING_POLISH.rollbackQuery));
  if (!enabled || disabled || !profile.characterDefinitionRuntime) return profile;
  if (!CHARACTER_GROUNDING_CONTACTS[profile.walkLoopSheet] || !CHARACTER_GROUNDING_CONTACTS[profile.walkRunSheet]
    || !profile.walkHandoffFrames?.length) return profile;
  const config = CHARACTER_GROUNDING_POLISH;
  const runSheet = "survival-held-torch-v2-run-sheet";
  const handoffSheet = "survival-held-torch-v2-run-handoff-sheet";
  const handoffs = new Map(profile.animationPolishAnimations
    .filter(a => a.sheet === profile.walkHandoffSheet).map(a => [a.key, a]));
  const heldTorchAnimations = profile.heldTorchAnimations.map(animation => {
    if (animation.baseAnimationKey === profile.walkRunAnim) return Object.freeze({ ...animation, sheet: runSheet });
    const native = handoffs.get(animation.baseAnimationKey);
    return native ? Object.freeze({ ...animation, sheet: handoffSheet, frames: native.frames, frameRate: native.frameRate }) : animation;
  });
  const extras = profile.heldTorchRuntime?.enabled ? [
    ["heldTorchRunSheet", runSheet, "heldTorchRunFrames", profile.walkRunFrames],
    ["heldTorchRunHandoffSheet", handoffSheet, "heldTorchRunHandoffFrames", profile.walkHandoffFrames],
  ] : [];
  const sheets = Object.keys(CHARACTER_GROUNDING_CONTACTS);
  const walkKeys = [profile.walkAnim, profile.walkStartAnim, profile.walkLoopAnim, profile.walkStopAnim];
  const stridePxByAnimation = {
    [profile.walkLoopAnim]: CHARACTER_GROUNDING_CONTACTS[profile.walkLoopSheet].stridePx,
    [profile.walkRunAnim]: CHARACTER_GROUNDING_CONTACTS[profile.walkRunSheet].stridePx,
  };
  for (const animation of heldTorchAnimations) {
    const stride = CHARACTER_GROUNDING_CONTACTS[animation.sheet]?.stridePx;
    if (stride) stridePxByAnimation[animation.key] = stride;
  }
  const footstepFrameIndices = { ...profile.footstepFrameIndices };
  for (const [key, sheet] of [[profile.walkLoopAnim, profile.walkLoopSheet], [profile.walkRunAnim, profile.walkRunSheet],
    ...heldTorchAnimations.map(a => [a.key, a.sheet])]) {
    const contacts = CHARACTER_GROUNDING_CONTACTS[sheet]?.contacts;
    if (contacts && Object.keys(contacts).length) footstepFrameIndices[key] = Object.freeze(Object.keys(contacts).map(frame => Number(frame) + 1));
  }
  return Object.freeze({
    ...profile,
    footstepFrameIndices: Object.freeze(footstepFrameIndices),
    version: config.version,
    coreAnimationPolicy: "Approved V2 material, fixed native camera and scale; shoe-grounded Standard Walk / Standard Run with phase-matched handoffs",
    characterGroundingPolish: config,
    walkAnimationFps: config.locomotionFrameRate,
    groundingContacts: CHARACTER_GROUNDING_CONTACTS,
    groundGaitFrameTransfers: CHARACTER_GAIT_TRANSFERS,
    mipmappedCharacterSheets: Object.freeze(sheets),
    stridePxByAnimation: Object.freeze(stridePxByAnimation),
    ...Object.fromEntries(extras.flatMap(([property, key, framesProperty, frames]) => [[property, key], [framesProperty, frames]])),
    requiredSheets: Object.freeze([...new Set([...profile.requiredSheets, ...extras.map(e => e[1])])]),
    frameSizePxBySheet: Object.freeze({ ...profile.frameSizePxBySheet, ...Object.fromEntries(extras.map(e => [e[1], config.frameSizePx])) }),
    sheetFiles: Object.freeze([
      ...profile.sheetFiles.filter(entry => !extras.some(extra => extra[0] === entry[0])).map(entry => Object.freeze(sheets.includes(profile[entry[0]])
        ? [entry[0], entry[1], entry[2], config.runtimeRoot] : entry)),
      ...extras.map(([property, key, framesProperty]) => Object.freeze([property, `${key}.json`, framesProperty, config.runtimeRoot])),
    ]),
    displaySizePxByAnimation: Object.freeze({ ...profile.displaySizePxByAnimation,
      ...Object.fromEntries(walkKeys.map(key => [key, config.displaySizePx])),
    }),
    heldTorchAnimations: Object.freeze(heldTorchAnimations),
    animationPolishConfig: Object.freeze({ ...profile.animationPolishConfig,
      groundHandoff: Object.freeze({ ...profile.animationPolishConfig.groundHandoff, timeScaleByKind: config.handoffTimeScale }),
    }),
  });
}
