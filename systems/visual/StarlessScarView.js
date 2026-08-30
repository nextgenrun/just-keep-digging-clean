import { TILE_TYPES } from "../../values/tileTypes.js";
import { STAR_SANCTUARY_CONFIG } from "../../values/starSanctuary.js";
import { getStarSanctuarySiteSeed } from
  "../environment/starSanctuaryProfile.js";

function mix32(value) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function seededUnit(seed, salt) {
  return mix32(seed ^ Math.imul(salt, 0x9e3779b1)) / 0xffffffff;
}

function colorNumber(hex, fallback = 0x80556f) {
  const parsed = Number.parseInt(String(hex || "").replace("#", ""), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class StarlessScarView {
  constructor(scene, worldModel, config = STAR_SANCTUARY_CONFIG) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    const visual = config.scar.visual;
    this.base = scene.add.graphics()
      .setDepth(visual.baseDepth)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.rim = scene.add.graphics().setDepth(visual.rimDepth);
    this.preview = scene.add.graphics()
      .setDepth(config.consumption.preview.worldDepth);
    this.visibleScars = [];
    this.previewVisible = false;
    this.previewProgress = 0;
  }

  _getVisibleBounds() {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view || !this.worldModel) return null;
    const tileSize = Math.max(1, this.worldModel.tileSize || 1);
    const margin = this.config.scar.visual.cullMarginTiles;
    return {
      left: Math.max(0, Math.floor(view.x / tileSize) - margin),
      right: Math.min(
        this.worldModel.widthTiles - 1,
        Math.ceil((view.x + view.width) / tileSize) + margin,
      ),
      top: Math.max(0, Math.floor(view.y / tileSize) - margin),
      bottom: Math.min(
        this.worldModel.depthTiles - 1,
        Math.ceil((view.y + view.height) / tileSize) + margin,
      ),
    };
  }

  _findVisibleScars() {
    const bounds = this._getVisibleBounds();
    if (!bounds) return [];
    const scars = [];
    for (let ty = bounds.top; ty <= bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
        if (this.worldModel.getTileType?.(tx, ty) === TILE_TYPES.SKY_TILE) {
          continue;
        }
        if (
          this.worldModel.getDugTileSource?.(tx, ty)?.type
          !== TILE_TYPES.SKY_TILE
        ) {
          continue;
        }
        scars.push({
          tx,
          ty,
          identityIndex: this.worldModel.getSkyTileIdentity?.(tx, ty) ?? 0,
          identityColor: colorNumber(
            this.scene._starSanctuaryRuntime?.system
              ?.getProfileAt(tx, ty)?.identityPrimary,
          ),
        });
      }
    }
    return scars;
  }

  _drawScar(scar) {
    const visual = this.config.scar.visual;
    const tileSize = Math.max(1, this.worldModel.tileSize || 1);
    const radius = this.config.scar.radiusTiles * tileSize;
    const worldX = (scar.tx + 0.5) * tileSize;
    const worldY = (scar.ty + 0.5) * tileSize;
    const seed = getStarSanctuarySiteSeed(
      scar.tx,
      scar.ty,
      scar.identityIndex,
    );

    this.base.fillStyle(visual.baseColor, visual.baseAlpha);
    this.base.fillCircle(worldX, worldY, radius * 0.84);
    for (let index = 0; index < visual.edgeLobes; index += 1) {
      const angle = Math.PI * 2 * index / visual.edgeLobes
        + seededUnit(seed, 10 + index) * 0.32;
      const edgeRadius = radius * (
        0.68 + seededUnit(seed, 40 + index) * 0.22
      );
      const lobeRadius = radius * (
        0.18 + seededUnit(seed, 70 + index) * 0.13
      );
      this.base.fillCircle(
        worldX + Math.cos(angle) * edgeRadius,
        worldY + Math.sin(angle) * edgeRadius,
        lobeRadius,
      );
    }
    this.base.fillStyle(visual.coreColor, visual.coreAlpha);
    this.base.fillCircle(worldX, worldY, radius * 0.23);
    this.base.fillStyle(visual.ashColor, visual.ashAlpha);
    for (let index = 0; index < visual.ashPatches; index += 1) {
      const angle = seededUnit(seed, 230 + index) * Math.PI * 2;
      const patchDistance = radius * (
        0.24 + seededUnit(seed, 260 + index) * 0.62
      );
      const patchRadius = radius * (
        0.055 + seededUnit(seed, 290 + index) * 0.09
      );
      this.base.fillCircle(
        worldX + Math.cos(angle) * patchDistance,
        worldY + Math.sin(angle) * patchDistance,
        patchRadius,
      );
    }

    this.rim.lineStyle(
      Math.max(1, tileSize * 0.045),
      scar.identityColor,
      visual.rimAlpha,
    );
    for (let index = 0; index < visual.coreArcSegments; index += 1) {
      const start = Math.PI * 2 * index / visual.coreArcSegments
        + seededUnit(seed, 320 + index) * 0.22;
      const length = 0.28 + seededUnit(seed, 350 + index) * 0.22;
      this.rim.beginPath();
      this.rim.arc(worldX, worldY, radius * 0.22, start, start + length);
      this.rim.strokePath();
    }
    this.rim.lineStyle(
      Math.max(1, tileSize * 0.052),
      visual.veinColor,
      visual.veinAlpha,
    );
    for (let index = 0; index < visual.veinCount; index += 1) {
      const angle = Math.PI * 2 * index / visual.veinCount
        + seededUnit(seed, 110 + index) * 0.66;
      const bend = angle + (seededUnit(seed, 140 + index) - 0.5) * 1.08;
      const endAngle = bend + (seededUnit(seed, 155 + index) - 0.5) * 0.86;
      const startRadius = radius * 0.2;
      const middleRadius = radius * (
        0.48 + seededUnit(seed, 170 + index) * 0.12
      );
      const endRadius = radius * (
        0.72 + seededUnit(seed, 200 + index) * 0.22
      );
      this.rim.beginPath();
      this.rim.moveTo(
        worldX + Math.cos(angle) * startRadius,
        worldY + Math.sin(angle) * startRadius,
      );
      this.rim.lineTo(
        worldX + Math.cos(bend) * middleRadius,
        worldY + Math.sin(bend) * middleRadius,
      );
      this.rim.lineTo(
        worldX + Math.cos(endAngle) * endRadius,
        worldY + Math.sin(endAngle) * endRadius,
      );
      this.rim.strokePath();
      if (index % 2 !== 0) continue;
      const branchAngle = bend + (index % 4 === 0 ? 0.62 : -0.62);
      const branchRadius = middleRadius + radius * (
        0.14 + seededUnit(seed, 380 + index) * 0.12
      );
      this.rim.beginPath();
      this.rim.moveTo(
        worldX + Math.cos(bend) * middleRadius,
        worldY + Math.sin(bend) * middleRadius,
      );
      this.rim.lineTo(
        worldX + Math.cos(branchAngle) * branchRadius,
        worldY + Math.sin(branchAngle) * branchRadius,
      );
      this.rim.strokePath();
    }
  }

  _drawPendingPreview() {
    const pending = this.scene?._starSanctuaryRuntime?.system
      ?.getSnapshot?.()?.pendingConsumption;
    if (pending?.phase !== "holding" || !pending.profile) return;
    const preview = this.config.consumption.preview;
    const tileSize = Math.max(1, this.worldModel.tileSize || 1);
    const radius = this.config.scar.radiusTiles * tileSize;
    const worldX = (pending.profile.tx + 0.5) * tileSize;
    const worldY = (pending.profile.ty + 0.5) * tileSize;
    const nowMs = this.scene.time?.now || 0;
    const cycle = nowMs / preview.pulsePeriodMs * Math.PI * 2;
    const pulse = preview.pulseMinimum
      + (preview.pulseMaximum - preview.pulseMinimum)
        * (Math.sin(cycle) * 0.5 + 0.5);
    const progress = Math.max(0, Math.min(1, pending.progress || 0));
    const warningColor = colorNumber(this.config.feedback.warningColor);
    this.preview.fillStyle(
      this.config.scar.visual.baseColor,
      preview.fillAlpha * pulse,
    );
    this.preview.fillCircle(worldX, worldY, radius);
    this.preview.lineStyle(
      Math.max(2, tileSize * preview.ringWidthTiles),
      warningColor,
      preview.ringAlpha * pulse,
    );
    this.preview.strokeCircle(worldX, worldY, radius);
    if (progress > 0) {
      this.preview.beginPath();
      this.preview.arc(
        worldX,
        worldY,
        radius * 0.92,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress,
      );
      this.preview.strokePath();
    }
    this.previewVisible = true;
    this.previewProgress = progress;
  }

  update() {
    this.base.clear();
    this.rim.clear();
    this.preview.clear();
    this.previewVisible = false;
    this.previewProgress = 0;
    if (!this.scene?._starSanctuaryRuntime?.system?.enabled) {
      this.visibleScars = [];
      return;
    }
    this.visibleScars = this._findVisibleScars();
    this.visibleScars.forEach(scar => this._drawScar(scar));
    this._drawPendingPreview();
  }

  getSnapshot() {
    return {
      visibleScarCount: this.visibleScars.length,
      scarRadiusTiles: this.config.scar.radiusTiles,
      previewVisible: this.previewVisible,
      previewProgress: this.previewProgress,
    };
  }

  destroy() {
    this.base?.destroy();
    this.rim?.destroy();
    this.preview?.destroy();
    this.visibleScars = [];
    this.scene = null;
    this.worldModel = null;
  }
}
