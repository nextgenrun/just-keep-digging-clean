import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";
import { WorldMapTextButton } from "./WorldMapTextButton.js";

/** Builds and updates the authored world-map frame, labels, and mouse controls. */
export class WorldMapOverlayView {
  constructor(scene, activityRegistry, callbacks) {
    this.scene = scene;
    this.activityRegistry = activityRegistry;
    this.callbacks = callbacks;
    this.dynamicObjects = [];
    this.staticButtons = [];
    this.activitySignature = "";
    this.root = null;
  }

  _rectFromRatio(rect) {
    const { width, height } = this.scene.scale;
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

  _addButton(label, options) {
    const button = new WorldMapTextButton(this.scene, this.root, label, options);
    this.staticButtons.push(button);
    return button;
  }

  build(visible = false) {
    this.destroy();
    const { width, height } = this.scene.scale;
    const { layout, colors, copy, input } = WORLD_MAP_CONFIG;
    this.viewport = this._rectFromRatio(layout.viewport);
    this.root = this.scene.add.container(0, 0)
      .setDepth(WORLD_MAP_CONFIG.depth).setScrollFactor(0).setVisible(visible);

    const shade = this.scene.add.rectangle(width / 2, height / 2, width, height, colors.shade, 0.82)
      .setScrollFactor(0).setInteractive();
    this.mapGraphics = this.scene.add.graphics().setScrollFactor(0);
    this.frame = this.scene.add.image(width / 2, height / 2, ASSET_KEYS.ui.worldMapFrame)
      .setDisplaySize(width, height).setScrollFactor(0);
    this.root.add([shade, this.mapGraphics, this.frame]);
    this._buildMask();
    this._buildViewportInput();

    this._addText(width / 2, layout.titleY * height, copy.title, {
      fontSize: `${Math.max(22, Math.round(height * 0.046))}px`,
      fontStyle: "bold",
      color: colors.title,
    });
    const closeText = this._addText(layout.closeX * width, layout.closeY * height, "X", {
      fontSize: `${Math.max(24, Math.round(height * 0.042))}px`,
      fontStyle: "bold",
      color: colors.title,
    });
    this._addButton(closeText, {
      x: closeText.x, y: closeText.y,
      width: input.closeHitSizePx, height: input.closeHitSizePx,
      baseColor: colors.title, activate: this.callbacks.close,
    });

    this._buildStatusPanels(width, height);
    this._buildFooter(width, height);
    this._buildZoomControls(height);
  }

  _buildMask() {
    this.maskShape = this.scene.make.graphics({ add: false }).setScrollFactor(0);
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(
      this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height,
    );
    this.mapMask = this.maskShape.createGeometryMask();
    this.mapGraphics.setMask(this.mapMask);
  }

  _buildViewportInput() {
    const input = WORLD_MAP_CONFIG.input;
    this.inputZone = this.scene.add.zone(
      this.viewport.x + this.viewport.width / 2,
      this.viewport.y + this.viewport.height / 2,
      this.viewport.width,
      this.viewport.height,
    ).setOrigin(0.5).setScrollFactor(0).setInteractive({ cursor: input.idleCursor });
    this.inputZone.input?.hitArea?.setTo?.(
      0, 0, this.viewport.width, this.viewport.height,
    );
    this.root.add(this.inputZone);
  }

  _buildStatusPanels(width, height) {
    const { colors, copy, layout } = WORLD_MAP_CONFIG;
    this.discoveryText = this._addText(0.874 * width, 0.145 * height, "", {
      fontSize: `${Math.max(15, Math.round(height * 0.025))}px`,
      fontStyle: "bold", color: colors.title,
    });
    this._addText(0.874 * width, 0.285 * height, copy.activityLayers, {
      fontSize: `${Math.max(13, Math.round(height * 0.02))}px`,
      fontStyle: "bold", color: colors.title,
    });
    this.worldStatusText = this._addText(0.874 * width, 0.655 * height, "", {
      fontFamily: "Consolas, monospace",
      fontSize: `${Math.max(11, Math.round(height * 0.017))}px`,
      color: colors.body, lineSpacing: 7,
    });
    this.depthTexts = [];
    const depthPanel = this._rectFromRatio(layout.depthPanel);
    for (let index = 0; index < 5; index += 1) {
      this.depthTexts.push(this._addText(
        depthPanel.x + depthPanel.width * 0.58,
        depthPanel.y + depthPanel.height * (0.08 + index * 0.21),
        "",
        { fontFamily: "Consolas, monospace", fontSize: `${Math.max(10, Math.round(height * 0.015))}px`, color: colors.body },
      ));
    }
  }

  _buildFooter(width, height) {
    const { colors, copy, input, layout } = WORLD_MAP_CONFIG;
    const style = {
      fontFamily: "Consolas, monospace",
      fontSize: `${Math.max(10, Math.round(height * 0.016))}px`,
      color: colors.body,
    };
    const y = layout.footerY * height;
    this._addText(layout.footerDragX * width, y, copy.dragPan, style);
    this._addText(layout.footerWheelX * width, y, copy.wheelZoom, style);
    const centerText = this._addText(layout.footerCenterX * width, y, copy.center, style);
    this._addButton(centerText, {
      x: centerText.x, y: centerText.y,
      width: input.centerHitWidthPx, height: input.centerHitHeightPx,
      baseColor: colors.body, activate: this.callbacks.center,
    });
    this._addText(layout.footerCloseX * width, y, copy.close, style);
  }

  _buildZoomControls(height) {
    const { colors, input, layout } = WORLD_MAP_CONFIG;
    const rect = this._rectFromRatio(layout.zoomControl);
    const style = {
      fontSize: `${Math.max(22, Math.round(height * 0.036))}px`,
      fontStyle: "bold", color: colors.title,
    };
    const zoomIn = this._addText(rect.x + rect.width / 2, rect.y + 24, "+", style);
    const zoomOut = this._addText(rect.x + rect.width / 2, rect.y + rect.height - 24, "-", style);
    this.zoomValueText = this._addText(rect.x + rect.width / 2, rect.y + rect.height / 2, "", {
      fontFamily: "Consolas, monospace",
      fontSize: `${Math.max(10, Math.round(height * 0.015))}px`, color: colors.body,
    });
    this.zoomInButton = this._addButton(zoomIn, {
      x: zoomIn.x, y: zoomIn.y, width: input.zoomHitSizePx, height: input.zoomHitSizePx,
      baseColor: colors.title, activate: this.callbacks.zoomIn,
    });
    this.zoomOutButton = this._addButton(zoomOut, {
      x: zoomOut.x, y: zoomOut.y, width: input.zoomHitSizePx, height: input.zoomHitSizePx,
      baseColor: colors.title, activate: this.callbacks.zoomOut,
    });
  }

  _renderActivityRows() {
    const { width, height } = this.scene.scale;
    const { colors, copy, input } = WORLD_MAP_CONFIG;
    const providers = this.activityRegistry.getProviders();
    const signature = providers.map(({ id, visible, label }) => `${id}:${visible}:${label || ""}`).join("|") || "empty";
    if (signature === this.activitySignature) return;
    this.activitySignature = signature;
    this.dynamicObjects.forEach(object => object?.destroy?.());
    this.dynamicObjects.length = 0;
    const startY = 0.325 * height;
    if (!providers.length) {
      this.dynamicObjects.push(this._addText(0.874 * width, startY, `${copy.noActivityLayers}\n${copy.noActivityHint}`, {
        fontFamily: "Consolas, monospace",
        fontSize: `${Math.max(10, Math.round(height * 0.014))}px`,
        color: colors.hint, lineSpacing: 6,
      }));
      return;
    }
    providers.slice(0, 7).forEach((provider, index) => {
      const y = startY + index * Math.max(25, height * 0.038);
      const baseColor = provider.visible ? colors.active : colors.inactive;
      const row = this._addText(0.79 * width, y,
        `${provider.visible ? "[ON]" : "[OFF]"} ${provider.label || provider.id.toUpperCase()}`,
        { fontFamily: "Consolas, monospace", fontSize: `${Math.max(10, Math.round(height * 0.015))}px`, color: baseColor, align: "left" },
        [0, 0.5]);
      this.dynamicObjects.push(new WorldMapTextButton(this.scene, this.root, row, {
        x: 0.874 * width, y,
        width: input.activityHitWidthRatio * width,
        height: Math.max(input.activityHitHeightPx, height * 0.038),
        baseColor,
        activate: () => {
          this.activityRegistry.toggle(provider.id);
          this.activitySignature = "";
          this.callbacks.render();
        },
      }));
    });
  }

  render(stats, viewState) {
    const { copy, view } = WORLD_MAP_CONFIG;
    this.discoveryText.setText(`${copy.discovered}\n${Math.round(stats.discoveryRatio * 100)}%`);
    this.worldStatusText.setText(`${copy.worldStatus}\n\n`
      + `${stats.widthTiles} x ${stats.depthTiles} TILES\n`
      + `DEPTH ${stats.currentDepth}m / ${stats.maxDepth}m\n`
      + `ZOOM ${viewState.zoom.toFixed(2)}x\nACTIVE MARKERS ${stats.markerCount}`);
    this.zoomValueText.setText(`${viewState.zoom.toFixed(0)}x`);
    this.zoomInButton.setEnabled(viewState.zoom < view.maxZoom);
    this.zoomOutButton.setEnabled(viewState.zoom > view.minZoom);
    this.depthTexts.forEach((text, index) => {
      text.setText(`${Math.round(stats.maxDepth * (index / 4))}m`);
    });
    this._renderActivityRows();
  }

  setVisible(visible) {
    this.root?.setVisible?.(visible);
  }

  destroy() {
    this.dynamicObjects.forEach(object => object?.destroy?.());
    this.staticButtons.forEach(button => button?.destroy?.());
    this.dynamicObjects.length = 0;
    this.staticButtons.length = 0;
    this.activitySignature = "";
    this.mapGraphics?.clearMask?.(true);
    this.mapMask?.destroy?.();
    this.maskShape?.destroy?.();
    this.root?.destroy?.(true);
    this.root = null;
    this.inputZone = null;
  }
}
