import { WORLD_GAMEPLAY_LAYOUT } from "../../values/worldGameplayLayout.js";
import { RESOURCE_ZERO_TOTALS, sanitizeResourceTotals } from "../../values/resourceTypes.js";
import { ANCIENT_RELIC_CONFIG } from "../../values/ancientRelics.js";
import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { sanitizeOpeningFlightArtifactData } from "../../values/openingFlightArtifact.js";
import { sanitizeStarHeartData } from "../../values/celestialEngines.js";
import { sanitizeCelestialOverhaulData } from "../../values/celestialOverhaulSave.js";
import { sanitizeHeavenblocksProgressionData } from "../../values/heavenblocksProgressionConfig.js";
import { sanitizeHardcoreModeData } from "../../values/hardcoreMode.js";
import { sanitizeGraveborerWurmData } from "../../values/graveborerWurm.js";
import { sanitizeRetentionProgressData } from "../../systems/progression/retentionProgressState.js";
import { sanitizePlayerPersistenceData } from "../../values/playerPersistence.js";
import { sanitizeCampfireData } from "../../values/campfireConfig.js";
import { sanitizeJourneySaveData } from "../../systems/progression/JourneyLedger.js";
import {
  SAVE_PAYLOAD_VERSION,
  sanitizeMilestoneData,
  sanitizeSaveRevisionMetadata,
  sanitizeStarCollectionData,
} from "../../values/savePayloadV15.js";

const MAX_DUG_TILE_KEYS = 500000;
const MAX_RUBBLE_TILES = 500000;
const MAX_CAVE_SCENE_NODE_KEYS = 10000;
const LEGACY_WORLD_WIDTH_TILES = 120;

function sanitizeDugTileKeys(values) {
  const normalized = [];
  const seen = new Set();
  for (const key of Array.isArray(values) ? values : []) {
    if (typeof key !== "string") continue;
    const [tx, ty] = key.split(",").map(value => Number.parseInt(value, 10));
    if (!Number.isInteger(tx) || !Number.isInteger(ty) || tx < 0 || ty < 0) continue;
    const next = `${tx},${ty}`;
    if (seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
    if (normalized.length >= MAX_DUG_TILE_KEYS) break;
  }
  return normalized;
}

function sanitizeRubbleTiles(values) {
  const normalized = [];
  const seen = new Set();
  for (const rubble of Array.isArray(values) ? values : []) {
    const { tx, ty, type } = rubble || {};
    if (![tx, ty, type].every(Number.isInteger) || tx < 0 || ty < 0 || type <= 0) continue;
    const key = `${tx},${ty}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      tx, ty, type,
      hp: Math.max(1, Math.floor(Number.isFinite(rubble.hp) ? rubble.hp : 1)),
      maxHp: Math.max(1, Math.floor(Number.isFinite(rubble.maxHp) ? rubble.maxHp : rubble.hp || 1)),
    });
    if (normalized.length >= MAX_RUBBLE_TILES) break;
  }
  return normalized;
}

export function sanitizeCaveSceneData(data) {
  const normalized = [];
  const seen = new Set();
  for (const key of Array.isArray(data?.collectedNodes) ? data.collectedNodes : []) {
    if (typeof key !== "string") continue;
    const coordinate = /^([a-z0-9][a-z0-9-]{0,63}):(\d{1,3}),(\d{1,3})$/i.exec(key);
    const legacy = /^([a-z0-9][a-z0-9-]{0,63}):(\d{1,2})$/i.exec(key);
    const node = legacy ? CAVE_SCENE_CONFIG.rewards.nodeLayout[Number.parseInt(legacy[2], 10)] : null;
    if (!coordinate && !node) continue;
    const caveId = coordinate?.[1] || legacy[1];
    const tx = coordinate ? Number.parseInt(coordinate[2], 10) : node.tx;
    const ty = coordinate ? Number.parseInt(coordinate[3], 10) : node.ty;
    if (tx < 0 || ty < 0 || tx >= 1000 || ty >= 1000) continue;
    const next = `${caveId}:${tx},${ty}`;
    if (seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
    if (normalized.length >= MAX_CAVE_SCENE_NODE_KEYS) break;
  }
  return { collectedNodes: normalized };
}

function sanitizeAncientRelicData(data) {
  const count = Number.isFinite(data?.count) ? Math.floor(data.count) : 0;
  return { count: Math.max(0, Math.min(ANCIENT_RELIC_CONFIG.persistence.maxRelics, count)) };
}

function normalizeDepthGateData(data) {
  const valid = new Set([100, 300, 1000]);
  const acceptedThresholds = Array.isArray(data?.acceptedThresholds)
    ? [...new Set(data.acceptedThresholds
      .map(value => (value === 999 ? 1000 : valid.has(value) ? value : null))
      .filter(value => value !== null))].sort((left, right) => left - right)
    : [];
  return { acceptedThresholds };
}

function normalizeWorld(world) {
  return {
    seed: world.seed,
    width: world.width,
    depth: world.depth,
    topAirRows: world.topAirRows,
    layoutId: typeof world.layoutId === "string" ? world.layoutId : WORLD_GAMEPLAY_LAYOUT.id,
    layoutRevision: Number.isInteger(world.layoutRevision)
      ? world.layoutRevision
      : WORLD_GAMEPLAY_LAYOUT.revision,
  };
}

export function worldMatches(expected, candidate) {
  if (!expected || !candidate) return false;
  const widthMatches = expected.width === candidate.width
    || (candidate.width === LEGACY_WORLD_WIDTH_TILES && expected.width >= LEGACY_WORLD_WIDTH_TILES);
  return expected.seed === candidate.seed
    && widthMatches
    && expected.depth === candidate.depth
    && expected.topAirRows === candidate.topAirRows
    && (expected.layoutId || WORLD_GAMEPLAY_LAYOUT.id) === (candidate.layoutId || WORLD_GAMEPLAY_LAYOUT.id)
    && (expected.layoutRevision ?? WORLD_GAMEPLAY_LAYOUT.revision)
      === (candidate.layoutRevision ?? WORLD_GAMEPLAY_LAYOUT.revision);
}

export function createDugTilesSavePayload(data) {
  return {
    version: SAVE_PAYLOAD_VERSION,
    updatedAt: new Date().toISOString(),
    revisionMetadata: sanitizeSaveRevisionMetadata(data.revisionMetadata, 1),
    playerCharacterId: typeof data.playerCharacterId === "string" ? data.playerCharacterId : null,
    world: normalizeWorld(data.worldIdentity),
    dugTiles: sanitizeDugTileKeys(data.dugTileKeys),
    rubbleTiles: sanitizeRubbleTiles(data.rubbleTiles),
    resources: sanitizeResourceTotals(data.resources || RESOURCE_ZERO_TOTALS),
    upgrades: data.upgrades || null,
    levelData: data.levelData || null,
    specialTileData: data.specialTileData || null,
    depthGateData: normalizeDepthGateData(data.depthGateData),
    dayNightData: data.dayNightData || null,
    caveSceneData: sanitizeCaveSceneData(data.caveSceneData),
    ancientRelicData: sanitizeAncientRelicData(data.ancientRelicData),
    openingFlightArtifactData: sanitizeOpeningFlightArtifactData(data.openingFlightArtifactData),
    starHeartData: sanitizeStarHeartData(data.starHeartData),
    retentionData: sanitizeRetentionProgressData(data.retentionData),
    heavenblocksData: sanitizeHeavenblocksProgressionData(data.heavenblocksData),
    hardcoreModeData: sanitizeHardcoreModeData(data.hardcoreModeData),
    graveborerWurmData: sanitizeGraveborerWurmData(data.graveborerWurmData),
    playerStateData: sanitizePlayerPersistenceData(data.playerStateData),
    campfireData: sanitizeCampfireData(data.campfireData),
    journeyData: sanitizeJourneySaveData(data.journeyData),
    celestialOverhaulData: sanitizeCelestialOverhaulData(data.celestialOverhaulData),
    milestoneData: sanitizeMilestoneData(data.milestoneData),
    starCollectionData: sanitizeStarCollectionData(data.starCollectionData),
  };
}

export function normalizeDugTilesSavePayload(payload) {
  if (!payload || typeof payload !== "object" || !payload.world) return null;
  const world = payload.world;
  if (!["seed", "width", "depth", "topAirRows"].every(field => Number.isInteger(world[field]))) return null;
  const version = Number.isInteger(payload.version) ? payload.version : 1;
  return {
    version,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    revisionMetadata: version >= SAVE_PAYLOAD_VERSION
      ? sanitizeSaveRevisionMetadata(payload.revisionMetadata)
      : null,
    world: normalizeWorld(world),
    dugTiles: sanitizeDugTileKeys(payload.dugTiles),
    rubbleTiles: sanitizeRubbleTiles(payload.rubbleTiles),
    resources: sanitizeResourceTotals(payload.resources),
    upgrades: payload.upgrades || null,
    levelData: payload.levelData || null,
    specialTileData: payload.specialTileData || null,
    depthGateData: normalizeDepthGateData(payload.depthGateData),
    dayNightData: payload.dayNightData || null,
    caveSceneData: sanitizeCaveSceneData(payload.caveSceneData),
    ancientRelicData: sanitizeAncientRelicData(payload.ancientRelicData),
    openingFlightArtifactData: payload.openingFlightArtifactData
      ? sanitizeOpeningFlightArtifactData(payload.openingFlightArtifactData) : null,
    starHeartData: payload.starHeartData ? sanitizeStarHeartData(payload.starHeartData) : null,
    retentionData: sanitizeRetentionProgressData(payload.retentionData),
    heavenblocksData: sanitizeHeavenblocksProgressionData(payload.heavenblocksData),
    hardcoreModeData: sanitizeHardcoreModeData(payload.hardcoreModeData),
    graveborerWurmData: sanitizeGraveborerWurmData(payload.graveborerWurmData),
    playerStateData: sanitizePlayerPersistenceData(payload.playerStateData),
    campfireData: payload.campfireData ? sanitizeCampfireData(payload.campfireData) : null,
    journeyData: payload.journeyData ? sanitizeJourneySaveData(payload.journeyData) : null,
    celestialOverhaulData: sanitizeCelestialOverhaulData(payload.celestialOverhaulData),
    milestoneData: version >= SAVE_PAYLOAD_VERSION ? sanitizeMilestoneData(payload.milestoneData) : null,
    starCollectionData: version >= SAVE_PAYLOAD_VERSION
      ? sanitizeStarCollectionData(payload.starCollectionData) : null,
    playerCharacterId: typeof payload.playerCharacterId === "string" ? payload.playerCharacterId : null,
  };
}
