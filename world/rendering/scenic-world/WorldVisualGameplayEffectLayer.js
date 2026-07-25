import { RESOURCE_BY_TILE_TYPE, RESOURCE_COLOR_INTS } from "../../../values/resourceTypes.js";
import { STAR_CONSTELLATION_CONFIG } from "../../../values/starConstellations.js";
import { TILE_TYPES } from "../../../values/tileTypes.js";
import { WORLD_VISUAL_GAMEPLAY_EFFECTS } from "../../../values/worldVisualGameplayEffects.js";
import { WORLD_VISUAL_RUNTIME } from "../../../values/worldVisualRuntime.js";
import { resolveWorldVisualSemanticAssetsEnabled } from "../../../values/worldVisualSemanticAssets.js";
import { collectWorldVisualGameplayEffectTargets } from "./collectWorldVisualGameplayEffectTargets.js";

const TAU = Math.PI * 2;

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function hashUnit(tx, ty, salt = 0) {
  let value = Math.imul(tx + 31, 73856093) ^ Math.imul(ty + 47, 19349663) ^ Math.imul(salt + 7, 83492791);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function mixColor(from, to, amount) {
  const t = clamp01(amount);
  const channel = shift => Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function isNear(tile, playerTile, range) {
  return Math.abs(tile.tx - playerTile.tx) <= range && Math.abs(tile.ty - playerTile.ty) <= range;
}

export class WorldVisualGameplayEffectLayer {
  constructor(
    scene,
    worldModel,
    geometryMask,
    runtimeConfig = WORLD_VISUAL_RUNTIME,
    effectConfig = WORLD_VISUAL_GAMEPLAY_EFFECTS
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.geometryMask = geometryMask;
    this.runtimeConfig = runtimeConfig;
    this.effectConfig = effectConfig;
    this.semanticAssetsEnabled = resolveWorldVisualSemanticAssetsEnabled();
    this.activeBounds = null;
    this.skyTiles = [];
    this.chestTiles = [];
    this.rootTiles = [];
    this.crystalTiles = [];
    this.crystalZones = [];
    this.rootGraphics = null;
    this.skyGraphics = null;
    this.chestGraphics = null;
    this.crystalGlowGraphics = null;
    this.crystalShardGraphics = null;
  }

  create() {
    const addGraphics = (depth, additive = false) => {
      const graphics = this.scene.add.graphics().setDepth(depth).setMask(this.geometryMask);
      if (additive) graphics.setBlendMode(this.effectConfig.blendMode);
      return graphics;
    };
    this.rootGraphics = addGraphics(this.runtimeConfig.render.rootOverlayDepth);
    this.crystalShardGraphics = addGraphics(this.runtimeConfig.render.physicalEffectDepth);
    this.skyGraphics = addGraphics(this.runtimeConfig.render.emissiveDepth, true);
    this.chestGraphics = addGraphics(this.runtimeConfig.render.emissiveDepth, true);
    this.crystalGlowGraphics = addGraphics(this.runtimeConfig.render.emissiveDepth, true);
  }

  sync(bounds) {
    if (!bounds || bounds.right <= bounds.left || bounds.bottom <= bounds.top) return;
    this.activeBounds = { ...bounds };
    Object.assign(this, collectWorldVisualGameplayEffectTargets(
      this.worldModel,
      bounds,
      this.effectConfig.performance
    ));
    this.updateRootOverlays();
  }

  invalidateCell(tx, ty) {
    const bounds = this.activeBounds;
    if (!bounds || tx < bounds.left || tx >= bounds.right || ty < bounds.top || ty >= bounds.bottom) return;
    this.sync(bounds);
  }

  updateSkyTileGlow(playerTile, viewRange = 20) {
    const graphics = this.skyGraphics;
    graphics?.clear();
    if (!graphics || !playerTile) return false;
    if (this.semanticAssetsEnabled) {
      return this.skyTiles.some(tile => isNear(tile, playerTile, viewRange));
    }
    const config = this.effectConfig.sky;
    const size = this.scene.config.tileSize;
    const now = this.scene.time?.now || 0;
    let drawn = 0;
    for (const tile of this.skyTiles) {
      if (!isNear(tile, playerTile, viewRange)) continue;
      const rarity = Math.max(0, Math.min(config.pulsePeriodMsByRarity.length - 1, tile.rarity));
      const color = STAR_CONSTELLATION_CONFIG.rarityFallbacks[rarity]?.glowColor || config.defaultColor;
      const pulse = Math.sin((now / config.pulsePeriodMsByRarity[rarity]) * TAU) * 0.5 + 0.5;
      const cx = (tile.tx + 0.5) * size;
      const cy = (tile.ty + 0.5) * size;
      const radius = size * config.diamondRadiusScale;
      const rarityAlpha = rarity * config.rarityAlphaStep;
      graphics.fillStyle(color, config.haloAlphaBase + rarityAlpha + pulse * config.haloAlphaPulse)
        .fillCircle(cx, cy, size * config.haloRadiusScale);
      graphics.fillStyle(mixColor(color, config.highlightColor, 0.28), config.coreAlphaBase + rarityAlpha)
        .fillCircle(cx, cy, size * config.coreRadiusScale);
      graphics.lineStyle(Math.max(1, size * config.outlineWidthScale), color, config.outlineAlpha + pulse * rarityAlpha)
        .beginPath().moveTo(cx, cy - radius).lineTo(cx + radius, cy).lineTo(cx, cy + radius)
        .lineTo(cx - radius, cy).lineTo(cx, cy - radius).strokePath();
      if (rarity >= config.sparkleMinRarity) {
        graphics.fillStyle(config.highlightColor, config.outlineAlpha + pulse * 0.35);
        for (const [ox, oy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          graphics.fillCircle(cx + ox * radius, cy + oy * radius, Math.max(1, size * config.sparkleRadiusScale));
        }
      }
      if (rarity >= config.coronaMinRarity) {
        graphics.lineStyle(Math.max(1, size * config.outlineWidthScale), color, config.coronaAlpha * pulse)
          .strokeCircle(cx, cy, size * config.coronaRadiusScale);
      }
      const flashCycle = (now % config.resourceFlashPeriodMs) / config.resourceFlashPeriodMs;
      if (flashCycle > config.resourceFlashStart) {
        const resourceKey = RESOURCE_BY_TILE_TYPE[tile.resourceType];
        const resourceColor = RESOURCE_COLOR_INTS[resourceKey] || config.defaultColor;
        const flash = Math.sin(((flashCycle - config.resourceFlashStart) / (1 - config.resourceFlashStart)) * Math.PI);
        graphics.fillStyle(resourceColor, flash * config.resourceFlashAlpha)
          .fillTriangle(cx, cy - radius, cx + radius, cy, cx, cy + radius)
          .fillTriangle(cx, cy - radius, cx - radius, cy, cx, cy + radius);
      }
      drawn += 1;
    }
    return drawn > 0;
  }

  updateChestGlow(playerTile, viewRange = 25) {
    const graphics = this.chestGraphics;
    graphics?.clear();
    if (!graphics || !playerTile) return false;
    const config = this.effectConfig.chest;
    const size = this.scene.config.tileSize;
    const now = this.scene.time?.now || 0;
    const pulse = Math.sin((now / config.pulsePeriodMs) * TAU) * 0.5 + 0.5;
    let drawn = 0;
    for (const tile of this.chestTiles) {
      if (!isNear(tile, playerTile, viewRange)) continue;
      const cx = (tile.tx + 0.5) * size;
      const cy = (tile.ty + 0.5) * size;
      graphics.fillStyle(config.haloColor, config.haloAlphaBase + pulse * config.haloAlphaPulse)
        .fillCircle(cx, cy, size * config.haloRadiusScale);
      graphics.fillStyle(config.coreColor, config.coreAlphaBase + pulse * config.coreAlphaPulse)
        .fillCircle(cx, cy, size * config.coreRadiusScale);
      graphics.fillStyle(config.highlightColor, config.coreAlphaBase + pulse * config.coreAlphaPulse);
      for (let index = 0; index < 3; index += 1) {
        const angle = index * TAU / 3 + pulse * 0.35;
        graphics.fillCircle(
          cx + Math.cos(angle) * size * config.sparkleOrbitScale,
          cy + Math.sin(angle) * size * config.sparkleOrbitScale,
          Math.max(1, size * config.sparkleRadiusScale)
        );
      }
      drawn += 1;
    }
    return drawn > 0;
  }

  updateGlowCrystals(playerTile, viewRange = 25) {
    this.crystalGlowGraphics?.clear();
    this.crystalShardGraphics?.clear();
    if (!this.crystalGlowGraphics || !this.crystalShardGraphics || !playerTile) return false;
    const size = this.scene.config.tileSize;
    const now = this.scene.time?.now || 0;
    let drawn = 0;
    for (const tile of this.crystalTiles) {
      if (!isNear(tile, playerTile, viewRange)) continue;
      this._drawCrystalTile(tile.tx, tile.ty, this.effectConfig.crystals.defaultColor, 1, now, size);
      drawn += 1;
    }
    for (const zone of this.crystalZones) {
      if (Math.abs(zone.cx - playerTile.tx) > viewRange + zone.rx || Math.abs(zone.cy - playerTile.ty) > viewRange + zone.ry) continue;
      const active = clamp01(this.worldModel.getGlowCrystalActiveRatio?.(zone) ?? 1);
      if (active <= 0) continue;
      const color = zone.color || this.effectConfig.crystals.defaultColor;
      const cx = (zone.cx + 0.5) * size;
      const cy = (zone.cy + 0.5) * size;
      const pulse = Math.sin((now / this.effectConfig.crystals.pulsePeriodMs) * TAU + (zone.phase || 0)) * 0.5 + 0.5;
      this.crystalGlowGraphics.fillStyle(color, this.effectConfig.crystals.haloAlpha * active * (0.75 + pulse * 0.25))
        .fillEllipse(cx, cy, (zone.rx + this.effectConfig.crystals.haloPaddingTilesX) * size * 2, (zone.ry + this.effectConfig.crystals.haloPaddingTilesY) * size * 2);
      const bounds = this.activeBounds;
      let reachedCap = false;
      for (let ty = Math.floor(zone.cy - zone.ry); ty <= Math.ceil(zone.cy + zone.ry); ty += 1) {
        for (let tx = Math.floor(zone.cx - zone.rx); tx <= Math.ceil(zone.cx + zone.rx); tx += 1) {
          if (drawn >= this.effectConfig.performance.maxCrystalTiles) {
            reachedCap = true;
            break;
          }
          if (bounds && (tx < bounds.left || tx >= bounds.right || ty < bounds.top || ty >= bounds.bottom)) continue;
          const nx = (tx - zone.cx) / Math.max(zone.rx, 0.001);
          const ny = (ty - zone.cy) / Math.max(zone.ry, 0.001);
          if (nx * nx + ny * ny > 1 || this.worldModel.getTileType(tx, ty) === TILE_TYPES.AIR) continue;
          this._drawCrystalTile(tx, ty, color, active, now, size);
          drawn += 1;
        }
        if (reachedCap) break;
      }
      if (reachedCap) break;
    }
    return drawn > 0;
  }

  _drawCrystalTile(tx, ty, color, alpha, now, size) {
    const config = this.effectConfig.crystals;
    const cx = (tx + 0.5) * size;
    const baseY = (ty + config.shardBaseYScale) * size;
    const pulse = Math.sin((now / config.pulsePeriodMs) * TAU + hashUnit(tx, ty, 2) * TAU) * 0.5 + 0.5;
    this.crystalGlowGraphics.fillStyle(color, config.coreAlpha * alpha * (0.8 + pulse * 0.2))
      .fillCircle(cx, (ty + 0.5) * size, size * 0.34);
    for (let shard = 0; shard < 2; shard += 1) {
      const tipX = cx + (hashUnit(tx, ty, 10 + shard) - 0.5) * size * 0.30;
      const height = size * (config.shardHeightMinScale + hashUnit(tx, ty, 20 + shard) * config.shardHeightRangeScale);
      const halfWidth = size * (config.shardHalfWidthMinScale + hashUnit(tx, ty, 30 + shard) * config.shardHalfWidthRangeScale);
      const shardColor = mixColor(color, config.highlightColor, 0.18 + shard * 0.14);
      this.crystalShardGraphics.fillStyle(shardColor, config.shardAlpha * alpha)
        .fillTriangle(tipX, baseY - height, tipX - halfWidth, baseY, tipX + halfWidth, baseY);
      this.crystalShardGraphics.lineStyle(Math.max(1, size * 0.012), config.highlightColor, config.outlineAlpha * alpha)
        .beginPath().moveTo(tipX, baseY - height).lineTo(tipX + halfWidth, baseY).strokePath();
    }
    const glint = Math.sin((now / config.glintPeriodMs) * TAU + hashUnit(tx, ty, 41) * TAU) * 0.5 + 0.5;
    this.crystalGlowGraphics.fillStyle(config.highlightColor, glint * config.outlineAlpha * alpha)
      .fillCircle(cx + size * 0.16, baseY - size * 0.35, Math.max(1, size * config.sparkleRadiusScale));
  }

  updateRootOverlays() {
    const graphics = this.rootGraphics;
    graphics?.clear();
    if (!graphics) return false;
    const config = this.effectConfig.roots;
    const size = this.scene.config.tileSize;
    for (const tile of this.rootTiles) {
      const deep = tile.overlayType === TILE_TYPES.ROOT_OVERLAY_DEEP;
      const color = deep ? config.deepColor : config.shallowColor;
      const alpha = deep ? config.deepAlpha : config.shallowAlpha;
      const x = tile.tx * size;
      const y = tile.ty * size;
      const inset = size * config.insetScale;
      const bend = (hashUnit(tile.tx, tile.ty, 5) - 0.5) * size * config.bendScale;
      const points = [[x + inset, y], [x + size * 0.44 + bend, y + size * 0.42], [x + size - inset, y + size]];
      const stroke = (strokeColor, strokeAlpha, width) => graphics.lineStyle(width, strokeColor, strokeAlpha)
        .beginPath().moveTo(points[0][0], points[0][1]).lineTo(points[1][0], points[1][1])
        .lineTo(points[2][0], points[2][1]).strokePath();
      stroke(config.shadowColor, config.shadowAlpha, Math.max(1, size * config.shadowWidthScale));
      stroke(color, alpha, Math.max(1, size * config.coreWidthScale));
      const direction = hashUnit(tile.tx, tile.ty, 9) > 0.5 ? 1 : -1;
      graphics.lineStyle(Math.max(1, size * config.coreWidthScale), color, alpha * 0.82).beginPath()
        .moveTo(points[1][0], points[1][1]).lineTo(
          points[1][0] + direction * size * config.branchLengthScale,
          points[1][1] - size * config.branchLengthScale
        ).strokePath();
    }
    return this.rootTiles.length > 0;
  }

  updateSpecialBlockGlow() {
    // Explicit visual-only no-op: persistent semantic markers are owned by
    // WorldVisualFeedbackLayer, avoiding a second square overlay.
    return false;
  }

  setEmissiveDepth(depth) {
    const resolved = Number.isFinite(depth) ? depth : this.runtimeConfig.render.emissiveDepth;
    this.skyGraphics?.setDepth(resolved);
    this.chestGraphics?.setDepth(resolved);
    this.crystalGlowGraphics?.setDepth(resolved);
  }

  destroy() {
    this.rootGraphics?.destroy();
    this.skyGraphics?.destroy();
    this.chestGraphics?.destroy();
    this.crystalGlowGraphics?.destroy();
    this.crystalShardGraphics?.destroy();
    this.rootGraphics = null;
    this.skyGraphics = null;
    this.chestGraphics = null;
    this.crystalGlowGraphics = null;
    this.crystalShardGraphics = null;
    this.activeBounds = null;
  }
}
