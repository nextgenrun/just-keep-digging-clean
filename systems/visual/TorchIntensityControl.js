import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import { fitLiveUiText } from "./bakedUiArt.js";
import { TorchIntensityTooltip } from "./TorchIntensityTooltip.js";

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
    this.title = null;
    this.text = null;
    this.hit = null;
    this._wheelHandler = null;
    this._create();
    this.tooltip = this.approvedSkinActive ? new TorchIntensityTooltip(scene, this) : null;
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
        titleX: approved.titleX * scale,
        titleY: approved.titleY * scale,
        titleFontSize: `${approved.titleFontSize * scale}px`,
        textX: approved.textX * scale,
        textY: approved.textY * scale,
        fontSize: `${approved.fontSize * scale}px`,
        lineSpacing: 0,
        textWidth: approved.textWidth * scale,
        restAlpha: approved.restAlpha,
        hoverAlpha: approved.hoverAlpha,
        contentDepth: HUD_LAYOUT.hudOverlayDepth
          + APPROVED_HUD_SKIN.layout.layers.contentOffset,
        interactionDepth: HUD_LAYOUT.hudOverlayDepth
          + APPROVED_HUD_SKIN.layout.layers.interactionOffset,
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
        contentDepth: HUD_LAYOUT.hudOverlayDepth,
        interactionDepth: HUD_LAYOUT.hudOverlayDepth + 1,
      };

    this.layout = layout;
    if (this.approvedSkinActive) {
      this.title = this.scene.add.text(
        layout.titleX,
        layout.titleY,
        HUD_LAYOUT.torchIntensityLabel,
        {
          align: "center",
          fontFamily: APPROVED_HUD_SKIN.font.family,
          fontSize: layout.titleFontSize,
          fontStyle: "bold",
          color: HUD_LAYOUT.torchIntensityOffColor,
          stroke: APPROVED_HUD_SKIN.font.shadow,
          strokeThickness: 1,
        },
      )
        .setOrigin(0.5)
        .setAlpha(layout.restAlpha)
        .setScrollFactor(0)
        .setDepth(layout.contentDepth);
    }

    this.text = this.scene.add.text(
      layout.textX,
      layout.textY,
      "",
      {
        align: this.approvedSkinActive ? "center" : "left",
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
      .setAlpha(layout.restAlpha)
      .setScrollFactor(0)
      .setDepth(layout.contentDepth);

    if (this.approvedSkinActive) {
      this.status = this.scene.add.text(approved.textX * scale, approved.statusY * scale, "", {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: approved.statusFontSize * scale,
        color: HUD_LAYOUT.torchIntensityOffColor,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(layout.contentDepth);
    }

    this.hit = this.scene.add.zone(
      layout.x + layout.width / 2,
      layout.y + layout.height / 2,
      layout.width,
      layout.height,
    )
      .setScrollFactor(0)
      .setDepth(layout.interactionDepth)
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
    this.hit.on("pointerover", () => {
      this.title?.setAlpha(layout.hoverAlpha);
      this.text?.setAlpha(layout.hoverAlpha);
      this.tooltip?.show();
    });
    this.hit.on("pointerout", () => {
      this.title?.setAlpha(layout.restAlpha);
      this.text?.setAlpha(layout.restAlpha);
      this.tooltip?.hide();
    });
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
    const approved = APPROVED_HUD_SKIN.layout.torchIntensity;
    this.title?.setText(this.overdriveActive ? approved.overdriveLabel : approved.label);
    this.status?.setText(this.active ? approved.onLabel : approved.offLabel);
    this.text?.setText(
      this.approvedSkinActive
        ? `${percent}%`
        : `${label} ${percent}%\n${HUD_LAYOUT.torchIntensityHint}`,
    );
    const color = this.active
      ? this.overdriveActive
        ? HUD_LAYOUT.torchIntensityOverdriveColor
        : HUD_LAYOUT.torchIntensityOnColor
      : HUD_LAYOUT.torchIntensityOffColor;
    this.title?.setColor(color);
    this.text?.setColor(color);
    this.status?.setColor(color);
    if (this.approvedSkinActive) fitLiveUiText(this.text, this.layout.textWidth);
    this.tooltip?.refresh();
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.title?.setVisible(this.visible);
    this.text?.setVisible(this.visible);
    this.status?.setVisible(this.visible);
    if (!this.visible) this.tooltip?.hide();
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
      titleText: this.title?.text || "",
      displayText: this.text?.text || "",
      statusText: this.status?.text || "",
      tooltipVisible: this.tooltip?.root?.visible === true,
      visible: this.visible,
    };
  }

  destroy() {
    this.scene?.input?.off?.("wheel", this._wheelHandler);
    this.tooltip?.destroy();
    this.tooltip = null;
    this.status?.destroy();
    this.status = null;
    this.hit?.removeAllListeners();
    this.hit?.destroy();
    this.title?.destroy();
    this.text?.destroy();
    this.hit = null;
    this.title = null;
    this.text = null;
    this._wheelHandler = null;
    this.scene = null;
  }
}
