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

const DAMAGE_STATE_COUNT = 12;
const DAMAGE_TIER_BY_STATE = Object.freeze([0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
const ALIGNED_RESPONSE_TIER_BY_STATE = Object.freeze([
  0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
]);
const DYNAMIC_RESPONSE_PROFILE_OFFSETS = Object.freeze([
  0, 6, 66, 72, 78, 84, 90, 96, 102, 108, 114,
  120, 126, 132, 138, 144, 150, 156, 162, 168, 174,
  180, 186, 192, 198, 204, 210, 216, 222, 228, 234,
  240, 246,
]);
const DYNAMIC_RESPONSE_VARIANTS_BY_PROFILE = Object.freeze([
  1, 10, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1,
]);
const STONE_RESPONSE_PROFILE_INDEX = 1;
const DAMAGE_TRANSFORMS = Object.freeze([
  Object.freeze({ index: 0, angle: 0, flipX: false, flipY: false }),
  Object.freeze({ index: 1, angle: 90, flipX: false, flipY: false }),
  Object.freeze({ index: 2, angle: 180, flipX: false, flipY: false }),
  Object.freeze({ index: 3, angle: 270, flipX: false, flipY: false }),
  Object.freeze({ index: 4, angle: 0, flipX: true, flipY: false }),
  Object.freeze({ index: 5, angle: 90, flipX: true, flipY: false }),
  Object.freeze({ index: 6, angle: 180, flipX: true, flipY: false }),
  Object.freeze({ index: 7, angle: 270, flipX: true, flipY: false }),
]);

const damageAtlas = (path, variants, revision, options = {}) => Object.freeze({
  key: options.key || "world-visual-v2-ground-damage-imagegen-v1",
  path,
  columns: options.columns || variants,
  frameSizePx: options.frameSizePx || 188,
  frameCount: (options.rasterTiers || DAMAGE_STATE_COUNT) * variants,
  framePrefix: options.framePrefix || "world-visual-v2-ground-damage-",
  variants,
  rasterTiers: options.rasterTiers || DAMAGE_STATE_COUNT,
  tierByState: options.tierByState || null,
  transformCount: options.transformCount || 1,
  mixProfile: options.mixProfile || null,
  decodedBytes: options.decodedBytes || null,
  revision,
  layered: Boolean(options.mixProfile),
});

const ALIGNED_DAMAGE_ATLAS = damageAtlas(
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-fracture-aligned-v5.png?v=20260826a",
  24,
  "aligned-v5",
  Object.freeze({
    key: "world-visual-v2-ground-damage-aligned-v5",
    framePrefix: "world-visual-v2-ground-damage-aligned-",
    columns: 16,
    rasterTiers: 12,
    transformCount: 8,
    mixProfile: "alignedV5",
    decodedBytes: 40716288,
  })
);
const DYNAMIC_DAMAGE_ATLAS = damageAtlas(
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-fracture-aligned-v5.png?v=20260826a",
  24,
  "dynamic-response-v6",
  Object.freeze({
    key: "world-visual-v2-ground-damage-dynamic-v6",
    framePrefix: "world-visual-v2-ground-damage-dynamic-",
    columns: 16,
    rasterTiers: 12,
    transformCount: 8,
    mixProfile: "dynamicV6",
    decodedBytes: 40716288,
  })
);
const EXPANDED_DAMAGE_ATLAS = damageAtlas(
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-fracture-expanded-v4.png?v=20260826a",
  64,
  "expanded-v4",
  Object.freeze({
    columns: 16,
    rasterTiers: 4,
    tierByState: DAMAGE_TIER_BY_STATE,
    transformCount: 8,
    mixProfile: "expandedV4",
    decodedBytes: 36192256,
  })
);
const LAYERED_DAMAGE_ATLAS = damageAtlas(
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-fracture-v3.png?v=20260826a",
  16,
  "layered-v3",
  Object.freeze({ mixProfile: "layeredV3" })
);
const POLISHED_DAMAGE_ATLAS = damageAtlas(
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-piskel-anchor-v2.png?v=20260730a",
  10,
  "polished-v2",
  Object.freeze({ decodedBytes: 16965120 })
);
const LEGACY_IMAGEGEN_DAMAGE_ATLAS = damageAtlas(
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-imagegen-v1.png?v=20260729a",
  10,
  "imagegen-v1"
);
const MATERIAL_RESPONSE_ATLAS = Object.freeze({
  key: "world-visual-v2-ground-damage-response-v3",
  path: "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-response-v3.png?v=20260826a",
  columns: 17,
  frameSizePx: 188,
  frameCount: 68,
  framePrefix: "world-visual-v2-ground-damage-response-",
});
const EXPANDED_RESPONSE_ATLAS = Object.freeze({
  key: "world-visual-v2-ground-damage-response-v3",
  path: "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-response-expanded-v4.png?v=20260826a",
  columns: 16,
  frameSizePx: 188,
  frameCount: 132,
  framePrefix: "world-visual-v2-ground-damage-response-",
  decodedBytes: 20358144,
});
const ALIGNED_RESPONSE_ATLAS = Object.freeze({
  key: "world-visual-v2-ground-damage-response-aligned-v5",
  path: "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-response-aligned-v5.png?v=20260826a",
  columns: 16,
  frameSizePx: 188,
  frameCount: 198,
  framePrefix: "world-visual-v2-ground-damage-response-aligned-",
  decodedBytes: 29406208,
});
const DYNAMIC_RESPONSE_ATLAS = Object.freeze({
  key: "world-visual-v2-ground-damage-response-dynamic-v6",
  path: "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-response-dynamic-v6.png?v=20260826a",
  columns: 18,
  frameSizePx: 188,
  frameCount: 252,
  framePrefix: "world-visual-v2-ground-damage-response-dynamic-",
  decodedBytes: 35626752,
});

const fractureLayers = (
  response,
  presentation = null,
  layerStyle = Object.freeze({})
) => Object.freeze({
  fractureShadow: Object.freeze({
    alpha: layerStyle.shadowAlpha ?? 0.96,
    blendMode: "MULTIPLY",
    depthOffset: 0.004,
  }),
  fractureRim: Object.freeze({
    alpha: layerStyle.rimAlpha ?? 0.46,
    tint: layerStyle.rimTint ?? 0xf0e5d8,
    tintFill: Boolean(layerStyle.rimTintFill),
    blendMode: "SCREEN",
    depthOffset: 0.005,
  }),
  response,
  presentation,
});

const EXPANDED_DAMAGE_MIX = fractureLayers(
  Object.freeze({
    atlas: EXPANDED_RESPONSE_ATLAS,
    mode: "tile",
    profileCount: 33,
    tiers: 4,
    tierByState: DAMAGE_TIER_BY_STATE,
    scale: 1.04,
    alpha: 1,
    blendMode: "NORMAL",
    depthOffset: 0.006,
  }),
  Object.freeze({
    scaleByState: Object.freeze([
      0.70, 0.77, 0.84, 0.87, 0.90, 0.92,
      0.94, 0.96, 0.98, 0.99, 1, 1,
    ]),
    alphaByState: Object.freeze([
      0.24, 0.32, 0.42, 0.50, 0.59, 0.68,
      0.76, 0.82, 0.88, 0.93, 0.97, 1,
    ]),
  })
);
const ALIGNED_DAMAGE_MIX = fractureLayers(
  Object.freeze({
    atlas: ALIGNED_RESPONSE_ATLAS,
    mode: "tile",
    profileCount: 33,
    tiers: 6,
    tierByState: ALIGNED_RESPONSE_TIER_BY_STATE,
    scale: 1,
    alpha: 0.94,
    blendMode: "NORMAL",
    depthOffset: 0.006,
  }),
  Object.freeze({
    scaleByState: Object.freeze([
      1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1,
    ]),
    alphaByState: Object.freeze([
      0.72, 0.76, 0.80, 0.84, 0.87, 0.90,
      0.92, 0.94, 0.96, 0.975, 0.99, 1,
    ]),
  }),
  Object.freeze({
    shadowAlpha: 1,
    rimAlpha: 0.52,
    rimTint: 0xd8e4ee,
    rimTintFill: true,
  })
);
const DYNAMIC_DAMAGE_MIX = fractureLayers(
  Object.freeze({
    atlas: DYNAMIC_RESPONSE_ATLAS,
    mode: "tile",
    frameLayout: "profile-major-variants",
    profileCount: 33,
    profileFrameOffsets: DYNAMIC_RESPONSE_PROFILE_OFFSETS,
    variantCountByProfile: DYNAMIC_RESPONSE_VARIANTS_BY_PROFILE,
    variantSalt: 2909,
    profileOverrides: Object.freeze({
      [STONE_RESPONSE_PROFILE_INDEX]: Object.freeze({
        alpha: 0.88,
        tint: 0xc1d7e9,
        blendMode: "SCREEN",
      }),
    }),
    tiers: 6,
    tierByState: ALIGNED_RESPONSE_TIER_BY_STATE,
    scale: 1,
    alpha: 0.94,
    blendMode: "NORMAL",
    depthOffset: 0.006,
  }),
  Object.freeze({
    scaleByState: Object.freeze([
      1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1,
    ]),
    alphaByState: Object.freeze([
      0.72, 0.76, 0.80, 0.84, 0.87, 0.90,
      0.92, 0.94, 0.96, 0.975, 0.99, 1,
    ]),
  }),
  Object.freeze({
    shadowAlpha: 1,
    rimAlpha: 0.52,
    rimTint: 0xd8e4ee,
    rimTintFill: true,
  })
);
const LAYERED_DAMAGE_MIX = fractureLayers(Object.freeze({
  atlas: MATERIAL_RESPONSE_ATLAS,
  mode: "family",
  familyCount: 17,
  tiers: 4,
  tierByState: DAMAGE_TIER_BY_STATE,
  scale: 1.08,
  alpha: 1,
  blendMode: "NORMAL",
  depthOffset: 0.006,
}));

export const WORLD_VISUAL_DAMAGE_MODES = Object.freeze({
  imagegen: "imagegen",
  modular: "modular",
  legacy: "legacy",
});

export const WORLD_VISUAL_DAMAGE = Object.freeze({
  defaultMode: WORLD_VISUAL_DAMAGE_MODES.imagegen,
  queryParam: "groundDamage",
  imagegenValues: Object.freeze(["imagegen", "art", "atlas", "new", "v6", "v5", "v4", "v3"]),
  modularValues: Object.freeze(["modular", "layers", "procedural", "v2"]),
  legacyValues: Object.freeze(["legacy", "old", "radial", "v1"]),
  stateCount: DAMAGE_STATE_COUNT,
  imagegen: Object.freeze({
    atlasQueryParam: "groundDamageAtlas",
    defaultAtlas: "polished",
    dynamicAtlasValues: Object.freeze(["dynamic", "responsive", "v6"]),
    alignedAtlasValues: Object.freeze(["aligned", "registered", "v5"]),
    expandedAtlasValues: Object.freeze(["expanded", "mix", "v4"]),
    layeredAtlasValues: Object.freeze(["layered", "layered-v3", "v3"]),
    polishedAtlasValues: Object.freeze(["polished", "piskel", "v2"]),
    legacyAtlasValues: Object.freeze(["legacy", "v1", "old"]),
    atlases: Object.freeze({
      dynamic: DYNAMIC_DAMAGE_ATLAS,
      aligned: ALIGNED_DAMAGE_ATLAS,
      expanded: EXPANDED_DAMAGE_ATLAS,
      layered: LAYERED_DAMAGE_ATLAS,
      polished: POLISHED_DAMAGE_ATLAS,
      legacy: LEGACY_IMAGEGEN_DAMAGE_ATLAS,
    }),
    atlas: POLISHED_DAMAGE_ATLAS,
    variants: 10,
    scale: 1,
    alpha: 0.94,
    depthOffset: 0.004,
    variantSalt: 977,
    transformSalt: 1879,
    transforms: DAMAGE_TRANSFORMS,
    decodedBytes: 16965120,
    decodedBudgetBytes: 17825792,
    effectiveStructuralCombinations: 120,
    mixProfiles: Object.freeze({
      dynamicV6: DYNAMIC_DAMAGE_MIX,
      alignedV5: ALIGNED_DAMAGE_MIX,
      expandedV4: EXPANDED_DAMAGE_MIX,
      layeredV3: LAYERED_DAMAGE_MIX,
    }),
    dynamic: DYNAMIC_DAMAGE_MIX,
    aligned: ALIGNED_DAMAGE_MIX,
    expanded: EXPANDED_DAMAGE_MIX,
    layered: LAYERED_DAMAGE_MIX,
  }),
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
  if (value && config.imagegenValues.includes(value)) return WORLD_VISUAL_DAMAGE_MODES.imagegen;
  return config.defaultMode;
}

export function resolveWorldVisualDamageAtlas(
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || ""
) {
  const imagegen = config.imagegen;
  const value = new URLSearchParams(search)
    .get(imagegen.atlasQueryParam)
    ?.trim()
    .toLowerCase();
  if (value && imagegen.legacyAtlasValues.includes(value)) {
    return imagegen.atlases.legacy;
  }
  if (value && imagegen.polishedAtlasValues.includes(value)) {
    return imagegen.atlases.polished;
  }
  if (value && imagegen.layeredAtlasValues.includes(value)) {
    return imagegen.atlases.layered;
  }
  if (value && imagegen.dynamicAtlasValues.includes(value)) {
    return imagegen.atlases.dynamic;
  }
  if (value && imagegen.alignedAtlasValues.includes(value)) {
    return imagegen.atlases.aligned;
  }
  if (value && imagegen.expandedAtlasValues.includes(value)) {
    return imagegen.atlases.expanded;
  }
  return imagegen.atlases[imagegen.defaultAtlas] || imagegen.atlas;
}

export function resolveWorldVisualDamageMixProfile(
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || ""
) {
  const atlas = resolveWorldVisualDamageAtlas(config, search);
  return atlas.mixProfile
    ? config.imagegen.mixProfiles[atlas.mixProfile] || null
    : null;
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

function hashWorldVisualDamageCoordinate(tx, ty, salt, config) {
  const hash = config.hash;
  let value = Math.imul(tx + hash.offsetX, hash.primeX)
    ^ Math.imul(ty + hash.offsetY, hash.primeY)
    ^ Math.imul(salt + hash.offsetSalt, hash.primeSalt);
  value = Math.imul(value ^ (value >>> hash.avalancheShift), hash.avalanchePrime);
  return (value ^ (value >>> hash.finalShift)) >>> 0;
}

export function resolveWorldVisualDamageVariant(
  tx,
  ty,
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || "",
  resolvedAtlas = null
) {
  const variants = (resolvedAtlas || resolveWorldVisualDamageAtlas(config, search)).variants
    || config.imagegen.variants;
  return hashWorldVisualDamageCoordinate(
    tx,
    ty,
    config.imagegen.variantSalt,
    config
  ) % variants;
}

export function resolveWorldVisualDamageFrame(
  tx,
  ty,
  damage,
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || "",
  resolvedAtlas = null
) {
  const stateNumber = resolveWorldVisualDamageStateNumber(damage, config);
  if (stateNumber <= 0) return null;
  const atlas = resolvedAtlas || resolveWorldVisualDamageAtlas(config, search);
  const variants = atlas.variants || config.imagegen.variants;
  const variant = resolveWorldVisualDamageVariant(tx, ty, config, search, atlas);
  const rasterTier = atlas.tierByState?.[stateNumber - 1] ?? stateNumber - 1;
  return rasterTier * variants + variant;
}

export function resolveWorldVisualDamagePresentation(
  damage,
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || "",
  resolvedMixProfile = undefined
) {
  const stateNumber = resolveWorldVisualDamageStateNumber(damage, config);
  const mixProfile = resolvedMixProfile === undefined
    ? resolveWorldVisualDamageMixProfile(config, search)
    : resolvedMixProfile;
  const presentation = mixProfile?.presentation;
  return {
    stateNumber,
    scale: presentation?.scaleByState?.[stateNumber - 1] ?? 1,
    alpha: presentation?.alphaByState?.[stateNumber - 1] ?? 1,
  };
}

export function resolveWorldVisualDamageTransform(
  tx,
  ty,
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || "",
  resolvedAtlas = null
) {
  const transformCount = (
    resolvedAtlas || resolveWorldVisualDamageAtlas(config, search)
  ).transformCount || 1;
  if (transformCount <= 1) return config.imagegen.transforms?.[0] || DAMAGE_TRANSFORMS[0];
  const index = hashWorldVisualDamageCoordinate(
    tx,
    ty,
    config.imagegen.transformSalt,
    config
  ) % transformCount;
  return config.imagegen.transforms?.[index] || DAMAGE_TRANSFORMS[0];
}

export function resolveWorldVisualDamageResponseTier(
  damage,
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || "",
  resolvedMixProfile = undefined
) {
  const stateNumber = resolveWorldVisualDamageStateNumber(damage, config);
  if (stateNumber <= 0) return null;
  const mixProfile = resolvedMixProfile === undefined
    ? resolveWorldVisualDamageMixProfile(config, search)
    : resolvedMixProfile;
  const response = mixProfile?.response;
  return response?.tierByState?.[stateNumber - 1] ?? null;
}

export function resolveWorldVisualDamageResponseVariant(
  tx,
  ty,
  profileIndex,
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || "",
  resolvedMixProfile = undefined
) {
  const mixProfile = resolvedMixProfile === undefined
    ? resolveWorldVisualDamageMixProfile(config, search)
    : resolvedMixProfile;
  const response = mixProfile?.response;
  const variantCount = response?.variantCountByProfile?.[profileIndex] ?? 1;
  if (variantCount <= 1) return 0;
  return hashWorldVisualDamageCoordinate(
    tx,
    ty,
    response.variantSalt,
    config,
  ) % variantCount;
}

export function resolveWorldVisualDamageResponseFrame(
  tx,
  ty,
  tier,
  profileIndex,
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || "",
  resolvedMixProfile = undefined
) {
  const mixProfile = resolvedMixProfile === undefined
    ? resolveWorldVisualDamageMixProfile(config, search)
    : resolvedMixProfile;
  const response = mixProfile?.response;
  if (!response || !Number.isInteger(tier) || !Number.isInteger(profileIndex)) return null;
  if (response.frameLayout === "profile-major-variants") {
    const frameOffset = response.profileFrameOffsets?.[profileIndex];
    const variantCount = response.variantCountByProfile?.[profileIndex];
    if (!Number.isInteger(frameOffset) || !Number.isInteger(variantCount)) return null;
    const variant = resolveWorldVisualDamageResponseVariant(
      tx,
      ty,
      profileIndex,
      config,
      search,
      mixProfile,
    );
    return frameOffset + tier * variantCount + variant;
  }
  const profileCount = response.mode === "tile"
    ? response.profileCount
    : response.familyCount;
  return tier * profileCount + profileIndex;
}

export function getWorldVisualDamagePreloadAssets(
  config = WORLD_VISUAL_DAMAGE,
  search = globalThis.location?.search || ""
) {
  const atlas = resolveWorldVisualDamageAtlas(config, search);
  const responseAtlas = resolveWorldVisualDamageMixProfile(config, search)?.response?.atlas;
  return responseAtlas ? [atlas, responseAtlas] : [atlas];
}
