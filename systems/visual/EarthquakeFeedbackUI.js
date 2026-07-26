import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

const clamp01 = value => Math.max(0, Math.min(1, value));

export class EarthquakeFeedbackUI {
  constructor(scene, earthquakeSystem, config = EARTHQUAKE_FEEDBACK_CONFIG) {
    this.scene = scene;
    this.source = earthquakeSystem;
    this.config = config;
    this.escapeActive = false;
    this.destroyed = false;
    this._notificationsShifted = false;
    this._notificationBaseY = scene.uiNotifications?.baseY;
    this._create();
  }

  _create() {
    const top = this.config.top;
    const objective = this.config.objective;

    this.topRoot = this.scene.add.container(0, top.marginY)
      .setScrollFactor(0).setDepth(this.config.hudDepth).setVisible(false);
    this.topBg = this.scene.add.graphics();
    this.topTitle = this.scene.add.text(0, top.titleY, "", {
      fontFamily: UI_FONTS.mono, fontSize: top.titleFontSize,
      fontStyle: "bold", color: UI_COLORS.white,
    }).setOrigin(0.5, 0);
    this.topSubtitle = this.scene.add.text(0, top.subtitleY, "", {
      fontFamily: UI_FONTS.mono, fontSize: top.subtitleFontSize,
      fontStyle: "bold", color: UI_COLORS.body,
    }).setOrigin(0.5, 0);
    this.topPhase = this.scene.add.text(0, top.phaseY, "", {
      fontFamily: UI_FONTS.mono, fontSize: top.phaseFontSize,
      color: UI_COLORS.dim,
    }).setOrigin(0.5, 0);
    this.topProgress = this.scene.add.graphics();
    this.topRoot.add([this.topBg, this.topProgress, this.topTitle, this.topSubtitle, this.topPhase]);

    this.objectiveRoot = this.scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(this.config.hudDepth).setVisible(false);
    this.objectiveBg = this.scene.add.graphics();
    this.objectiveTitle = this.scene.add.text(0, 0, "", {
      fontFamily: UI_FONTS.mono, fontSize: objective.escapeTitleFontSize,
      fontStyle: "bold", color: UI_COLORS.danger,
    }).setOrigin(0.5);
    this.objectiveAction = this.scene.add.text(0, 0, "", {
      fontFamily: UI_FONTS.mono, fontSize: objective.actionFontSize,
      fontStyle: "bold", color: UI_COLORS.white,
    }).setOrigin(0.5);
    this.objectiveDetail = this.scene.add.text(0, 0, "", {
      fontFamily: UI_FONTS.mono, fontSize: objective.escapeDetailFontSize,
      color: UI_COLORS.body,
    }).setOrigin(0.5);
    this.objectiveRoot.add([
      this.objectiveBg, this.objectiveTitle, this.objectiveAction, this.objectiveDetail,
    ]);

    this._onResize = () => this._layout();
    this.scene.scale?.on?.("resize", this._onResize);
    this._layout();
  }

  activateEscapeObjective() {
    this.escapeActive = true;
    this.update();
  }

  clearEscapeObjective() {
    this.escapeActive = false;
    this.update();
  }

  reset() {
    this.escapeActive = false;
    this._setVisible(false);
  }

  update() {
    if (this.destroyed || !this.config.enabled) return;
    const state = this.source?.state || "idle";
    const mode = this.escapeActive ? "escape" : state;
    const awarenessKnown = typeof this.source?.isPlayerAware === "function";
    const playerAware = awarenessKnown ? this.source.isPlayerAware() : true;
    if (mode === "idle" || (mode !== "escape" && !playerAware)) {
      this._setVisible(false);
      return;
    }

    this._setVisible(true);
    this._renderTop(mode);
    this._renderObjective(mode);
  }

  _renderTop(mode) {
    const labels = this.config.labels;
    const intensity = labels.intensity[this.source?.intensity] || labels.intensity.minor;
    const seconds = Math.max(0, (this.source?.stateRemaining || 0) / 1000);
    let title = labels.aftermathTitle;
    let subtitle = `${labels.groundSettling} • ${seconds.toFixed(1)}s`;
    let phase = labels.aftermathPhase;
    let accent = this.config.colors.gold;

    if (mode === "warning") {
      title = labels.warningTitle;
      subtitle = `${intensity} • ${labels.impactIn} ${seconds.toFixed(1)}s`;
      phase = labels.warningPhase;
      accent = this.config.colors.warning;
    } else if (mode === "earthquake") {
      title = labels.quakeTitle;
      subtitle = `${intensity} • ${String(Math.ceil(seconds)).padStart(2, "0")}s ${labels.remaining}`;
      phase = labels.quakePhase;
      accent = this.config.colors.danger;
    } else if (mode === "aftermath" && this.source?.chainPending) {
      subtitle = `${labels.aftershockPossible} • ${seconds.toFixed(1)}s`;
    } else if (mode === "escape") {
      title = labels.collapsedTitle;
      subtitle = labels.escapeRoute;
      phase = labels.escapePhase;
      accent = this.config.colors.gold;
    }

    this.topTitle.setText(title).setColor(mode === "escape" ? UI_COLORS.title : UI_COLORS.danger);
    this.topSubtitle.setText(subtitle);
    this.topPhase.setText(phase);
    this._drawTopPanel(accent, mode === "escape" ? 1 : this._remainingRatio());
  }

  _drawTopPanel(accent, progress) {
    const top = this.config.top;
    const width = this._topWidth();
    const left = -width / 2;
    this.topBg.clear();
    this.topBg.fillStyle(UI_COLORS.bg, this.config.colors.panelAlpha);
    this.topBg.fillRoundedRect(left, 0, width, top.height, top.cornerRadius);
    this.topBg.lineStyle(top.borderWidth, accent, this.config.colors.panelBorderAlpha);
    this.topBg.strokeRoundedRect(left, 0, width, top.height, top.cornerRadius);
    this.topProgress.clear();
    this.topProgress.fillStyle(this.config.colors.inactive, 0.75);
    this.topProgress.fillRect(left, top.progressY, width, top.progressHeight);
    this.topProgress.fillStyle(accent, 1);
    this.topProgress.fillRect(left, top.progressY, width * clamp01(progress), top.progressHeight);
  }

  _renderObjective(mode) {
    const cfg = this.config.objective;
    const labels = this.config.labels;
    const escape = mode === "escape";
    const width = escape ? Math.min(cfg.escapeWidth, this._viewportWidth() - cfg.sideMargin * 2)
      : Math.min(cfg.maxWidth, this._viewportWidth() - cfg.sideMargin * 2);
    const height = escape ? cfg.escapeHeight : cfg.normalHeight;
    const accent = escape ? this.config.colors.gold
      : mode === "earthquake" ? this.config.colors.danger : this.config.colors.cyan;
    const action = mode === "warning" ? labels.warningAction
      : mode === "earthquake" ? labels.quakeAction : labels.aftermathAction;

    this._drawObjectivePanel(width, height, accent);
    this.objectiveTitle.setVisible(escape).setText(labels.escapeTitle).setPosition(0, -height * 0.3);
    let escapeDetail = labels.escapeDetail;
    if (escape) {
      const player = this.scene.playerController?.getPlayerTile?.();
      const nearest = this.scene.specialTileSystem?.getNearestPortal?.(player);
      if (nearest && player) {
        const dx = nearest.tx - player.tx;
        const dy = nearest.ty - player.ty;
        const glyph = Math.abs(dx) > Math.abs(dy)
          ? (dx < 0 ? "◀" : "▶")
          : (dy < 0 ? "▲" : "▼");
        escapeDetail = `${glyph} NEAREST SAFE PORTAL  •  ${nearest.label}`
          + `  •  ${nearest.distance} tiles`;
      }
    }
    this.objectiveDetail.setVisible(escape).setText(escapeDetail).setPosition(0, height * 0.3);
    this.objectiveAction.setText(escape ? labels.escapeAction : action)
      .setFontSize(escape ? cfg.escapeActionFontSize : cfg.actionFontSize)
      .setPosition(0, escape ? 0 : 0);
    this.objectiveRoot.setPosition(this._viewportWidth() / 2, this._viewportHeight() - cfg.bottomMargin - height / 2);
  }

  _drawObjectivePanel(width, height, accent) {
    const cfg = this.config.objective;
    this.objectiveBg.clear();
    this.objectiveBg.fillStyle(UI_COLORS.bg, this.config.colors.panelAlpha);
    this.objectiveBg.fillRoundedRect(-width / 2, -height / 2, width, height, cfg.cornerRadius);
    this.objectiveBg.lineStyle(2, accent, this.config.colors.panelBorderAlpha);
    this.objectiveBg.strokeRoundedRect(-width / 2, -height / 2, width, height, cfg.cornerRadius);
  }

  _remainingRatio() {
    const total = this.source?.stateTotalMs || this.source?.stateRemaining || 1;
    return (this.source?.stateRemaining || 0) / total;
  }

  _setVisible(visible) {
    this.topRoot?.setVisible(visible);
    this.objectiveRoot?.setVisible(visible);
    if (visible !== this._notificationsShifted) {
      this._notificationsShifted = visible;
      const y = visible ? this.config.notificationActiveBaseY : this._notificationBaseY;
      if (Number.isFinite(y)) this.scene.uiNotifications?.setBaseY?.(y);
    }
  }

  _layout() {
    this.topRoot?.setPosition(this._viewportWidth() / 2, this.config.top.marginY);
    if (this.topRoot?.visible) this.update();
  }

  _topWidth() {
    const cfg = this.config.top;
    const available = this._viewportWidth() - cfg.sideMargin * 2;
    const viewportFit = this._viewportWidth() - cfg.marginY * 2;
    return Math.min(cfg.maxWidth, Math.max(cfg.minWidth, available), viewportFit);
  }

  _viewportWidth() { return this.scene.scale?.width || this.scene.config?.viewportWidth; }
  _viewportHeight() { return this.scene.scale?.height || this.scene.config?.viewportHeight; }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this._setVisible(false);
    this.scene.scale?.off?.("resize", this._onResize);
    this.topRoot?.destroy(true);
    this.objectiveRoot?.destroy(true);
    this.scene = null;
    this.source = null;
  }
}
