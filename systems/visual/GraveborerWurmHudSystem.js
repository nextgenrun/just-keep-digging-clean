import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
} from "../../values/graveborerWurm.js";

const TAU = Math.PI * 2;

/**
 * ImageGen medallion plus live Phaser text. No HTML or generated placeholder
 * panel is used; missing production art hides the widget and reports an error.
 */
export class GraveborerWurmHudSystem {
  constructor(scene, config = GRAVEBORER_WURM_CONFIG, options = {}) {
    this.scene = scene;
    this.config = config;
    this.devToolsEnabled = options.devToolsEnabled === true;
    this.onSummon = typeof options.onSummon === "function"
      ? options.onSummon
      : null;
    this.root = null;
    this.medallion = null;
    this.label = null;
    this.devBadge = null;
    this.devHover = false;
    this.devPressUntilMs = 0;
    this.ready = scene.textures?.exists?.(ASSET_KEYS.environment.graveborerWurm.medallion) === true;
    this._resizeHandler = () => this._layout();
    if (this.ready) {
      this._create();
    } else {
      console.warn("[GraveborerWurmHudSystem] Production Wurm medallion is unavailable.");
    }
  }

  _create() {
    const visuals = this.config.visuals;
    this.root = this.scene.add.container(0, visuals.hudY)
      .setScrollFactor(0)
      .setDepth(visuals.hudDepth)
      .setVisible(false);
    this.medallion = this.scene.add.image(
      0,
      0,
      ASSET_KEYS.environment.graveborerWurm.medallion,
    )
      .setOrigin(0.5)
      .setDisplaySize(visuals.hudSizePx, visuals.hudSizePx);
    this._medallionBaseScaleX = this.medallion.scaleX;
    this._medallionBaseScaleY = this.medallion.scaleY;
    this.label = this.scene.add.text(0, visuals.hudLabelOffsetY, "", {
      fontFamily: visuals.hudLabelFont,
      fontSize: `${visuals.hudLabelFontSizePx}px`,
      fontStyle: "bold",
      color: visuals.hudLabelDormantColor,
      stroke: visuals.hudLabelStrokeColor,
      strokeThickness: visuals.hudLabelStrokeThickness,
      align: "center",
    }).setOrigin(0.5);
    this.devBadge = this.scene.add.text(0, visuals.hudDevBadgeOffsetY, "", {
      fontFamily: visuals.hudLabelFont,
      fontSize: `${visuals.hudDevBadgeFontSizePx}px`,
      fontStyle: "bold",
      color: visuals.hudDevBadgeColor,
      stroke: visuals.hudDevBadgeStrokeColor,
      strokeThickness: visuals.hudDevBadgeStrokeThickness,
    }).setOrigin(0.5).setVisible(false);
    this.root.add([this.medallion, this.label, this.devBadge]);
    if (this.devToolsEnabled) {
      this.medallion
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.devHover = true;
        })
        .on("pointerout", () => {
          this.devHover = false;
        })
        .on("pointerdown", () => {
          if (this.onSummon?.() !== false) {
            this.devPressUntilMs = (this.scene.time?.now || 0)
              + visuals.hudDevPressMs;
          }
        });
    }
    this._layout();
    this.scene.scale?.on?.("resize", this._resizeHandler);
  }

  _layout() {
    if (!this.root) return;
    this.root.setPosition(
      this.config.visuals.hudX,
      this.config.visuals.hudY,
    );
  }

  update(snapshot, timeMs = 0) {
    if (!this.ready) return;
    const active = snapshot?.active === true;
    const devVisible = this.devToolsEnabled === true;
    this.root.setVisible(active || devVisible);
    if (!active && !devVisible) return;

    const visuals = this.config.visuals;
    let label = this.config.labels.dormant;
    let tint = visuals.hudDormantTint;
    let color = visuals.hudLabelDormantColor;
    let alpha = visuals.hudDormantAlpha;
    let pulseHz = visuals.hudDormantPulseHz;
    let pulseAmount = visuals.hudPulseAmount * visuals.hudDormantPulseScale;

    if (!active && devVisible) {
      const enabled = snapshot?.enabled !== false;
      label = enabled
        ? this.config.labels.devReady
        : this.config.labels.devDisabled;
      tint = enabled ? visuals.hudDevReadyTint : visuals.hudDormantTint;
      color = enabled
        ? visuals.hudLabelListeningColor
        : visuals.hudLabelDormantColor;
      alpha = enabled ? visuals.hudDevReadyAlpha : visuals.hudDormantAlpha;
      pulseHz = visuals.hudDevReadyPulseHz;
    } else if (snapshot.phase === GRAVEBORER_WURM_PHASES.warning) {
      label = `${this.config.labels.passPrefix} ${snapshot.passIndex}/${snapshot.passCount}`
        + ` • ${this.config.labels.warningPrefix} ${(snapshot.warningRemainingMs / 1000).toFixed(1)}s`;
      tint = visuals.hudWarningTint;
      color = visuals.hudLabelWarningColor;
      alpha = visuals.hudActiveAlpha;
      pulseHz = visuals.hudWarningPulseHz;
      pulseAmount = visuals.hudPulseAmount;
    } else if (snapshot.phase === GRAVEBORER_WURM_PHASES.burrowing) {
      label = `${this.config.labels.passPrefix} ${snapshot.passIndex}/${snapshot.passCount}`
        + ` • ${this.config.labels.burrowing}`;
      tint = visuals.hudBurrowTint;
      color = visuals.hudLabelBurrowColor;
      alpha = visuals.hudActiveAlpha;
      pulseHz = visuals.hudBurrowPulseHz;
      pulseAmount = visuals.hudPulseAmount * visuals.hudBurrowPulseScale;
    } else if (snapshot.noiseRatio > 0.08 || snapshot.cooldownMs <= 0) {
      label = `${this.config.labels.listening}  ${Math.round(snapshot.noiseRatio * 100)}%`
        + ` • THREAT ${snapshot.difficulty?.threatPercent || 0}%`;
      tint = visuals.hudListeningTint;
      color = visuals.hudLabelListeningColor;
      alpha = visuals.hudListeningAlpha;
      pulseHz = visuals.hudListeningBasePulseHz
        + snapshot.noiseRatio * visuals.hudListeningNoisePulseHz;
      pulseAmount = visuals.hudPulseAmount * (
        visuals.hudListeningPulseScaleBase
        + snapshot.noiseRatio * visuals.hudListeningPulseScaleNoise
      );
    }

    const phase = timeMs / 1000 * pulseHz * TAU;
    const pulse = 1 + Math.sin(phase) * pulseAmount;
    const hoverScale = this.devHover ? visuals.hudDevHoverScale : 1;
    const pressScale = timeMs < this.devPressUntilMs
      ? visuals.hudDevPressScale
      : 1;
    this.medallion
      .setTint(tint)
      .setAlpha(alpha)
      .setRotation(
        Math.sin(phase * visuals.hudRotationWaveScale)
          * visuals.hudRotationRadians,
      )
      .setScale(
        this._medallionBaseScaleX * pulse * hoverScale * pressScale,
        this._medallionBaseScaleY * pulse * hoverScale * pressScale,
      );
    this.label
      .setText(label)
      .setColor(color)
      .setAlpha(Math.max(visuals.hudMinimumLabelAlpha, alpha));
    this.devBadge
      .setText(
        snapshot?.enabled === false
          ? this.config.labels.devBadgeDisabled
          : snapshot?.devTest10x === true
            ? this.config.labels.devBadge10x
            : this.config.labels.devBadge,
      )
      .setVisible(devVisible);
  }

  destroy() {
    this.scene?.scale?.off?.("resize", this._resizeHandler);
    this.medallion?.removeAllListeners?.();
    this.medallion?.disableInteractive?.();
    this.root?.destroy(true);
    this.root = null;
    this.medallion = null;
    this.label = null;
    this.devBadge = null;
    this.onSummon = null;
    this.scene = null;
  }
}
