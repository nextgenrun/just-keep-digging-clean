const damageStage = (
  minDamage,
  spanScale,
  branchLengthScale,
  branchCount,
  twigCount,
  scuffCount,
  scuffAlpha,
  chipCount,
  shadowWidthScale,
  shadowAlpha,
  rimAlpha
) => Object.freeze({
  minDamage,
  spanScale,
  branchLengthScale,
  branchCount,
  twigCount,
  scuffCount,
  scuffAlpha,
  chipCount,
  shadowWidthScale,
  shadowAlpha,
  rimAlpha,
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
  stateCount: 9,
  stages: Object.freeze([
    damageStage(0.001, 0.18, 0.10, 0, 0, 1, 0.035, 0, 0.023, 0.58, 0.12),
    damageStage(0.12, 0.25, 0.12, 1, 0, 1, 0.050, 1, 0.025, 0.62, 0.14),
    damageStage(0.23, 0.32, 0.14, 1, 0, 2, 0.065, 2, 0.027, 0.66, 0.16),
    damageStage(0.34, 0.40, 0.16, 2, 0, 2, 0.080, 3, 0.029, 0.69, 0.18),
    damageStage(0.45, 0.49, 0.18, 3, 1, 2, 0.095, 4, 0.031, 0.72, 0.20),
    damageStage(0.56, 0.58, 0.20, 4, 1, 3, 0.110, 5, 0.033, 0.75, 0.22),
    damageStage(0.67, 0.67, 0.22, 5, 2, 3, 0.125, 6, 0.035, 0.78, 0.24),
    damageStage(0.78, 0.76, 0.24, 6, 3, 4, 0.140, 8, 0.037, 0.81, 0.26),
    damageStage(0.89, 0.84, 0.26, 8, 4, 4, 0.155, 10, 0.039, 0.84, 0.29),
  ]),
  geometry: Object.freeze({
    primaryPointCount: 6,
    centerJitterScale: 0.055,
    primaryBendScale: 0.075,
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
      widthScale: 0.18,
      heightScale: 0.075,
      alongSpreadScale: 0.13,
      normalSpreadScale: 0.055,
      randomSizeMin: 0.72,
      randomSizeRange: 0.28,
    }),
    fracture: Object.freeze({
      shadowColor: 0x211d19,
      coreColor: 0x080706,
      coreWidthRatio: 0.43,
      coreAlphaScale: 0.92,
      branchWidthRatio: 0.82,
      twigWidthRatio: 0.58,
      minWidthPx: 1,
    }),
    rim: Object.freeze({
      color: 0xf2e9dc,
      widthScale: 0.009,
      branchWidthRatio: 0.74,
      twigWidthRatio: 0.56,
      offsetScale: 0.008,
      minWidthPx: 0.75,
    }),
    chips: Object.freeze({
      shadowColor: 0x161310,
      shadowAlpha: 0.62,
      rimColor: 0xf0e5d4,
      rimAlpha: 0.30,
      radiusScale: 0.013,
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
