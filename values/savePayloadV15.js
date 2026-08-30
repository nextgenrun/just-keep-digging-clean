import { DEPTH_MILESTONES } from "./depthMilestones.js";
import { STAR_CONSTELLATION_CONFIG } from "./starConstellations.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "./starIdentityLibrary.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "./starRarityProgression.js";

export const SAVE_PAYLOAD_VERSION = 15;
export const MAX_SAVE_REVISION = Number.MAX_SAFE_INTEGER;

const MILESTONE_DEPTHS = new Set(DEPTH_MILESTONES.map(entry => entry.depth));
const STAR_RESOURCE_TYPES = Object.freeze(Object.keys(STAR_CONSTELLATION_CONFIG.defs));
const STAR_RESOURCE_SET = new Set(STAR_RESOURCE_TYPES);
const MAX_STAR_COUNT = STAR_RARITY_PROGRESSION_CONFIG.signProgression.maxEncounterCount;
const MAX_RARITY_SLOTS = 64;
const MAX_STAR_IDENTITY_SLOTS = STAR_IDENTITY_LIBRARY_CONFIG.identities.length;

function boundedInteger(value, min, max, fallback = 0) {
  return Number.isFinite(value) && Number.isInteger(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

export function sanitizeSaveRevisionMetadata(value, fallbackRevision = 0) {
  const fallback = boundedInteger(fallbackRevision, 0, MAX_SAVE_REVISION, 0);
  const revision = boundedInteger(value?.revision, 0, MAX_SAVE_REVISION, fallback);
  const parentRevision = boundedInteger(
    value?.parentRevision,
    0,
    Math.max(0, revision - 1),
    Math.max(0, revision - 1),
  );
  return Object.freeze({
    revision,
    parentRevision,
    transactionId: typeof value?.transactionId === "string"
      ? value.transactionId.slice(0, 128)
      : null,
    reason: typeof value?.reason === "string" ? value.reason.slice(0, 128) : "unspecified",
    capturedAt: typeof value?.capturedAt === "string" ? value.capturedAt : null,
  });
}

export function sanitizeMilestoneData(value) {
  const depths = Array.isArray(value?.reachedDepths) ? value.reachedDepths : [];
  return Object.freeze({
    reachedDepths: Object.freeze([...new Set(depths
      .filter(depth => Number.isInteger(depth) && MILESTONE_DEPTHS.has(depth)))]
      .sort((left, right) => left - right)),
  });
}

function sanitizeCountMap(value, maximums = null) {
  const result = {};
  for (const resourceType of STAR_RESOURCE_TYPES) {
    const maximum = maximums?.[resourceType] ?? MAX_STAR_COUNT;
    result[resourceType] = boundedInteger(value?.[resourceType], 0, maximum, 0);
  }
  return result;
}

export function sanitizeStarCollectionData(value) {
  const rarityCounts = Array.isArray(value?.rarityCounts)
    ? value.rarityCounts.slice(0, MAX_RARITY_SLOTS)
      .map(count => boundedInteger(count, 0, MAX_STAR_COUNT, 0))
    : [];
  const identityCounts = Array.isArray(value?.identityCounts)
    ? value.identityCounts.slice(0, MAX_STAR_IDENTITY_SLOTS)
      .map(count => boundedInteger(count, 0, MAX_STAR_COUNT, 0))
    : [];
  const unlockedConstellations = Array.isArray(value?.unlockedConstellations)
    ? [...new Set(value.unlockedConstellations
      .filter(resourceType => STAR_RESOURCE_SET.has(resourceType)))]
    : [];
  return Object.freeze({
    constellationCounts: Object.freeze(sanitizeCountMap(value?.constellationCounts)),
    signXp: Object.freeze(sanitizeCountMap(
      value?.signXp,
      STAR_RARITY_PROGRESSION_CONFIG.signProgression.xpTotals,
    )),
    rarityCounts: Object.freeze(rarityCounts),
    identityCounts: Object.freeze(identityCounts),
    unlockedConstellations: Object.freeze(unlockedConstellations),
  });
}

export function createEmptyStarCollectionData() {
  return sanitizeStarCollectionData(null);
}
