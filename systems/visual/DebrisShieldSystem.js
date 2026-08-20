import { ASSET_KEYS } from "../../values/assetKeys.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { DEBRIS_SHIELD_CONFIG } from "../../values/debrisShield.js";

export class DebrisShieldSystem {
  constructor(scene, config = DEBRIS_SHIELD_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.threatActive = false;
    this.active = false;
    this._create();
  }

  _create() {
    if (this.config.enabled !== true) return;
    if (this.scene.textures.exists(this.config.world.haloKey)) {
      this.halo = this.scene.add.image(0, 0, this.config.world.haloKey)
        .setDisplaySize(this.config.world.displaySizePx, this.config.world.displaySizePx)
        .setDepth((this.scene.player?.depth || 20) + this.config.world.depthOffset)
        .setAlpha(this.config.world.alpha)
        .setVisible(false);
      this._haloBaseScaleX = this.halo.scaleX;
      this._haloBaseScaleY = this.halo.scaleY;
      const addMode = globalThis.Phaser?.BlendModes?.ADD;
      if (addMode !== undefined) this.halo.setBlendMode(addMode);
    }
    if (!this.scene.textures.exists(ASSET_KEYS.ui.approvedHud.buffChip)) return;
    const hud = this.config.hud;
    this.hudRoot = this.scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(hud.depth).setVisible(false);
    this.hudFrame = this.scene.add.image(0, 0, ASSET_KEYS.ui.approvedHud.buffChip)
      .setDisplaySize(hud.widthPx, hud.heightPx);
    this.hudIcon = this.scene.add.image(
      hud.iconOffsetXPx,
      0,
      this.config.world.haloKey,
    ).setDisplaySize(hud.iconSizePx, hud.iconSizePx);
    this.hudLabel = this.scene.add.text(hud.labelOffsetXPx, 0, "", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: `${hud.labelFontSizePx}px`,
      fontStyle: "bold",
      color: hud.readyColor,
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
    }).setOrigin(0.5);
    this.hudRoot.add([this.hudFrame, this.hudIcon, this.hudLabel]);
    this.resize();
  }

  update(deltaMs, key, earthquakeSystem) {
    this.threatActive = Boolean(
      earthquakeSystem?.caveIns?.length || earthquakeSystem?.fallingRocks?.length,
    );
    const gp = this.scene.playerController?.getGemPowerExact?.() || 0;
    this.active = this.threatActive
      && key?.isDown === true
      && gp > this.config.minimumGpToActivate;
    if (this.active) {
      this.scene.playerController?.consumeGemPower?.(
        this.config.gpDrainPerSecond * Math.max(0, deltaMs) / 1000,
        { source: "debrisShield" },
      );
    }
    this._syncVisuals();
    return this.active;
  }

  isInputCaptured() {
    return this.threatActive;
  }

  absorbFallingRock(rock) {
    if (!this.active) return false;
    this.scene.floatingTextSystem?.showFloatingText?.(
      rock.x,
      rock.y,
      this.config.feedback.blockedText,
      this.config.feedback.blockedColor,
      this.config.feedback.blockedDurationMs,
      undefined,
      "status",
    );
    this.scene.soundSystem?.playUiConfirm?.();
    this.scene.shakeSystem?.shake?.("earthquake.warning", 0.35);
    return true;
  }

  _syncVisuals() {
    const player = this.scene.playerController?.sprite || this.scene.player;
    if (this.halo && player) {
      const time = (this.scene.time?.now || 0) / 1000;
      const pulse = 1 + Math.max(0, Math.sin(
        time * Math.PI * 2 * this.config.world.pulseHz,
      )) * this.config.world.pulseScale;
      this.halo.setPosition(player.x, player.y - (player.displayHeight || 0) * 0.5)
        .setScale(
          this._haloBaseScaleX * pulse,
          this._haloBaseScaleY * pulse,
        )
        .setVisible(this.active);
    }
    this.hudRoot?.setVisible(this.threatActive);
    if (!this.hudLabel) return;
    const label = (this.active
      ? this.config.hud.activeLabel
      : this.config.hud.readyLabel)
      .replace("{key}", this.config.fixedKeyLabel)
      .replace("{drain}", String(this.config.gpDrainPerSecond));
    this.hudLabel.setText(label).setColor(
      this.active ? this.config.hud.activeColor : this.config.hud.readyColor,
    );
  }

  resize() {
    if (!this.hudRoot) return;
    const width = this.scene.scale?.width || 1280;
    const height = this.scene.scale?.height || 720;
    this.hudRoot.setPosition(width / 2, height - this.config.hud.bottomPx);
  }

  destroy() {
    this.halo?.destroy?.();
    this.hudRoot?.destroy?.(true);
    this.halo = null;
    this.hudRoot = null;
    this.scene = null;
  }
}
