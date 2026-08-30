const range = (length, start = 0) => Object.freeze(
  Array.from({ length }, (_, index) => start + index),
);

const WALK_FRAME_COUNT = 24;
const HANDOFF_START_FRAME_COUNT = 7;
const HANDOFF_STOP_FRAME_COUNT = 5;
const HANDOFF_STOP_PHASES = Object.freeze(range(WALK_FRAME_COUNT / 2)
  .map((index) => index * 2));
const HANDOFF_SHEET_FRAME_COUNT = HANDOFF_START_FRAME_COUNT
  + HANDOFF_STOP_PHASES.length * HANDOFF_STOP_FRAME_COUNT;

function stopVariantKey(baseKey, phase) {
  if (phase === 0) return baseKey;
  return baseKey.replace(/-anim$/, `-phase-${String(phase).padStart(2, "0")}-anim`);
}

function buildStopVariants(stopAnimationKey, sheet) {
  return Object.freeze(HANDOFF_STOP_PHASES.map((runFrame, index) => Object.freeze({
    key: stopVariantKey(stopAnimationKey, runFrame),
    sheet: sheet.key,
    frames: range(
      HANDOFF_STOP_FRAME_COUNT,
      HANDOFF_START_FRAME_COUNT + index * HANDOFF_STOP_FRAME_COUNT,
    ),
    frameRate: sheet.frameRate,
    repeat: 0,
    runFrame,
  })));
}

export const SURVIVAL_MIXAMO_WALK_RUNTIME = Object.freeze({
  version: "survival-mixamo-walk-runtime-v3-20260830",
  enabledByDefault: true,
  rollbackQuery: "mixamoWalk",
  disabledValues: Object.freeze(["0", "off", "false"]),
  sheet: Object.freeze({
    key: "survival-mixamo-v1-walk-loop-sheet",
    fileName: "survival-character-mixamo-locomotion-v1-walk-loop-sheet.png",
    frames: range(WALK_FRAME_COUNT),
    frameRate: 24,
    displaySizePx: 101,
  }),
  handoff: Object.freeze({
    sheet: Object.freeze({
      key: "survival-mixamo-v2-walk-handoff-sheet",
      fileName: "2026-08-25-survival-mixamo-v2-walk-handoff-sheet.webp",
      basePath: "sprites/character/survival-character-unified-v1/runtime",
      frames: range(HANDOFF_SHEET_FRAME_COUNT),
      frameSizePx: 192,
      frameRate: 24,
      displaySizePx: 101,
      origin: Object.freeze({ x: 0.5, y: 0.890625 }),
    }),
    startFrameCount: HANDOFF_START_FRAME_COUNT,
    stopFrameCount: HANDOFF_STOP_FRAME_COUNT,
    stopPhases: HANDOFF_STOP_PHASES,
    resumeWalkFrame: 7,
  }),
  sourceClip: "mixamo-standard-walk-123500901.fbx",
  strideTilesPerCycle: 1.55,
  footstepFrameIndices: Object.freeze([0, 12]),
});

export function buildSurvivalMixamoWalkHandoffAnimations(
  startAnimationKey,
  stopAnimationKey,
) {
  const handoff = SURVIVAL_MIXAMO_WALK_RUNTIME.handoff;
  const start = Object.freeze({
    key: startAnimationKey,
    sheet: handoff.sheet.key,
    frames: range(handoff.startFrameCount),
    frameRate: handoff.sheet.frameRate,
    repeat: 0,
  });
  const stopVariants = buildStopVariants(stopAnimationKey, handoff.sheet);
  const stopByPhase = new Map(stopVariants.map((variant) => [variant.runFrame, variant]));
  const stopAnimationKeyByOutgoingWalkFrame = Object.freeze(range(WALK_FRAME_COUNT)
    .map((frame) => {
      const nextEvenPhase = frame % 2 === 0 ? frame : (frame + 1) % WALK_FRAME_COUNT;
      return stopByPhase.get(nextEvenPhase).key;
    }));
  return Object.freeze({
    sheet: handoff.sheet,
    start,
    stopVariants,
    stopAnimationKeyByOutgoingWalkFrame,
    animations: Object.freeze([start, ...stopVariants]),
    animationKeys: Object.freeze([start.key, ...stopVariants.map((variant) => variant.key)]),
  });
}

export function resolveSurvivalMixamoWalkEnabled(search = null) {
  const query = search ?? (typeof window !== "undefined" ? window.location.search : "");
  const value = new URLSearchParams(query)
    .get(SURVIVAL_MIXAMO_WALK_RUNTIME.rollbackQuery)
    ?.trim()
    .toLowerCase();
  return SURVIVAL_MIXAMO_WALK_RUNTIME.enabledByDefault
    && (!value || !SURVIVAL_MIXAMO_WALK_RUNTIME.disabledValues.includes(value));
}

export function buildSurvivalMixamoWalkGroundHandoff(
  current,
  startAnimationKey,
  stopAnimationKey,
  animations = buildSurvivalMixamoWalkHandoffAnimations(
    startAnimationKey,
    stopAnimationKey,
  ),
) {
  if (!current || !startAnimationKey || !stopAnimationKey) return current;
  return Object.freeze({
    ...current,
    runFrameCount: WALK_FRAME_COUNT,
    resumeJogFrame: SURVIVAL_MIXAMO_WALK_RUNTIME.handoff.resumeWalkFrame,
    startAnimationKey,
    stopAnimationKeyPrefix: stopAnimationKey,
    start: animations.start,
    stopVariants: animations.stopVariants,
    stopAnimationKeyByOutgoingJogFrame:
      animations.stopAnimationKeyByOutgoingWalkFrame,
  });
}
