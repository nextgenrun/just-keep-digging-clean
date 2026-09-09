import { WORLD_MAP_CONFIG } from "../../values/worldMapConfig.js";
import { SCENE_SUSPENSION_KINDS } from "../../values/sceneRuntime.js";
import { resolveWorldMapPlayerTile } from "../../systems/map/resolveWorldMapPlayerTile.js";
import { WorldMapInputController } from "./world-map/WorldMapInputController.js";
import { WorldMapOverlayView } from "./world-map/WorldMapOverlayView.js";
import { WorldMapRenderer } from "./world-map/WorldMapRenderer.js";

/** Coordinates world-map lifecycle, camera state, rendering, and input. */
export class WorldMapOverlay {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.discoverySystem = options.discoverySystem;
    this.activityRegistry = options.activityRegistry;
    this.isOpen = false;
    this._modeToken = null;
    this._destroyed = false;
    this.viewState = {
      zoom: WORLD_MAP_CONFIG.view.defaultZoom,
      centerTileX: scene.worldModel.widthTiles / 2,
      centerTileY: scene.worldModel.depthTiles / 2,
    };
    this.renderer = new WorldMapRenderer(scene, this.discoverySystem, this.activityRegistry);
    this.view = new WorldMapOverlayView(scene, this.activityRegistry, {
      close: () => this.scene.hideWorldMap ? this.scene.hideWorldMap() : this.close(),
      center: () => this.centerOnPlayer(),
      zoomIn: () => this._changeZoom(WORLD_MAP_CONFIG.view.zoomStep),
      zoomOut: () => this._changeZoom(-WORLD_MAP_CONFIG.view.zoomStep),
      render: () => this.render(),
    });
    this.inputController = new WorldMapInputController(scene, {
      isOpen: () => this.isOpen,
      getViewport: () => this.view?.viewport,
      panByPixels: (deltaX, deltaY) => this._panByPixels(deltaX, deltaY),
      changeZoom: (delta, anchor) => this._changeZoom(delta, anchor),
      centerOnPlayer: () => this.centerOnPlayer(),
    });

    this._onResize = this._handleResize.bind(this);
    this._onShutdown = this.destroy.bind(this);
    scene.scale.on("resize", this._onResize);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this._onShutdown);
    this._buildVisuals();
  }

  _buildVisuals() {
    this.inputController?.unbindViewport?.();
    this.view.build(this.isOpen);
    this.inputController.bindViewport(this.view.inputZone);
    if (this.isOpen) this.render();
  }

  _handleResize() {
    this._buildVisuals();
  }

  _panByPixels(deltaX, deltaY) {
    if (!this.isOpen || (!deltaX && !deltaY)) return false;
    const metrics = this.renderer.getMetrics(this.view.viewport, this.viewState);
    this.viewState.centerTileX -= deltaX / metrics.pixelsPerTile;
    this.viewState.centerTileY -= deltaY / metrics.pixelsPerTile;
    this.render();
    return true;
  }

  _changeZoom(delta, anchor = null) {
    const nextZoom = Phaser.Math.Clamp(
      this.viewState.zoom + delta,
      WORLD_MAP_CONFIG.view.minZoom,
      WORLD_MAP_CONFIG.view.maxZoom,
    );
    if (nextZoom === this.viewState.zoom) return false;
    const viewport = this.view.viewport;
    const focusX = Number.isFinite(anchor?.x)
      ? anchor.x
      : viewport.x + viewport.width / 2;
    const focusY = Number.isFinite(anchor?.y)
      ? anchor.y
      : viewport.y + viewport.height / 2;
    this.renderer.zoomAtScreenPoint(
      viewport, this.viewState, nextZoom, focusX, focusY,
    );
    this.render();
    return true;
  }

  centerOnPlayer() {
    const tile = resolveWorldMapPlayerTile(this.scene);
    if (tile) {
      this.viewState.centerTileX = tile.tx;
      this.viewState.centerTileY = tile.ty;
    } else {
      this.viewState.centerTileX = this.scene.worldModel.widthTiles / 2;
      this.viewState.centerTileY = this.scene.worldModel.depthTiles / 2;
    }
    this.render();
    return Boolean(tile);
  }

  centerOnTile(tile) {
    const tileX = Number(tile?.tx ?? tile?.tileX);
    const tileY = Number(tile?.ty ?? tile?.tileY);
    if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) return false;
    this.viewState.centerTileX = tileX;
    this.viewState.centerTileY = tileY;
    this.render();
    return true;
  }

  render() {
    if (!this.view?.root || !this.discoverySystem || !this.activityRegistry) return;
    this.discoverySystem.updatePlayerDiscovery();
    const stats = this.renderer.render(
      this.view.mapGraphics,
      this.view.viewport,
      this.viewState,
    );
    const { pixelsPerTile } = this.renderer.getMetrics(
      this.view.viewport,
      this.viewState,
    );
    const terrainStats = this.view.renderTerrain({
      layout: this.view.viewport,
      viewState: this.viewState,
      model: this.scene.worldModel,
      discoverySystem: this.discoverySystem,
      pixelsPerTile,
      worldToScreen: (tileX, tileY, layout) => (
        this.renderer.worldToScreen(tileX, tileY, layout, this.viewState)
      ),
      biomeFieldEnabled: stats.totalBiomeCount > 0,
    });
    this.view.render({ ...stats, ...terrainStats }, this.viewState);
  }

  open(options = {}) {
    if (this.isOpen || this._destroyed) return false;
    this._modeToken = this.scene.acquireSceneSuspension(
      SCENE_SUSPENSION_KINDS.PAUSE,
      "world-map",
    );
    this.scene.playerController?.setControlsEnabled?.(false);
    this.scene.inputHandler?.setAimBoxVisible?.(false);
    this.discoverySystem.updatePlayerDiscovery(true);
    this.isOpen = true;
    this.view.setVisible(true);
    if (!this.centerOnTile(options.focusTile)) this.centerOnPlayer();
    return true;
  }

  close() {
    if (!this.isOpen) return false;
    this.isOpen = false;
    this.view?.setVisible(false);
    this.inputController?.cancelDrag?.();
    this._modeToken?.release?.();
    this._modeToken = null;
    this.scene.playerController?.setControlsEnabled?.(
      this.scene.sceneModeController.isGameplayActive,
    );
    return true;
  }

  toggle() {
    return this.isOpen ? this.close() : this.open();
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.close();
    this.inputController?.destroy?.();
    this.scene.scale.off("resize", this._onResize);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this._onShutdown);
    this.view?.destroy?.();
    this.inputController = null;
    this.renderer = null;
    this.view = null;
  }
}
