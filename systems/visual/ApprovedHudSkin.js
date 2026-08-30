import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { PickaxeHudView } from "./PickaxeHudView.js";
import { ApprovedHudBuffView } from "./ApprovedHudBuffView.js";

const REQUIRED_KEYS = Object.freeze(Object.values(ASSET_KEYS.ui.approvedHud));
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function hasApprovedHudSkin(scene) {
  return APPROVED_HUD_SKIN.enabled === true
    && Boolean(scene?.textures)
    && REQUIRED_KEYS.every((key) => scene.textures.exists(key));
}

function setHudTextStyle(text, size, color = APPROVED_HUD_SKIN.font.color) {
  text?.setStyle({
    fontFamily: APPROVED_HUD_SKIN.font.family,
    fontSize: `${size}px`,
    fontStyle: "bold",
    color,
    stroke: APPROVED_HUD_SKIN.font.shadow,
    strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
  });
}

export class ApprovedHudSkin {
  constructor(scene, hud) {
    this.scene = scene;
    this.hud = hud;
    this.active = hasApprovedHudSkin(scene);
    this.buffView = null;
    this.buffFrames = [];
    this.buffTexts = [];
    this.torchBurnFrame = null;
    this.torchActive = false;
    this.torchIntensity = 1;
    this.torchBurnAlpha = 0;
    this.pickaxeHudView = null;
    if (!this.active) return;

    this.scale = Math.min(
      (scene.scale?.width || 1280) / APPROVED_HUD_SKIN.referenceViewport.width,
      (scene.scale?.height || 720) / APPROVED_HUD_SKIN.referenceViewport.height,
    );
    this._createFrames();
    this.buffView = new ApprovedHudBuffView(scene, this.scale);
    this.buffFrames = this.buffView.frames;
    this.buffTexts = this.buffView.texts;
    this._applyLegacyObjectLayout();
    this.pickaxeHudView = new PickaxeHudView(scene, this.scale);
    this.setTorchState(hud.torchActive, hud.torchIntensity);
  }

  _createFrames() {
    const layout = APPROVED_HUD_SKIN.layout;
    const depth = HUD_LAYOUT.hudDepth - 2;
    const width = this.scene.scale?.width || 1280;
    const s = this.scale;

    this.playerFrame = this._image(
      layout.playerCore.x * s,
      layout.playerCore.y * s,
      ASSET_KEYS.ui.approvedHud.playerCore,
      layout.playerCore.width * s,
      layout.playerCore.height * s,
      depth,
    );

    const burn = layout.torchBurn;
    const burnScaleX = layout.playerCore.width / burn.sourceWidth;
    const burnScaleY = layout.playerCore.height / burn.sourceHeight;
    this.torchBurnFrame = this._croppedImage(
      (layout.playerCore.x + burn.sourceCrop.x * burnScaleX) * s,
      (layout.playerCore.y + burn.sourceCrop.y * burnScaleY) * s,
      ASSET_KEYS.ui.approvedHud.playerCore,
      burn.sourceCrop,
      burn.sourceCrop.width * burnScaleX * s,
      burn.sourceCrop.height * burnScaleY * s,
      depth,
    ).setAlpha(0).setVisible(false);

    this.comboFrame = this._image(
      width / 2 - layout.combo.width * s / 2,
      layout.combo.y * s,
      ASSET_KEYS.ui.approvedHud.combo,
      layout.combo.width * s,
      layout.combo.height * s,
      depth,
    ).setVisible(false);

    this.worldFrame = HUD_LAYOUT.showWorldStateHud
      ? this._croppedImage(
          width - (layout.worldState.right + layout.worldState.width) * s,
          layout.worldState.y * s,
          ASSET_KEYS.ui.approvedHud.worldState,
          layout.worldState.sourceCrop,
          layout.worldState.width * s,
          layout.worldState.height * s,
          depth,
        )
      : null;

  }

  _applyLegacyObjectLayout() {
    const hud = this.hud;
    const layout = APPROVED_HUD_SKIN.layout;
    const width = this.scene.scale?.width || 1280;
    const s = this.scale;
    const worldX = width - (layout.worldState.right + layout.worldState.width) * s;

    hud.hudBg?.setVisible(false);
    hud.statusBg?.setVisible(false);
    hud.torchIcon?.setVisible(false);
    hud.torchStatusText?.setVisible(false);
    hud.buffTimerText?.setVisible(false);
    hud.clockPanel?.setVisible(false);
    hud.clockTimeText?.setVisible(HUD_LAYOUT.showWorldStateHud);
    hud.clockDayText?.setVisible(HUD_LAYOUT.showWorldStateHud);

    hud.statsText?.setPosition(layout.depth.x * s, layout.depth.y * s).setOrigin(0, 0);
    setHudTextStyle(hud.statsText, layout.depth.fontSize * s);

    const comboX = width / 2;
    hud.comboText?.setPosition(comboX, (layout.combo.y + layout.combo.textY) * s).setOrigin(0.5, 0);
    setHudTextStyle(hud.comboText, layout.combo.fontSize * s);

    hud.clockTimeText?.setPosition(
      worldX + layout.worldState.timeX * s,
      (layout.worldState.y + layout.worldState.topY) * s,
    ).setOrigin(0, 0.5);
    hud.clockDayText?.setPosition(
      worldX + layout.worldState.dayX * s,
      (layout.worldState.y + layout.worldState.topY) * s,
    ).setOrigin(0, 0.5);
    setHudTextStyle(
      hud.clockTimeText,
      layout.worldState.timeFontSize * s,
      APPROVED_HUD_SKIN.font.gold,
    );
    setHudTextStyle(
      hud.clockDayText,
      layout.worldState.dayFontSize * s,
      APPROVED_HUD_SKIN.font.secondary,
    );
  }

  bindGemPowerObjects(bg, fill, label) {
    if (!this.active) return;
    const gp = APPROVED_HUD_SKIN.layout.gemPower;
    const s = this.scale;
    setHudTextStyle(label, gp.fontSize * s);
    label?.setPosition(gp.labelX * s, gp.labelY * s).setOrigin(0, 0);
    bg?.setDepth(HUD_LAYOUT.hudDepth);
    fill?.setDepth(HUD_LAYOUT.hudOverlayDepth);
  }

  getGemPowerLayout() {
    const gp = APPROVED_HUD_SKIN.layout.gemPower;
    const s = this.scale;
    return { x: gp.x * s, y: gp.y * s, width: gp.width * s, height: gp.height * s, radius: gp.radius * s };
  }

  getComboTimerLayout() {
    const combo = APPROVED_HUD_SKIN.layout.combo;
    const s = this.scale;
    return {
      x: (this.scene.scale?.width || 1280) / 2 - combo.width * s / 2 + combo.timerX * s,
      y: (combo.y + combo.timerY) * s,
      width: combo.timerWidth * s,
      height: combo.timerHeight * s,
    };
  }

  setBuffLines(lines) {
    this.setBuffEntries(lines.map(text => ({ text })));
  }

  setBuffEntries(entries) {
    if (!this.active) return;
    this.buffView?.setEntries(entries);
  }

  getBuffSnapshot() {
    return this.buffView?.getSnapshot() || Object.freeze({
      visibleEntries: 0,
      tooltipVisible: false,
    });
  }

  setComboVisible(visible) {
    this.comboFrame?.setVisible(Boolean(visible));
  }

  setTorchState(active, intensity = this.torchIntensity) {
    if (!this.active) return;
    this.torchActive = Boolean(active);
    this.torchIntensity = clamp01(intensity);
    this.playerFrame?.setTexture(ASSET_KEYS.ui.approvedHud.playerCoreTorchOff);
    this.setTorchBurn(this.torchActive ? this.torchIntensity : 0);
    this.hud.torchStatusText?.setVisible(false);
  }

  setTorchBurn(alpha) {
    if (!this.active) return;
    this.torchBurnAlpha = this.torchActive ? clamp01(alpha) : 0;
    const visible = this.torchActive && this.torchBurnAlpha > 0;
    this.torchBurnFrame?.setAlpha(this.torchBurnAlpha).setVisible(visible);
  }

  getTorchBurnSnapshot() {
    return {
      active: this.torchActive,
      intensity: this.torchIntensity,
      alpha: this.torchBurnAlpha,
      visible: this.torchBurnFrame?.visible === true,
    };
  }

  setCurrentPickaxe(pickaxeId, options = {}) {
    if (!this.active) return false;
    return this.pickaxeHudView?.setPickaxe(pickaxeId, options) === true;
  }

  getCurrentPickaxeTheme() {
    return this.pickaxeHudView?.getTheme() || null;
  }

  getPickaxeHudSnapshot() {
    return this.pickaxeHudView?.getSnapshot() || Object.freeze({
      enabled: false,
      ready: false,
      pickaxeId: null,
      label: "",
      overlayVisible: false,
    });
  }

  destroy() {
    this.pickaxeHudView?.destroy();
    this.buffView?.destroy();
    [
      this.playerFrame,
      this.torchBurnFrame,
      this.comboFrame,
      this.worldFrame,
    ]
      .forEach((object) => object?.destroy());
    this.buffView = null;
    this.buffFrames = [];
    this.buffTexts = [];
    this.torchBurnFrame = null;
    this.pickaxeHudView = null;
    this.scene = null;
    this.hud = null;
  }

  _image(x, y, key, width, height, depth) {
    return this.scene.add.image(x, y, key)
      .setOrigin(0, 0)
      .setDisplaySize(width, height)
      .setScrollFactor(0)
      .setDepth(depth);
  }

  _croppedImage(x, y, key, crop, width, height, depth) {
    return this.scene.add.image(x, y, key)
      .setOrigin(0, 0)
      .setCrop(crop.x, crop.y, crop.width, crop.height)
      .setDisplayOrigin(crop.x, crop.y)
      .setScale(width / crop.width, height / crop.height)
      .setScrollFactor(0)
      .setDepth(depth);
  }
}
