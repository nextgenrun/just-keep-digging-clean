// Approved production pillar visuals and progression values.
// Screenshot 1 drives the town Milestone Pillar; screenshot 2 drives the Sky Island Star Pillar.

const freezeSocketStage = (anchors) => Object.freeze(
  anchors.map(({ x, y, diameter }) => Object.freeze({ x, y, diameter }))
);

export const PILLAR_VISUAL_CONFIG = Object.freeze({
  assetBasePath: "sprites/environment/approved-pillars-v1/",
  milestone: Object.freeze({
    filenames: Object.freeze([
      "milestone-pillar-stage-1.png",
      "milestone-pillar-stage-2.png",
      "milestone-pillar-stage-3.png",
      "milestone-pillar-stage-4.png",
      "milestone-pillar-stage-5.png",
    ]),
    stageDepths: Object.freeze([0, 500, 1000, 1500, 2000]),
    maxHeightPx: 300,
    depth: 12,
    baseYOffsetPx: 5,
    transitionDurationMs: 420,
    transitionStartScale: 0.9,
    transitionStartAlpha: 0.2,
    promptOffsetPx: 14,
    promptFontSizePx: 14,
    promptDepth: 20,
    promptPulseMinAlpha: 0.72,
    promptPulseMaxAlpha: 1,
    promptPulseDurationMs: 950,
    promptText: "Milestone Pillar",
    glowColor: 0x47DCE8,
    glowWidthPx: 142,
    glowHeightPx: 26,
    glowAlpha: 0.16,
    glowPulseScale: 1.16,
    glowPulseDurationMs: 1500,
  }),
  star: Object.freeze({
    filenames: Object.freeze([
      "star-pillar-stage-1.png",
      "star-pillar-stage-2.png",
      "star-pillar-stage-3.png",
      "star-pillar-stage-4.png",
      "star-pillar-stage-5.png",
    ]),
    stageUnlockThresholds: Object.freeze([0, 1, 3, 5, 7]),
    maxHeightPx: 260,
    depth: 12,
    transitionDurationMs: 520,
    transitionStartScale: 0.9,
    transitionStartAlpha: 0.18,
    promptOffsetPx: 16,
    promptFontSizePx: 16,
    promptDepth: 20,
    promptText: "View Star Chart",
    glowColor: 0x48CFFF,
    glowWidthPx: 170,
    glowHeightPx: 34,
    glowAlpha: 0.2,
    glowPulseScale: 1.2,
    glowPulseDurationMs: 1600,
    starDepthOffset: 3,
    starCoreScale: 1.05,
    starHaloScale: 1.42,
    starSingleAlpha: 0.7,
    starPairAlpha: 1,
    starHaloAlpha: 0.22,
    starPulseScale: 1.1,
    starPulseDurationMs: 1050,
    starPulseStaggerMs: 130,
    starPopStartScale: 0.18,
    starPopPeakScale: 1.32,
    starPopDurationMs: 560,
    starBurstScale: 3.2,
    starBurstDurationMs: 720,
    starBurstAlpha: 0.75,
    unlockBeamHeightPx: 720,
    unlockBeamWidthPx: 7,
    unlockBeamAlpha: 0.55,
    unlockBeamExpandScale: 12,
    unlockBeamDurationMs: 920,
    socketStages: Object.freeze([
      freezeSocketStage([
        { x: 0.5, y: 0.446, diameter: 0.21 },
      ]),
      freezeSocketStage([
        { x: 0.5, y: 0.61, diameter: 0.2 },
      ]),
      freezeSocketStage([
        { x: 0.5, y: 0.242, diameter: 0.19 },
        { x: 0.5, y: 0.491, diameter: 0.19 },
        { x: 0.5, y: 0.733, diameter: 0.19 },
      ]),
      freezeSocketStage([
        { x: 0.5, y: 0.188, diameter: 0.18 },
        { x: 0.5, y: 0.425, diameter: 0.18 },
        { x: 0.5, y: 0.649, diameter: 0.18 },
      ]),
      freezeSocketStage([
        { x: 0.5, y: 0.314, diameter: 0.175 },
        { x: 0.5, y: 0.446, diameter: 0.175 },
        { x: 0.5, y: 0.573, diameter: 0.175 },
        { x: 0.5, y: 0.704, diameter: 0.175 },
        { x: 0.5, y: 0.836, diameter: 0.175 },
      ]),
    ]),
  }),
});

export function resolvePillarStageIndex(value, thresholds) {
  const safeValue = Math.max(0, Number(value) || 0);
  let stageIndex = 0;
  for (let index = 0; index < thresholds.length; index += 1) {
    if (safeValue >= thresholds[index]) stageIndex = index;
  }
  return stageIndex;
}

export function resolveStarSocketProgress(unlockedCount) {
  const safeCount = Math.max(0, Math.min(10, Number(unlockedCount) || 0));
  return Object.freeze({
    filledSockets: Math.ceil(safeCount / 2),
    newestSocketIndex: safeCount > 0 ? Math.floor((safeCount - 1) / 2) : -1,
    newestSocketStrength: safeCount > 0 && safeCount % 2 === 0 ? 2 : 1,
  });
}
