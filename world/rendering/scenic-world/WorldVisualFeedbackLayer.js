import {
  RESOURCE_BY_TILE_TYPE,
  RESOURCE_ORE_COLOR_INTS,
} from "../../../values/resourceTypes.js";
import { TILE_TYPES } from "../../../values/tileTypes.js";
import {
  WORLD_VISUAL_FEEDBACK,
  WORLD_VISUAL_SPECIAL_MARKER_KEY_BY_TYPE,
  resolveWorldVisualFeedbackFrame,
  resolveWorldVisualFeedbackMarker,
  resolveWorldVisualResourceVeinsEnabled,
} from "../../../values/worldVisualFeedback.js";
import { WORLD_VISUAL_RUNTIME } from "../../../values/worldVisualRuntime.js";
import {
  resolveWorldVisualSemanticAssetsEnabled,
  resolveWorldVisualSemanticSpecialFrame,
} from "../../../values/worldVisualSemanticAssets.js";
import { WorldVisualDamagePainter } from "./WorldVisualDamagePainter.js";
import { getHeavenblocksRegionAt } from "../../../values/heavenblocksWorldConfig.js";

function hashUnit(tx, ty, salt = 0) {
  let value = Math.imul(tx + 31, 73856093) ^ Math.imul(ty + 47, 19349663) ^ Math.imul(salt + 7, 83492791);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function mixColor(from, to, amount) {
  const t = Math.max(0, Math.min(1, amount));
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  return (
    (Math.round(fr + (tr - fr) * t) << 16)
    | (Math.round(fg + (tg - fg) * t) << 8)
    | Math.round(fb + (tb - fb) * t)
  );
}

export class WorldVisualFeedbackLayer {
  constructor(
    scene,
    worldModel,
    geometryMask,
    config = WORLD_VISUAL_RUNTIME,
    feedbackConfig = WORLD_VISUAL_FEEDBACK
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.geometryMask = geometryMask;
    this.config = config;
    this.feedbackConfig = feedbackConfig;
    this.semanticAssetsEnabled = resolveWorldVisualSemanticAssetsEnabled();
    this.resourceVeinsEnabled = resolveWorldVisualResourceVeinsEnabled(feedbackConfig);
    this.decals = null;
    this.damagePainter = null;
    this.markerPool = [];
    this.activeBounds = null;
  }

  create() {
    this._installAtlasFrames();
    this.decals = this.scene.add.graphics()
      .setDepth(this.config.render.feedbackDepth)
      .setMask(this.geometryMask);
    this.damagePainter = new WorldVisualDamagePainter(
      this.scene,
      this.geometryMask,
      this.config.render.feedbackDepth
    );
    this.damagePainter.create();
  }

  sync(bounds, reduced = false) {
    this.activeBounds = bounds;
    this.decals.clear();
    this.damagePainter?.clear();
    this.markerPool.forEach(image => image.setVisible(false));
    const tileSize = this.scene.config.tileSize;
    let markerIndex = 0;
    let visibleResources = 0;
    let damaged = 0;
    const markerCap = reduced
      ? Math.floor(this.config.streaming.maxVisibleResourceVeins / 2)
      : this.config.streaming.maxVisibleResourceVeins;
    const damageCap = reduced
      ? Math.floor(this.config.streaming.maxVisibleDamageCells / 2)
      : this.config.streaming.maxVisibleDamageCells;

    // Gameplay-significant cells are never allowed to lose their emblem just
    // because a dense ore field exhausted the decorative resource budget.
    for (let ty = bounds.top; ty < bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx < bounds.right; tx += 1) {
        if (getHeavenblocksRegionAt(tx, ty)) continue;
        const type = this.worldModel.getTileType(tx, ty);
        const markerKey = WORLD_VISUAL_SPECIAL_MARKER_KEY_BY_TYPE[type];
        const marker = markerKey ? this.feedbackConfig.specialMarkers[markerKey] : null;
        if (!marker) continue;
        if (this.semanticAssetsEnabled && Number.isInteger(resolveWorldVisualSemanticSpecialFrame(type))) continue;
        this._showMarker(markerIndex, tx, ty, type, marker, tileSize);
        markerIndex += 1;
      }
    }

    for (let ty = bounds.top; ty < bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx < bounds.right; tx += 1) {
        if (getHeavenblocksRegionAt(tx, ty)) continue;
        const tileType = this.worldModel.getTileType(tx, ty);
        if (tileType === TILE_TYPES.AIR) continue;
        const resourceType = tileType === TILE_TYPES.SKY_TILE
          ? this.worldModel.getSkyTileOriginalType(tx, ty)
          : tileType;
        const resourceKey = RESOURCE_BY_TILE_TYPE[resourceType];
        const marker = resourceKey
          ? resolveWorldVisualFeedbackMarker(resourceKey, resourceType, this.feedbackConfig)
          : null;
        if (!this.semanticAssetsEnabled && marker && visibleResources < markerCap) {
          if (resourceKey && this.resourceVeinsEnabled) {
            this._drawEmbeddedResource(tx, ty, resourceKey, marker, tileSize);
          } else {
            this._showMarker(markerIndex, tx, ty, resourceType, marker, tileSize);
            markerIndex += 1;
          }
          visibleResources += 1;
        }

        const hp = this.worldModel.getTileHp(tx, ty);
        const maxHp = this.worldModel.getTileMaxHp(tx, ty, tileType);
        if (maxHp > 0 && hp > 0 && hp < maxHp && damaged < damageCap) {
          this._drawDamage(tx, ty, 1 - hp / maxHp, tileSize);
          damaged += 1;
        }
      }
    }
  }
  _showMarker(index, tx, ty, type, marker, size) {
    const frameIndex = resolveWorldVisualFeedbackFrame(tx, ty, type, marker);
    const frame = `${this.feedbackConfig.atlas.framePrefix}${frameIndex}`;
    const image = this.markerPool[index] || this._createMarker();
    image.setPosition((tx + 0.5) * size, (ty + 0.5) * size)
      .setTexture(this.feedbackConfig.atlas.key, frame)
      .setDisplaySize(size * marker.scale, size * marker.scale)
      .setAlpha(marker.alpha)
      .setVisible(true);
  }

  _createMarker() {
    const image = this.scene.add.image(0, 0, this.feedbackConfig.atlas.key)
      .setDepth(this.config.render.feedbackDepth)
      .setMask(this.geometryMask)
      .setVisible(false);
    this.markerPool.push(image);
    return image;
  }

  _drawEmbeddedResource(tx, ty, resourceKey, marker, size) {
    const config = this.feedbackConfig.embeddedResourceVeins;
    const profile = config.profiles[resourceKey];
    const oreColor = RESOURCE_ORE_COLOR_INTS[resourceKey];
    if (!profile || !Number.isFinite(oreColor)) return;

    const alpha = marker.alpha * config.alphaScale * (profile.alphaScale ?? 1);
    const angle = hashUnit(tx, ty, 7) * Math.PI * 2;
    const axisX = Math.cos(angle);
    const axisY = Math.sin(angle);
    const normalX = -axisY;
    const normalY = axisX;
    const centerX = (tx + 0.5 + (hashUnit(tx, ty, 11) - 0.5) * config.centerJitterScale) * size;
    const centerY = (ty + 0.5 + (hashUnit(tx, ty, 13) - 0.5) * config.centerJitterScale) * size;
    const span = size * config.spanScale * profile.scale * (
      config.spanRandomMin + hashUnit(tx, ty, 17) * config.spanRandomRange
    );
    const highlightColor = mixColor(oreColor, config.highlightTargetColor, config.highlightMix);
    const points = config.mainPointPositions.map((position, index) => {
      const bend = (hashUnit(tx, ty, 21 + index) - 0.5) * size * config.bendScale;
      return {
        x: centerX + axisX * span * position + normalX * bend,
        y: centerY + axisY * span * position + normalY * bend,
      };
    });
    const branches = [];
    for (let index = 0; index < profile.branches; index += 1) {
      const origin = points[1 + (index % 2)];
      const direction = angle
        + (index % 2 === 0 ? 1 : -1) * (
          config.branchAngleMinRadians
          + hashUnit(tx, ty, 31 + index) * config.branchAngleRangeRadians
        );
      const length = size * config.branchLengthScale * (
        config.branchLengthRandomMin
        + hashUnit(tx, ty, 41 + index) * config.branchLengthRandomRange
      );
      branches.push([
        origin,
        {
          x: origin.x + Math.cos(direction) * length * config.branchMidpoint,
          y: origin.y + Math.sin(direction) * length * config.branchMidpoint,
        },
        {
          x: origin.x + Math.cos(direction) * length,
          y: origin.y + Math.sin(direction) * length,
        },
      ]);
    }

    if (profile.vein !== false) {
      this._strokeVein(points, config.shadowColor, config.shadowAlpha * alpha, size * config.shadowWidthScale);
      branches.forEach(branch => this._strokeVein(
        branch,
        config.shadowColor,
        config.shadowAlpha * alpha,
        size * config.shadowWidthScale * config.branchWidthScale
      ));
      this._strokeVein(points, oreColor, config.coreAlpha * alpha, size * config.coreWidthScale);
      branches.forEach(branch => this._strokeVein(
        branch,
        oreColor,
        config.coreAlpha * alpha,
        size * config.coreWidthScale * config.branchWidthScale
      ));
      this._strokeVein(points, highlightColor, config.highlightAlpha * alpha, size * config.highlightWidthScale);
    }

    for (let index = 0; index < profile.nodes; index += 1) {
      const point = points[index % points.length];
      const offsetX = (hashUnit(tx, ty, 61 + index) - 0.5) * size * config.nodeJitterScale;
      const offsetY = (hashUnit(tx, ty, 71 + index) - 0.5) * size * config.nodeJitterScale;
      const radius = size * config.nodeRadiusScale * (
        config.nodeRadiusRandomMin
        + hashUnit(tx, ty, 81 + index) * config.nodeRadiusRandomRange
      );
      const x = point.x + offsetX;
      const y = point.y + offsetY;
      this.decals.fillStyle(config.shadowColor, config.shadowAlpha * alpha)
        .fillCircle(x, y, radius * config.nodeShadowScale);
      this.decals.fillStyle(oreColor, config.coreAlpha * alpha).fillCircle(x, y, radius);
      this.decals.fillStyle(highlightColor, config.highlightAlpha * alpha).fillCircle(
        x - radius * config.nodeHighlightOffsetScale,
        y - radius * config.nodeHighlightOffsetScale,
        radius * config.nodeHighlightRadiusScale
      );
      if (profile.crystalline && index < 3) {
        this.decals.fillStyle(oreColor, config.coreAlpha * alpha).fillTriangle(
          x,
          y - radius * config.crystalTipScale,
          x - radius * config.crystalHalfWidthScale,
          y + radius * config.crystalBaseScale,
          x + radius * config.crystalHalfWidthScale,
          y + radius * config.crystalBaseScale
        );
      }
    }
  }

  _strokeVein(points, color, alpha, width) {
    this.decals.lineStyle(Math.max(1, width), color, alpha).beginPath();
    this.decals.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      this.decals.lineTo(points[index].x, points[index].y);
    }
    this.decals.strokePath();
  }

  _installAtlasFrames() {
    const cfg = this.feedbackConfig.atlas;
    if (!this.scene.textures.exists(cfg.key)) {
      throw new Error(`[WorldVisualFeedbackLayer] Required feedback atlas was not preloaded: ${cfg.key}`);
    }
    const texture = this.scene.textures.get(cfg.key);
    for (let index = 0; index < cfg.frameCount; index += 1) {
      const name = `${cfg.framePrefix}${index}`;
      if (texture.has(name)) continue;
      texture.add(
        name,
        0,
        (index % cfg.columns) * cfg.frameSizePx,
        Math.floor(index / cfg.columns) * cfg.frameSizePx,
        cfg.frameSizePx,
        cfg.frameSizePx
      );
    }
  }
  _drawDamage(tx, ty, damage, size) {
    this.damagePainter?.draw(tx, ty, damage, size);
  }
  setDepth(depth) {
    this.decals?.setDepth(depth);
    this.damagePainter?.setDepth(depth);
    this.markerPool.forEach(image => image.setDepth(depth));
  }

  destroy() {
    this.decals?.destroy();
    this.damagePainter?.destroy();
    this.markerPool.forEach(image => image.destroy());
    this.decals = null;
    this.damagePainter = null;
    this.markerPool = [];
  }
}
