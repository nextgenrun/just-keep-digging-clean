import {
  CAVE_ARCHETYPE_CONFIG,
  getCaveArchetype,
} from "../../values/caveArchetypes.js";
import { hash01, hashUint } from "../../values/deterministicMath.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

const CARDINAL_NEIGHBORS = Object.freeze([
  Object.freeze({ tx: 1, ty: 0 }),
  Object.freeze({ tx: -1, ty: 0 }),
  Object.freeze({ tx: 0, ty: 1 }),
  Object.freeze({ tx: 0, ty: -1 }),
]);

function touchesTeleportTile(worldModel, tx, ty) {
  return CARDINAL_NEIGHBORS.some(offset => (
    worldModel.getTileType(tx + offset.tx, ty + offset.ty)
      === TILE_TYPES.TELEPORT_TILE
  ));
}

const FEATURE_SOURCE = "cave-archetype";

function getEligibleArchetypes(depth, config) {
  const eligible = config.archetypes.filter(archetype => depth >= archetype.minDepth);
  return eligible.length ? eligible : [config.archetypes[0]];
}

function pickWeightedArchetype(archetypes, roll) {
  const totalWeight = archetypes.reduce((sum, archetype) => sum + archetype.weight, 0);
  let cursor = roll * Math.max(1, totalWeight);
  for (const archetype of archetypes) {
    cursor -= archetype.weight;
    if (cursor <= 0) return archetype;
  }
  return archetypes[archetypes.length - 1];
}

function resolveCaveForm(radiusX, config) {
  return config.forms.find(form => radiusX <= form.maxRadiusX)
    || config.forms[config.forms.length - 1];
}

function resolveFeaturePlans(zone, archetype, seed, config) {
  return archetype.features.flatMap((feature, featureIndex) => {
    const chance = hash01(
      zone.cx,
      zone.cy,
      seed,
      config.salts.featureChance + featureIndex * 1009,
    );
    if (chance >= feature.chance) return [];

    const typeRoll = hash01(
      zone.cx,
      zone.cy,
      seed,
      config.salts.featureType + featureIndex * 2017,
    );
    const typeIndex = Math.min(
      feature.tileTypes.length - 1,
      Math.floor(typeRoll * feature.tileTypes.length),
    );
    return [{
      id: feature.id,
      slot: feature.slot,
      tileType: feature.tileTypes[typeIndex],
    }];
  });
}

function resolveFeatureAnchor(zone, slot) {
  if (slot === "ceiling") {
    return { tx: Math.round(zone.cx), ty: Math.round(zone.cy - zone.ry) };
  }
  return { tx: Math.round(zone.cx), ty: Math.round(zone.cy + zone.ry) };
}

export function resolveCaveIdentity(
  zone,
  seed,
  topAirRows,
  config = CAVE_ARCHETYPE_CONFIG,
  forcedArchetypeId = null,
) {
  const depth = Math.max(0, zone.cy - topAirRows);
  const archetypes = getEligibleArchetypes(depth, config);
  const roll = hash01(zone.cx, zone.cy, seed, config.salts.identityRoll);
  const forcedArchetype = forcedArchetypeId
    ? archetypes.find(entry => entry.id === forcedArchetypeId)
    : null;
  const archetype = forcedArchetype || pickWeightedArchetype(archetypes, roll);
  const form = resolveCaveForm(zone.rx, config);
  const displayName = `${archetype.adjective} ${form.label}`;

  return Object.freeze({
    archetypeId: archetype.id,
    displayName,
    journalLabel: archetype.journalLabel,
    journalKey: `${config.discovery.journalKeyPrefix}${archetype.id}`,
    hint: archetype.hint,
    motif: archetype.motif,
    palette: archetype.palette,
    depth,
    visualSeed: hashUint(zone.cx, zone.cy, seed, config.salts.visual),
    featurePlans: Object.freeze(resolveFeaturePlans(zone, archetype, seed, config)),
  });
}

export function attachCaveIdentity(
  zone,
  seed,
  topAirRows,
  config = CAVE_ARCHETYPE_CONFIG,
  forcedArchetypeId = null,
) {
  if (!config.enabled || !zone) return zone;
  zone.identity = resolveCaveIdentity(
    zone,
    seed,
    topAirRows,
    config,
    forcedArchetypeId,
  );
  zone.archetypeId = zone.identity.archetypeId;
  zone.displayName = zone.identity.displayName;
  zone.discoveryHint = zone.identity.hint;
  zone.visualSeed = zone.identity.visualSeed;
  return zone;
}

export function applyCaveFeatures(worldModel, zone) {
  zone.features = [];
  if (!zone?.identity || zone.standaloneScene) return zone.features;

  for (const plan of zone.identity.featurePlans) {
    const anchor = resolveFeatureAnchor(zone, plan.slot);
    if (!worldModel.inBounds(anchor.tx, anchor.ty)) continue;
    const currentType = worldModel.getTileType(anchor.tx, anchor.ty);
    if (currentType !== TILE_TYPES.AIR && currentType !== plan.tileType) continue;
    if (
      currentType === TILE_TYPES.AIR
      && touchesTeleportTile(worldModel, anchor.tx, anchor.ty)
    ) {
      continue;
    }

    if (currentType === TILE_TYPES.AIR) {
      const hp = worldModel.getTileMaxHp(anchor.tx, anchor.ty, plan.tileType);
      worldModel.setTile(anchor.tx, anchor.ty, plan.tileType, hp);
    }
    zone.features.push({
      ...plan,
      ...anchor,
      source: FEATURE_SOURCE,
    });
  }
  return zone.features;
}

export function isCaveZoneStructurallyLive(worldModel, zone) {
  if (!zone) return false;
  if (zone.standaloneScene === true) return true;
  if (!worldModel.inBounds(zone.cx, zone.cy)) return false;
  if (worldModel.getTileType(zone.cx, zone.cy) !== TILE_TYPES.AIR) return false;
  if (zone.source === "second-world") return true;

  const shellOffset = Math.max(1, zone.ry + zone.wallThickness);
  const topShell = worldModel.getTileType(zone.cx, zone.cy - shellOffset);
  const bottomShell = worldModel.getTileType(zone.cx, zone.cy + shellOffset);
  return topShell === TILE_TYPES.CAVE_WALL || bottomShell === TILE_TYPES.CAVE_WALL;
}

export function finalizeCaveIdentities(
  worldModel,
  config = CAVE_ARCHETYPE_CONFIG,
) {
  const seed = worldModel.config.seed || 133742;
  worldModel.caveZones = (worldModel.caveZones || [])
    .filter(zone => isCaveZoneStructurallyLive(worldModel, zone));

  for (const zone of worldModel.caveZones) {
    if (!zone.identity) attachCaveIdentity(zone, seed, worldModel.topAirRows, config);
    applyCaveFeatures(worldModel, zone);
  }
  worldModel.caveLightZones = worldModel.caveZones
    .filter(zone => zone.standaloneScene !== true)
    .map(zone => ({
      id: `cave-light:${zone.id}`,
      caveId: zone.id,
      archetypeId: zone.archetypeId,
      cx: zone.cx,
      cy: zone.cy,
      rx: zone.rx,
      ry: zone.ry,
      color: zone.identity.palette.glow,
      alpha: 0.7,
      phase: (zone.visualSeed % 628) / 100,
      lightRadiusTiles: Math.min(
        5.5,
        Math.max(2.5, Math.sqrt(zone.rx + zone.ry) * 1.22),
      ),
    }));
  return rebuildCaveFeatureIndexes(worldModel);
}

export function rebuildCaveFeatureIndexes(worldModel) {
  const existingTreasures = (worldModel.treasureRoomZones || [])
    .filter(zone => zone?.source !== FEATURE_SOURCE);
  const existingCrystals = (worldModel.glowCrystalZones || [])
    .filter(zone => zone?.source !== FEATURE_SOURCE);

  for (const zone of worldModel.caveZones || []) {
    const archetype = getCaveArchetype(zone.archetypeId);
    for (const feature of zone.features || []) {
      if (worldModel.getTileType(feature.tx, feature.ty) !== feature.tileType) continue;
      if (feature.tileType === TILE_TYPES.CHEST) {
        existingTreasures.push({
          id: `${zone.id}:${feature.id}`,
          source: FEATURE_SOURCE,
          caveId: zone.id,
          chestTx: feature.tx,
          chestTy: feature.ty,
        });
      }
      if (feature.tileType === TILE_TYPES.GLOW_CRYSTAL) {
        existingCrystals.push({
          id: `${zone.id}:${feature.id}`,
          source: FEATURE_SOURCE,
          caveId: zone.id,
          cx: feature.tx,
          cy: feature.ty,
          rx: 0.45,
          ry: 0.32,
          color: archetype.palette.glow,
          alpha: 0.68,
          phase: (zone.visualSeed % 628) / 100,
          seed: zone.visualSeed,
        });
      }
    }
  }

  worldModel.treasureRoomZones = existingTreasures;
  worldModel.glowCrystalZones = existingCrystals;
  return {
    treasureRooms: existingTreasures.length,
    glowCrystals: existingCrystals.length,
  };
}

export { FEATURE_SOURCE };
