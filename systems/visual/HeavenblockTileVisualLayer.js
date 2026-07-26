import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HEAVENBLOCK_CELL_MARKERS } from "../../values/heavenblocksWorldConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

const cellKey = (tileX, tileY) => `${tileX},${tileY}`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const DAMAGE_KEYS_BY_TYPE = Object.freeze({
  [TILE_TYPES.STONE]: [
    ASSET_KEYS.tiles.stoneHp1,
    ASSET_KEYS.tiles.stoneHp2,
    ASSET_KEYS.tiles.stoneHp3,
    ASSET_KEYS.tiles.stoneHp4,
    ASSET_KEYS.tiles.stoneHp5,
  ],
  [TILE_TYPES.COPPER]: [
    ASSET_KEYS.tiles.copperHp1,
    ASSET_KEYS.tiles.copperHp2,
    ASSET_KEYS.tiles.copperHp3,
    ASSET_KEYS.tiles.copperHp4,
    ASSET_KEYS.tiles.copperHp5,
  ],
  [TILE_TYPES.STEEL]: [
    ASSET_KEYS.tiles.steelHp1,
    ASSET_KEYS.tiles.steelHp2,
    ASSET_KEYS.tiles.steelHp3,
    ASSET_KEYS.tiles.steelHp4,
    ASSET_KEYS.tiles.steelHp5,
  ],
  [TILE_TYPES.SILVER]: [
    ASSET_KEYS.tiles.silverHp1,
    ASSET_KEYS.tiles.silverHp2,
    ASSET_KEYS.tiles.silverHp3,
    ASSET_KEYS.tiles.silverHp4,
    ASSET_KEYS.tiles.silverHp5,
  ],
  [TILE_TYPES.GOLD]: [
    ASSET_KEYS.tiles.goldHp1,
    ASSET_KEYS.tiles.goldHp2,
    ASSET_KEYS.tiles.goldHp3,
    ASSET_KEYS.tiles.goldHp4,
    ASSET_KEYS.tiles.goldHp5,
  ],
  [TILE_TYPES.LAVA_DIRT]: [
    ASSET_KEYS.tiles.lavaDirtHp1,
    ASSET_KEYS.tiles.lavaDirtHp2,
    ASSET_KEYS.tiles.lavaDirtHp3,
    ASSET_KEYS.tiles.lavaDirtHp4,
    ASSET_KEYS.tiles.lavaDirtHp5,
  ],
  [TILE_TYPES.OBSIDIAN]: [
    ASSET_KEYS.tiles.obsidianHp1,
    ASSET_KEYS.tiles.obsidianHp2,
    ASSET_KEYS.tiles.obsidianHp3,
    ASSET_KEYS.tiles.obsidianHp4,
    ASSET_KEYS.tiles.obsidianHp5,
  ],
  [TILE_TYPES.EMBER_ORE]: [
    ASSET_KEYS.tiles.emberOreHp1,
    ASSET_KEYS.tiles.emberOreHp2,
    ASSET_KEYS.tiles.emberOreHp3,
    ASSET_KEYS.tiles.emberOreHp4,
    ASSET_KEYS.tiles.emberOreHp5,
  ],
  [TILE_TYPES.MAGMA_CRYSTAL]: [
    ASSET_KEYS.tiles.magmaCrystalHp1,
    ASSET_KEYS.tiles.magmaCrystalHp2,
    ASSET_KEYS.tiles.magmaCrystalHp3,
    ASSET_KEYS.tiles.magmaCrystalHp4,
    ASSET_KEYS.tiles.magmaCrystalHp5,
  ],
});

const TYPE_KEY_BY_VALUE = Object.freeze(
  Object.fromEntries(Object.entries(TILE_TYPES).map(([key, value]) => [value, key])),
);

const CARDINAL_OFFSETS = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: -1, y: 0 }),
]);

function deterministicIndex(tileX, tileY, length) {
  if (length <= 1) return 0;
  return Math.abs((tileX * 73856093) ^ (tileY * 19349663)) % length;
}

function damageStageIndex(hp, maxHp, stageCount) {
  if (!Number.isFinite(maxHp) || maxHp <= 0) return stageCount - 1;
  return clamp(Math.ceil(clamp(hp / maxHp, 0, 1) * stageCount) - 1, 0, stageCount - 1);
}

export class HeavenblockTileVisualLayer {
  constructor(scene, worldModel, worldConfig) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.worldConfig = worldConfig;
    this.tileCells = new Map();
    this.crackCells = new Map();
  }

  createRegion(region) {
    const tileSize = this.worldModel.tileSize;
    const initialTexture = this._resolveStyleKey(region, "interiorAssetSlots", 0, 0);
    region.layoutRows.forEach((row, localY) => {
      Array.from(row).forEach((marker, localX) => {
        if (marker === HEAVENBLOCK_CELL_MARKERS.AIR) return;
        const tileX = region.leftTile + localX;
        const tileY = region.topTile + localY;
        const image = this.scene.add.image(tileX * tileSize, tileY * tileSize, initialTexture)
          .setOrigin(0)
          .setDepth(this.worldConfig.visual.tileDepth)
          .setDisplaySize(tileSize, tileSize);
        image.name = `${region.id}:native-tile:${localX},${localY}`;
        const entry = {
          image,
          region,
          marker,
          role: "interior",
          textureKey: initialTexture,
          usesDamageTexture: false,
        };
        this.tileCells.set(cellKey(tileX, tileY), entry);

        if (marker !== HEAVENBLOCK_CELL_MARKERS.PROTECTED) {
          const crackKey = ASSET_KEYS.tiles.dynamicSoil.cracks[0];
          const crack = this.scene.add.image(tileX * tileSize, tileY * tileSize, crackKey)
            .setOrigin(0)
            .setDepth(this.worldConfig.visual.crackDepth)
            .setDisplaySize(tileSize, tileSize)
            .setVisible(false);
          this.crackCells.set(cellKey(tileX, tileY), crack);
        }
      });
    });
  }

  _resolveStyleKey(region, slotName, tileX, tileY) {
    const slots = region.tileStyle[slotName];
    const slot = slots[deterministicIndex(tileX, tileY, slots.length)];
    return ASSET_KEYS.tiles[slot];
  }

  _isLiveCell(tileX, tileY) {
    return this.tileCells.has(cellKey(tileX, tileY))
      && this.worldModel.getType(tileX, tileY) !== TILE_TYPES.AIR;
  }

  _getRole(tileX, tileY) {
    if (!this._isLiveCell(tileX, tileY - 1)) return "surface";
    if (!this._isLiveCell(tileX, tileY + 1)) return "underside";
    if (!this._isLiveCell(tileX - 1, tileY) || !this._isLiveCell(tileX + 1, tileY)) {
      return "edge";
    }
    return "interior";
  }

  _resolveAppearance(entry, tileX, tileY, type, hp, maxHp) {
    const role = this._getRole(tileX, tileY);
    const typeKey = TYPE_KEY_BY_VALUE[type] || "";
    const damageKeys = DAMAGE_KEYS_BY_TYPE[type] || null;
    const canStyleTopology = (
      entry.marker !== HEAVENBLOCK_CELL_MARKERS.MATERIAL
      || entry.region.tileStyle.stylizedSurfaceTypeKeys.includes(typeKey)
    );
    const slotName = `${role}AssetSlots`;
    const useStyleTexture = role !== "interior" && canStyleTopology;
    const damageTextureKey = damageKeys?.[
      damageStageIndex(hp, maxHp, damageKeys.length)
    ];
    const textureKey = useStyleTexture
      ? this._resolveStyleKey(entry.region, slotName, tileX, tileY)
      : damageTextureKey || this._resolveStyleKey(
        entry.region,
        "interiorAssetSlots",
        tileX,
        tileY,
      );
    const tint = useStyleTexture
      ? entry.region.tileStyle[`${role}Tint`]
      : entry.region.tileStyle.materialTint;
    return {
      role,
      textureKey,
      tint,
      usesDamageTexture: textureKey === damageTextureKey,
      flipX: role !== "surface" && deterministicIndex(tileX, tileY, 2) === 1,
    };
  }

  syncCell(tileX, tileY) {
    const entry = this.tileCells.get(cellKey(tileX, tileY));
    if (!entry) return;
    const type = this.worldModel.getType(tileX, tileY);
    const visible = type !== TILE_TYPES.AIR;
    entry.image.setVisible(visible);
    const crack = this.crackCells.get(cellKey(tileX, tileY));
    if (!visible) {
      crack?.setVisible(false);
      return;
    }

    const hp = this.worldModel.getHp(tileX, tileY);
    const maxHp = this.worldModel.getTileMaxHp(tileX, tileY, type);
    const appearance = this._resolveAppearance(entry, tileX, tileY, type, hp, maxHp);
    if (this.scene.textures.exists(appearance.textureKey)) {
      entry.image
        .setTexture(appearance.textureKey)
        .setTint(appearance.tint)
        .setFlipX(appearance.flipX);
    }
    Object.assign(entry, appearance);

    if (!crack) return;
    const damageRatio = maxHp > 0 ? clamp(1 - hp / maxHp, 0, 1) : 0;
    const crackKeys = ASSET_KEYS.tiles.dynamicSoil.cracks;
    const crackStage = clamp(
      Math.ceil(damageRatio * crackKeys.length) - 1,
      0,
      crackKeys.length - 1,
    );
    const showCrack = !appearance.usesDamageTexture && damageRatio > 0;
    if (showCrack && this.scene.textures.exists(crackKeys[crackStage])) {
      crack.setTexture(crackKeys[crackStage]).setVisible(true);
    } else {
      crack.setVisible(false);
    }
  }

  invalidateCell(tileX, tileY) {
    for (const offset of CARDINAL_OFFSETS) {
      this.syncCell(tileX + offset.x, tileY + offset.y);
    }
  }

  refreshAll() {
    for (const key of this.tileCells.keys()) {
      const [tileX, tileY] = key.split(",").map(Number);
      this.syncCell(tileX, tileY);
    }
  }

  getRequiredTextureKeys() {
    const keys = new Set(ASSET_KEYS.tiles.dynamicSoil.cracks);
    for (const region of this.worldConfig.regions) {
      for (const slotName of [
        "surfaceAssetSlots",
        "edgeAssetSlots",
        "undersideAssetSlots",
        "interiorAssetSlots",
      ]) {
        for (const slot of region.tileStyle[slotName]) keys.add(ASSET_KEYS.tiles[slot]);
      }
      for (const paletteEntry of region.materialPalette) {
        const type = TILE_TYPES[paletteEntry.tileTypeKey];
        for (const key of DAMAGE_KEYS_BY_TYPE[type] || []) keys.add(key);
      }
    }
    return Array.from(keys);
  }

  getHealthSnapshot() {
    const expectedCells = this.worldConfig.regions.reduce(
      (count, region) => count + region.layoutRows.reduce(
        (rowCount, row) => rowCount + Array.from(row)
          .filter((marker) => marker !== HEAVENBLOCK_CELL_MARKERS.AIR).length,
        0,
      ),
      0,
    );
    const missingTextures = this.getRequiredTextureKeys()
      .filter((key) => !this.scene.textures.exists(key));
    const topologyCounts = {
      surface: 0,
      edge: 0,
      underside: 0,
      interior: 0,
    };
    for (const entry of this.tileCells.values()) {
      topologyCounts[entry.role] += 1;
    }
    return {
      ready: missingTextures.length === 0 && this.tileCells.size === expectedCells,
      expectedCells,
      tileCellCount: this.tileCells.size,
      crackCellCount: this.crackCells.size,
      bakedFacadeCellCount: 0,
      topologyCounts,
      missingTextures,
    };
  }

  destroy() {
    for (const entry of this.tileCells.values()) entry.image.destroy?.();
    for (const crack of this.crackCells.values()) crack.destroy?.();
    this.tileCells.clear();
    this.crackCells.clear();
  }
}

export default HeavenblockTileVisualLayer;
