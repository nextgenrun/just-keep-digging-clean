export const THUNDER_STRIKE_CHAIN_PHASES = Object.freeze({
  IDLE: "idle",
  CHARGE: "charge",
  STRIKE: "strike",
  TIMING: "timing",
  READY: "ready",
  COMPLETE: "complete",
  FAILED: "failed",
});

const stage = (number, damageMultiplier, timing, visual) => Object.freeze({
  number,
  damageMultiplier,
  timing: timing ? Object.freeze(timing) : null,
  visual: Object.freeze(visual),
});

export const THUNDER_STRIKE_CHAIN_CONFIG = Object.freeze({
  upfrontCostMultiplier: 3,
  followUpCost: 0,
  stages: Object.freeze([
    stage(1, 1, null, {
      label: "I",
      accent: 0x7fdcff,
      accentCss: "#7fdcff",
      boltThickness: 3,
      glowThickness: 12,
      branchCount: 3,
      ringCount: 2,
      sparkCount: 12,
      flashAlpha: 0.12,
      shakeSignature: "thunderStrike.slam1",
      fallbackShakeDurationMs: 130,
      fallbackShakeIntensity: 0.006,
    }),
    stage(2, 3, {
      durationMs: 1100,
      targetProgress: 0.64,
      windowMs: 220,
    }, {
      label: "II",
      accent: 0xb58cff,
      accentCss: "#b58cff",
      boltThickness: 5,
      glowThickness: 18,
      branchCount: 6,
      ringCount: 3,
      sparkCount: 22,
      flashAlpha: 0.2,
      shakeSignature: "thunderStrike.slam2",
      fallbackShakeDurationMs: 180,
      fallbackShakeIntensity: 0.01,
    }),
    stage(3, 10, {
      durationMs: 950,
      targetProgress: 0.72,
      windowMs: 140,
    }, {
      label: "III",
      accent: 0xffd36b,
      accentCss: "#ffd36b",
      boltThickness: 8,
      glowThickness: 28,
      branchCount: 10,
      ringCount: 5,
      sparkCount: 38,
      flashAlpha: 0.32,
      shakeSignature: "thunderStrike.slam3",
      fallbackShakeDurationMs: 260,
      fallbackShakeIntensity: 0.017,
    }),
  ]),
  feedback: Object.freeze({
    timingHitText: "PERFECT — STORM DAMAGE UP",
    chainBrokenText: "CHAIN BROKEN",
    finalHitText: "10× STORM PERFECT",
    followUpsFreeText: "FOLLOW-UP SLAMS FREE",
    timingHintText: "PRESS {key} INSIDE THE FLASH",
    successLingerMs: 260,
    failureLingerMs: 620,
    finalLingerMs: 850,
  }),
  damage: Object.freeze({
    minimumFalloffMultiplier: 0.2,
    successBuffPerTimingHit: 0.2,
  }),
  timingBar: Object.freeze({
    assetPath: "sprites/UI/thunderstrike-chain-v1/thunderstrike-chain-frame-v1.webp",
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
    stageCenterY: 142,
    stageRadius: 37,
    stageValueY: 181,
    trackX: -300,
    trackY: 230,
    trackWidth: 600,
    trackHeight: 22,
    promptY: 269,
    slamY: 295,
    badgeY: 321,
    badgeWidth: 164,
    badgeHeight: 25,
    trackColor: 0x050a13,
    trackFillColor: 0x42bfff,
    trackBorderColor: 0x8edfff,
    targetColor: 0xffeaa0,
    targetGlowColor: 0xffb84d,
    needleColor: 0xffffff,
    completedColor: 0x54bfff,
    upcomingColor: 0x8591a8,
    challengeColor: 0xffd36b,
    titleColor: "#f7e2b2",
    mutedColor: "#91a0bd",
    freeColor: "#7fffd4",
    dangerColor: "#ff607c",
    titleFont: "Georgia, serif",
    bodyFont: "Consolas, monospace",
    titleFontSize: "25px",
    stageFontSize: "31px",
    bodyFontSize: "15px",
    promptFontSize: "16px",
    slamFontSize: "19px",
    badgeFontSize: "14px",
    needleWidth: 4,
    needleOverhang: 13,
    overlay: Object.freeze({
      titleStrokeThickness: 5,
      stageStrokeThickness: 5,
      bodyStrokeThickness: 4,
      stageGlowPadding: 11,
      stageGlowAlpha: 0.2,
      stageFillAlpha: 0.14,
      stageRingWidth: 3,
      stageRingAlpha: 0.95,
      checkOffsetX: 23,
      checkOffsetY: 21,
      checkWidth: 5,
      checkSize: 10,
      trackRadius: 10,
      trackAlpha: 0.76,
      progressAlpha: 0.32,
      targetGlowPadding: 5,
      targetGlowAlpha: 0.34,
      targetAlpha: 0.96,
      minimumTargetWidth: 6,
      needleGlowExtraWidth: 8,
      needleGlowAlpha: 0.2,
      badgeAlpha: 0.9,
      badgeBorderAlpha: 0.92,
      badgeRadius: 5,
      badgeBorderWidth: 2,
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
    labelFontSizes: Object.freeze(["24px", "31px", "42px"]),
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
