export const THUNDER_STRIKE_CHAIN_PHASES = Object.freeze({
  IDLE: "idle",
  CHARGE: "charge",
  STRIKE: "strike",
  TIMING: "timing",
  READY: "ready",
  COMPLETE: "complete",
  FAILED: "failed",
});

const STAGE_LABELS = Object.freeze(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]);
const STAGE_DAMAGE = Object.freeze([1, 3, 10, 12, 15, 20, 28, 40, 60, 100]);
const STAGE_ACCENTS = Object.freeze([
  0x7fdcff, 0xb58cff, 0xffd36b, 0xffbf6b, 0xffa85c,
  0xff8f73, 0xff79a8, 0xe58cff, 0xc9a7ff, 0xfff0b0,
]);
const STAGE_VISUAL_STEPS = Object.freeze([0, 2, 5, 6, 7, 8, 9, 10, 11, 12]);
const STAGE_TIMING = Object.freeze([
  null,
  { durationMs: 1100, targetProgress: 0.56, windowMs: 280 },
  { durationMs: 1000, targetProgress: 0.69, windowMs: 230 },
  { durationMs: 940, targetProgress: 0.61, windowMs: 190 },
  { durationMs: 880, targetProgress: 0.76, windowMs: 150 },
  { durationMs: 760, targetProgress: 0.58, windowMs: 90 },
  { durationMs: 680, targetProgress: 0.82, windowMs: 62 },
  { durationMs: 600, targetProgress: 0.67, windowMs: 42 },
  { durationMs: 530, targetProgress: 0.88, windowMs: 28 },
  { durationMs: 470, targetProgress: 0.73, windowMs: 16 },
].map((timing) => timing ? Object.freeze(timing) : null));

const stage = (index) => {
  const number = index + 1;
  const accent = STAGE_ACCENTS[index];
  const visualStep = STAGE_VISUAL_STEPS[index];
  const shakeTier = Math.min(3, number);
  return Object.freeze({
    number,
    damageMultiplier: STAGE_DAMAGE[index],
    timing: STAGE_TIMING[index],
    visual: Object.freeze({
      label: STAGE_LABELS[index],
      accent,
      accentCss: `#${accent.toString(16).padStart(6, "0")}`,
      boltThickness: Math.min(10, 3 + visualStep),
      glowThickness: Math.min(36, 12 + visualStep * 3),
      branchCount: Math.min(12, 3 + Math.round(visualStep * 1.4)),
      ringCount: Math.min(6, 2 + Math.floor((visualStep + 1) / 2)),
      sparkCount: Math.min(54, 12 + visualStep * 5),
      flashAlpha: Math.min(0.38, 0.12 + visualStep * 0.04),
      shakeSignature: `thunderStrike.slam${shakeTier}`,
      fallbackShakeDurationMs: Math.min(340, 130 + visualStep * 25),
      fallbackShakeIntensity: Math.min(0.022, 0.006 + visualStep * 0.0022),
    }),
  });
};

const THUNDER_STRIKE_STAGES = Object.freeze(STAGE_LABELS.map((_, index) => stage(index)));

export const THUNDER_STRIKE_CHAIN_CONFIG = Object.freeze({
  upfrontCostMultiplier: 3,
  followUpCost: 0,
  initialImpact: Object.freeze({
    chargeTimeMs: 180,
  }),
  stages: THUNDER_STRIKE_STAGES,
  feedback: Object.freeze({
    insufficientGpText: "NOT ENOUGH GP",
    insufficientGpSlamText: "CAST BLOCKED",
    insufficientGpBadgeText: "CHARGE REQUIRED",
    timingHitText: "PERFECT — STORM DAMAGE UP",
    chainBrokenText: "STORM DISPERSED",
    cancelledText: "THUNDERSTRIKE CANCELLED",
    finalHitText: "TEN-STRIKE STORM PERFECT",
    followUpsFreeText: "FOLLOW-UP SLAMS FREE",
    timingHintText: "PRESS {key} INSIDE THE FLASH",
    cancelHintText: "MOVE / ESC CANCEL",
    insufficientGpLingerMs: 900,
    successLingerMs: 260,
    cancelLingerMs: 360,
    failureLingerMs: 620,
    finalLingerMs: 850,
  }),
  damage: Object.freeze({
    minimumFalloffMultiplier: 0.2,
    successBuffPerTimingHit: 0.2,
  }),
  timingBar: Object.freeze({
    assetPath: "sprites/UI/thunderstrike-chain-v1/thunderstrike-chain-frame-v1.webp",
    targetAssetPath: "sprites/UI/thunderstrike-chain-v2/thunderstrike-target-gate-v2.webp",
    needleAssetPath: "sprites/UI/thunderstrike-chain-v2/thunderstrike-needle-v2.webp",
    indicatorArt: Object.freeze({
      assetPaths: Object.freeze({
        milestoneDormant: "sprites/UI/thunderstrike-chain-v3/thunderstrike-milestone-dormant-v3.webp",
        milestoneChallenge: "sprites/UI/thunderstrike-chain-v3/thunderstrike-milestone-challenge-v3.webp",
        milestoneCompleted: "sprites/UI/thunderstrike-chain-v3/thunderstrike-milestone-completed-v3.webp",
        milestoneCheck: "sprites/UI/thunderstrike-chain-v3/thunderstrike-milestone-check-v3.webp",
        promptPlate: "sprites/UI/thunderstrike-chain-v3/thunderstrike-prompt-plate-v3.webp",
        stagePlate: "sprites/UI/thunderstrike-chain-v3/thunderstrike-stage-plate-v3.webp",
        badgePlate: "sprites/UI/thunderstrike-chain-v3/thunderstrike-badge-plate-v3.webp",
        glyphI: "sprites/UI/thunderstrike-chain-v3/thunderstrike-glyph-i-v3.webp",
        glyphV: "sprites/UI/thunderstrike-chain-v3/thunderstrike-glyph-v-v3.webp",
        glyphX: "sprites/UI/thunderstrike-chain-v3/thunderstrike-glyph-x-v3.webp",
      }),
      milestoneSize: 96,
      checkWidth: 42,
      checkHeight: 39,
      checkOffsetX: 32,
      checkOffsetY: 29,
      glyphSizes: Object.freeze([
        Object.freeze({ width: 28, height: 54 }),
        Object.freeze({ width: 51, height: 54 }),
        Object.freeze({ width: 48, height: 54 }),
      ]),
      titlePlate: Object.freeze({ width: 410, height: 42, alpha: 0.88 }),
      milestoneValuePlate: Object.freeze({ width: 132, height: 25, alpha: 0.82 }),
      promptPlate: Object.freeze({ width: 620, height: 44, alpha: 0.92 }),
      slamPlate: Object.freeze({ width: 220, height: 38, alpha: 0.9 }),
      badgePlate: Object.freeze({ width: 230, height: 31, alpha: 0.9 }),
      dormantAlpha: 0.72,
    }),
    assetWidth: 790,
    assetHeight: 395,
    visibleTop: 54,
    visibleHeight: 277,
    top: 18,
    depth: 3700,
    maximumScale: 1,
    minimumScale: 0.52,
    viewportWidthFraction: 0.6,
    viewportHeightFraction: 0.39,
    horizontalMargin: 24,
    titleY: 69,
    stageCentersX: Object.freeze([-185, 0, 185]),
    milestones: Object.freeze([
      Object.freeze({ stageIndex: 0, label: "I", suffix: "PAID" }),
      Object.freeze({ stageIndex: 4, label: "V", suffix: "CHAIN" }),
      Object.freeze({ stageIndex: 9, label: "X", suffix: "MYTHIC" }),
    ]),
    stageCenterY: 142,
    stageValueY: 181,
    trackX: -300,
    trackY: 230,
    trackWidth: 600,
    trackHeight: 22,
    targetArtHeight: 42,
    targetArtAlpha: 0.98,
    needleArtWidth: 10,
    needleArtHeight: 60,
    promptY: 269,
    slamY: 295,
    badgeY: 321,
    titleColor: "#f7e2b2",
    mutedColor: "#91a0bd",
    freeColor: "#7fffd4",
    dangerColor: "#ff607c",
    titleFont: "Georgia, serif",
    bodyFont: "Consolas, monospace",
    titleFontSize: "25px",
    bodyFontSize: "15px",
    promptFontSize: "16px",
    slamFontSize: "19px",
    badgeFontSize: "14px",
    overlay: Object.freeze({
      titleStrokeThickness: 5,
      bodyStrokeThickness: 4,
    }),
  }),
  impactFx: Object.freeze({
    depth: 44,
    boltSkyHeightTiles: 7,
    boltSegments: 16,
    boltJitterPx: 18,
    branchLengthPx: 42,
    boltLifetimeMs: 190,
    ringLifetimeMs: 420,
    sparkLifetimeMs: 460,
    flashLifetimeMs: 170,
    labelRisePx: 52,
    labelLifetimeMs: 680,
    labelFont: "Georgia, serif",
    labelFontSizes: Object.freeze([
      "24px", "31px", "42px", "43px", "44px",
      "45px", "46px", "48px", "50px", "54px",
    ]),
    coreColor: 0xf7fbff,
    glowColor: 0x72b8ff,
    flashColor: 0xd9ecff,
  }),
});

export function getThunderStrikeStage(stageIndex = 0) {
  const clamped = Math.max(
    0,
    Math.min(THUNDER_STRIKE_CHAIN_CONFIG.stages.length - 1, Math.trunc(stageIndex)),
  );
  return THUNDER_STRIKE_CHAIN_CONFIG.stages[clamped];
}

export function resolveThunderStrikeSuccessDamageMultiplier(successCount = 0) {
  const clampedCount = Math.max(
    0,
    Math.min(
      THUNDER_STRIKE_CHAIN_CONFIG.stages.length - 1,
      Math.trunc(Number(successCount) || 0),
    ),
  );
  return Math.round((
    1 + clampedCount * THUNDER_STRIKE_CHAIN_CONFIG.damage.successBuffPerTimingHit
  ) * 100) / 100;
}

export function resolveThunderStrikeEffectiveDamageMultiplier(
  stageDamageMultiplier,
  successCount = 0,
) {
  return Math.round(
    (
      Math.max(0, Number(stageDamageMultiplier) || 0)
      * resolveThunderStrikeSuccessDamageMultiplier(successCount)
    ) * 100,
  ) / 100;
}

export function formatThunderStrikeMultiplier(multiplier) {
  const value = Math.max(0, Number(multiplier) || 0);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function resolveThunderStrikeSuccessDamageBonusPercent(successCount = 0) {
  return Math.round(
    (resolveThunderStrikeSuccessDamageMultiplier(successCount) - 1) * 100,
  );
}

export function resolveThunderStrikeTimingBarScale(viewportWidth, viewportHeight) {
  const ui = THUNDER_STRIKE_CHAIN_CONFIG.timingBar;
  const width = Math.max(1, Number(viewportWidth) || 1);
  const height = Math.max(1, Number(viewportHeight) || 1);
  const availableWidthScale = (width - ui.horizontalMargin * 2) / ui.assetWidth;
  const preferredWidthScale = (width * ui.viewportWidthFraction) / ui.assetWidth;
  const visibleHeightScale = (height * ui.viewportHeightFraction) / ui.visibleHeight;
  return Math.max(
    ui.minimumScale,
    Math.min(
      ui.maximumScale,
      availableWidthScale,
      preferredWidthScale,
      visibleHeightScale,
    ),
  );
}

export function resolveThunderStrikeDamage({
  baseDamage,
  normalDamageMultiplier,
  bonusDamageMultiplier,
  stageDamageMultiplier,
  successDamageMultiplier = 1,
  falloffPerTile = 0,
  distance = 0,
}) {
  const base = Math.max(0, Number(baseDamage) || 0);
  const normal = Math.max(0, Number(normalDamageMultiplier) || 0);
  const bonus = Math.max(0, Number(bonusDamageMultiplier) || 0);
  const stageMultiplier = Math.max(0, Number(stageDamageMultiplier) || 0);
  const successMultiplier = Math.max(0, Number(successDamageMultiplier) || 0);
  const falloff = Math.max(0, Number(falloffPerTile) || 0);
  const tileDistance = Math.max(0, Number(distance) || 0);
  const distanceMultiplier = Math.max(
    THUNDER_STRIKE_CHAIN_CONFIG.damage.minimumFalloffMultiplier,
    1 - falloff * tileDistance,
  );
  return Math.max(
    1,
    Math.round(
      base
      * normal
      * bonus
      * stageMultiplier
      * successMultiplier
      * distanceMultiplier,
    ),
  );
}
