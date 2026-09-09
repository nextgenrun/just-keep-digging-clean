import { ASSET_KEYS } from "../../values/assetKeys.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { HARDCORE_MODE_CONFIG } from "../../values/hardcoreMode.js";
import {
  HARDCORE_PANIC_PRESENTATION,
  resolveHardcorePanicView,
} from "../../values/hardcorePanicPresentation.js";
import { HardcorePanicBoundaryView } from "./HardcorePanicBoundaryView.js";
import { HardcorePanicOverlay } from "./HardcorePanicOverlay.js";
import { hasUiInputPriority } from "../UiInputPriorityRegistry.js";

const TAU = Math.PI * 2;
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const lerp = (from, to, amount) => from + (to - from) * amount;

export class HardcoreStatusHud {
  constructor(scene, config = HARDCORE_MODE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.layout = config.ui.statusHud;
    this.presentation = HARDCORE_PANIC_PRESENTATION;
    this.root = null;
    this.frame = null;
    this.crest = null;
    this.label = null;
    this.detail = null;
    this.panicBoundary = null;
    this.panicOverlay = null;
    this._lastSignature = "";
    this._lastIconKey = "";
    this._lastView = { visible: false, band: "calm", critical: false };
    this._panicFlashActive = false;
    this._statusSuppressedForOverlay = false;
    this._create();
    this.panicBoundary = new HardcorePanicBoundaryView(scene, config);
    this.panicOverlay = new HardcorePanicOverlay(scene, config, this.presentation);
  }

  _create() {
    const frameKey = ASSET_KEYS.ui.approvedHud.hardcoreStatusShell;
    const crestKey = ASSET_KEYS.ui.hardcore.oathCrest;
    if (!this.scene.textures.exists(frameKey) || !this.scene.textures.exists(crestKey)) return;
    const layout = this.layout;
    const status = this.presentation.status;
    this.root = this.scene.add.container(layout.x, layout.y)
      .setScrollFactor(0)
      .setDepth(layout.depth)
      .setVisible(false);
    this.frame = this.scene.add.image(0, 0, frameKey)
      .setDisplaySize(layout.width, layout.height);
    this.crest = this.scene.add.image(
      -layout.width / 2 + layout.crestSize / 2 + 5,
      0,
      crestKey,
    ).setDisplaySize(status.calmIconSizePx, status.calmIconSizePx);
    this.label = this.scene.add.text(
      -layout.width / 2 + layout.crestSize + layout.textOffsetX,
      status.titleY,
      "",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: `${this.config.ui.font.statusTitlePx}px`,
        fontStyle: "bold",
        color: APPROVED_HUD_SKIN.font.color,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
      },
    ).setOrigin(0, 0.5);
    this.detail = this.scene.add.text(
      -layout.width / 2 + layout.crestSize + layout.textOffsetX,
      status.detailY,
      "",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: `${this.config.ui.font.statusBodyPx}px`,
        color: APPROVED_HUD_SKIN.font.secondary,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
      },
    ).setOrigin(0, 0.5);
    this.root.add([this.frame, this.crest, this.label, this.detail]);
  }

  isReady() {
    return Boolean(
      this.root
      && this.panicBoundary?.isReady()
      && this.panicOverlay?.isReady()
    );
  }

  update(snapshot, timeMs = 0, gp = 0, options = {}) {
    const view = resolveHardcorePanicView(snapshot, gp, {
      nearDeathGpThreshold: this.config.stress.nearDeathGpThreshold,
      lastBreathGpThreshold: this.config.checkpoint.lowGpImmediateThreshold,
      panicStartDepth: this.config.stress.panicStartDepthTiles,
    });
    const gameplayActive = options.gameplayActive !== false
      && !hasUiInputPriority(this.scene);
    this.panicBoundary?.update(snapshot, timeMs, gameplayActive);
    const overlayState = this.panicOverlay?.update(view, timeMs, gameplayActive) || {};
    const overlayOwnsSignal = overlayState.bannerOwnsSignal === true;
    const highPanicEntered = view.overlayVisible === true
      && gameplayActive
      && this.panicOverlay?.isReady();
    if (highPanicEntered && !this._panicFlashActive) {
      this.scene.screenFlashSystem?.flashPanic?.();
    }
    this._panicFlashActive = highPanicEntered;
    this._lastView = view;
    this._statusSuppressedForOverlay = overlayOwnsSignal;
    this._updateStatus(view, timeMs, overlayOwnsSignal || !gameplayActive);
  }

  _updateStatus(view, timeMs, suppressed) {
    if (!this.root) return;
    const visible = view.visible === true && suppressed !== true;
    this.root.setVisible(visible);
    if (!visible) return;
    const signature = [
      view.iconRole,
      view.title,
      view.detail,
      view.titleColor,
      view.detailColor,
    ].join(":");
    if (signature !== this._lastSignature) {
      this._lastSignature = signature;
      this._setStatusIcon(view.iconRole);
      this.label.setText(view.title).setColor(view.titleColor);
      this.detail.setText(view.detail).setColor(view.detailColor);
    }

    const status = this.presentation.status;
    const cue = clamp01(view.statusCueIntensity);
    const hz = lerp(status.pulseHzMinimum, status.pulseHzMaximum, cue);
    const pulse = cue > 0
      ? (Math.sin(
          (Number(timeMs) || 0) / status.millisecondsPerSecond * TAU * hz,
        ) + 1) / 2
      : 0;
    this.root.setScale(1 + pulse * status.pulseScaleMaximum * cue);
    this.frame.setAlpha(1 - status.frameAlphaLossMaximum * cue * (1 - pulse));
    const iconSize = this._getStatusIconSize(view.iconRole);
    const iconScale = 1 + pulse * status.iconPulseScale * cue;
    this.crest.setDisplaySize(iconSize * iconScale, iconSize * iconScale);
  }

  _setStatusIcon(role) {
    const assets = this.config.assets;
    const requestedKey = role === "critical"
      ? assets.panicCritical.key
      : role === "warning" ? assets.panicWarning.key : assets.crest.key;
    const key = this.scene.textures.exists(requestedKey)
      ? requestedKey
      : assets.crest.key;
    if (key === this._lastIconKey) return;
    this._lastIconKey = key;
    this.crest.setTexture(key);
  }

  _getStatusIconSize(role) {
    const status = this.presentation.status;
    if (role === "critical") return status.criticalIconSizePx;
    if (role === "warning") return status.warningIconSizePx;
    return status.calmIconSizePx;
  }

  getDebugSnapshot() {
    const boundary = this.panicBoundary?.getDebugSnapshot?.() || {};
    const overlay = this.panicOverlay?.getDebugSnapshot?.() || {};
    return {
      ready: this.isReady(),
      band: this._lastView.band,
      severity: this._lastView.severity || "stable",
      sanityPercent: this._lastView.sanityPercent ?? null,
      panicIntensity: this._lastView.panicIntensity || 0,
      statusCueIntensity: this._lastView.statusCueIntensity || 0,
      statusVisible: this.root?.visible === true,
      statusSuppressedForOverlay: this._statusSuppressedForOverlay,
      statusIconKey: this._lastIconKey || null,
      title: this.label?.text || "",
      detail: this.detail?.text || "",
      ...boundary,
      ...overlay,
    };
  }

  destroy() {
    this.root?.destroy(true);
    this.panicBoundary?.destroy();
    this.panicOverlay?.destroy();
    this.root = null;
    this.frame = null;
    this.crest = null;
    this.label = null;
    this.detail = null;
    this.panicBoundary = null;
    this.panicOverlay = null;
    this.scene = null;
  }
}
