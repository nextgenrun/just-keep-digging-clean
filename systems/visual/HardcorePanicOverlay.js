import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HARDCORE_PANIC_PRESENTATION } from
  "../../values/hardcorePanicPresentation.js";
const TAU = Math.PI * 2;
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const lerp = (from, to, amount) => from + (to - from) * amount;
export class HardcorePanicOverlay {
  constructor(scene, config, presentation = HARDCORE_PANIC_PRESENTATION) {
    this.scene = scene;
    this.config = config;
    this.presentation = presentation;
    this.edge = null;
    this.edgeEcho = null;
    this.edgeSlip = null;
    this.bannerRoot = null;
    this.bannerFrame = null;
    this.icon = null;
    this.title = null;
    this.detail = null;
    this._lastTextSignature = "";
    this._lastViewportSignature = "";
    this._lastTimeMs = null;
    this._signals = {
      panic: 0,
      peripheral: 0,
      echo: 0,
      slip: 0,
      banner: 0,
    };
    this._debug = {
      panicVisible: false,
      highPanicVisible: false,
      bannerOwnsSignal: false,
      edgeAlpha: 0,
      echoAlpha: 0,
      slipAlpha: 0,
      bannerAlpha: 0,
      panicIntensity: 0,
      targetPanicIntensity: 0,
      peripheralIntensity: 0,
      echoIntensity: 0,
      realitySlipIntensity: 0,
    };
    this._create();
  }
  _create() {
    const assets = this.config.assets;
    const frameKey = ASSET_KEYS.ui.approvedHud.hardcoreStatusShell;
    const required = [assets.panicCritical.key, assets.panicEdgeFrame.key, frameKey];
    if (!required.every(key => this.scene.textures.exists(key))) return;
    const overlay = this.presentation.overlay;
    const createEdge = () => this.scene.add.image(0, 0, assets.panicEdgeFrame.key)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(overlay.edgeDepth)
      .setVisible(false);
    this.edge = createEdge();
    this.edgeEcho = createEdge();
    this.edgeSlip = createEdge();
    this.bannerRoot = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(overlay.bannerDepth)
      .setVisible(false);
    this.bannerFrame = this.scene.add.image(0, 0, frameKey);
    this.icon = this.scene.add.image(overlay.iconX, 0, assets.panicCritical.key);
    this.title = this.scene.add.text(overlay.textX, overlay.titleY, "", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: `${overlay.titleFontPx}px`,
      fontStyle: "bold",
      color: this.presentation.colors.criticalTitle,
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
    }).setOrigin(0, 0.5);
    this.detail = this.scene.add.text(overlay.textX, overlay.detailY, "", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: `${overlay.detailFontPx}px`,
      fontStyle: "bold",
      color: this.presentation.colors.criticalDetail,
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
    }).setOrigin(0, 0.5);
    this.bannerRoot.add([
      this.bannerFrame,
      this.icon,
      this.title,
      this.detail,
    ]);
    this._layout(true);
  }
  isReady() {
    return Boolean(this.edge && this.edgeEcho && this.edgeSlip && this.bannerRoot);
  }
  update(view, timeMs = 0, gameplayActive = true) {
    if (!this.isReady()) return this.getDebugSnapshot();
    const active = gameplayActive === true;
    const signals = this._smoothSignals(view, timeMs, active);
    const epsilon = this.presentation.thresholds.visibilityEpsilon;
    const edgeActive = active && (
      view.edgeVisible === true
      || signals.peripheral > epsilon
      || signals.echo > epsilon
      || signals.slip > epsilon
    );
    const bannerActive = active && (
      view.overlayVisible === true || signals.banner > epsilon
    );
    this.edge.setVisible(edgeActive);
    this.edgeEcho.setVisible(edgeActive);
    this.edgeSlip.setVisible(edgeActive);
    this.bannerRoot.setVisible(bannerActive);
    this._debug.panicVisible = edgeActive;
    this._debug.highPanicVisible = bannerActive;
    this._debug.bannerOwnsSignal = bannerActive;
    this._debug.panicIntensity = signals.panic;
    this._debug.targetPanicIntensity = clamp01(view.panicIntensity);
    this._debug.peripheralIntensity = signals.peripheral;
    this._debug.echoIntensity = signals.echo;
    this._debug.realitySlipIntensity = signals.slip;
    if (!active) {
      this._debug.edgeAlpha = 0;
      this._debug.echoAlpha = 0;
      this._debug.slipAlpha = 0;
      this._debug.bannerAlpha = 0;
      return this.getDebugSnapshot();
    }
    this._layout();
    const overlay = this.presentation.overlay;
    const intensity = signals.panic;
    const seconds = (Number(timeMs) || 0) / overlay.millisecondsPerSecond;
    const pulseHz = lerp(overlay.pulseHzMinimum, overlay.pulseHzMaximum, intensity);
    const pulse = (Math.sin(seconds * TAU * pulseHz) + 1) / 2;
    const curvedIntensity = signals.peripheral ** overlay.edgeIntensityExponent;
    const pulseAlpha = lerp(
      overlay.edgePulseAlphaMinimum,
      overlay.edgePulseAlphaMaximum,
      pulse,
    );
    const edgeAlpha = overlay.edgeAlphaMaximum * curvedIntensity * pulseAlpha;
    const echoAlpha = overlay.echoAlphaMaximum * signals.echo * (1 - pulse / 2);
    const slipPulse = (
      Math.sin(seconds * TAU * overlay.slipDriftXHz) + 1
    ) / 2;
    const slipAlpha = overlay.slipAlphaMaximum * signals.slip * lerp(
      overlay.edgePulseAlphaMinimum,
      overlay.edgePulseAlphaMaximum,
      slipPulse,
    );
    this.edge.setAlpha(edgeAlpha);
    this.edgeEcho.setAlpha(echoAlpha);
    this.edgeSlip.setAlpha(slipAlpha);
    this._layoutPeripheralLayers(seconds, pulse, signals.echo, signals.slip);
    this._debug.edgeAlpha = edgeAlpha;
    this._debug.echoAlpha = echoAlpha;
    this._debug.slipAlpha = slipAlpha;

    if (!bannerActive) {
      this._debug.bannerAlpha = 0;
      return this.getDebugSnapshot();
    }
    if (view.overlayVisible === true) {
      const signature = `${view.overlayTitle}:${view.overlayDetail}`;
      if (signature !== this._lastTextSignature) {
        this._lastTextSignature = signature;
        this.title.setText(view.overlayTitle);
        this.detail.setText(view.overlayDetail);
      }
    }
    const bannerStrength = signals.banner;
    const bannerAlpha = lerp(
      overlay.bannerAlphaMinimum,
      overlay.bannerAlphaMaximum,
      bannerStrength,
    ) * bannerStrength ** overlay.bannerAlphaExponent;
    const viewportScale = this._getViewportScale();
    const bannerScale = lerp(overlay.bannerScaleMinimum, 1, bannerStrength)
      + overlay.bannerPulseScale * intensity * pulse;
    this.bannerRoot.setAlpha(bannerAlpha).setScale(bannerScale);
    const iconSize = overlay.iconSizePx * viewportScale
      * (1 + overlay.iconPulseScale * intensity * pulse);
    this.icon.setDisplaySize(iconSize, iconSize);
    const textDrift = overlay.textDriftMaximumPx * signals.slip;
    this.title.setPosition(
      (overlay.textX + Math.sin(seconds * TAU * overlay.textDriftHz) * textDrift)
        * viewportScale,
      overlay.titleY * viewportScale,
    );
    this.detail.setPosition(
      (overlay.textX - Math.sin(seconds * TAU * overlay.textDriftHz) * textDrift)
        * viewportScale,
      overlay.detailY * viewportScale,
    );
    this._debug.bannerAlpha = bannerAlpha;
    return this.getDebugSnapshot();
  }
  _smoothSignals(view, timeMs, active) {
    const targets = {
      panic: clamp01(view.panicIntensity),
      peripheral: clamp01(view.peripheralIntensity),
      echo: clamp01(view.echoIntensity),
      slip: clamp01(view.realitySlipIntensity),
      banner: view.overlayVisible === true ? clamp01(view.bannerIntensity) : 0,
    };
    const now = Math.max(0, Number(timeMs) || 0);
    if (!active || this._lastTimeMs === null || now < this._lastTimeMs) {
      this._signals = { ...targets };
      this._lastTimeMs = active ? now : null;
      return this._signals;
    }
    const overlay = this.presentation.overlay;
    const deltaSeconds = Math.min(
      (now - this._lastTimeMs) / overlay.millisecondsPerSecond,
      overlay.maximumFrameDeltaSeconds,
    );
    for (const key of Object.keys(targets)) {
      const current = this._signals[key];
      const target = targets[key];
      const response = target > current
        ? overlay.transitionRisePerSecond
        : overlay.transitionFallPerSecond;
      const blend = 1 - Math.exp(-response * deltaSeconds);
      this._signals[key] = lerp(current, target, blend);
    }
    this._lastTimeMs = now;
    return this._signals;
  }
  _layoutPeripheralLayers(seconds, pulse, echoStrength, slipStrength) {
    const overlay = this.presentation.overlay;
    const reference = this.presentation.referenceViewport;
    const width = this.scene.scale?.width || reference.width;
    const height = this.scene.scale?.height || reference.height;
    const scale = 1 + overlay.echoScaleMaximum * echoStrength * pulse;
    const drift = overlay.echoDriftMaximumPx * echoStrength;
    this.edgeEcho.setPosition(
      width / 2 + Math.sin(seconds * TAU * overlay.echoDriftXHz) * drift,
      height / 2 + Math.cos(seconds * TAU * overlay.echoDriftYHz) * drift,
    ).setDisplaySize(width * scale, height * scale);
    const slipScale = 1 + overlay.slipScaleMaximum * slipStrength * (1 - pulse);
    const slipDrift = overlay.slipDriftMaximumPx * slipStrength;
    this.edgeSlip.setPosition(
      width / 2 - Math.sin(seconds * TAU * overlay.slipDriftXHz) * slipDrift,
      height / 2 + Math.cos(seconds * TAU * overlay.slipDriftYHz) * slipDrift,
    ).setDisplaySize(width * slipScale, height * slipScale);
  }
  _layout(force = false) {
    const reference = this.presentation.referenceViewport;
    const width = this.scene.scale?.width || reference.width;
    const height = this.scene.scale?.height || reference.height;
    const signature = `${width}x${height}`;
    if (!force && signature === this._lastViewportSignature) return;
    this._lastViewportSignature = signature;
    const overlay = this.presentation.overlay;
    const scale = this._getViewportScale();
    this.edge.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    this.edgeEcho.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    this.edgeSlip.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    this.bannerRoot.setPosition(width / 2, overlay.bannerY * scale);
    this.bannerFrame.setDisplaySize(overlay.bannerWidth * scale, overlay.bannerHeight * scale);
    this.icon.setPosition(overlay.iconX * scale, 0)
      .setDisplaySize(overlay.iconSizePx * scale, overlay.iconSizePx * scale);
    this.title.setPosition(overlay.textX * scale, overlay.titleY * scale)
      .setFontSize?.(`${overlay.titleFontPx * scale}px`);
    this.detail.setPosition(overlay.textX * scale, overlay.detailY * scale)
      .setFontSize?.(`${overlay.detailFontPx * scale}px`);
  }
  _getViewportScale() {
    const reference = this.presentation.referenceViewport;
    return Math.min(
      (this.scene.scale?.width || reference.width) / reference.width,
      (this.scene.scale?.height || reference.height) / reference.height,
    );
  }
  getDebugSnapshot() {
    return {
      ready: this.isReady(),
      ...this._debug,
      overlayTitle: this.title?.text || "",
      overlayDetail: this.detail?.text || "",
    };
  }
  destroy() {
    this.edge?.destroy();
    this.edgeEcho?.destroy();
    this.edgeSlip?.destroy();
    this.bannerRoot?.destroy(true);
    this.edge = null;
    this.edgeEcho = null;
    this.edgeSlip = null;
    this.bannerRoot = null;
    this.bannerFrame = null;
    this.icon = null;
    this.title = null;
    this.detail = null;
    this.scene = null;
  }
}
