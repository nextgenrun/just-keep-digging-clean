import { ASSET_KEYS } from "../../values/assetKeys.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  HEAVENBLOCKS_MATERIAL_TILE_TYPES,
  getHeavenblocksRegionAt,
  isHeavenblocksMaterialTileType,
} from "../../values/heavenblocksWorldConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../../values/heavenblocksVisualConfig.js";

const MATERIAL_TYPES = new Set(HEAVENBLOCKS_MATERIAL_TILE_TYPES);
const TERRAIN_TEXTURE_ROLES = Object.freeze([
  "interior",
  "alternate",
  "ore",
  "crystal",
  "surface",
  "edgeLeft",
  "edgeRight",
  "underside",
  "barrier",
  "relicVault",
]);

function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

function hash01(tx, ty, salt = 0) {
  let value = Math.imul(tx + 19, 73856093) ^ Math.imul(ty + 37, 19349663);
  value ^= Math.imul(salt + 11, 83492791);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function isOwnedType(type, tx, ty) {
  if (type === TILE_TYPES.ANCIENT_RELIC_CACHE) {
    return getHeavenblocksRegionAt(tx, ty) !== null;
  }
  return MATERIAL_TYPES.has(type)
    || type === TILE_TYPES.HEAVEN_BARRIER;
}

export class HeavenblocksTerrainRenderer {
  constructor(scene, worldModel, config = HEAVENBLOCKS_VISUAL_CONFIG) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.cells = new Map();
    this.created = false;
    this.nextUpdateAt = 0;
    this.lastSignature = "";
    this.lastBounds = null;
    this.missingTextureKeys = new Set();
  }

  create() {
    this.created = true;
    this._validateTextureKeys();
    this.sync(this._getCameraBounds(), true);
  }

  _validateTextureKeys() {
    const textureExists = this.scene.textures?.exists;
    if (typeof textureExists !== "function") return;
    for (const biome of Object.values(this.config.biomes)) {
      for (const role of TERRAIN_TEXTURE_ROLES) {
        const key = biome.keys[role];
        if (!textureExists.call(this.scene.textures, key)) {
          this.missingTextureKeys.add(key);
        }
      }
    }
    for (const key of ASSET_KEYS.tiles.dynamicSoil.cracks) {
      if (!textureExists.call(this.scene.textures, key)) {
        this.missingTextureKeys.add(key);
      }
    }
  }

  update() {
    if (!this.created) return;
    const now = this.scene.time?.now || performance.now();
    if (now < this.nextUpdateAt) return;
    this.nextUpdateAt = now + this.config.render.updateIntervalMs;
    const bounds = this._getCameraBounds();
    const signature = `${bounds.left}:${bounds.right}:${bounds.top}:${bounds.bottom}`;
    if (signature === this.lastSignature) return;
    this.sync(bounds, false, signature);
  }

  sync(bounds, force = false, suppliedSignature = "") {
    if (!this.created || !bounds) return;
    const desired = new Set();
    for (let ty = bounds.top; ty < bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx < bounds.right; tx += 1) {
        const type = this.worldModel.getTileType(tx, ty);
        if (!isOwnedType(type, tx, ty)) continue;
        const key = tileKey(tx, ty);
        desired.add(key);
        this._syncCell(key, tx, ty, type, force);
      }
    }
    for (const [key, record] of this.cells) {
      if (desired.has(key)) continue;
      this._destroyRecord(record);
      this.cells.delete(key);
    }
    this.lastBounds = bounds;
    this.lastSignature = suppliedSignature
      || `${bounds.left}:${bounds.right}:${bounds.top}:${bounds.bottom}`;
  }

  invalidateCell(tx, ty) {
    if (!this.created) return;
    for (let y = ty - 1; y <= ty + 1; y += 1) {
      for (let x = tx - 1; x <= tx + 1; x += 1) {
        const key = tileKey(x, y);
        const record = this.cells.get(key);
        if (record) {
          this._destroyRecord(record);
          this.cells.delete(key);
        }
      }
    }
    if (this.lastBounds) this.sync(this.lastBounds, false);
  }

  _syncCell(key, tx, ty, type, force) {
    const region = this._resolveRegion(tx, ty, type);
    if (!region) return;
    const biome = this.config.biomes[region.id];
    if (!biome) return;
    const visualName = this._resolveVisualName(tx, ty, type, region);
    const textureKey = biome.keys[visualName];
    if (
      !textureKey
      || (
        typeof this.scene.textures?.exists === "function"
        && !this.scene.textures.exists(textureKey)
      )
    ) {
      if (textureKey) this.missingTextureKeys.add(textureKey);
      return;
    }
    this.missingTextureKeys.delete(textureKey);
    const damageStage = this._resolveDamageStage(tx, ty, type);
    const signature = `${type}:${textureKey}:${damageStage}`;
    const current = this.cells.get(key);
    if (!force && current?.signature === signature) return;
    if (current) this._destroyRecord(current);
    this.cells.set(
      key,
      this._createRecord(tx, ty, type, textureKey, damageStage, signature, biome.tint)
    );
  }

  _createRecord(tx, ty, type, textureKey, damageStage, signature, tint) {
    const size = this.worldModel.tileSize;
    const x = (tx + 0.5) * size;
    const y = (ty + 0.5) * size;
    const isRelic = type === TILE_TYPES.ANCIENT_RELIC_CACHE;
    const isBarrier = type === TILE_TYPES.HEAVEN_BARRIER;
    const displayScale = isRelic
      ? this.config.render.relicDisplayScale
      : isBarrier
        ? this.config.render.barrierDisplayScale
        : this.config.render.tileDisplayScale;
    const depth = isRelic
      ? this.config.render.propDepth
      : isBarrier
        ? this.config.render.barrierDepth
        : this.config.render.tileDepth;
    const image = this.scene.add.image(x, y, textureKey)
      .setDisplaySize(size * displayScale, size * displayScale)
      .setDepth(depth);
    const record = { image, crack: null, aura: null, tween: null, signature };

    if (damageStage >= 0) {
      record.crack = this.scene.add.image(
        x,
        y,
        ASSET_KEYS.tiles.dynamicSoil.cracks[damageStage]
      )
        .setDisplaySize(size, size)
        .setDepth(this.config.render.crackDepth)
        .setAlpha(this.config.render.damageOverlayAlpha);
    }
    if (isRelic || isBarrier) {
      record.aura = this.scene.add.image(x, y, textureKey)
        .setDisplaySize(
          size * (
            isRelic
              ? this.config.render.relicAuraScale
              : this.config.render.barrierAuraScale
          ),
          size * (
            isRelic
              ? this.config.render.relicAuraScale
              : this.config.render.barrierAuraScale
          ),
        )
        .setDepth(depth - 0.01)
        .setTint(tint)
        .setAlpha(isRelic ? 0.24 : 0.18)
        .setBlendMode(Phaser.BlendModes.ADD);
      const auraScaleX = record.aura.scaleX;
      const auraScaleY = record.aura.scaleY;
      record.tween = this.scene.tweens.add({
        targets: record.aura,
        alpha: isRelic ? 0.52 : 0.34,
        scaleX: auraScaleX * (isRelic ? 1.08 : 1.04),
        scaleY: auraScaleY * (isRelic ? 1.08 : 1.04),
        duration: isRelic ? 920 : 1280,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
    return record;
  }

  _resolveRegion(tx, ty, type) {
    const direct = getHeavenblocksRegionAt(tx, ty);
    if (direct) return direct;
    return null;
  }

  _resolveVisualName(tx, ty, type, region) {
    if (type === TILE_TYPES.ANCIENT_RELIC_CACHE) return "relicVault";
    if (type === TILE_TYPES.HEAVEN_BARRIER) return "barrier";
    if (type === region.oreTileType) {
      return hash01(tx, ty, 417) < this.config.render.crystalVariantChance
        ? "crystal"
        : "ore";
    }
    const air = TILE_TYPES.AIR;
    if (this.worldModel.getTileType(tx, ty - 1) === air) return "surface";
    if (this.worldModel.getTileType(tx, ty + 1) === air) return "underside";
    if (this.worldModel.getTileType(tx - 1, ty) === air) return "edgeLeft";
    if (this.worldModel.getTileType(tx + 1, ty) === air) return "edgeRight";
    return hash01(tx, ty, 119) < this.config.render.alternateChance
      ? "alternate"
      : "interior";
  }

  _resolveDamageStage(tx, ty, type) {
    if (!isHeavenblocksMaterialTileType(type)) return -1;
    const hp = this.worldModel.getTileHp(tx, ty);
    const maxHp = this.worldModel.getTileMaxHp(tx, ty, type);
    if (!(maxHp > 0) || !(hp > 0) || hp >= maxHp) return -1;
    return Math.min(4, Math.max(0, Math.floor((1 - hp / maxHp) * 5)));
  }

  _getCameraBounds() {
    const camera = this.scene.cameras.main;
    const view = camera.worldView;
    const size = this.worldModel.tileSize;
    const margin = this.config.render.streamMarginTiles;
    const leftPx = Number.isFinite(view?.x) ? view.x : camera.scrollX;
    const topPx = Number.isFinite(view?.y) ? view.y : camera.scrollY;
    const widthPx = Number.isFinite(view?.width) && view.width > 0
      ? view.width
      : camera.width / (camera.zoom || 1);
    const heightPx = Number.isFinite(view?.height) && view.height > 0
      ? view.height
      : camera.height / (camera.zoom || 1);
    return {
      left: Math.max(0, Math.floor(leftPx / size) - margin),
      right: Math.min(this.worldModel.width, Math.ceil((leftPx + widthPx) / size) + margin),
      top: Math.max(0, Math.floor(topPx / size) - margin),
      bottom: Math.min(this.worldModel.depth, Math.ceil((topPx + heightPx) / size) + margin),
    };
  }

  _destroyRecord(record) {
    record.tween?.remove();
    record.crack?.destroy();
    record.aura?.destroy();
    record.image?.destroy();
  }

  getHealthSnapshot() {
    return {
      created: this.created,
      activeCells: this.cells.size,
      nativeTileRenderer: this.config.nativeTileRenderer === true,
      bakedFacadeRuntime: this.config.bakedFacadeRuntime === true,
      missingTextureKeys: [...this.missingTextureKeys],
      ready: this.created
        && this.config.nativeTileRenderer === true
        && this.config.bakedFacadeRuntime === false
        && this.missingTextureKeys.size === 0,
    };
  }

  destroy() {
    for (const record of this.cells.values()) this._destroyRecord(record);
    this.cells.clear();
    this.created = false;
    this.lastBounds = null;
    this.lastSignature = "";
    this.missingTextureKeys.clear();
  }
}
