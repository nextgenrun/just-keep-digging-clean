const SCENIC_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/level1-biome-scenic-alternates-v1"
);
const IDENTITY_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/level1-biome-identity-kits-v1"
);
const LANDMARK_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/level1-biome-rare-landmarks-v1"
);

const FAMILY_IDS = Object.freeze([
  "weathered-rootways", "fungal-rainwells", "sunken-orchard", "timber-cisterns",
  "thornwake-hollows", "peat-lantern-fen", "rootbell-ossuary", "siltwood-warrens",
  "mossglass-reservoir", "ironbark-sink", "cobalt-aquifer", "sapphire-grotto",
  "glacial-waterveil", "drowned-observatory", "azure-bell-caves",
  "stormglass-conduits", "frozen-choir", "tideclock-chasm", "prism-kelp-vault",
  "blue-salt-basilica", "amber-silt-fault", "honeyglass-pocket", "resin-archive",
  "fossil-sun-vault", "saffron-boneworks", "citrine-hivefault",
  "gilded-root-reliquary", "ochre-spiral-quarry", "sunwax-catacombs",
  "bronze-pollen-rift", "mercury-fold", "magnetic-needle-reef",
  "lunar-mint-galleries", "mirrorstone-convergence", "argent-choir",
  "quicksilver-loom", "moonwire-ravine", "pale-magnet-basilica",
  "glasssteel-sepulcher", "starless-reflectory", "basalt-emberworks",
  "obsidian-caldera", "lavawheel-necropolis", "shattered-furnace", "cinder-organ",
  "slagheart-foundry", "ashen-crown-rift", "molten-chain-garden",
  "pyreclast-cathedral", "blackglass-crucible",
]);

const EXPANDED_FAMILY_IDS = Object.freeze([
  "thornwake-hollows", "peat-lantern-fen", "rootbell-ossuary", "siltwood-warrens",
  "mossglass-reservoir", "ironbark-sink", "azure-bell-caves",
  "stormglass-conduits", "frozen-choir", "tideclock-chasm", "prism-kelp-vault",
  "blue-salt-basilica", "saffron-boneworks", "citrine-hivefault",
  "gilded-root-reliquary", "ochre-spiral-quarry", "sunwax-catacombs",
  "bronze-pollen-rift", "argent-choir", "quicksilver-loom", "moonwire-ravine",
  "pale-magnet-basilica", "glasssteel-sepulcher", "starless-reflectory",
  "cinder-organ", "slagheart-foundry", "ashen-crown-rift", "molten-chain-garden",
  "pyreclast-cathedral", "blackglass-crucible",
]);

const EXPERIMENTAL_FAMILY_IDS = Object.freeze([
  "peat-lantern-fen", "mossglass-reservoir", "ironbark-sink",
  "stormglass-conduits", "prism-kelp-vault", "blue-salt-basilica",
  "citrine-hivefault", "bronze-pollen-rift", "sunwax-catacombs",
  "quicksilver-loom", "pale-magnet-basilica", "starless-reflectory",
  "ashen-crown-rift", "molten-chain-garden", "blackglass-crucible",
]);

const expandedIds = new Set(EXPANDED_FAMILY_IDS);
const experimentalIds = new Set(EXPERIMENTAL_FAMILY_IDS);
const scenicRoles = Object.freeze(["background", "signature", "foreground"]);

const imageAsset = (key, path, selectionId = key, crop = null) => Object.freeze({
  key,
  path,
  type: "image",
  selectionId,
  ...(crop ? { crop: Object.freeze(crop) } : {}),
});

const scenicAsset = (familyId, roleId) => imageAsset(
  `world-visual-level1-biome-${roleId}-alternate-v1-${familyId}`,
  `${SCENIC_ROOT}/${familyId}-${roleId}-alternate-v1.webp`
);

const identityAtlas = familyId => imageAsset(
  `world-visual-level1-biome-identity-kit-v1-${familyId}`,
  `${IDENTITY_ROOT}/${familyId}-identity-kit-v1.webp`
);

const identityFrame = (atlas, familyId, frameIndex) => imageAsset(
  atlas.key,
  atlas.path,
  `${atlas.key}:frame-${frameIndex}`,
  Object.freeze({
    x: (frameIndex % 2) * 768,
    y: Math.floor(frameIndex / 2) * 512,
    width: 768,
    height: 512,
  })
);

const familyVariant = (familyId, index) => {
  const experimental = experimentalIds.has(familyId);
  const scenicRole = experimental ? "background" : scenicRoles[index % scenicRoles.length];
  const atlas = expandedIds.has(familyId) ? identityAtlas(familyId) : null;
  return Object.freeze({
    familyId,
    experimental,
    scenicRole,
    scenicAsset: scenicAsset(familyId, scenicRole),
    identityAtlas: atlas,
    identityFrames: atlas
      ? Object.freeze([0, 1, 2, 3].map(frameIndex => (
        identityFrame(atlas, familyId, frameIndex)
      )))
      : Object.freeze([]),
  });
};

const FAMILY_VARIANTS = Object.freeze(FAMILY_IDS.map(familyVariant));
const FAMILY_VARIANT_BY_ID = Object.freeze(Object.fromEntries(
  FAMILY_VARIANTS.map(entry => [entry.familyId, entry])
));

const landmark = (seedIndex, familyId, landmarkId) => Object.freeze({
  seedIndex,
  familyId,
  landmarkId,
  asset: imageAsset(
    `world-visual-level1-biome-rare-landmark-v1-${landmarkId}`,
    `${LANDMARK_ROOT}/${landmarkId}-v1.webp`
  ),
});

const LANDMARKS = Object.freeze([
  landmark(4, "thornwake-hollows", "thornwake-root-crown"),
  landmark(12, "fungal-rainwells", "rainwell-belfry"),
  landmark(20, "siltwood-warrens", "siltwood-cistern-maze"),
  landmark(28, "prism-kelp-vault", "prism-kelp-royal-fan"),
  landmark(36, "azure-bell-caves", "azure-grand-carillon"),
  landmark(44, "citrine-hivefault", "citrine-sundered-sun"),
  landmark(52, "honeyglass-pocket", "honeyglass-tidal-reliquary"),
  landmark(60, "ochre-spiral-quarry", "ochre-grand-spiral"),
  landmark(68, "basalt-emberworks", "basalt-ember-gate"),
  landmark(76, "mirrorstone-convergence", "mirrorstone-eclipse-organ"),
  landmark(84, "ashen-crown-rift", "ashen-blackfire-crown"),
  landmark(92, "starless-reflectory", "starless-grand-oculus"),
]);
const LANDMARK_BY_SEED_INDEX = Object.freeze(Object.fromEntries(
  LANDMARKS.map(entry => [entry.seedIndex, entry])
));
const LANDMARK_BY_FAMILY_ID = Object.freeze(Object.fromEntries(
  LANDMARKS.map(entry => [entry.familyId, entry])
));
const BASE_FOUNDATION_ROLES_BY_FAMILY = Object.freeze(Object.fromEntries(
  FAMILY_VARIANTS.map(entry => {
    const roles = [];
    if (entry.identityFrames.length === 4) roles.push("ground", "foreground");
    if (
      entry.scenicRole === "signature"
      && LANDMARK_BY_FAMILY_ID[entry.familyId]
    ) roles.push("signature");
    return [entry.familyId, Object.freeze(roles)];
  }).filter(([, roles]) => roles.length > 0)
));
const BASE_FOUNDATION_ROLE_COUNT = Object.values(
  BASE_FOUNDATION_ROLES_BY_FAMILY
).reduce((total, roles) => total + roles.length, 0);
const REPLACEMENT_ALIGNMENT = Object.freeze({
  preserveBaseAsset: true,
  foundationDepthOffset: -0.00035,
  foundationAlphaByRole: Object.freeze({
    background: 0.62,
    signature: 0.58,
    ground: 0.68,
    foreground: 0.62,
  }),
  foundationScaleByRole: Object.freeze({
    background: 1.04,
    signature: 0.96,
    ground: 1.08,
    foreground: 1.04,
  }),
});

export const LEVEL_ONE_BIOME_DEPTH_VARIANTS = Object.freeze({
  familyCount: FAMILY_VARIANTS.length,
  identityFamilyCount: EXPANDED_FAMILY_IDS.length,
  experimentalFamilyCount: EXPERIMENTAL_FAMILY_IDS.length,
  scenicAssetCount: FAMILY_VARIANTS.length,
  identityAtlasCount: EXPANDED_FAMILY_IDS.length,
  identityFrameCount: EXPANDED_FAMILY_IDS.length * 4,
  landmarkCount: LANDMARKS.length,
  familyVariants: FAMILY_VARIANTS,
  familyVariantById: FAMILY_VARIANT_BY_ID,
  landmarks: LANDMARKS,
  landmarkBySeedIndex: LANDMARK_BY_SEED_INDEX,
  landmarkByFamilyId: LANDMARK_BY_FAMILY_ID,
  baseFoundationRoleCount: BASE_FOUNDATION_ROLE_COUNT,
  baseFoundationRolesByFamily: BASE_FOUNDATION_ROLES_BY_FAMILY,
  replacementAlignment: REPLACEMENT_ALIGNMENT,
});

export function resolveLevelOneBiomeDepthRoleAsset(
  profileOrId,
  roleId,
  siteOrdinal,
  seedIndex,
  baseAsset,
  config = LEVEL_ONE_BIOME_DEPTH_VARIANTS
) {
  const familyId = typeof profileOrId === "string" ? profileOrId : profileOrId?.id;
  const landmarkEntry = config.landmarkBySeedIndex[seedIndex];
  if (roleId === "signature" && landmarkEntry?.familyId === familyId) {
    return landmarkEntry.asset;
  }
  const family = config.familyVariantById[familyId];
  if (!family) return baseAsset;
  const ordinal = Math.abs(Number(siteOrdinal) || 0) % 2;
  if (roleId === "ground" && family.identityFrames.length === 4) {
    return family.identityFrames[ordinal];
  }
  if (
    roleId === "background"
    && family.scenicRole === "foreground"
    && family.identityFrames.length === 4
    && ordinal === 0
  ) {
    return family.identityFrames[3];
  }
  if (roleId === "foreground" && family.identityFrames.length === 4) {
    if (family.scenicRole === roleId && ordinal === 1) return family.scenicAsset;
    return family.identityFrames[2 + ordinal];
  }
  if (
    roleId === "signature"
    && family.scenicRole === roleId
    && config.landmarkByFamilyId[familyId]
  ) {
    return family.scenicAsset;
  }
  if (family.scenicRole === roleId && ordinal === 1) return family.scenicAsset;
  return baseAsset;
}

export function resolveLevelOneBiomeDepthRoleLayers(
  profileOrId,
  roleId,
  siteOrdinal,
  seedIndex,
  baseAsset,
  config = LEVEL_ONE_BIOME_DEPTH_VARIANTS
) {
  const primary = resolveLevelOneBiomeDepthRoleAsset(
    profileOrId,
    roleId,
    siteOrdinal,
    seedIndex,
    baseAsset,
    config
  );
  const alignment = config.replacementAlignment;
  const familyId = typeof profileOrId === "string" ? profileOrId : profileOrId?.id;
  const foundationRoles = config.baseFoundationRolesByFamily[familyId] || [];
  const foundationSite = Math.abs(Number(siteOrdinal) || 0) % 2 === 0;
  if (
    !primary
    || !baseAsset
    || !alignment?.preserveBaseAsset
    || !foundationRoles.includes(roleId)
    || !foundationSite
    || (primary.selectionId || primary.key) === (baseAsset.selectionId || baseAsset.key)
  ) {
    return primary ? [{ layerId: "primary", asset: primary }] : [];
  }
  return [
    {
      layerId: "foundation",
      asset: baseAsset,
      alphaMultiplier: alignment.foundationAlphaByRole[roleId] || 1,
      scaleMultiplier: alignment.foundationScaleByRole[roleId] || 1,
      depthOffset: alignment.foundationDepthOffset,
    },
    { layerId: "primary", asset: primary },
  ];
}

export function getLevelOneBiomeDepthVariantAssets(
  config = LEVEL_ONE_BIOME_DEPTH_VARIANTS
) {
  return [
    ...config.familyVariants.map(entry => entry.scenicAsset),
    ...config.familyVariants.flatMap(entry => (
      entry.identityAtlas ? [entry.identityAtlas] : []
    )),
    ...config.landmarks.map(entry => entry.asset),
  ];
}
