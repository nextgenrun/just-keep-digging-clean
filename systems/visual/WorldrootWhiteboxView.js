import { NPC_ACTIVITY_CONFIG } from "../../values/npcActivityConfig.js";
import { TITAN_DISCOVERY_CONFIG } from "../../values/titanDiscoveries.js";
import { TOWN_SQUARE_CONFIG } from "../../values/townSquareConfig.js";
import {
  WORLDROOT_WHITEBOX_CONFIG,
  isWorldrootWhiteboxEnabled,
} from "../../values/worldrootWhitebox.js";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/** Query-gated collision-first review view. It owns no progression or final art. */
export class WorldrootWhiteboxView {
  constructor(scene, config = WORLDROOT_WHITEBOX_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = isWorldrootWhiteboxEnabled(globalThis.location?.search || "", config);
    this.tileSize = scene?.config?.tileSize || 94;
    this.growthStage = -1;
    this.silhouetteGraphics = null;
    this.contactGraphics = null;
    this.markerGraphics = null;
    this.guideGraphics = null;
    this.moduleLabels = [];
    this.systemLabels = [];
    this.modeText = null;
  }

  create(snapshot = null) {
    if (!this.enabled || !this.scene?.add) return this;
    const presentation = this.config.presentation;
    this.silhouetteGraphics = this.scene.add.graphics().setDepth(presentation.silhouetteDepth);
    this.contactGraphics = this.scene.add.graphics().setDepth(presentation.outlineDepth);
    this.markerGraphics = this.scene.add.graphics().setDepth(presentation.markerDepth);
    this.guideGraphics = this.scene.add.graphics().setDepth(presentation.markerDepth);
    this.moduleLabels = this.config.modules.map(module => this._createModuleLabel(module));
    this.systemLabels = this.config.systemSockets.map(socket => this._createSystemLabel(socket));
    this.modeText = this.scene.add.text(18, 86, `${this.config.copy.mode}\n${this.config.copy.legend}`, {
      fontFamily: "Arial, sans-serif",
      fontSize: `${presentation.noteFontSizePx}px`,
      color: "#dffaff",
      backgroundColor: "rgba(3, 9, 20, 0.88)",
      padding: { x: 8, y: 6 },
      lineSpacing: 3,
    }).setScrollFactor(0).setDepth(210);
    this._drawGuides();
    this.sync(snapshot?.growthStage ?? 0, true);
    return this;
  }

  _createModuleLabel(module) {
    return this.scene.add.text(
      module.labelAt.x * this.tileSize,
      module.labelAt.y * this.tileSize,
      module.label,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: `${this.config.presentation.labelFontSizePx}px`,
        fontStyle: "bold",
        color: `#${module.color.toString(16).padStart(6, "0")}`,
        stroke: "#040810",
        strokeThickness: 4,
      },
    ).setOrigin(0, 0.5).setDepth(this.config.presentation.labelDepth);
  }

  _createSystemLabel(socket) {
    return this.scene.add.text(
      (socket.x + 0.30) * this.tileSize,
      socket.y * this.tileSize,
      socket.label,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: `${this.config.presentation.noteFontSizePx}px`,
        color: "#e8fbff",
        stroke: "#040810",
        strokeThickness: 3,
      },
    ).setOrigin(0, 0.5).setDepth(this.config.presentation.labelDepth);
  }

  sync(stage = 0, force = false) {
    if (!this.enabled || !this.silhouetteGraphics) return false;
    const nextStage = clamp(Math.floor(Number(stage) || 0), 0, 6);
    if (!force && nextStage === this.growthStage) return false;
    this.growthStage = nextStage;
    this._drawStructure();
    this._drawContacts();
    this._drawSockets();
    this.moduleLabels.forEach((label, index) => {
      label.setAlpha(this.config.modules[index].stage <= nextStage ? 1 : 0.24);
    });
    this.config.systemSockets.forEach((socket, index) => {
      this.systemLabels[index]?.setAlpha(socket.stage <= nextStage ? 0.9 : 0.18);
    });
    return true;
  }

  _moduleState(moduleId, stage) {
    const module = this.config.modules.find(entry => entry.id === moduleId);
    return {
      active: stage <= this.growthStage,
      color: module?.color || 0x78f2ff,
    };
  }

  _drawStructure() {
    const graphics = this.silhouetteGraphics.clear();
    const presentation = this.config.presentation;
    for (const entry of this.config.connectors) {
      const state = this._moduleState(entry.moduleId, entry.stage);
      const alpha = state.active ? presentation.activeAlpha : presentation.sleepingAlpha;
      graphics.lineStyle(entry.widthTiles * this.tileSize, presentation.activeFill, alpha);
      graphics.beginPath();
      entry.points.forEach((item, index) => {
        const x = item.x * this.tileSize;
        const y = item.y * this.tileSize;
        if (index === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
      });
      graphics.strokePath();
      graphics.fillStyle(presentation.activeFill, alpha);
      for (const item of entry.points) {
        graphics.fillCircle(item.x * this.tileSize, item.y * this.tileSize, entry.widthTiles * this.tileSize / 2);
      }
    }
    for (const entry of this.config.silhouettes) {
      const state = this._moduleState(entry.moduleId, entry.stage);
      const fill = state.active ? presentation.activeFill : presentation.sleepingFill;
      const fillAlpha = state.active ? presentation.activeAlpha : presentation.sleepingAlpha;
      const lineAlpha = state.active ? presentation.outlineAlpha : presentation.sleepingOutlineAlpha;
      graphics.fillStyle(fill, fillAlpha);
      graphics.lineStyle(2, state.color, lineAlpha);
      graphics.beginPath();
      entry.points.forEach((item, index) => {
        const x = item.x * this.tileSize;
        const y = item.y * this.tileSize;
        if (index === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
      });
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
    }
  }

  _drawContacts() {
    const graphics = this.contactGraphics.clear();
    const presentation = this.config.presentation;
    for (const entry of this.config.platforms) {
      const active = entry.stage <= this.growthStage;
      graphics.lineStyle(
        presentation.collisionWidthPx,
        presentation.collisionColor,
        active ? 0.95 : 0.24,
      );
      graphics.lineBetween(
        entry.leftTile * this.tileSize,
        entry.yTile * this.tileSize,
        entry.rightTile * this.tileSize,
        entry.yTile * this.tileSize,
      );
    }
  }

  _drawSockets() {
    const graphics = this.markerGraphics.clear();
    const presentation = this.config.presentation;
    for (const socket of this.config.starSockets) {
      const state = this._moduleState(socket.moduleId, socket.stage);
      graphics.lineStyle(2, state.color, state.active ? 0.9 : 0.18);
      graphics.strokeCircle(
        socket.x * this.tileSize,
        socket.y * this.tileSize,
        presentation.socketRadiusTiles * this.tileSize,
      );
    }
    for (const socket of this.config.systemSockets) {
      const state = this._moduleState(socket.moduleId, socket.stage);
      graphics.lineStyle(3, state.color, state.active ? 1 : 0.2);
      graphics.strokeCircle(
        socket.x * this.tileSize,
        socket.y * this.tileSize,
        presentation.systemSocketRadiusTiles * this.tileSize,
      );
    }
  }

  _drawGuides() {
    const graphics = this.guideGraphics.clear();
    const snapshot = this.getClearanceSnapshot();
    const color = this.config.presentation.guideColor;
    const alpha = this.config.presentation.guideAlpha;
    const surfaceY = (this.scene.config?.topAirRows || 65) * this.tileSize;
    graphics.lineStyle(2, color, alpha);
    graphics.lineBetween(snapshot.merchantLimitTile * this.tileSize, surfaceY - 5 * this.tileSize, snapshot.merchantLimitTile * this.tileSize, surfaceY);
    graphics.lineBetween(snapshot.firstTitanLeftTile * this.tileSize, surfaceY - 6 * this.tileSize, snapshot.firstTitanLeftTile * this.tileSize, surfaceY);
    graphics.lineBetween(
      snapshot.firstTitanLeftTile * this.tileSize,
      snapshot.canopyBottomLimitTile * this.tileSize,
      this.config.bounds.rightTile * this.tileSize,
      snapshot.canopyBottomLimitTile * this.tileSize,
    );
    this._createGuideLabel(snapshot.merchantLimitTile, 64.35, "MERCHANT CLEAR");
    this._createGuideLabel(snapshot.firstTitanLeftTile, 60.1, "TITAN GALLERY START");
    this._createGuideLabel(snapshot.firstTitanLeftTile + 0.3, snapshot.canopyBottomLimitTile - 0.15, "1.5 TILE TITAN AIR GAP");
  }

  _createGuideLabel(xTile, yTile, text) {
    const label = this.scene.add.text(xTile * this.tileSize, yTile * this.tileSize, text, {
      fontFamily: "Arial, sans-serif",
      fontSize: `${this.config.presentation.noteFontSizePx}px`,
      color: "#ff7894",
      stroke: "#030710",
      strokeThickness: 3,
    }).setOrigin(0, 1).setDepth(this.config.presentation.labelDepth);
    this.systemLabels.push(label);
  }

  getOneWayPlatforms() {
    if (!this.enabled) return [];
    return this.config.platforms.map(entry => ({
      id: `worldroot-${entry.id}`,
      leftX: entry.leftTile * this.tileSize,
      rightX: entry.rightTile * this.tileSize,
      y: entry.yTile * this.tileSize,
      source: "worldroot-whitebox",
      moduleId: entry.moduleId,
      stage: entry.stage,
    }));
  }

  pointToWorld(sourcePoint, kind = "") {
    const authored = kind === "root"
      ? this.config.interaction.rootTalent
      : kind === "crown" ? this.config.interaction.crownStar : null;
    const point = authored || sourcePoint || { x: 0.5, y: 0.5 };
    if (authored) return { x: point.x * this.tileSize, y: point.y * this.tileSize };
    const x = clamp(Number(point.x) || 0.5, 0, 1);
    const y = clamp(Number(point.y) || 0.5, 0, 1);
    return {
      x: (this.config.bounds.leftTile + x * (this.config.bounds.rightTile - this.config.bounds.leftTile)) * this.tileSize,
      y: (this.config.bounds.topTile + y * (this.config.bounds.bottomTile - this.config.bounds.topTile)) * this.tileSize,
    };
  }

  getTransform() {
    const bounds = this.config.bounds;
    return {
      left: bounds.leftTile * this.tileSize,
      top: bounds.topTile * this.tileSize,
      width: (bounds.rightTile - bounds.leftTile) * this.tileSize,
      height: (bounds.bottomTile - bounds.topTile) * this.tileSize,
      scaleX: 1,
      scaleY: 1,
      tileSize: this.tileSize,
      surfaceY: bounds.bottomTile * this.tileSize,
    };
  }

  getClearanceSnapshot() {
    const lastMerchantTile = Math.max(...Object.values(TOWN_SQUARE_CONFIG.merchantSlots).map(slot => slot.tileX));
    const merchantVisibleRightTile = lastMerchantTile + 0.5 + NPC_ACTIVITY_CONFIG.render.displayScale / 2;
    const gallery = TITAN_DISCOVERY_CONFIG.surfaceGallery;
    const firstTitanLeftTile = gallery.startTileX
      - gallery.maxWidthTiles * gallery.maximumScaleMultiplier / 2;
    const titanTopTile = (this.scene.config?.topAirRows || 65)
      + gallery.baselineOffsetTiles - gallery.maxHeightTiles;
    return {
      merchantVisibleRightTile,
      merchantLimitTile: merchantVisibleRightTile + this.config.clearance.merchantGapTiles,
      firstTitanLeftTile,
      groundedRightLimitTile: firstTitanLeftTile - this.config.clearance.titanGroundGapTiles,
      titanTopTile,
      canopyBottomLimitTile: titanTopTile - this.config.clearance.titanCanopyAirGapTiles,
    };
  }

  getDebugSnapshot() {
    return {
      enabled: this.enabled,
      growthStage: this.growthStage,
      bounds: this.getTransform(),
      platformCount: this.config.platforms.length,
      starSocketCount: this.config.starSockets.length,
      systemSocketCount: this.config.systemSockets.length,
      clearance: this.getClearanceSnapshot(),
    };
  }

  destroy() {
    for (const object of [
      this.silhouetteGraphics, this.contactGraphics, this.markerGraphics,
      this.guideGraphics, this.modeText, ...this.moduleLabels, ...this.systemLabels,
    ]) object?.destroy?.();
    this.moduleLabels = [];
    this.systemLabels = [];
    this.scene = null;
  }
}
