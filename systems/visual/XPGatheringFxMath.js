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

export function resolveXpGatheringVariation(entries = []) {
  if (entries.some(entry => entry?.levelUp)) return "levelUp";
  if (entries.some(entry => SPECIAL_PROGRESS_EFFECTS.has(entry?.specialBlockEffect))) {
    return "special";
  }
  return entries.length > 1 ? "cluster" : "routine";
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
