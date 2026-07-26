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
  constructor(scene, config = GRAVEBORER_WURM_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.medallion = null;
    this.label = null;
    this.devBadge = null;
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
    this.devBadge = this.scene.add.text(0, 23, "DEV 10×", {
      fontFamily: visuals.hudLabelFont,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffd18a",
      stroke: "#120908",
      strokeThickness: 4,
    }).setOrigin(0.5).setVisible(false);
    this.root.add([this.medallion, this.label, this.devBadge]);
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
    this.root.setVisible(active);
    if (!active) return;

    const visuals = this.config.visuals;
    let label = this.config.labels.dormant;
    let tint = visuals.hudDormantTint;
    let color = visuals.hudLabelDormantColor;
    let alpha = visuals.hudDormantAlpha;
    let pulseHz = 0.8;
    let pulseAmount = visuals.hudPulseAmount * 0.25;

    if (snapshot.phase === GRAVEBORER_WURM_PHASES.warning) {
      label = `${this.config.labels.warningPrefix} ${(snapshot.warningRemainingMs / 1000).toFixed(1)}s`;
      tint = visuals.hudWarningTint;
      color = visuals.hudLabelWarningColor;
      alpha = visuals.hudActiveAlpha;
      pulseHz = visuals.hudWarningPulseHz;
      pulseAmount = visuals.hudPulseAmount;
    } else if (snapshot.phase === GRAVEBORER_WURM_PHASES.burrowing) {
      label = this.config.labels.burrowing;
      tint = visuals.hudBurrowTint;
      color = visuals.hudLabelBurrowColor;
      alpha = visuals.hudActiveAlpha;
      pulseHz = visuals.hudBurrowPulseHz;
      pulseAmount = visuals.hudPulseAmount * 1.25;
    } else if (snapshot.noiseRatio > 0.08 || snapshot.cooldownMs <= 0) {
      label = `${this.config.labels.listening}  ${Math.round(snapshot.noiseRatio * 100)}%`;
      tint = visuals.hudListeningTint;
      color = visuals.hudLabelListeningColor;
      alpha = visuals.hudListeningAlpha;
      pulseHz = 1.6 + snapshot.noiseRatio;
      pulseAmount = visuals.hudPulseAmount * (0.35 + snapshot.noiseRatio * 0.5);
    }

    const phase = timeMs / 1000 * pulseHz * TAU;
    const pulse = 1 + Math.sin(phase) * pulseAmount;
    this.medallion
      .setTint(tint)
      .setAlpha(alpha)
      .setRotation(Math.sin(phase * 0.34) * 0.018)
      .setScale(
        this._medallionBaseScaleX * pulse,
        this._medallionBaseScaleY * pulse,
      );
    this.label.setText(label).setColor(color).setAlpha(Math.max(0.72, alpha));
    this.devBadge.setVisible(snapshot.devTest10x === true);
  }

  destroy() {
    this.scene?.scale?.off?.("resize", this._resizeHandler);
    this.root?.destroy(true);
    this.root = null;
    this.medallion = null;
    this.label = null;
    this.devBadge = null;
    this.scene = null;
  }
}
