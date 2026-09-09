import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";
import { WORLD_MAP_COPY } from "../../../values/playerFacingCopy.js";
import { WorldMapAnnotationView } from "./WorldMapAnnotationView.js";
import { WorldMapTerrainTextureView } from "./WorldMapTerrainTextureView.js";
import { WorldMapTextButton } from "./WorldMapTextButton.js";
import { formatWorldMapStatus } from "./formatWorldMapStatus.js";

function liftColor(value, amount) {
  if (!Number.isFinite(value)) return value;
  const channel = shift => (value >> shift) & 0xff;
  const lift = source => Math.round(source + (255 - source) * amount);
  return (lift(channel(16)) << 16) | (lift(channel(8)) << 8) | lift(channel(0));
}

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
    this.annotationView = null;
    this.terrainTextureView = null;
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
    const { layout, colors, input } = WORLD_MAP_CONFIG;
    const copy = WORLD_MAP_COPY;
    this.viewport = this._rectFromRatio(layout.viewport);
    this.root = this.scene.add.container(0, 0)
      .setDepth(WORLD_MAP_CONFIG.depth).setScrollFactor(0).setVisible(visible);

    const shade = this.scene.add.rectangle(width / 2, height / 2, width, height, colors.shade, 0.82)
      .setScrollFactor(0).setInteractive();
    this.mapGraphics = this.scene.add.graphics().setScrollFactor(0);
    this.terrainTextureView = new WorldMapTerrainTextureView(this.scene);
    const terrainTexture = this.terrainTextureView.create(this.viewport);
    this.annotationView = new WorldMapAnnotationView(this.scene);
    this.frame = this.scene.add.image(width / 2, height / 2, ASSET_KEYS.ui.worldMapFrame)
      .setDisplaySize(width, height).setScrollFactor(0);
    this.root.add([
      shade,
      this.mapGraphics,
      terrainTexture,
      this.annotationView.root,
      this.frame,
    ].filter(Boolean));
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
    this.terrainTextureView.setMask(this.mapMask);
    this.annotationView.setMask(this.mapMask);
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
    const { colors, layout } = WORLD_MAP_CONFIG;
    const copy = WORLD_MAP_COPY;
    this.discoveryText = this._addText(layout.discoveryX * width, layout.discoveryY * height, "", {
      fontSize: `${Math.max(15, Math.round(height * 0.025))}px`,
      fontStyle: "bold", color: colors.title,
    });
    this._addText(layout.activityTitleX * width, layout.activityTitleY * height, copy.activityLayers, {
      fontSize: `${Math.max(13, Math.round(height * 0.02))}px`,
      fontStyle: "bold", color: colors.title,
    });
    this.worldStatusText = this._addText(layout.statusX * width, layout.statusY * height, "", {
      fontFamily: "Consolas, monospace",
      fontSize: `${Math.max(11, Math.round(height * 0.017))}px`,
      color: colors.body, lineSpacing: 5,
    }, [0.5, 0]);
    this.regionIcon = this.scene.add.image(
      layout.statusBiomeIconX * width,
      layout.statusBiomeIconY * height,
      ASSET_KEYS.ui.worldMapSymbols,
      WORLD_MAP_CONFIG.symbolAtlas.frames.biome,
    ).setDisplaySize(
      WORLD_MAP_CONFIG.annotations.iconSizesPx.status,
      WORLD_MAP_CONFIG.annotations.iconSizesPx.status,
    ).setScrollFactor(0).setVisible(false);
    this.root.add(this.regionIcon);
    this.starTerritoryIcon = this.scene.add.image(
      layout.statusStarIconX * width,
      layout.statusStarIconY * height,
      ASSET_KEYS.ui.worldMapSymbols,
      WORLD_MAP_CONFIG.symbolAtlas.frames.star,
    ).setDisplaySize(
      WORLD_MAP_CONFIG.annotations.iconSizesPx.status,
      WORLD_MAP_CONFIG.annotations.iconSizesPx.status,
    ).setScrollFactor(0).setVisible(false);
    this.root.add(this.starTerritoryIcon);
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
    const { colors, input, layout } = WORLD_MAP_CONFIG;
    const copy = WORLD_MAP_COPY;
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

  _renderActivityRows(stats) {
    const { width, height } = this.scene.scale;
    const { annotations, colors, input, layout, symbolAtlas } = WORLD_MAP_CONFIG;
    const copy = WORLD_MAP_COPY;
    const providers = this.activityRegistry.getProviders();
    const counts = stats.markerCounts || {};
    const signature = providers
      .map(({ id, visible, label }) => `${id}:${visible}:${label || ""}:${counts[id] || 0}`)
      .join("|") || "empty";
    if (signature === this.activitySignature) return;
    this.activitySignature = signature;
    this.dynamicObjects.forEach(object => object?.destroy?.());
    this.dynamicObjects.length = 0;
    const startY = layout.activityStartY * height;
    if (!providers.length) {
      this.dynamicObjects.push(this._addText(layout.activityCenterX * width, startY, `${copy.noActivityLayers}\n${copy.noActivityHint}`, {
        fontFamily: "Consolas, monospace",
        fontSize: `${Math.max(10, Math.round(height * 0.014))}px`,
        color: colors.hint, lineSpacing: 6,
      }));
      return;
    }
    providers.slice(0, layout.activityMaxRows).forEach((provider, index) => {
      const y = startY + index * Math.max(
        layout.activityRowMinimumGapPx,
        height * layout.activityRowGapRatio,
      );
      const baseColor = provider.visible ? colors.active : colors.inactive;
      const icon = this.scene.add.image(
        layout.activityIconX * width,
        y,
        ASSET_KEYS.ui.worldMapSymbols,
        Number.isInteger(provider.iconFrame) ? provider.iconFrame : symbolAtlas.frames.landmark,
      ).setDisplaySize(annotations.iconSizesPx.activity, annotations.iconSizesPx.activity)
        .setAlpha(provider.visible ? 1 : input.disabledAlpha)
        .setScrollFactor(0);
      this.root.add(icon);
      this.dynamicObjects.push(icon);
      const state = provider.visible ? copy.layerOn : copy.layerOff;
      const row = this._addText(layout.activityTextX * width, y,
        `${provider.label || provider.id.toUpperCase()}  ${counts[provider.id] || 0}  ${state}`,
        { fontFamily: "Consolas, monospace", fontSize: `${Math.max(10, Math.round(height * 0.015))}px`, color: baseColor, align: "left" },
        [0, 0.5]);
      this.dynamicObjects.push(new WorldMapTextButton(this.scene, this.root, row, {
        x: layout.activityCenterX * width, y,
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
    const { view } = WORLD_MAP_CONFIG;
    const copy = WORLD_MAP_COPY;
    this.annotationView.render({
      markers: stats.markerAnnotations,
      biomeLabels: stats.biomeLabels,
      player: stats.playerAnnotation,
    });
    this.discoveryText.setText(`${copy.discovered}\n${Math.round(stats.discoveryRatio * 100)}%`);
    this.worldStatusText.setText(formatWorldMapStatus(stats, viewState));
    this.regionIcon.setVisible(stats.biomeFieldActive);
    if (stats.biomeFieldActive && Number.isFinite(stats.currentBiomeColor)) {
      this.regionIcon.setTint(liftColor(
        stats.currentBiomeColor,
        WORLD_MAP_CONFIG.annotations.biomeIdentityLift,
      ));
    } else {
      this.regionIcon.clearTint?.();
    }
    const territory = stats.currentStarTerritory;
    this.starTerritoryIcon.setVisible(Boolean(territory));
    if (territory?.state === "consumed") {
      this.starTerritoryIcon
        .setTint(WORLD_MAP_CONFIG.starTerritories.consumedMarkerTint)
        .setAlpha(WORLD_MAP_CONFIG.starTerritories.consumedMarkerAlpha);
    } else if (territory && !territory.discovered) {
      this.starTerritoryIcon
        .setTint(WORLD_MAP_CONFIG.starTerritories.routeSignalColor)
        .setAlpha(WORLD_MAP_CONFIG.starTerritories.signalMarkerAlpha);
    } else {
      this.starTerritoryIcon.clearTint?.();
      this.starTerritoryIcon.setAlpha(1);
    }
    this.zoomValueText.setText(`${viewState.zoom.toFixed(0)}x`);
    this.zoomInButton.setEnabled(viewState.zoom < view.maxZoom);
    this.zoomOutButton.setEnabled(viewState.zoom > view.minZoom);
    this.depthTexts.forEach((text, index) => {
      text.setText(`${Math.round(stats.maxDepth * (index / 4))}m`);
    });
    this._renderActivityRows(stats);
  }

  renderTerrain(options) {
    return this.terrainTextureView?.render?.(options) || {
      terrainTextureActive: false,
      terrainTextureTileCount: 0,
      terrainTextureMissingLayers: 0,
    };
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
    this.annotationView?.destroy?.();
    this.terrainTextureView?.destroy?.();
    this.mapGraphics?.clearMask?.(true);
    this.mapMask?.destroy?.();
    this.maskShape?.destroy?.();
    this.root?.destroy?.(true);
    this.root = null;
    this.inputZone = null;
    this.annotationView = null;
    this.terrainTextureView = null;
  }
}
