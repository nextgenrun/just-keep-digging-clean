import { XP_GATHERING_CONFIG } from "../../values/xpGathering.js";
import {
  RESOURCE_COLOR_INTS,
  RESOURCE_ORE_COLOR_INTS,
} from "../../values/resourceTypes.js";

const SPECIAL_PROGRESS_EFFECTS = new Set([
  "levelProgress",
  "levelUp",
  "legendLevelProgress",
  "legendLevelUp",
]);

function isLegendProgress(entry) {
  return String(entry?.specialBlockEffect || "").startsWith("legend");
}

function isStarReward(entry) {
  return entry?.skyTileRarity !== null
    && entry?.skyTileRarity !== undefined
    && Number.isFinite(Number(entry.skyTileRarity));
}

export function resolveXpGatheringVariation(entries = []) {
  if (entries.some(entry => entry?.levelUp)) return "levelUp";
  if (entries.some(isLegendProgress)) return "legend";
  if (entries.some(entry => SPECIAL_PROGRESS_EFFECTS.has(entry?.specialBlockEffect))) {
    return "special";
  }
  if (entries.some(isStarReward)) return "star";
  const totalXp = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.xpGained) || 0), 0);
  if (totalXp >= XP_GATHERING_CONFIG.pickup.surgeThresholdXp) return "surge";
  return entries.length > 1 ? "cluster" : "routine";
}

export function resolveXpGatheringIconId(
  variationId,
  entries = [],
  index = 0,
  sequence = 0,
  recentIds = [],
) {
  const profile = XP_GATHERING_CONFIG.pickup.variations[variationId]
    || XP_GATHERING_CONFIG.pickup.variations.routine;
  const library = XP_GATHERING_CONFIG.iconLibraries[profile.iconLibrary]
    || XP_GATHERING_CONFIG.iconLibraries.routine;
  const key = [
    variationId,
    index,
    sequence,
    ...entries.flatMap(entry => [
      Math.round(Number(entry?.worldX) || 0),
      Math.round(Number(entry?.worldY) || 0),
      Math.round(Number(entry?.xpGained) || 0),
      entry?.resourceType || "",
      entry?.skyTileRarity ?? "",
      entry?.specialBlockEffect || "",
    ]),
  ].join("|");
  let hash = XP_GATHERING_CONFIG.iconSelection.hashOffset;
  for (let cursor = 0; cursor < key.length; cursor += 1) {
    hash ^= key.charCodeAt(cursor);
    hash = Math.imul(hash, XP_GATHERING_CONFIG.iconSelection.hashPrime);
  }
  const start = (hash >>> 0) % library.length;
  for (let offset = 0; offset < library.length; offset += 1) {
    const candidate = library[(start + offset) % library.length];
    if (!recentIds.includes(candidate)) return candidate;
  }
  return library[start];
}

export function resolveXpFlightPose(motionPlan, t, profile, index = 0, reducedMotion = false) {
  const progress = Math.max(0, Math.min(Number(t) || 0, 1));
  const point = motionPlan.sample(progress);
  const reduced = XP_GATHERING_CONFIG.pickup.reducedMotion;
  if (reducedMotion) {
    return {
      x: point.x,
      y: point.y,
      scaleX: 1,
      scaleY: 1,
      rotation: motionPlan.rotationRadians * progress * reduced.rotationMultiplier,
    };
  }
  const delta = XP_GATHERING_CONFIG.pickup.flightSampleDelta;
  const before = motionPlan.sample(Math.max(0, progress - delta));
  const after = motionPlan.sample(Math.min(1, progress + delta));
  const tangentX = after.x - before.x;
  const tangentY = after.y - before.y;
  const length = Math.max(
    XP_GATHERING_CONFIG.pickup.flightTangentMinimum,
    Math.hypot(tangentX, tangentY),
  );
  const envelope = Math.sin(Math.PI * progress);
  const phase = index * XP_GATHERING_CONFIG.pickup.flightPhaseStepRadians;
  const wave = cycles => Math.sin(Math.PI * 2 * cycles * progress + phase);
  const flutter = wave(profile.flutterCycles) * profile.flutterAmplitudePx * envelope;
  const bob = Math.sin(
    Math.PI * 2 * profile.bobCycles * progress
      + phase * XP_GATHERING_CONFIG.pickup.flightBobPhaseRatio,
  )
    * profile.bobAmplitudePx * envelope;
  const breath = wave(profile.breathCycles) * profile.breathScale * envelope;
  const squash = Math.cos(Math.PI * 2 * profile.breathCycles * progress + phase)
    * profile.squashScale * envelope;
  const tangentAngle = Math.atan2(tangentY, tangentX);
  const bank = wave(profile.bankCycles) * profile.bankRadians * envelope
    + tangentAngle * profile.headingInfluence * envelope;
  return {
    x: point.x - (tangentY / length) * flutter,
    y: point.y + (tangentX / length) * flutter + bob,
    scaleX: 1 + breath + squash,
    scaleY: 1 + breath - squash,
    rotation: motionPlan.rotationRadians * progress + bank,
  };
}

export function isXpGatheringEnabled(scene) {
  const config = scene?.config;
  return config?.lootVisuals !== false
    && config?.featureFlags?.lootVisuals !== false
    && config?.featureFlags?.["loot-visuals"] !== false;
}

export function resolveXpRewardEntry(scene, reward, targetTile, overrides = {}) {
  if (!reward || !targetTile) return null;
  const xpGained = Math.max(0, Number(overrides.xpGained ?? reward.xpGained) || 0);
  if (xpGained <= 0) return null;
  const tileSize = scene.config.tileSize;
  return {
    worldX: targetTile.tx * tileSize + tileSize / 2,
    worldY: targetTile.ty * tileSize + tileSize / 2,
    xpGained,
    resourceType: overrides.resourceType ?? reward.resourceType ?? reward.resource,
    skyTileRarity: overrides.skyTileRarity ?? reward.skyTileRarity,
    specialBlockEffect: overrides.specialBlockEffect ?? reward.specialBlockEffect,
    levelUp: overrides.levelUp ?? reward.levelUp ?? false,
  };
}

export function resolveXpSourceColor(scene, entry) {
  const rarity = entry.skyTileRarity;
  if (rarity !== null && rarity !== undefined && Number.isFinite(Number(rarity))) {
    const tier = scene.config?.skyTileRarities?.[Math.floor(Number(rarity))];
    if (Number.isFinite(tier?.palette?.glowColor)) return tier.palette.glowColor;
  }
  if (entry.resourceType) {
    return RESOURCE_ORE_COLOR_INTS[entry.resourceType]
      || RESOURCE_COLOR_INTS[entry.resourceType]
      || XP_GATHERING_CONFIG.sourceColors.fallback;
  }
  if (String(entry.specialBlockEffect || "").startsWith("legend")) {
    return XP_GATHERING_CONFIG.sourceColors.legendBlock;
  }
  if (SPECIAL_PROGRESS_EFFECTS.has(entry.specialBlockEffect)) {
    return XP_GATHERING_CONFIG.sourceColors.xpBlock;
  }
  return XP_GATHERING_CONFIG.sourceColors.fallback;
}

export function worldToScreen(scene, worldX, worldY) {
  const camera = scene.cameras?.main;
  if (!camera) return { x: worldX, y: worldY };
  return {
    x: (worldX - camera.scrollX) * camera.zoom + camera.x,
    y: (worldY - camera.scrollY) * camera.zoom + camera.y,
  };
}

export function isNearXpViewport(scene, point) {
  const margin = XP_GATHERING_CONFIG.pickup.offscreenMarginPx;
  const width = scene.scale?.width || 0;
  const height = scene.scale?.height || 0;
  return point.x >= -margin && point.x <= width + margin
    && point.y >= -margin && point.y <= height + margin;
}
