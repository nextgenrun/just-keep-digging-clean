import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  LEVEL_ONE_GROUND_FACADE,
  resolveLevelOneGroundFacadeEnabled,
} from "../../values/levelOneGroundFacade.js";
import { LevelOneGroundFacadeChunkView } from "./LevelOneGroundFacadeChunkView.js";

function assertRequiredMarkerFrames(config, frameCount) {
  for (const group of [config.resourceMarkers, config.specialMarkers]) {
    for (const [name, marker] of Object.entries(group)) {
      const lastFrame = marker.frame + marker.variants - 1;
      if (marker.frame < 0 || lastFrame >= frameCount) {
        throw new Error(`[LevelOneGroundFacadeSystem] Required marker '${name}' needs frame ${marker.frame}..${lastFrame}; atlas only has ${frameCount} frames`);
      }
    }
  }
}

export class LevelOneGroundFacadeSystem {
  constructor(scene, worldModel, config = LEVEL_ONE_GROUND_FACADE) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.activeChunks = new Map();
    this.cellByKey = new Map();
    this.desiredChunkIndices = new Set();
    this.desiredSignature = "";
    this.loadInFlight = null;
    this.loadFailure = null;
    this.enabled = false;
  }

  get cells() {
    return Array.from(this.cellByKey.values());
  }

  create() {
    this.enabled = resolveLevelOneGroundFacadeEnabled(this.config);
    if (!this.enabled) {
      console.info("[LevelOneGroundFacadeSystem] Disabled; legacy town facade remains available");
      return false;
    }
    const atlasKey = ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas;
    if (!this.scene.textures.exists(atlasKey)) {
      throw new Error(`[LevelOneGroundFacadeSystem] Missing required texture: ${atlasKey}`);
    }
    this._installRecognitionFrames();
    this._syncStreaming(true);
    console.info("[LevelOneGroundFacadeSystem] Camera-streamed 280x10 facade active; use ?level1Facade=0 to roll back");
    return true;
  }

  _installRecognitionFrames() {
    const atlasConfig = this.config.recognitionAtlas;
    const atlasKey = ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas;
    const atlas = this.scene.textures.get(atlasKey);
    const source = atlas.getSourceImage?.();
    const frameCount = Math.min(
      atlasConfig.frameCount,
      Math.floor(source.width / atlasConfig.frameSizePx) * Math.floor(source.height / atlasConfig.frameSizePx)
    );
    assertRequiredMarkerFrames(this.config, frameCount);
    for (let index = 0; index < frameCount; index += 1) {
      const frameName = `level1-ground-recognition-${index}`;
      if (atlas.has(frameName)) continue;
      atlas.add(
        frameName,
        0,
        index % atlasConfig.columns * atlasConfig.frameSizePx,
        Math.floor(index / atlasConfig.columns) * atlasConfig.frameSizePx,
        atlasConfig.frameSizePx,
        atlasConfig.frameSizePx
      );
    }
  }

  update() {
    if (!this.enabled) return;
    if (this.loadFailure) throw this.loadFailure;
    this._syncStreaming();
  }

  invalidateCell(tx, ty) {
    if (!this.enabled) return;
    const chunkIndex = this._chunkIndexForTile(tx);
    this.activeChunks.get(chunkIndex)?.refreshCell(tx, ty);
  }

  _syncStreaming(force = false) {
    if (!this.enabled || this.loadFailure) return;
    const desired = this._resolveDesiredChunks();
    const signature = [...desired].join(",");
    if (!force && signature === this.desiredSignature) return;
    this.desiredSignature = signature;
    this.desiredChunkIndices = desired;

    for (const chunkIndex of [...this.activeChunks.keys()]) {
      if (!desired.has(chunkIndex)) this._deactivateChunk(chunkIndex);
    }
    for (const chunkIndex of desired) {
      const textureKey = ASSET_KEYS.background.levelOneGroundFacade.chunks[chunkIndex];
      if (this.scene.textures.exists(textureKey)) this._activateChunk(chunkIndex);
    }
    this._loadMissingDesiredChunks();
  }

  _resolveDesiredChunks() {
    const streaming = this.config.streaming;
    if (!this.scene.player) return new Set([streaming.preloadChunkIndex]);
    const tileSize = this.scene.config.tileSize;
    const surfaceTop = this.scene.config.topAirRows * tileSize;
    const surfaceBottom = (this.scene.config.topAirRows + this.config.depthTiles) * tileSize;
    const cameraView = this.scene.cameras?.main?.worldView;
    const viewTop = cameraView?.y ?? 0;
    const viewBottom = viewTop + (cameraView?.height ?? 0);
    const verticalMargin = streaming.verticalMarginTiles * tileSize;
    const cameraNear = viewBottom >= surfaceTop - verticalMargin && viewTop <= surfaceBottom + verticalMargin;
    const playerMargin = streaming.playerSurfaceMarginTiles * tileSize;
    const playerNear = this.scene.player.y >= surfaceTop - playerMargin
      && this.scene.player.y <= surfaceBottom + playerMargin;
    if (!cameraNear && !playerNear) return new Set();

    const centerX = cameraNear
      ? (cameraView?.centerX ?? ((cameraView?.x ?? 0) + (cameraView?.width ?? 0) / 2))
      : this.scene.player.x;
    const tileX = Math.floor(centerX / tileSize);
    const centerIndex = this._chunkIndexForTile(tileX);
    if (centerIndex < 0) return new Set();
    const desired = new Set();
    for (let offset = -streaming.horizontalMarginChunks; offset <= streaming.horizontalMarginChunks; offset += 1) {
      const chunkIndex = centerIndex + offset;
      if (chunkIndex >= 0 && chunkIndex < this.config.chunks.length) desired.add(chunkIndex);
    }
    return desired;
  }

  _chunkIndexForTile(tx) {
    const column = tx - this.config.worldSpan.leftTileX;
    return this.config.chunks.findIndex(chunk => (
      column >= chunk.startColumn && column < chunk.startColumn + chunk.columns
    ));
  }

  _activateChunk(chunkIndex) {
    if (this.activeChunks.has(chunkIndex)) return;
    const chunk = this.config.chunks[chunkIndex];
    const textureKey = ASSET_KEYS.background.levelOneGroundFacade.chunks[chunkIndex];
    const view = new LevelOneGroundFacadeChunkView(
      this.scene,
      this.worldModel,
      this.config,
      chunk,
      chunkIndex,
      textureKey
    );
    for (const cell of view.create()) this.cellByKey.set(`${cell.tx},${cell.ty}`, cell);
    this.activeChunks.set(chunkIndex, view);
  }

  _deactivateChunk(chunkIndex) {
    const view = this.activeChunks.get(chunkIndex);
    if (view) {
      for (const cell of view.cells) this.cellByKey.delete(`${cell.tx},${cell.ty}`);
      view.destroy();
      this.activeChunks.delete(chunkIndex);
    }
    const textureKey = ASSET_KEYS.background.levelOneGroundFacade.chunks[chunkIndex];
    if (this.scene.textures.exists(textureKey)) this.scene.textures.remove(textureKey);
  }

  _loadMissingDesiredChunks() {
    const loader = this.scene.load;
    if (this.loadInFlight || !loader || loader.isLoading?.()) return;
    const missing = [...this.desiredChunkIndices].filter((chunkIndex) => {
      const key = ASSET_KEYS.background.levelOneGroundFacade.chunks[chunkIndex];
      return !this.scene.textures.exists(key);
    });
    if (missing.length === 0) return;
    this.loadInFlight = new Set(missing);
    const requestedKeys = new Set(missing.map(index => ASSET_KEYS.background.levelOneGroundFacade.chunks[index]));
    const onLoadError = (file) => {
      if (!requestedKeys.has(file?.key)) return;
      this.loadFailure = new Error(`[LevelOneGroundFacadeSystem] Failed to load required facade chunk: ${file.key}`);
    };
    const onComplete = () => {
      loader.off?.("loaderror", onLoadError);
      const completed = this.loadInFlight || new Set();
      this.loadInFlight = null;
      if (!this.enabled || this.loadFailure) {
        for (const index of completed) this._removeChunkTexture(index);
        return;
      }
      const latestDesired = this._resolveDesiredChunks();
      for (const index of completed) {
        if (!latestDesired.has(index)) this._removeChunkTexture(index);
      }
      this._syncStreaming(true);
    };
    loader.on?.("loaderror", onLoadError);
    loader.once("complete", onComplete);
    for (const chunkIndex of missing) {
      loader.image(
        ASSET_KEYS.background.levelOneGroundFacade.chunks[chunkIndex],
        this.config.chunks[chunkIndex].assetPath
      );
    }
    loader.start();
  }

  _removeChunkTexture(chunkIndex) {
    const textureKey = ASSET_KEYS.background.levelOneGroundFacade.chunks[chunkIndex];
    if (this.scene.textures.exists(textureKey)) this.scene.textures.remove(textureKey);
  }

  destroy() {
    this.enabled = false;
    for (const chunkIndex of [...this.activeChunks.keys()]) this._deactivateChunk(chunkIndex);
    this.activeChunks.clear();
    this.cellByKey.clear();
    this.desiredChunkIndices.clear();
  }
}
