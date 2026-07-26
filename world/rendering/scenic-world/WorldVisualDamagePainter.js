import { WORLD_VISUAL_DAMAGE, WORLD_VISUAL_DAMAGE_MODES, resolveWorldVisualDamageMode, resolveWorldVisualDamageStage } from "../../../values/worldVisualDamage.js";
import { drawLegacyWorldVisualDamage } from "./drawLegacyWorldVisualDamage.js";

function hashUnit(tx, ty, salt, config) {
  let value = Math.imul(tx + config.offsetX, config.primeX)
    ^ Math.imul(ty + config.offsetY, config.primeY)
    ^ Math.imul(salt + config.offsetSalt, config.primeSalt);
  value = Math.imul(value ^ (value >>> config.avalancheShift), config.avalanchePrime);
  return ((value ^ (value >>> config.finalShift)) >>> 0) / config.unsignedMax;
}

function resolveBlendMode(name) {
  return globalThis.Phaser?.BlendModes?.[name] ?? name;
}

function offsetPoints(points, x, y) {
  return points.map(point => ({ x: point.x + x, y: point.y + y }));
}
export class WorldVisualDamagePainter {
  constructor(scene, geometryMask, depth, config = WORLD_VISUAL_DAMAGE) {
    this.scene = scene;
    this.geometryMask = geometryMask;
    this.depth = depth;
    this.config = config;
    this.mode = resolveWorldVisualDamageMode(config);
    this.scuffLayer = null;
    this.shadowLayer = null;
    this.rimLayer = null;
    this.chipLayer = null;
  }

  create() {
    const blendModes = this.config.layers.blendModes;
    this.scuffLayer = this._createLayer("scuff", blendModes.scuff);
    this.shadowLayer = this._createLayer("shadow", blendModes.shadow);
    this.rimLayer = this._createLayer("rim", blendModes.rim);
    this.chipLayer = this._createLayer("chips", blendModes.chips);
    return true;
  }
  _createLayer(name, blendMode) {
    return this.scene.add.graphics()
      .setDepth(this.depth + this.config.layers.depthOffsets[name])
      .setMask(this.geometryMask)
      .setBlendMode(resolveBlendMode(blendMode));
  }

  clear() {
    this.scuffLayer?.clear();
    this.shadowLayer?.clear();
    this.rimLayer?.clear();
    this.chipLayer?.clear();
  }

  draw(tx, ty, damage, size) {
    if (this.mode === WORLD_VISUAL_DAMAGE_MODES.legacy) {
      drawLegacyWorldVisualDamage(this.shadowLayer, tx, ty, damage, size, this.config);
      return true;
    }
    const stage = resolveWorldVisualDamageStage(damage, this.config);
    if (!stage || !this.shadowLayer) return false;
    const fracture = this._buildFracture(tx, ty, size, stage);
    this._drawScuff(tx, ty, size, stage, fracture);
    this._drawFractures(size, stage, fracture);
    this._drawChips(tx, ty, size, stage, fracture);
    return true;
  }

  _buildFracture(tx, ty, size, stage) {
    const geometry = this.config.geometry;
    const hash = this.config.hash;
    const salts = geometry.salts;
    const angle = hashUnit(tx, ty, salts.orientation, hash) * Math.PI * 2;
    const axis = { x: Math.cos(angle), y: Math.sin(angle) };
    const normal = { x: -axis.y, y: axis.x };
    const center = {
      x: (tx + 0.5 + (hashUnit(tx, ty, salts.centerX, hash) - 0.5) * geometry.centerJitterScale) * size,
      y: (ty + 0.5 + (hashUnit(tx, ty, salts.centerY, hash) - 0.5) * geometry.centerJitterScale) * size,
    };
    const span = size * stage.spanScale;
    const primary = [];
    for (let index = 0; index < geometry.primaryPointCount; index += 1) {
      const position = index / (geometry.primaryPointCount - 1) - 0.5;
      const bend = (hashUnit(tx, ty, salts.primaryBend + index, hash) - 0.5)
        * size * geometry.primaryBendScale;
      primary.push({
        x: center.x + axis.x * span * position + normal.x * bend,
        y: center.y + axis.y * span * position + normal.y * bend,
      });
    }
    const branches = this._buildBranches(tx, ty, size, stage, primary, angle);
    const twigs = this._buildTwigs(tx, ty, size, stage, branches, angle);
    return { center, axis, normal, primary, branches, twigs };
  }

  _buildBranches(tx, ty, size, stage, primary, primaryAngle) {
    const geometry = this.config.geometry;
    const salts = geometry.salts;
    const hash = this.config.hash;
    const attachable = primary.length - geometry.branchAttachPadding * 2;
    const branches = [];
    for (let index = 0; index < stage.branchCount; index += 1) {
      const attachIndex = geometry.branchAttachPadding
        + Math.floor(hashUnit(tx, ty, salts.branchAttach + index, hash) * attachable);
      const origin = primary[Math.min(primary.length - geometry.branchAttachPadding - 1, attachIndex)];
      const side = hashUnit(tx, ty, salts.branchSide + index, hash) < 0.5 ? -1 : 1;
      const angle = primaryAngle + side * (
        geometry.branchAngleMinRadians
        + hashUnit(tx, ty, salts.branchAngle + index, hash) * geometry.branchAngleRangeRadians
      );
      const length = size * stage.branchLengthScale * (
        geometry.branchLengthRandomMin
        + hashUnit(tx, ty, salts.branchLength + index, hash) * geometry.branchLengthRandomRange
      );
      const bend = (hashUnit(tx, ty, salts.branchBend + index, hash) - 0.5)
        * size * geometry.branchBendScale;
      branches.push([
        origin,
        {
          x: origin.x + Math.cos(angle) * length * geometry.branchMidpoint - Math.sin(angle) * bend,
          y: origin.y + Math.sin(angle) * length * geometry.branchMidpoint + Math.cos(angle) * bend,
        },
        {
          x: origin.x + Math.cos(angle) * length,
          y: origin.y + Math.sin(angle) * length,
        },
      ]);
    }
    return branches;
  }

  _buildTwigs(tx, ty, size, stage, branches, primaryAngle) {
    const geometry = this.config.geometry;
    const salts = geometry.salts;
    const hash = this.config.hash;
    const twigs = [];
    for (let index = 0; index < stage.twigCount && branches.length > 0; index += 1) {
      const parent = branches[index % branches.length];
      const origin = parent[1];
      const side = index % 2 === 0 ? -1 : 1;
      const angle = primaryAngle + side * (
        geometry.twigAngleMinRadians
        + hashUnit(tx, ty, salts.twigAngle + index, hash) * geometry.twigAngleRangeRadians
      );
      const length = size * stage.branchLengthScale * geometry.twigLengthScale;
      twigs.push([
        origin,
        {
          x: origin.x + Math.cos(angle) * length,
          y: origin.y + Math.sin(angle) * length,
        },
      ]);
    }
    return twigs;
  }

  _drawScuff(tx, ty, size, stage, fracture) {
    const scuff = this.config.layers.scuff;
    const salts = this.config.geometry.salts;
    const hash = this.config.hash;
    for (let index = 0; index < stage.scuffCount; index += 1) {
      const along = (hashUnit(tx, ty, salts.scuffAlong + index, hash) - 0.5)
        * size * scuff.alongSpreadScale;
      const across = (hashUnit(tx, ty, salts.scuffNormal + index, hash) - 0.5)
        * size * scuff.normalSpreadScale;
      const randomSize = scuff.randomSizeMin
        + hashUnit(tx, ty, salts.scuffSize + index, hash) * scuff.randomSizeRange;
      const width = size * scuff.widthScale * randomSize
        * (0.5 + Math.abs(fracture.axis.x) * 0.5);
      const height = size * scuff.heightScale * randomSize
        * (0.5 + Math.abs(fracture.axis.y) * 0.5);
      this.scuffLayer.fillStyle(scuff.color, stage.scuffAlpha).fillEllipse(
        fracture.center.x + fracture.axis.x * along + fracture.normal.x * across,
        fracture.center.y + fracture.axis.y * along + fracture.normal.y * across,
        width,
        height
      );
    }
  }

  _drawFractures(size, stage, fracture) {
    const fractureStyle = this.config.layers.fracture;
    const rimStyle = this.config.layers.rim;
    const rimOffsetX = fracture.normal.x * size * rimStyle.offsetScale;
    const rimOffsetY = fracture.normal.y * size * rimStyle.offsetScale;
    const paths = [
      { points: fracture.primary, widthRatio: 1 },
      ...fracture.branches.map(points => ({ points, widthRatio: fractureStyle.branchWidthRatio })),
      ...fracture.twigs.map(points => ({ points, widthRatio: fractureStyle.twigWidthRatio })),
    ];
    for (const path of paths) {
      const shadowWidth = size * stage.shadowWidthScale * path.widthRatio;
      this._stroke(
        this.shadowLayer,
        path.points,
        shadowWidth,
        fractureStyle.shadowColor,
        stage.shadowAlpha,
        fractureStyle.minWidthPx
      );
      this._stroke(
        this.shadowLayer,
        path.points,
        shadowWidth * fractureStyle.coreWidthRatio,
        fractureStyle.coreColor,
        stage.shadowAlpha * fractureStyle.coreAlphaScale,
        fractureStyle.minWidthPx
      );
      const rimWidthRatio = path.widthRatio === 1
        ? 1
        : (path.widthRatio === fractureStyle.branchWidthRatio
          ? rimStyle.branchWidthRatio
          : rimStyle.twigWidthRatio);
      this._stroke(
        this.rimLayer,
        offsetPoints(path.points, rimOffsetX, rimOffsetY),
        size * rimStyle.widthScale * rimWidthRatio,
        rimStyle.color,
        stage.rimAlpha,
        rimStyle.minWidthPx
      );
    }
  }

  _stroke(layer, points, width, color, alpha, minWidth) {
    layer.lineStyle(Math.max(minWidth, width), color, alpha).beginPath();
    layer.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      layer.lineTo(points[index].x, points[index].y);
    }
    layer.strokePath();
  }

  _drawChips(tx, ty, size, stage, fracture) {
    const chip = this.config.layers.chips;
    const salts = this.config.geometry.salts;
    const hash = this.config.hash;
    for (let index = 0; index < stage.chipCount; index += 1) {
      const pathPosition = hashUnit(tx, ty, salts.chipPath + index, hash);
      const pathIndex = Math.min(
        fracture.primary.length - 1,
        Math.floor(pathPosition * fracture.primary.length)
      );
      const point = fracture.primary[pathIndex];
      const normalOffset = (hashUnit(tx, ty, salts.chipNormal + index, hash) - 0.5)
        * size * chip.normalSpreadScale;
      const radius = size * chip.radiusScale * (
        chip.randomSizeMin
        + hashUnit(tx, ty, salts.chipSize + index, hash) * chip.randomSizeRange
      );
      const angle = hashUnit(tx, ty, salts.chipAngle + index, hash) * Math.PI * 2;
      const x = point.x + fracture.normal.x * normalOffset;
      const y = point.y + fracture.normal.y * normalOffset;
      if (hashUnit(tx, ty, salts.chipAngle + stage.chipCount + index, hash) < chip.triangleRatio) {
        this._fillChipTriangle(this.chipLayer, x, y, radius, angle, chip.shadowColor, chip.shadowAlpha);
      } else {
        this.chipLayer.fillStyle(chip.shadowColor, chip.shadowAlpha).fillCircle(x, y, radius);
      }
      this.rimLayer.fillStyle(chip.rimColor, stage.rimAlpha * chip.rimAlpha).fillCircle(
        x - Math.cos(angle) * radius * chip.rimOffsetScale,
        y - Math.sin(angle) * radius * chip.rimOffsetScale,
        radius * chip.rimOffsetScale
      );
    }
  }

  _fillChipTriangle(layer, x, y, radius, angle, color, alpha) {
    layer.fillStyle(color, alpha).fillTriangle(
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius,
      x + Math.cos(angle + this.config.layers.chips.triangleCornerRadians) * radius,
      y + Math.sin(angle + this.config.layers.chips.triangleCornerRadians) * radius,
      x + Math.cos(angle - this.config.layers.chips.triangleCornerRadians) * radius,
      y + Math.sin(angle - this.config.layers.chips.triangleCornerRadians) * radius
    );
  }

  setDepth(depth) {
    this.depth = depth;
    for (const [name, layer] of [
      ["scuff", this.scuffLayer],
      ["shadow", this.shadowLayer],
      ["rim", this.rimLayer],
      ["chips", this.chipLayer],
    ]) {
      layer?.setDepth(depth + this.config.layers.depthOffsets[name]);
    }
  }

  destroy() {
    this.scuffLayer?.destroy();
    this.shadowLayer?.destroy();
    this.rimLayer?.destroy();
    this.chipLayer?.destroy();
    this.scuffLayer = null;
    this.shadowLayer = null;
    this.rimLayer = null;
    this.chipLayer = null;
  }
}
