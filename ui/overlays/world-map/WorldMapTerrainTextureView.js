import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";

function modelWidth(model) {
  return Math.max(0, Number(model?.widthTiles ?? model?.width) || 0);
}

function modelDepth(model) {
  return Math.max(0, Number(model?.depthTiles ?? model?.depth) || 0);
}

function modelTileSize(model) {
  return Math.max(1, Number(model?.tileSize ?? model?.config?.tileSize) || 1);
}

export function isWorldMapTerrainDetailActive(
  layout,
  pixelsPerTile,
  config = WORLD_MAP_CONFIG,
) {
  const detail = config.terrainDetail;
  if (!detail?.enabled || pixelsPerTile < detail.minimumPixelsPerTile) return false;
  const columns = Math.ceil(layout.width / pixelsPerTile) + detail.sampleMarginTiles * 2;
  const rows = Math.ceil(layout.height / pixelsPerTile) + detail.sampleMarginTiles * 2;
  return columns * rows <= detail.maximumVisibleTiles;
}

export function resolveWorldMapTerrainWindow(
  layout,
  viewState,
  model,
  pixelsPerTile,
  config = WORLD_MAP_CONFIG,
) {
  const margin = config.terrainDetail.sampleMarginTiles;
  const halfWidthTiles = layout.width / Math.max(1, pixelsPerTile) * 0.5;
  const halfHeightTiles = layout.height / Math.max(1, pixelsPerTile) * 0.5;
  const left = Math.max(0, Math.floor(viewState.centerTileX - halfWidthTiles) - margin);
  const right = Math.min(
    modelWidth(model),
    Math.ceil(viewState.centerTileX + halfWidthTiles) + margin,
  );
  const top = Math.max(0, Math.floor(viewState.centerTileY - halfHeightTiles) - margin);
  const bottom = Math.min(
    modelDepth(model),
    Math.ceil(viewState.centerTileY + halfHeightTiles) + margin,
  );
  return { left, right, top, bottom, tileCount: (right - left) * (bottom - top) };
}

/** Maps the map viewport onto the exact world coordinate space used by gameplay. */
export function resolveWorldMapMirrorTransform(
  layout,
  viewState,
  model,
  pixelsPerTile,
) {
  const tileSize = modelTileSize(model);
  const halfWidthTiles = layout.width / Math.max(1, pixelsPerTile) * 0.5;
  const halfHeightTiles = layout.height / Math.max(1, pixelsPerTile) * 0.5;
  return {
    scrollX: (viewState.centerTileX - halfWidthTiles) * tileSize,
    scrollY: (viewState.centerTileY - halfHeightTiles) * tileSize,
    zoom: pixelsPerTile / tileSize,
    tileSize,
  };
}

/** Keeps screen-space HUD and modal objects out of the live world mirror. */
export function shouldMirrorWorldMapObject(
  object,
  config = WORLD_MAP_CONFIG,
) {
  if (!object || object.active === false || object.visible === false) return false;
  if ((Number(object.alpha) || 0) <= 0) return false;
  if ((Number(object.depth) || 0) > config.terrainDetail.maximumWorldRenderDepth) {
    return false;
  }
  const xFactor = Number(object.scrollFactorX ?? 1);
  const yFactor = Number(object.scrollFactorY ?? 1);
  const epsilon = config.terrainDetail.worldScrollFactorEpsilon;
  return Math.abs(xFactor) > epsilon || Math.abs(yFactor) > epsilon;
}

/** Mirrors the already-composed gameplay world instead of rebuilding legacy tiles. */
export class WorldMapTerrainTextureView {
  constructor(scene, config = WORLD_MAP_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.renderTexture = null;
    this.discoveryEraseGraphics = null;
    this.renderGroup = {
      list: [],
      getChildren() {
        return this.list;
      },
    };
  }

  create(layout) {
    const width = Math.max(1, Math.ceil(layout.width));
    const height = Math.max(1, Math.ceil(layout.height));
    this.renderTexture = this.scene.add.renderTexture(
      layout.x,
      layout.y,
      width,
      height,
      false,
    ).setOrigin(0, 0)
      .setDisplaySize(layout.width, layout.height)
      .setScrollFactor(0)
      .setAlpha(this.config.terrainDetail.textureAlpha)
      .setVisible(false);
    this.discoveryEraseGraphics = this.scene.make.graphics({ add: false });
    return this.renderTexture;
  }

  setMask(mask) {
    this.renderTexture?.setMask?.(mask);
  }

  _hide() {
    this.renderTexture?.setVisible?.(false);
    return {
      terrainTextureActive: false,
      terrainTextureTileCount: 0,
      terrainTextureMissingLayers: 0,
      terrainTextureObjectCount: 0,
    };
  }

  _prepareDiscoveryErase(window, discoverySystem, tileSize) {
    const graphics = this.discoveryEraseGraphics;
    const overlap = this.config.terrainDetail.discoveryEraseOverlapWorldPx;
    let discoveredTiles = 0;
    let hiddenTiles = 0;
    graphics.clear().fillStyle(0xffffff, 1);
    for (let tileY = window.top; tileY < window.bottom; tileY += 1) {
      for (let tileX = window.left; tileX < window.right; tileX += 1) {
        if (discoverySystem.isTileDiscovered(tileX, tileY)) {
          discoveredTiles += 1;
          continue;
        }
        hiddenTiles += 1;
        graphics.fillRect(
          tileX * tileSize,
          tileY * tileSize,
          tileSize + overlap,
          tileSize + overlap,
        );
      }
    }
    return { discoveredTiles, hiddenTiles };
  }

  _liveWorldObjects() {
    const displayList = this.scene.children;
    displayList?.depthSort?.();
    return (displayList?.getChildren?.() || []).filter(object => (
      object !== this.renderTexture
      && shouldMirrorWorldMapObject(object, this.config)
    ));
  }

  render({ layout, viewState, model, discoverySystem, pixelsPerTile }) {
    if (!this.renderTexture || !this.discoveryEraseGraphics) return this._hide();
    if (!isWorldMapTerrainDetailActive(layout, pixelsPerTile, this.config)) {
      return this._hide();
    }
    const window = resolveWorldMapTerrainWindow(
      layout, viewState, model, pixelsPerTile, this.config,
    );
    if (window.tileCount > this.config.terrainDetail.maximumVisibleTiles) {
      return this._hide();
    }

    const transform = resolveWorldMapMirrorTransform(
      layout, viewState, model, pixelsPerTile,
    );
    const discovery = this._prepareDiscoveryErase(
      window, discoverySystem, transform.tileSize,
    );
    if (discovery.discoveredTiles <= 0) return this._hide();

    const worldObjects = this._liveWorldObjects();
    if (!worldObjects.length) return this._hide();
    this.renderGroup.list = worldObjects;
    this.renderTexture.camera
      .setScroll(transform.scrollX, transform.scrollY)
      .setZoom(transform.zoom)
      .setRoundPixels(false);
    this.renderTexture.clear().draw(this.renderGroup);
    if (discovery.hiddenTiles > 0) {
      this.renderTexture.erase(this.discoveryEraseGraphics);
    }
    this.renderTexture.setVisible(true);
    return {
      terrainTextureActive: true,
      terrainTextureTileCount: discovery.discoveredTiles,
      terrainTextureMissingLayers: 0,
      terrainTextureObjectCount: worldObjects.length,
    };
  }

  destroy() {
    this.renderTexture?.clearMask?.();
    this.renderTexture?.destroy?.();
    this.discoveryEraseGraphics?.destroy?.();
    this.renderGroup.list = [];
    this.renderTexture = null;
    this.discoveryEraseGraphics = null;
  }
}
