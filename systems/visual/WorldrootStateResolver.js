import {
  LEVEL_ONE_BIOME_FIELD,
  resolveLevelOneBiomeFieldAtTile,
} from "../../values/levelOneBiomeField.js";
import { TITAN_DEFINITIONS } from "../../values/titanDiscoveries.js";
import { getTitanLoreEntry } from "../../values/titanLore.js";
import {
  WORLDROOT_CONFIG,
  resolveWorldrootGrowthStage,
  sampleWorldrootPath,
} from "../../values/worldroot.js?rev=20260830-worldroot-v13";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const integer = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
};
const TITAN_IDS = new Set(TITAN_DEFINITIONS.map(definition => definition.id));
const STAR_STATES = new Set(["intact", "consumed"]);

function finiteNonNegative(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function colorNumber(value, fallback) {
  const parsed = Number.isFinite(value)
    ? value
    : Number.parseInt(String(value || "").replace("#", ""), 16);
  return Number.isFinite(parsed)
    ? clamp(Math.floor(parsed), 0, 0xffffff)
    : fallback;
}

function normalizeKnownSites(rawMap, discoverySystem, config) {
  const seenKeys = new Set();
  const seenTiles = new Set();
  const sites = [];
  for (const raw of Array.isArray(rawMap?.knownSites) ? rawMap.knownSites : []) {
    const tx = Number(raw?.tx);
    const ty = Number(raw?.ty);
    if (!Number.isFinite(tx) || !Number.isFinite(ty) || !STAR_STATES.has(raw?.state)) {
      continue;
    }
    const tileX = Math.floor(tx);
    const tileY = Math.floor(ty);
    const key = String(raw?.key || `${tileX},${tileY}`);
    const tileKey = `${tileX},${tileY}`;
    if (!key || seenKeys.has(key) || seenTiles.has(tileKey)) continue;
    seenKeys.add(key);
    seenTiles.add(tileKey);
    const discovered = raw?.discovered === true
      || discoverySystem?.isTileDiscovered?.(tileX, tileY) === true;
    sites.push({
      ...raw,
      id: String(raw?.id || `star-${tileX}-${tileY}`),
      key,
      tx: tileX,
      ty: tileY,
      state: raw.state,
      discovered,
      identityId: discovered ? raw?.identityId || null : null,
      identityName: discovered
        ? String(raw?.identityName || config.copy.unknownStarLabel)
        : config.copy.unknownStarLabel,
      rarityIndex: discovered ? clamp(integer(raw?.rarityIndex), 0, 5) : 0,
      color: discovered
        ? colorNumber(raw?.color, config.colors.intact)
        : config.colors.intact,
    });
  }
  return sites.sort((left, right) => left.ty - right.ty || left.tx - right.tx);
}

function hashUnit(value) {
  let hash = 2166136261;
  const text = String(value || "worldroot");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function statusForCounts(intact, consumed) {
  if (intact <= 0 && consumed <= 0) return "sleeping";
  if (intact > 0 && consumed > 0) return "mixed";
  return intact > 0 ? "intact" : "consumed";
}

function resolveProfileForSite(site, field = LEVEL_ONE_BIOME_FIELD) {
  const exact = resolveLevelOneBiomeFieldAtTile(site.tx, site.ty, field);
  if (exact) return { profile: exact, projected: false };
  const bounds = field.bounds;
  const projectedX = clamp(site.tx, bounds.leftTile, bounds.rightTileExclusive - 1);
  const projectedY = clamp(site.ty, bounds.topTile, bounds.bottomTileExclusive - 1);
  return {
    profile: resolveLevelOneBiomeFieldAtTile(projectedX, projectedY, field),
    projected: true,
  };
}

function resolveProfileAnchor(profile, regionLayout, profilesInRegion) {
  const index = Math.max(0, profilesInRegion.findIndex(entry => entry.id === profile.id));
  const progress = (index + 0.45 + hashUnit(profile.id) * 0.1) / profilesInRegion.length;
  const sampled = sampleWorldrootPath(regionLayout.path, progress);
  const side = hashUnit(`${profile.id}:side`) - 0.5;
  const y = clamp(sampled.y + (hashUnit(`${profile.id}:rise`) - 0.5) * 0.028,
    regionLayout.mask.y + 0.012,
    regionLayout.mask.y + regionLayout.mask.height - 0.012);
  return {
    x: clamp(sampled.x + side * 0.025, regionLayout.mask.x + 0.012,
      regionLayout.mask.x + regionLayout.mask.width - 0.012),
    // Keep all inspectable story knots above the town interaction band. The
    // only surface Worldroot action remains its dedicated talent root.
    y: profile.sourceRegionId === "surface-entry" ? Math.min(y, 0.74) : y,
  };
}

function resolveStarPoint(site, anchor, ordinal) {
  const angle = hashUnit(`${site.key}:angle`) * Math.PI * 2;
  const radius = 0.009 + hashUnit(`${site.key}:radius`) * 0.036;
  const ordinalOffset = ((ordinal % 5) - 2) * 0.0018;
  return {
    x: clamp(anchor.x + Math.cos(angle) * radius + ordinalOffset, 0.02, 0.985),
    y: clamp(anchor.y + Math.sin(angle) * radius * 0.72, 0.29, 0.91),
  };
}

function buildBiomeMemories(knownSites, config, field) {
  const layoutsById = new Map(config.regions.map(region => [region.id, region]));
  const profilesByRegion = new Map(config.regions.map(region => [
    region.id,
    field.profiles.filter(profile => profile.sourceRegionId === region.id),
  ]));
  const groups = new Map(field.profiles.map(profile => [profile.id, []]));
  const assignedSites = [];

  for (const site of knownSites) {
    const resolved = resolveProfileForSite(site, field);
    if (!resolved.profile) continue;
    const record = { ...site, profileId: resolved.profile.id, projected: resolved.projected };
    groups.get(resolved.profile.id)?.push(record);
    assignedSites.push(record);
  }

  const profileMemories = field.profiles.map(profile => {
    const sites = groups.get(profile.id) || [];
    const intactCount = sites.filter(site => site.state === "intact").length;
    const consumedCount = sites.filter(site => site.state === "consumed").length;
    const region = layoutsById.get(profile.sourceRegionId) || config.regions[0];
    const anchor = resolveProfileAnchor(
      profile,
      region,
      profilesByRegion.get(profile.sourceRegionId) || [profile],
    );
    const representative = sites.find(site => site.state === "intact") || sites[0] || null;
    const seed = field.seeds.find(entry => entry.profileId === profile.id);
    const focusTile = representative
      ? { tx: representative.tx, ty: representative.ty }
      : seed
        ? { tx: seed.centerTileX, ty: field.bounds.topTile + seed.centerDepthM }
        : null;
    return {
      id: profile.id,
      label: profile.label,
      regionId: profile.sourceRegionId,
      color: profile.mapColor,
      anchor,
      focusTile,
      status: statusForCounts(intactCount, consumedCount),
      knownCount: sites.length,
      intactCount,
      consumedCount,
    };
  });

  const profilesById = new Map(profileMemories.map(memory => [memory.id, memory]));
  const ordinals = new Map();
  const starMemories = assignedSites.map(site => {
    const profile = profilesById.get(site.profileId);
    const ordinal = ordinals.get(site.profileId) || 0;
    ordinals.set(site.profileId, ordinal + 1);
    return {
      id: site.id,
      key: site.key,
      label: site.discovered
        ? String(site.identityName || config.copy.unknownStarLabel)
        : config.copy.unknownStarLabel,
      identityId: site.discovered ? site.identityId || null : null,
      discovered: site.discovered,
      state: site.state,
      rarityIndex: site.discovered ? site.rarityIndex : 0,
      color: site.discovered ? site.color : config.colors.intact,
      profileId: site.profileId,
      regionId: profile?.regionId,
      projected: site.projected,
      tile: { tx: site.tx, ty: site.ty },
      point: resolveStarPoint(site, profile?.anchor || { x: 0.5, y: 0.6 }, ordinal),
    };
  });

  const regionMemories = config.regions.map(region => {
    const profiles = profileMemories.filter(memory => memory.regionId === region.id);
    const knownCount = profiles.reduce((total, memory) => total + memory.knownCount, 0);
    const intactCount = profiles.reduce((total, memory) => total + memory.intactCount, 0);
    const consumedCount = profiles.reduce((total, memory) => total + memory.consumedCount, 0);
    return {
      ...region,
      knownCount,
      intactCount,
      consumedCount,
      consumedRatio: knownCount > 0 ? consumedCount / knownCount : 0,
      awake: knownCount > 0,
      status: statusForCounts(intactCount, consumedCount),
    };
  });

  return { profileMemories, regionMemories, starMemories };
}

function buildTitanMemories(discoveredIds, activeClueId, config) {
  const discovered = new Set(discoveredIds);
  return TITAN_DEFINITIONS.map((definition, index) => {
    const region = config.regions[Math.min(config.regions.length - 1, Math.floor(index / 5))];
    const localIndex = index % 5;
    const progress = clamp(
      (localIndex + 0.28 + hashUnit(`${definition.id}:route`) * 0.44) / 5,
      0,
      1,
    );
    const sampled = sampleWorldrootPath(region.path, progress);
    const point = {
      x: clamp(sampled.x + (hashUnit(`${definition.id}:x`) - 0.5) * 0.038, 0.025, 0.98),
      y: clamp(sampled.y + (hashUnit(`${definition.id}:y`) - 0.5) * 0.052, 0.30, 0.90),
    };
    return {
      id: definition.id,
      index: definition.index,
      name: definition.name,
      regionLabel: definition.regionLabel,
      color: definition.glowTint,
      discovered: discovered.has(definition.id),
      tracked: activeClueId === definition.id,
      worldrootKeystone: definition.id === config.endgame.worldrootTitanId,
      lore: getTitanLoreEntry(definition.id),
      point,
    };
  });
}

function buildTalentMemories(talentSnapshot, config) {
  const anchors = [
    { x: 0.245, y: 0.805 },
    { x: 0.300, y: 0.735 },
    { x: 0.365, y: 0.665 },
  ];
  const branchesById = new Map(
    (Array.isArray(talentSnapshot?.branches) ? talentSnapshot.branches : [])
      .filter(branch => config.endgame.talentBranchIds.includes(branch?.id))
      .map(branch => [branch.id, branch]),
  );
  return config.endgame.talentBranchIds.map((branchId, index) => {
    const branch = branchesById.get(branchId) || {};
    const purchasedCount = integer(branch.purchasedCount);
    const nodeCount = integer(branch.nodeCount);
    return {
      id: branchId,
      name: String(branch.name || branchId),
      color: config.colors.talentBranches[branchId] || config.colors.intact,
      rootPurchased: branch.rootPurchased === true,
      completed: branch.completed === true,
      mastered: branch.mastered === true,
      purchasedCount,
      nodeCount,
      progress: nodeCount > 0 ? clamp(purchasedCount / nodeCount, 0, 1) : 0,
      point: anchors[index] || anchors[anchors.length - 1],
    };
  });
}

export function resolveWorldrootSnapshot(
  scene,
  playerTile = null,
  config = WORLDROOT_CONFIG,
  field = LEVEL_ONE_BIOME_FIELD,
) {
  const rawMap = scene?.worldMapStarTerritorySystem?.resolveMap?.(
    scene?.worldMapDiscoverySystem,
    playerTile,
  ) || { knownSites: [], knownIntactCount: 0, knownConsumedCount: 0 };
  const knownSites = normalizeKnownSites(
    rawMap,
    scene?.worldMapDiscoverySystem,
    config,
  );
  const intactStarCount = knownSites.filter(site => site.state === "intact").length;
  const consumedStarCount = knownSites.length - intactStarCount;
  const map = {
    ...rawMap,
    knownSites,
    knownIntactCount: intactStarCount,
    knownConsumedCount: consumedStarCount,
  };
  const biome = buildBiomeMemories(knownSites, config, field);
  const talentSnapshot = scene?.celestialTalentProgressionSystem?.getSnapshot?.() || {};
  const talentMemories = buildTalentMemories(talentSnapshot, config);
  const rawDiscoveredTitanIds = scene?.retentionProgressSystem
    ?.getDiscoveredTitans?.();
  const discoveredTitanIds = [...new Set(
    (Array.isArray(rawDiscoveredTitanIds) ? rawDiscoveredTitanIds : [])
      .filter(id => TITAN_IDS.has(id)),
  )];
  const requestedTitanClueId = scene?.titanClueSystem?.getActiveClueId?.() || null;
  const activeTitanClueId = TITAN_IDS.has(requestedTitanClueId)
    ? requestedTitanClueId
    : null;
  const campfireLevel = clamp(
    integer(scene?.campfireSystem?.getCampfireLevel?.() || 1),
    1,
    config.endgame.requiredCampfireLevel,
  );
  const activeCampfireBuff = scene?.campfireSystem?.getActiveBuff?.() || null;
  const abilities = scene?.playerController?.abilities;
  const gpCurrent = finiteNonNegative(abilities?.getGemPowerExact?.());
  const gpMaximum = finiteNonNegative(abilities?.getGemPowerMax?.());
  const awakeRegionCount = biome.regionMemories.filter(region => region.awake).length;
  const completedTalentBranchCount = talentMemories.filter(branch => branch.completed).length;
  const talentRootCount = talentMemories.filter(branch => branch.rootPurchased).length;
  const discoveredSet = new Set(discoveredTitanIds);
  const titanCount = discoveredSet.size;
  const knownStarCount = knownSites.length;

  const currents = [
    {
      id: "root-hearth",
      label: "ROOT HEARTH",
      ready: campfireLevel >= config.endgame.requiredCampfireLevel,
      detail: `Campfire ${campfireLevel}/${config.endgame.requiredCampfireLevel}`,
    },
    {
      id: "world-memory",
      label: "WORLD MEMORY",
      ready: awakeRegionCount >= config.endgame.requiredRegions,
      detail: `Biomes ${awakeRegionCount}/${config.endgame.requiredRegions}`,
    },
    {
      id: "star-memory",
      label: "STAR MEMORY",
      ready: knownStarCount >= config.endgame.requiredKnownStars,
      detail: `Known Stars ${knownStarCount}/${config.endgame.requiredKnownStars}`,
    },
    {
      id: "celestial-mastery",
      label: "CELESTIAL MASTERY",
      ready: completedTalentBranchCount >= config.endgame.requiredCompletedTalentBranches,
      detail: `Talent paths ${completedTalentBranchCount}/${config.endgame.requiredCompletedTalentBranches}`,
    },
    {
      id: "titan-chorus",
      label: "TITAN CHORUS",
      ready: titanCount >= config.endgame.requiredTitans
        && discoveredSet.has(config.endgame.worldrootTitanId),
      detail: `Titan echoes ${titanCount}/${config.endgame.requiredTitans}`,
    },
  ];
  const endgameReady = currents.every(current => current.ready);
  const snapshot = {
    map,
    knownStarCount,
    intactStarCount,
    consumedStarCount,
    profileMemories: biome.profileMemories,
    regionMemories: biome.regionMemories,
    starMemories: biome.starMemories,
    awakeRegionCount,
    talentSnapshot,
    talentMemories,
    talentRootCount,
    completedTalentBranchCount,
    titanMemories: buildTitanMemories(discoveredTitanIds, activeTitanClueId, config),
    titanCount,
    activeTitanClueId,
    campfireLevel,
    activeCampfireBuff,
    gpCurrent,
    gpMaximum,
    gpRatio: gpMaximum > 0 ? clamp(gpCurrent / gpMaximum, 0, 1) : 0,
    currents,
    endgameReady,
  };
  snapshot.growthStage = resolveWorldrootGrowthStage(snapshot);
  snapshot.signature = [
    knownSites.map(site => (
      site.discovered
        ? `${site.key}:${site.state}:seen:${site.identityId || "unknown"}`
          + `:${site.identityName}:${site.rarityIndex}:${site.color}`
        : `${site.key}:${site.state}:signal`
    )).join("|"),
    [...discoveredSet].sort().join("|"),
    talentMemories.map(branch => (
      `${branch.id}:${branch.rootPurchased ? 1 : 0}:${branch.purchasedCount}`
      + `:${branch.nodeCount}:${branch.completed ? 1 : 0}:${branch.mastered ? 1 : 0}`
    )).join("|"),
    campfireLevel,
  ].join("::");
  return snapshot;
}

export function formatWorldrootMissingCurrents(snapshot) {
  return (snapshot?.currents || [])
    .filter(current => !current.ready)
    .map(current => current.detail);
}
