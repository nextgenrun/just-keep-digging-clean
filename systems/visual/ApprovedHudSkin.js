import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";

const REQUIRED_KEYS = Object.freeze(Object.values(ASSET_KEYS.ui.approvedHud));

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
    this.buffFrames = [];
    this.buffTexts = [];
    if (!this.active) return;

    this.scale = Math.min(
      (scene.scale?.width || 1280) / APPROVED_HUD_SKIN.referenceViewport.width,
      (scene.scale?.height || 720) / APPROVED_HUD_SKIN.referenceViewport.height,
    );
    this._createFrames();
    this._applyLegacyObjectLayout();
    this.setTorchState(hud.torchActive);
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

    this.comboFrame = this._image(
      width / 2 - layout.combo.width * s / 2,
      layout.combo.y * s,
      ASSET_KEYS.ui.approvedHud.combo,
      layout.combo.width * s,
      layout.combo.height * s,
      depth,
    ).setVisible(false);

    const worldX = width - (layout.worldState.right + layout.worldState.width) * s;
    this.worldFrame = this._image(
      worldX,
      layout.worldState.y * s,
      ASSET_KEYS.ui.approvedHud.worldState,
      layout.worldState.width * s,
      layout.worldState.height * s,
      depth,
    );

    for (let index = 0; index < layout.buffs.maxVisible; index += 1) {
      const x = (layout.buffs.x + index * (layout.buffs.width + layout.buffs.gap)) * s;
      const frame = this._image(
        x,
        layout.buffs.y * s,
        ASSET_KEYS.ui.approvedHud.buffChip,
        layout.buffs.width * s,
        layout.buffs.height * s,
        depth,
      ).setVisible(false);
      const text = this.scene.add.text(
        x + layout.buffs.width * s / 2,
        (layout.buffs.y + layout.buffs.height / 2) * s,
        "",
        { align: "center" },
      ).setOrigin(0.5).setScrollFactor(0).setDepth(HUD_LAYOUT.hudOverlayDepth).setVisible(false);
      setHudTextStyle(text, layout.buffs.fontSize * s, APPROVED_HUD_SKIN.font.cyan);
      this.buffFrames.push(frame);
      this.buffTexts.push(text);
    }
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
    hud.weatherPanel?.setVisible(false);
    hud.weatherSeasonText?.setVisible(false);

    hud.statsText?.setPosition(layout.depth.x * s, layout.depth.y * s).setOrigin(0, 0);
    setHudTextStyle(hud.statsText, layout.depth.fontSize * s);

    const comboX = width / 2;
    hud.comboText?.setPosition(comboX, (layout.combo.y + layout.combo.textY) * s).setOrigin(0.5, 0);
    setHudTextStyle(hud.comboText, layout.combo.fontSize * s);

    hud.clockTimeText?.setPosition(worldX + layout.worldState.timeX * s, (layout.worldState.y + layout.worldState.topY) * s);
    hud.clockDayText?.setPosition(worldX + layout.worldState.dayX * s, (layout.worldState.y + layout.worldState.topY) * s);
    hud.weatherText?.setPosition(worldX + layout.worldState.weatherX * s, (layout.worldState.y + layout.worldState.bottomY) * s);
    hud.weatherTempText?.setPosition(worldX + layout.worldState.temperatureX * s, (layout.worldState.y + layout.worldState.bottomY) * s);
    [hud.clockTimeText, hud.clockDayText, hud.weatherText, hud.weatherTempText].forEach((text) => {
      setHudTextStyle(text, layout.worldState.fontSize * s);
    });
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

  getWeatherBarLayout() {
    const layout = APPROVED_HUD_SKIN.layout;
    const s = this.scale;
    const worldX = (this.scene.scale?.width || 1280) - (layout.worldState.right + layout.worldState.width) * s;
    return {
      x: worldX + layout.weatherBar.xInset * s,
      y: (layout.worldState.y + layout.weatherBar.y) * s,
      width: layout.weatherBar.width * s,
      height: layout.weatherBar.height * s,
    };
  }

  setBuffLines(lines) {
    if (!this.active) return;
    this.buffFrames.forEach((frame, index) => {
      const line = lines[index] || "";
      frame.setVisible(Boolean(line));
      this.buffTexts[index].setText(line).setVisible(Boolean(line));
    });
  }

  setComboVisible(visible) {
    this.comboFrame?.setVisible(Boolean(visible));
  }

  setTorchState(active) {
    if (!this.active) return;
    this.playerFrame?.setTexture(
      active
        ? ASSET_KEYS.ui.approvedHud.playerCore
        : ASSET_KEYS.ui.approvedHud.playerCoreTorchOff
    );
    this.hud.torchStatusText?.setVisible(false);
  }

  destroy() {
    [this.playerFrame, this.comboFrame, this.worldFrame, ...this.buffFrames, ...this.buffTexts]
      .forEach((object) => object?.destroy());
    this.buffFrames = [];
    this.buffTexts = [];
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
}
