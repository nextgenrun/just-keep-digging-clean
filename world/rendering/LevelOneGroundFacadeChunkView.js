import { ASSET_KEYS } from "../../values/assetKeys.js";
import { RESOURCE_BY_TILE_TYPE } from "../../values/resourceTypes.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { getDamageStage } from "./tileRenderMap.js";
import {
  resolveScenicFacadeMarker,
  scenicMarkerVariant,
} from "./worldScenicFacadeHelpers.js";

function cellKey(tx, ty) {
  return `${tx},${ty}`;
}

export class LevelOneGroundFacadeChunkView {
  constructor(
    scene,
    worldModel,
    config,
    chunk,
    chunkIndex,
    textureKey,
    resourceDepletionProvider = null,
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.chunk = chunk;
    this.chunkIndex = chunkIndex;
    this.textureKey = textureKey;
    this.resourceDepletionProvider = resourceDepletionProvider;
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
    const resourceDepleted = Boolean(
      resourceKey
      && this.resourceDepletionProvider?.({
        tileX: cell.tx,
        tileY: cell.ty,
        tileType: type,
        resourceKey,
      }) === true
    );
    const marker = resourceDepleted ? null : resolveScenicFacadeMarker(
      this.config,
      type,
      resourceKey,
      cell.ty,
      this.worldModel.topAirRows
        ?? this.worldModel.config?.topAirRows
        ?? this.scene.config.topAirRows
        ?? 0
    );
    cell.base.setAlpha(resourceDepleted
      ? 1
      : (this.config.damage.baseAlphaByStage[damageStage] ?? 1));
    this._syncRecognition(cell, type, marker, damageStage);
    this._syncCrack(
      cell,
      resourceDepleted ? maxHp : hp,
      maxHp,
      resourceDepleted ? 5 : damageStage,
    );
  }

  setResourceDepletionProvider(provider) {
    this.resourceDepletionProvider = typeof provider === "function" ? provider : null;
    this.cells.forEach(cell => this._refreshCell(cell));
  }

  _syncRecognition(cell, type, marker, damageStage) {
    if (!marker) {
      cell.recognition?.setVisible(false);
      cell.lastMarkerFrame = null;
      return;
    }
    const variant = scenicMarkerVariant(cell.tx, cell.ty, type, marker.variants);
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
