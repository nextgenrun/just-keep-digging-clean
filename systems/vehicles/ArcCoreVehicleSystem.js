import {
  ARC_CORE_CONFIG,
  ARC_CORE_UPGRADE_ID,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "../../values/arcCoreConfig.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { resolveArcCoreDigFootprint } from "./arcCoreDigFootprint.js";

export class ArcCoreVehicleSystem {
  constructor(scene) {
    this.scene = scene;
    this.sprite = null;
    this.prompt = null;
    this.digFx = null;
    this.active = false;
    this._interactConsumed = false;
  }

  create() {
    const tileSize = this.scene.config.tileSize;
    const parking = ARC_CORE_CONFIG.parking;
    this.sprite = this.scene.add
      .image((parking.tileX + 0.5) * tileSize, (parking.tileY + 1) * tileSize, ASSET_KEYS.vehicles.arcCore)
      .setOrigin(0.5, 1)
      .setDepth(18)
      .setDisplaySize(tileSize * ARC_CORE_CONFIG.displaySizeTiles, tileSize * ARC_CORE_CONFIG.displaySizeTiles);

    this.prompt = this.scene.add.text(this.sprite.x, this.sprite.y - tileSize * 1.05, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "14px",
      color: "#77F7FF",
      stroke: "#06121A",
      strokeThickness: 4,
      align: "center",
    }).setOrigin(0.5, 1).setDepth(22).setVisible(false);

    this.digFx = this.scene.add.graphics().setDepth(21);
    this.syncOwnership();
  }

  isUnlocked() {
    return this.scene.upgradeSystem?.godModeActive === true
      || this.scene.upgradeSystem?.getUpgradeLevel?.(ARC_CORE_UPGRADE_ID) > 0
      || this.scene.upgradeSystem?.getUpgradeLevel?.(OMEGA_ARC_CORE_UPGRADE_ID) > 0;
  }

  isOmegaUnlocked() {
    return this.scene.upgradeSystem?.godModeActive === true
      || this.scene.upgradeSystem?.getUpgradeLevel?.(OMEGA_ARC_CORE_UPGRADE_ID) > 0;
  }

  getActiveProfile() {
    return this.isOmegaUnlocked() ? ARC_CORE_CONFIG.omega : ARC_CORE_CONFIG;
  }

  isActive() {
    return this.active;
  }

  syncOwnership() {
    const unlocked = this.isUnlocked();
    const profile = this.getActiveProfile();
    const displaySize = this.scene.config.tileSize * profile.displaySizeTiles;
    this.sprite?.setDisplaySize(displaySize, displaySize)
      .setTint(unlocked ? (this.isOmegaUnlocked() ? 0xd9b3ff : 0xffffff) : 0x59636d);
    if (!unlocked && this.active) this.setActive(false, { silent: true });
    return unlocked;
  }

  setActive(active, options = {}) {
    const next = Boolean(active) && this.isUnlocked();
    if (next === this.active) return this.active;
    this.active = next;
    this.scene.player?.setVisible(!next);
    this.scene.playerBodyLanguage?.setEnabled?.(!next);
    if (!options.silent) {
      const profile = this.getActiveProfile();
      this.scene.hudSystem?.flashStatus?.(
        next
          ? `${profile.displayName || "Arc Core"} online — ${profile.dig.widthTiles} wide × ${profile.dig.depthTiles} deep mining`
          : `${profile.displayName || "Arc Core"} parked`,
        next ? (this.isOmegaUnlocked() ? "#D96CFF" : "#63F5FF") : "#D6E2E8",
        1800
      );
    }
    return this.active;
  }

  update(playerTile, keys) {
    this._interactConsumed = false;
    if (!this.sprite || !playerTile) return false;

    const tileSize = this.scene.config.tileSize;
    const parking = ARC_CORE_CONFIG.parking;
    const distance = Math.abs(playerTile.tx - parking.tileX) + Math.abs(playerTile.ty - parking.tileY);
    const inRange = distance <= ARC_CORE_CONFIG.interactRangeTiles;

    if (this.active) {
      const interactPressed = keys?.interact && Phaser.Input.Keyboard.JustDown(keys.interact);
      const body = this.scene.playerController?.physicsBody;
      if (body) {
        this.sprite.setPosition(body.x + body.w / 2, body.y + body.h);
      } else {
        this.sprite.setPosition(this.scene.player.x, this.scene.player.y);
      }
      this.prompt
        .setPosition(this.sprite.x, this.sprite.y - tileSize * 1.05)
        .setText(`[${USER_SETTINGS.getKeyLabel("interact")}] Exit Arc Core`)
        .setVisible(true);
      this.scene.player?.setVisible(false);

      if (interactPressed) {
        this._interactConsumed = true;
        this.setActive(false);
      }
      return this._interactConsumed;
    }

    this.sprite.setPosition((parking.tileX + 0.5) * tileSize, (parking.tileY + 1) * tileSize);
    this.prompt.setPosition(this.sprite.x, this.sprite.y - tileSize * 1.05);

    if (!inRange) {
      this.prompt.setVisible(false);
      return false;
    }

    const interactPressed = keys?.interact && Phaser.Input.Keyboard.JustDown(keys.interact);
    const unlocked = this.syncOwnership();
    const profile = this.getActiveProfile();
    this.prompt
      .setText(unlocked
        ? `[${USER_SETTINGS.getKeyLabel("interact")}] Pilot ${profile.displayName || "Arc Core"}`
        : "Arc Core locked\nForge in Halo Bastion")
      .setVisible(true);

    if (interactPressed) {
      this._interactConsumed = true;
      if (unlocked) this.setActive(true);
      else this.scene.hudSystem?.flashStatus?.(
        "Attune Cloud Reef and Halo Bastion hearts, then forge the Arc Core.",
        "#FFB347",
        2600
      );
    }
    return this._interactConsumed;
  }

  resolveDigTargets(primaryTarget, aimDirection) {
    return resolveArcCoreDigFootprint(primaryTarget, aimDirection, this.getActiveProfile().dig);
  }

  playDigPulse(targets) {
    if (!this.digFx || !Array.isArray(targets) || targets.length === 0) return;
    const tileSize = this.scene.config.tileSize;
    this.digFx.clear();
    const digConfig = this.getActiveProfile().dig;
    this.digFx.lineStyle(3, digConfig.targetColor, 0.95);
    for (const target of targets) {
      this.digFx.strokeRect(target.tx * tileSize + 4, target.ty * tileSize + 4, tileSize - 8, tileSize - 8);
    }
    this.digFx.lineStyle(5, digConfig.beamColor, 0.8);
    const first = targets[0];
    this.digFx.lineBetween(
      this.sprite.x,
      this.sprite.y - tileSize * 0.48,
      (first.tx + 0.5) * tileSize,
      (first.ty + 0.5) * tileSize
    );
    this.digFx.setAlpha(1);
    this.scene.tweens.killTweensOf(this.digFx);
    this.scene.tweens.add({
      targets: this.digFx,
      alpha: 0,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => this.digFx?.clear(),
    });
  }

  destroy() {
    this.scene.player?.setVisible(true);
    this.scene.tweens?.killTweensOf?.(this.digFx);
    this.sprite?.destroy();
    this.prompt?.destroy();
    this.digFx?.destroy();
    this.sprite = null;
    this.prompt = null;
    this.digFx = null;
  }
}
