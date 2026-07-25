import { ASSET_KEYS } from "../../values/assetKeys.js";
import { RESOURCE_BY_TILE_TYPE } from "../../values/resourceTypes.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { getDamageStage } from "./tileRenderMap.js";

const SPECIAL_MARKER_KEY_BY_TYPE = Object.freeze({
  [TILE_TYPES.TELEPORT_TILE]: "teleport",
  [TILE_TYPES.GAMBLE_TILE]: "gamble",
  [TILE_TYPES.GEM_POWER_BLOCK]: "gemPower",
  [TILE_TYPES.SPEED_BLOCK]: "speed",
  [TILE_TYPES.XP_BLOCK]: "xp",
  [TILE_TYPES.CRIT_BLOCK]: "crit",
  [TILE_TYPES.BERSERK_BLOCK]: "berserk",
  [TILE_TYPES.COMBO_BLOCK]: "combo",
  [TILE_TYPES.LEGEND_BLOCK]: "legend",
  [TILE_TYPES.GEODE_INTERIOR]: "geodeInterior",
  [TILE_TYPES.GEODE_WALL]: "geodeWall",
  [TILE_TYPES.CHEST]: "chest",
  [TILE_TYPES.ANCIENT_RELIC_CACHE]: "ancientRelic",
  [TILE_TYPES.GLOW_CRYSTAL]: "glowCrystal",
});

function cellKey(tx, ty) {
  return `${tx},${ty}`;
}

function markerVariant(tx, ty, type, variants) {
  let hash = Math.imul(tx + 17, 374761393) ^ Math.imul(ty + 31, 668265263) ^ Math.imul(type + 7, 2246822519);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) % variants;
}

export class LevelOneGroundFacadeChunkView {
  constructor(scene, worldModel, config, chunk, chunkIndex, textureKey) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.chunk = chunk;
    this.chunkIndex = chunkIndex;
    this.textureKey = textureKey;
    this.cells = [];
    this.cellByKey = new Map();
  }

  create() {
    this._installFrames();
    const { leftTileX } = this.config.worldSpan;
    const surfaceTileY = this.scene.config.topAirRows;
    const tileSize = this.scene.config.tileSize;
    const overlap = this.config.render.tileOverlapPx;
    for (let localColumn = 0; localColumn < this.chunk.columns; localColumn += 1) {
      const column = this.chunk.startColumn + localColumn;
      for (let row = 0; row < this.config.depthTiles; row += 1) {
        const tx = leftTileX + column;
        const ty = surfaceTileY + row;
        const base = this.scene.add.image(
          tx * tileSize,
          ty * tileSize,
          this.textureKey,
          this._facadeFrameName(column, row)
        )
          .setOrigin(0)
          .setDepth(this.config.render.facadeDepth)
          .setDisplaySize(tileSize + overlap, tileSize + overlap)
          .setVisible(false);
        const cell = {
          tx,
          ty,
          base,
          recognition: null,
          crack: null,
          lastMarkerFrame: null,
          lastCrackStage: null,
        };
        this.cells.push(cell);
        this.cellByKey.set(cellKey(tx, ty), cell);
        this._refreshCell(cell);
      }
    }
    return this.cells;
  }

  _installFrames() {
    const texture = this.scene.textures.get(this.textureKey);
    const sourceSize = this.config.sourceCellPx;
    for (let row = 0; row < this.config.depthTiles; row += 1) {
      for (let localColumn = 0; localColumn < this.chunk.columns; localColumn += 1) {
        const column = this.chunk.startColumn + localColumn;
        const frameName = this._facadeFrameName(column, row);
        if (texture.has(frameName)) continue;
        texture.add(frameName, 0, localColumn * sourceSize, row * sourceSize, sourceSize, sourceSize);
      }
    }
  }

  refreshCell(tx, ty) {
    const cell = this.cellByKey.get(cellKey(tx, ty));
    if (cell) this._refreshCell(cell);
  }

  _refreshCell(cell) {
    const type = this.worldModel.getTileType(cell.tx, cell.ty);
    const visible = type !== TILE_TYPES.AIR;
    cell.base.setVisible(visible);
    if (!visible) {
      cell.recognition?.setVisible(false);
      cell.crack?.setVisible(false);
      return;
    }
    const hp = this.worldModel.getTileHp(cell.tx, cell.ty);
    const maxHp = this.worldModel.getTileMaxHp(cell.tx, cell.ty, type);
    const damageStage = getDamageStage(hp, maxHp);
    const resourceKey = RESOURCE_BY_TILE_TYPE[type];
    const specialKey = SPECIAL_MARKER_KEY_BY_TYPE[type];
    const marker = this.config.resourceMarkers[resourceKey] || this.config.specialMarkers[specialKey];
    cell.base.setAlpha(this.config.damage.baseAlphaByStage[damageStage] ?? 1);
    this._syncRecognition(cell, type, marker, damageStage);
    this._syncCrack(cell, hp, maxHp, damageStage);
  }

  _syncRecognition(cell, type, marker, damageStage) {
    if (!marker) {
      cell.recognition?.setVisible(false);
      cell.lastMarkerFrame = null;
      return;
    }
    const variant = markerVariant(cell.tx, cell.ty, type, marker.variants);
    const frameName = this._recognitionFrameName(marker.frame + variant);
    const tileSize = this.scene.config.tileSize;
    if (!cell.recognition) {
      cell.recognition = this.scene.add.image(
        (cell.tx + 0.5) * tileSize,
        (cell.ty + 0.5) * tileSize,
        ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas,
        frameName
      ).setDepth(this.config.render.recognitionDepth);
    } else if (cell.lastMarkerFrame !== frameName) {
      cell.recognition.setTexture(ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas, frameName);
    }
    const damageAlpha = this.config.damage.recognitionAlphaByStage[damageStage] ?? 1;
    cell.recognition
      .setDisplaySize(tileSize * marker.scale, tileSize * marker.scale)
      .setAlpha(marker.alpha * damageAlpha)
      .setVisible(true);
    cell.lastMarkerFrame = frameName;
  }

  _syncCrack(cell, hp, maxHp, stage) {
    const visible = hp > 0 && hp < maxHp && stage > 0 && stage < 5;
    if (!visible) {
      cell.crack?.setVisible(false);
      cell.lastCrackStage = null;
      return;
    }
    const textureKey = ASSET_KEYS.tiles.dynamicSoil.cracks[stage - 1];
    const tileSize = this.scene.config.tileSize;
    const overlap = this.config.render.tileOverlapPx;
    if (!cell.crack) {
      cell.crack = this.scene.add.image(cell.tx * tileSize, cell.ty * tileSize, textureKey)
        .setOrigin(0)
        .setDepth(this.config.render.crackDepth)
        .setDisplaySize(tileSize + overlap, tileSize + overlap);
    } else if (cell.lastCrackStage !== stage) {
      cell.crack.setTexture(textureKey);
    }
    cell.crack
      .setTint(this.config.damage.crackTint)
      .setAlpha(this.config.damage.crackAlphaByStage[stage] ?? 1)
      .setVisible(true);
    cell.lastCrackStage = stage;
  }

  _facadeFrameName(column, row) {
    return `level1-ground-facade-${column}-${row}`;
  }

  _recognitionFrameName(index) {
    return `level1-ground-recognition-${index}`;
  }

  destroy() {
    for (const cell of this.cells) {
      cell.base.destroy();
      cell.recognition?.destroy();
      cell.crack?.destroy();
    }
    this.cells = [];
    this.cellByKey.clear();
  }
}
