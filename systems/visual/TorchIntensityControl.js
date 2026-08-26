import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export class TorchIntensityControl {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.approvedSkinActive = options.approvedSkinActive === true;
    this.onCycle = typeof options.onCycle === "function" ? options.onCycle : null;
    this.onAdjust = typeof options.onAdjust === "function" ? options.onAdjust : null;
    this.visible = true;
    this.active = false;
    this.intensity = 1;
    this.drainGpPerSecond = 0;
    this.frame = null;
    this.text = null;
    this.hit = null;
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
        x: approved.x * scale,
        y: approved.y * scale,
        width: approved.width * scale,
        height: approved.height * scale,
        fontSize: `${approved.fontSize * scale}px`,
        lineSpacing: approved.lineSpacing * scale,
      }
      : {
        x: HUD_LAYOUT.torchIntensityX,
        y: HUD_LAYOUT.torchIntensityY,
        width: HUD_LAYOUT.torchIntensityHitW,
        height: HUD_LAYOUT.torchIntensityHitH,
        fontSize: HUD_LAYOUT.torchIntensityFontSize,
        lineSpacing: -2,
      };

    if (this.approvedSkinActive) {
      this.frame = this.scene.add.image(
        layout.x,
        layout.y,
        ASSET_KEYS.ui.approvedHud.buffChip,
      )
        .setOrigin(0, 0)
        .setDisplaySize(layout.width, layout.height)
        .setScrollFactor(0)
        .setDepth(HUD_LAYOUT.hudDepth - 1);
    }

    this.text = this.scene.add.text(
      this.approvedSkinActive ? layout.x + layout.width / 2 : layout.x,
      this.approvedSkinActive ? layout.y + layout.height / 2 : layout.y,
      "",
      {
        align: "center",
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
      .setOrigin(this.approvedSkinActive ? 0.5 : 0, this.approvedSkinActive ? 0.5 : 0)
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
    this.hit.on("wheel", (_pointer, _deltaX, deltaY, _deltaZ, event) => {
      event?.stopPropagation?.();
      if (deltaY !== 0) this.onAdjust?.(deltaY < 0 ? 1 : -1);
    });
    this.hit.on("pointerover", () => this.frame?.setAlpha(1));
    this.hit.on("pointerout", () => this.frame?.setAlpha(0.96));
    this.frame?.setAlpha(0.96);
  }

  setState(active, intensity, drainGpPerSecond) {
    this.active = Boolean(active);
    this.intensity = clamp01(intensity);
    this.drainGpPerSecond = Math.max(0, Number(drainGpPerSecond) || 0);
    const percent = Math.round(this.intensity * 100);
    this.text?.setText(
      `${HUD_LAYOUT.torchIntensityLabel} ${percent}%\n${HUD_LAYOUT.torchIntensityHint}`,
    );
    this.text?.setColor(
      this.active
        ? HUD_LAYOUT.torchIntensityOnColor
        : HUD_LAYOUT.torchIntensityOffColor,
    );
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.frame?.setVisible(this.visible);
    this.text?.setVisible(this.visible);
    this.hit?.setVisible(this.visible);
    if (this.hit?.input) this.hit.input.enabled = this.visible;
  }

  getSnapshot() {
    return {
      active: this.active,
      intensity: this.intensity,
      percent: Math.round(this.intensity * 100),
      drainGpPerSecond: this.drainGpPerSecond,
      approvedSkinActive: this.approvedSkinActive,
      visible: this.visible,
    };
  }

  destroy() {
    this.hit?.removeAllListeners();
    this.hit?.destroy();
    this.text?.destroy();
    this.frame?.destroy();
    this.hit = null;
    this.text = null;
    this.frame = null;
    this.scene = null;
  }
}
