import { ASSET_KEYS } from "../../values/assetKeys.js";
import { WORLD_MAP_CONFIG } from "../../values/worldMapConfig.js";
import { WorldMapRenderer } from "./world-map/WorldMapRenderer.js";

export class WorldMapOverlay {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.discoverySystem = options.discoverySystem;
    this.activityRegistry = options.activityRegistry;
    this.isOpen = false;
    this.previousGameState = "playing";
    this.dragPointerId = null;
    this.lastPointer = null;
    this.dynamicObjects = [];
    this._destroyed = false;
    this.viewState = {
      zoom: WORLD_MAP_CONFIG.view.defaultZoom,
      centerTileX: scene.worldModel.widthTiles / 2,
      centerTileY: scene.worldModel.depthTiles / 2,
    };
    this.renderer = new WorldMapRenderer(scene, this.discoverySystem, this.activityRegistry);

    this._onWheel = this._handleWheel.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onResize = this._handleResize.bind(this);
    this._onShutdown = this.destroy.bind(this);

    scene.input.on("wheel", this._onWheel);
    scene.input.on("pointerup", this._onPointerUp);
    scene.input.keyboard.on("keydown", this._onKeyDown);
    scene.scale.on("resize", this._onResize);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this._onShutdown);
    this._buildVisuals();
  }

  _rectFromRatio(rect) {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    return {
      x: rect.x * width,
      y: rect.y * height,
      width: rect.width * width,
      height: rect.height * height,
    };
  }

  _addText(x, y, text, style = {}, origin = [0.5, 0.5]) {
    const object = this.scene.add.text(x, y, text, {
      fontFamily: style.fontFamily || "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: style.fontSize || "14px",
      fontStyle: style.fontStyle || "normal",
      color: style.color || WORLD_MAP_CONFIG.colors.body,
      align: style.align || "center",
      lineSpacing: style.lineSpacing || 0,
    }).setOrigin(origin[0], origin[1]).setScrollFactor(0);
    this.root.add(object);
    return object;
  }

  _buildVisuals() {
    const wasVisible = this.isOpen;
    this._destroyVisuals();
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const layout = WORLD_MAP_CONFIG.layout;
    this.viewport = this._rectFromRatio(layout.viewport);

    this.root = this.scene.add.container(0, 0).setDepth(WORLD_MAP_CONFIG.depth).setScrollFactor(0);
    this.root.setVisible(wasVisible);

    const shade = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      WORLD_MAP_CONFIG.colors.shade,
      0.82
    ).setScrollFactor(0).setInteractive();
    this.mapGraphics = this.scene.add.graphics().setScrollFactor(0);
    this.frame = this.scene.add.image(width / 2, height / 2, ASSET_KEYS.ui.worldMapFrame)
      .setDisplaySize(width, height)
      .setScrollFactor(0);
    this.root.add([shade, this.mapGraphics, this.frame]);

    this.maskShape = this.scene.make.graphics({ add: false }).setScrollFactor(0);
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(
      this.viewport.x,
      this.viewport.y,
      this.viewport.width,
      this.viewport.height
    );
    this.mapMask = this.maskShape.createGeometryMask();
    this.mapGraphics.setMask(this.mapMask);

    this.titleText = this._addText(
      width / 2,
      layout.titleY * height,
      WORLD_MAP_CONFIG.copy.title,
      { fontSize: `${Math.max(22, Math.round(height * 0.046))}px`, fontStyle: "bold", color: WORLD_MAP_CONFIG.colors.title }
    );

    this.closeText = this._addText(
      layout.closeX * width,
      layout.closeY * height,
      "X",
      { fontSize: `${Math.max(24, Math.round(height * 0.042))}px`, fontStyle: "bold", color: WORLD_MAP_CONFIG.colors.title }
    ).setInteractive({ useHandCursor: true });
    this.closeText.on("pointerdown", () => this.close());

    this.discoveryText = this._addText(
      0.874 * width,
      0.145 * height,
      "",
      { fontSize: `${Math.max(15, Math.round(height * 0.025))}px`, fontStyle: "bold", color: WORLD_MAP_CONFIG.colors.title }
    );
    this.activityHeader = this._addText(
      0.874 * width,
      0.285 * height,
      WORLD_MAP_CONFIG.copy.activityLayers,
      { fontSize: `${Math.max(13, Math.round(height * 0.02))}px`, fontStyle: "bold", color: WORLD_MAP_CONFIG.colors.title }
    );
    this.worldStatusText = this._addText(
      0.874 * width,
      0.655 * height,
      "",
      { fontFamily: "Consolas, monospace", fontSize: `${Math.max(11, Math.round(height * 0.017))}px`, color: WORLD_MAP_CONFIG.colors.body, lineSpacing: 7 }
    );

    this.depthTexts = [];
    const depthPanel = this._rectFromRatio(layout.depthPanel);
    for (let index = 0; index < 5; index += 1) {
      this.depthTexts.push(this._addText(
        depthPanel.x + depthPanel.width * 0.58,
        depthPanel.y + depthPanel.height * (0.08 + index * 0.21),
        "",
        { fontFamily: "Consolas, monospace", fontSize: `${Math.max(10, Math.round(height * 0.015))}px`, color: WORLD_MAP_CONFIG.colors.body }
      ));
    }

    const footerStyle = {
      fontFamily: "Consolas, monospace",
      fontSize: `${Math.max(10, Math.round(height * 0.016))}px`,
      color: WORLD_MAP_CONFIG.colors.body,
    };
    const footerY = layout.footerY * height;
    this._addText(0.29 * width, footerY, WORLD_MAP_CONFIG.copy.dragPan, footerStyle);
    this._addText(0.45 * width, footerY, WORLD_MAP_CONFIG.copy.wheelZoom, footerStyle);
    this._addText(0.61 * width, footerY, WORLD_MAP_CONFIG.copy.center, footerStyle);
    this._addText(0.73 * width, footerY, WORLD_MAP_CONFIG.copy.close, footerStyle);

    const zoomRect = this._rectFromRatio(layout.zoomControl);
    this.zoomInText = this._addText(
      zoomRect.x + zoomRect.width / 2,
      zoomRect.y + 24,
      "+",
      { fontSize: `${Math.max(22, Math.round(height * 0.036))}px`, fontStyle: "bold", color: WORLD_MAP_CONFIG.colors.title }
    ).setInteractive({ useHandCursor: true });
    this.zoomOutText = this._addText(
      zoomRect.x + zoomRect.width / 2,
      zoomRect.y + zoomRect.height - 24,
      "-",
      { fontSize: `${Math.max(22, Math.round(height * 0.036))}px`, fontStyle: "bold", color: WORLD_MAP_CONFIG.colors.title }
    ).setInteractive({ useHandCursor: true });
    this.zoomInText.on("pointerdown", () => this._changeZoom(WORLD_MAP_CONFIG.view.zoomStep));
    this.zoomOutText.on("pointerdown", () => this._changeZoom(-WORLD_MAP_CONFIG.view.zoomStep));

    this.inputZone = this.scene.add.zone(
      this.viewport.x + this.viewport.width / 2,
      this.viewport.y + this.viewport.height / 2,
      this.viewport.width,
      this.viewport.height
    ).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.root.add(this.inputZone);
    this.inputZone.on("pointerdown", pointer => {
      if (!this.isOpen) return;
      this.dragPointerId = pointer.id;
      this.lastPointer = { x: pointer.x, y: pointer.y };
    });
    this.inputZone.on("pointermove", pointer => this._handlePointerMove(pointer));
    if (wasVisible) this.render();
  }

  _destroyVisuals() {
    this.dynamicObjects.forEach(object => object?.destroy?.());
    this.dynamicObjects.length = 0;
    this.mapGraphics?.clearMask?.(true);
    this.mapMask?.destroy?.();
    this.maskShape?.destroy?.();
    this.root?.destroy?.(true);
    this.root = null;
  }

  _handleResize() {
    this._buildVisuals();
  }

  _handlePointerMove(pointer) {
    if (!this.isOpen || pointer.id !== this.dragPointerId || !this.lastPointer) return;
    const deltaX = pointer.x - this.lastPointer.x;
    const deltaY = pointer.y - this.lastPointer.y;
    const metrics = this.renderer.getMetrics(this.viewport, this.viewState);
    this.viewState.centerTileX -= deltaX / metrics.pixelsPerTile;
    this.viewState.centerTileY -= deltaY / metrics.pixelsPerTile;
    this.lastPointer = { x: pointer.x, y: pointer.y };
    this.render();
  }

  _handlePointerUp(pointer) {
    if (pointer.id !== this.dragPointerId) return;
    this.dragPointerId = null;
    this.lastPointer = null;
  }

  _handleWheel(pointer, _objects, _deltaX, deltaY) {
    if (!this.isOpen) return;
    if (
      pointer.x < this.viewport.x
      || pointer.y < this.viewport.y
      || pointer.x > this.viewport.x + this.viewport.width
      || pointer.y > this.viewport.y + this.viewport.height
    ) {
      return;
    }
    this._changeZoom(deltaY > 0 ? -WORLD_MAP_CONFIG.view.zoomStep : WORLD_MAP_CONFIG.view.zoomStep);
  }

  _handleKeyDown(event) {
    if (!this.isOpen) return;
    if (event.code === "KeyF") {
      event.preventDefault();
      this.centerOnPlayer();
      return;
    }
    if (event.code === "Equal" || event.code === "NumpadAdd") {
      this._changeZoom(WORLD_MAP_CONFIG.view.zoomStep);
      return;
    }
    if (event.code === "Minus" || event.code === "NumpadSubtract") {
      this._changeZoom(-WORLD_MAP_CONFIG.view.zoomStep);
      return;
    }
    const panTiles = 12 / this.viewState.zoom;
    if (event.code === "ArrowLeft") this.viewState.centerTileX -= panTiles;
    else if (event.code === "ArrowRight") this.viewState.centerTileX += panTiles;
    else if (event.code === "ArrowUp") this.viewState.centerTileY -= panTiles;
    else if (event.code === "ArrowDown") this.viewState.centerTileY += panTiles;
    else return;
    event.preventDefault();
    this.render();
  }

  _changeZoom(delta) {
    this.viewState.zoom = Phaser.Math.Clamp(
      this.viewState.zoom + delta,
      WORLD_MAP_CONFIG.view.minZoom,
      WORLD_MAP_CONFIG.view.maxZoom
    );
    this.render();
  }

  centerOnPlayer() {
    const player = this.scene.player || this.scene.playerController?.sprite;
    if (player) {
      const tile = this.scene.worldModel.worldToTile(player.x, player.y);
      this.viewState.centerTileX = tile.tx;
      this.viewState.centerTileY = tile.ty;
    } else {
      this.viewState.centerTileX = this.scene.worldModel.widthTiles / 2;
      this.viewState.centerTileY = this.scene.worldModel.depthTiles / 2;
    }
    this.render();
  }

  _renderActivityRows() {
    this.dynamicObjects.forEach(object => object?.destroy?.());
    this.dynamicObjects.length = 0;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const providers = this.activityRegistry.getProviders();
    const startY = 0.325 * height;

    if (!providers.length) {
      const empty = this._addText(
        0.874 * width,
        startY,
        `${WORLD_MAP_CONFIG.copy.noActivityLayers}\n${WORLD_MAP_CONFIG.copy.noActivityHint}`,
        { fontFamily: "Consolas, monospace", fontSize: `${Math.max(10, Math.round(height * 0.014))}px`, color: WORLD_MAP_CONFIG.colors.hint, lineSpacing: 6 }
      );
      this.dynamicObjects.push(empty);
      return;
    }

    providers.slice(0, 7).forEach((provider, index) => {
      const row = this._addText(
        0.79 * width,
        startY + index * Math.max(25, height * 0.038),
        `${provider.visible ? "[ON]" : "[OFF]"} ${provider.label || provider.id.toUpperCase()}`,
        {
          fontFamily: "Consolas, monospace",
          fontSize: `${Math.max(10, Math.round(height * 0.015))}px`,
          color: provider.visible ? WORLD_MAP_CONFIG.colors.active : WORLD_MAP_CONFIG.colors.inactive,
          align: "left",
        },
        [0, 0.5]
      ).setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.activityRegistry.toggle(provider.id);
        this.render();
      });
      this.dynamicObjects.push(row);
    });
  }

  render() {
    if (!this.root || !this.discoverySystem || !this.activityRegistry) return;
    this.discoverySystem.updatePlayerDiscovery();
    const stats = this.renderer.render(this.mapGraphics, this.viewport, this.viewState);
    this.discoveryText.setText(
      `${WORLD_MAP_CONFIG.copy.discovered}\n${Math.round(stats.discoveryRatio * 100)}%`
    );
    this.worldStatusText.setText(
      `${WORLD_MAP_CONFIG.copy.worldStatus}\n\n`
      + `${stats.widthTiles} x ${stats.depthTiles} TILES\n`
      + `DEPTH ${stats.currentDepth}m / ${stats.maxDepth}m\n`
      + `ZOOM ${this.viewState.zoom.toFixed(2)}x\n`
      + `ACTIVE MARKERS ${stats.markerCount}`
    );
    this.depthTexts.forEach((text, index) => {
      text.setText(`${Math.round(stats.maxDepth * (index / 4))}m`);
    });
    this._renderActivityRows();
  }

  open() {
    if (this.isOpen || this._destroyed) return false;
    this.previousGameState = this.scene.gameState || "playing";
    this.scene.gameState = "paused";
    this.scene.playerController?.setControlsEnabled?.(false);
    this.scene.inputHandler?.setAimBoxVisible?.(false);
    this.discoverySystem.updatePlayerDiscovery(true);
    this.isOpen = true;
    this.root.setVisible(true);
    this.centerOnPlayer();
    return true;
  }

  close() {
    if (!this.isOpen) return false;
    this.isOpen = false;
    this.root?.setVisible(false);
    this.dragPointerId = null;
    this.lastPointer = null;
    this.scene.gameState = this.previousGameState || "playing";
    if (this.scene.gameState === "playing") {
      this.scene.playerController?.setControlsEnabled?.(true);
    }
    return true;
  }

  toggle() {
    return this.isOpen ? this.close() : this.open();
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.close();
    this.scene.input.off("wheel", this._onWheel);
    this.scene.input.off("pointerup", this._onPointerUp);
    this.scene.input.keyboard.off("keydown", this._onKeyDown);
    this.scene.scale.off("resize", this._onResize);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this._onShutdown);
    this._destroyVisuals();
    this.renderer = null;
  }
}
