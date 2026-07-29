const damageStage = (
  minDamage,
  intensity,
  spanScale,
  branchLengthScale,
  branchCount,
  twigCount,
  scuffCount,
  chipCount,
  stressCount
) => Object.freeze({
  minDamage,
  intensity,
  spanScale,
  branchLengthScale,
  branchCount,
  twigCount,
  scuffCount,
  chipCount,
  stressCount,
});

export const WORLD_VISUAL_DAMAGE_MODES = Object.freeze({
  modular: "modular",
  legacy: "legacy",
});

export const WORLD_VISUAL_DAMAGE = Object.freeze({
  defaultMode: WORLD_VISUAL_DAMAGE_MODES.modular,
  queryParam: "groundDamage",
  modularValues: Object.freeze(["modular", "layers", "new", "v2"]),
  legacyValues: Object.freeze(["legacy", "old", "radial", "v1"]),
  stateCount: 12,
  stages: Object.freeze([
    damageStage(0.001, 0.12, 0.22, 0.10, 0, 0, 1, 0, 1),
    damageStage(0.08, 0.20, 0.27, 0.12, 0, 0, 1, 1, 1),
    damageStage(0.16, 0.28, 0.32, 0.14, 1, 0, 2, 1, 1),
    damageStage(0.24, 0.36, 0.38, 0.16, 1, 0, 2, 2, 2),
    damageStage(0.32, 0.44, 0.44, 0.18, 2, 0, 2, 2, 2),
    damageStage(0.40, 0.52, 0.50, 0.20, 2, 1, 3, 3, 3),
    damageStage(0.49, 0.60, 0.57, 0.22, 3, 1, 3, 3, 3),
    damageStage(0.58, 0.68, 0.64, 0.24, 3, 1, 3, 4, 4),
    damageStage(0.67, 0.76, 0.71, 0.26, 4, 2, 4, 5, 4),
    damageStage(0.76, 0.84, 0.77, 0.28, 4, 2, 4, 6, 5),
    damageStage(0.85, 0.92, 0.83, 0.30, 5, 3, 5, 8, 6),
    damageStage(0.94, 1.00, 0.88, 0.32, 6, 4, 5, 10, 7),
  ]),
  geometry: Object.freeze({
    primaryPointCount: 6,
    centerJitterScale: 0.045,
    primaryBendScale: 0.065,
    branchAttachPadding: 1,
    branchAngleMinRadians: 0.46,
    branchAngleRangeRadians: 0.74,
    branchLengthRandomMin: 0.72,
    branchLengthRandomRange: 0.28,
    branchMidpoint: 0.56,
    branchBendScale: 0.18,
    twigLengthScale: 0.54,
    twigAngleMinRadians: 0.38,
    twigAngleRangeRadians: 0.52,
    salts: Object.freeze({
      orientation: 401,
      centerX: 409,
      centerY: 419,
      primaryBend: 431,
      branchAttach: 503,
      branchSide: 541,
      branchAngle: 557,
      branchLength: 577,
      branchBend: 593,
      twigAngle: 619,
      scuffAlong: 701,
      scuffNormal: 719,
      scuffSize: 733,
      stressAlong: 751,
      stressNormal: 769,
      stressSide: 787,
      stressAngle: 797,
      stressLength: 803,
      chipPath: 809,
      chipNormal: 823,
      chipSize: 839,
      chipAngle: 853,
    }),
  }),
  layers: Object.freeze({
    depthOffsets: Object.freeze({
      scuff: -0.003,
      shadow: 0,
      rim: 0.002,
      chips: 0.003,
    }),
    blendModes: Object.freeze({
      scuff: "MULTIPLY",
      shadow: "MULTIPLY",
      rim: "SCREEN",
      chips: "NORMAL",
    }),
    scuff: Object.freeze({
      color: 0x302c28,
      alphaMin: 0.055,
      alphaMax: 0.19,
      widthScale: 0.22,
      heightScale: 0.085,
      alongSpreadScale: 0.16,
      normalSpreadScale: 0.07,
      randomSizeMin: 0.72,
      randomSizeRange: 0.28,
    }),
    fracture: Object.freeze({
      shadowColor: 0x211d19,
      coreColor: 0x080706,
      shadowWidthScaleMin: 0.030,
      shadowWidthScaleMax: 0.055,
      shadowAlphaMin: 0.66,
      shadowAlphaMax: 0.92,
      coreWidthRatio: 0.39,
      coreAlphaScale: 0.96,
      branchWidthRatio: 0.82,
      twigWidthRatio: 0.58,
      minWidthPx: 1.15,
    }),
    rim: Object.freeze({
      color: 0xf2e9dc,
      alphaMin: 0.18,
      alphaMax: 0.44,
      widthScale: 0.010,
      branchWidthRatio: 0.74,
      twigWidthRatio: 0.56,
      offsetScale: 0.010,
      oppositeOffsetScale: 0.006,
      oppositeAlphaScale: 0.16,
      minWidthPx: 0.82,
    }),
    stress: Object.freeze({
      shadowColor: 0x241f1b,
      rimColor: 0xf4eadc,
      lengthScale: 0.085,
      randomLengthMin: 0.68,
      randomLengthRange: 0.32,
      alongSpreadScale: 0.42,
      normalSpreadScale: 0.20,
      angleMinRadians: 0.42,
      angleRangeRadians: 0.48,
      shadowWidthScale: 0.012,
      rimWidthScale: 0.008,
      shadowAlphaMin: 0.24,
      shadowAlphaMax: 0.52,
      rimAlphaMin: 0.08,
      rimAlphaMax: 0.20,
      rimOffsetScale: 0.006,
      minShadowWidthPx: 0.85,
      minRimWidthPx: 0.70,
    }),
    chips: Object.freeze({
      shadowColor: 0x161310,
      shadowAlpha: 0.72,
      rimColor: 0xf0e5d4,
      rimAlphaMin: 0.16,
      rimAlphaMax: 0.34,
      radiusScale: 0.015,
      randomSizeMin: 0.62,
      randomSizeRange: 0.48,
      normalSpreadScale: 0.11,
      rimOffsetScale: 0.45,
      triangleRatio: 0.58,
      triangleCornerRadians: 2.104867,
    }),
  }),
  hash: Object.freeze({
    offsetX: 31,
    offsetY: 47,
    offsetSalt: 7,
    primeX: 73856093,
    primeY: 19349663,
    primeSalt: 83492791,
    avalancheShift: 13,
    avalanchePrime: 1274126177,
    finalShift: 16,
    unsignedMax: 4294967295,
  }),
  legacy: Object.freeze({
    branchBase: 2,
    branchDamageScale: 5,
    minWidthPx: 2,
    baseWidthScale: 0.018,
    damageWidthScale: 0.018,
    color: 0x17110e,
    baseAlpha: 0.72,
    damageAlphaScale: 0.20,
    baseLengthScale: 0.18,
    damageLengthScale: 0.32,
    randomLengthMin: 0.72,
    randomLengthRange: 0.28,
    midpoint: 0.54,
    bendRadians: 0.32,
    angleSalt: 71,
    lengthSalt: 91,
    bendSalt: 101,
    endSalt: 111,
  }),
});

export function resolveWorldVisualDamageMode(
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (value && config.legacyValues.includes(value)) return WORLD_VISUAL_DAMAGE_MODES.legacy;
  if (value && config.modularValues.includes(value)) return WORLD_VISUAL_DAMAGE_MODES.modular;
  return config.defaultMode;
}

export function resolveWorldVisualDamageStage(damage, config = WORLD_VISUAL_DAMAGE) {
  const normalized = Math.max(0, Math.min(1, Number.isFinite(damage) ? damage : 0));
  if (normalized <= 0) return null;
  let resolved = config.stages[0];
  for (const stage of config.stages) {
    if (normalized < stage.minDamage) break;
    resolved = stage;
  }
  return resolved;
}

export function resolveWorldVisualDamageStateNumber(damage, config = WORLD_VISUAL_DAMAGE) {
  const stage = resolveWorldVisualDamageStage(damage, config);
  return stage ? config.stages.indexOf(stage) + 1 : 0;
}
