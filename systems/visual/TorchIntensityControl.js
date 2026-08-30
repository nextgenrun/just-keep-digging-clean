import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";

const clampTorchIntensity = (value) => Math.max(
  0,
  Math.min(
    LIGHT_CONFIG.torchIntensity.maximumPercent / 100,
    Number(value) || 0,
  ),
);

export class TorchIntensityControl {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.approvedSkinActive = options.approvedSkinActive === true;
    this.onCycle = typeof options.onCycle === "function" ? options.onCycle : null;
    this.onAdjust = typeof options.onAdjust === "function" ? options.onAdjust : null;
    this.visible = true;
    this.active = false;
    this.intensity = 1;
    this.overdriveActive = false;
    this.drainGpPerSecond = 0;
    this.text = null;
    this.hit = null;
    this._wheelHandler = null;
    this._create();
    this.setState(false, 1, 0);
  }

  _create() {
    const approved = APPROVED_HUD_SKIN.layout.torchIntensity;
    const scale = Math.min(
      (this.scene.scale?.width || 1280) / APPROVED_HUD_SKIN.referenceViewport.width,
      (this.scene.scale?.height || 720) / APPROVED_HUD_SKIN.referenceViewport.height,
    );
    const layout = this.approvedSkinActive
      ? {
        x: approved.hitX * scale,
        y: approved.hitY * scale,
        width: approved.hitWidth * scale,
        height: approved.hitHeight * scale,
        textX: approved.textX * scale,
        textY: approved.textY * scale,
        fontSize: `${approved.fontSize * scale}px`,
        lineSpacing: 0,
        restAlpha: approved.restAlpha,
        hoverAlpha: approved.hoverAlpha,
      }
      : {
        x: HUD_LAYOUT.torchIntensityX,
        y: HUD_LAYOUT.torchIntensityY,
        width: HUD_LAYOUT.torchIntensityHitW,
        height: HUD_LAYOUT.torchIntensityHitH,
        textX: HUD_LAYOUT.torchIntensityX,
        textY: HUD_LAYOUT.torchIntensityY,
        fontSize: HUD_LAYOUT.torchIntensityFontSize,
        lineSpacing: -2,
        restAlpha: 1,
        hoverAlpha: 1,
      };

    this.text = this.scene.add.text(
      layout.textX,
      layout.textY,
      "",
      {
        align: this.approvedSkinActive ? "right" : "left",
        fontFamily: this.approvedSkinActive
          ? APPROVED_HUD_SKIN.font.family
          : "Consolas, monospace",
        fontSize: layout.fontSize,
        fontStyle: this.approvedSkinActive ? "bold" : "normal",
        color: HUD_LAYOUT.torchIntensityOffColor,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: this.approvedSkinActive
          ? APPROVED_HUD_SKIN.font.strokeThickness
          : 1,
        lineSpacing: layout.lineSpacing,
      },
    )
      .setOrigin(this.approvedSkinActive ? 1 : 0, 0)
      .setAlpha(layout.restAlpha)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth);

    this.hit = this.scene.add.zone(
      layout.x + layout.width / 2,
      layout.y + layout.height / 2,
      layout.width,
      layout.height,
    )
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + 1)
      .setInteractive({ useHandCursor: true });
    this.hit.on("pointerdown", (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      this.onCycle?.();
    });
    this._wheelHandler = (pointer, _gameObjects, _deltaX, deltaY) => {
      if (!this.visible || deltaY === 0) return;
      pointer?.event?.preventDefault?.();
      pointer?.event?.stopPropagation?.();
      this.onAdjust?.(deltaY < 0 ? 1 : -1);
    };
    this.scene.input?.on?.("wheel", this._wheelHandler);
    this.hit.on("pointerover", () => this.text?.setAlpha(layout.hoverAlpha));
    this.hit.on("pointerout", () => this.text?.setAlpha(layout.restAlpha));
  }

  setState(active, intensity, drainGpPerSecond) {
    this.active = Boolean(active);
    this.intensity = clampTorchIntensity(intensity);
    this.drainGpPerSecond = Math.max(0, Number(drainGpPerSecond) || 0);
    const percent = Math.round(this.intensity * 100);
    this.overdriveActive = percent > LIGHT_CONFIG.torchIntensity.overdrive.startPercent;
    const label = this.overdriveActive
      ? HUD_LAYOUT.torchIntensityOverdriveLabel
      : HUD_LAYOUT.torchIntensityLabel;
    this.text?.setText(
      this.approvedSkinActive
        ? `${percent}%`
        : `${label} ${percent}%\n${HUD_LAYOUT.torchIntensityHint}`,
    );
    this.text?.setColor(
      this.active
        ? this.overdriveActive
          ? HUD_LAYOUT.torchIntensityOverdriveColor
          : HUD_LAYOUT.torchIntensityOnColor
        : HUD_LAYOUT.torchIntensityOffColor,
    );
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.text?.setVisible(this.visible);
    this.hit?.setVisible(this.visible);
    if (this.hit?.input) this.hit.input.enabled = this.visible;
  }

  getSnapshot() {
    return {
      active: this.active,
      intensity: this.intensity,
      percent: Math.round(this.intensity * 100),
      overdriveActive: this.overdriveActive,
      drainGpPerSecond: this.drainGpPerSecond,
      approvedSkinActive: this.approvedSkinActive,
      integratedIntoPlayerCore: this.approvedSkinActive,
      displayText: this.text?.text || "",
      visible: this.visible,
    };
  }

  destroy() {
    this.scene?.input?.off?.("wheel", this._wheelHandler);
    this.hit?.removeAllListeners();
    this.hit?.destroy();
    this.text?.destroy();
    this.hit = null;
    this.text = null;
    this._wheelHandler = null;
    this.scene = null;
  }
}
