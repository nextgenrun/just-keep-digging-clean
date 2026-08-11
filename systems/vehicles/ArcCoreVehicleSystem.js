import {
  ARC_CORE_CONFIG,
  ARC_CORE_UPGRADE_ID,
  OMEGA_ARC_CORE_UPGRADE_ID,
} from "../../values/arcCoreConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { ArcCoreVisualSystem } from "./ArcCoreVisualSystem.js";
import { resolveArcCoreDigFootprint } from "./arcCoreDigFootprint.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

export class ArcCoreVehicleSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.enabled = isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.ARC_CORES);
    this.visuals = this.enabled
      ? (options.visualSystem || new ArcCoreVisualSystem(scene, options))
      : null;
    this.sprite = null;
    this.prompt = null;
    this.active = false;
    this._interactConsumed = false;
  }

  create() {
    if (!this.enabled) return false;
    const tileSize = this.scene.config.tileSize;
    const parking = ARC_CORE_CONFIG.parking;
    const promptStyle = ARC_CORE_CONFIG.visual.prompt;
    this.visuals
      .create()
      .setAnchor(
        (parking.tileX + 0.5) * tileSize,
        (parking.tileY + 1) * tileSize,
      );
    this.sprite = this.visuals.legacySprite;
    this.prompt = this.scene.add.text(0, 0, "", {
      fontFamily: promptStyle.fontFamily,
      fontSize: `${promptStyle.fontSizePx}px`,
      color: promptStyle.color,
      stroke: promptStyle.stroke,
      strokeThickness: promptStyle.strokeThickness,
      align: promptStyle.align,
    }).setOrigin(0.5, 1)
      .setDepth(ARC_CORE_CONFIG.visual.promptDepth)
      .setVisible(false);

    this.syncOwnership();
    this.visuals.update(this.scene.time?.now || 0);
    return true;
  }

  isUnlocked() {
    return this.enabled && (
      this.scene.upgradeSystem?.godModeActive === true
      || this.scene.upgradeSystem?.getUpgradeLevel?.(ARC_CORE_UPGRADE_ID) > 0
      || this.scene.upgradeSystem?.getUpgradeLevel?.(OMEGA_ARC_CORE_UPGRADE_ID) > 0
    );
  }

  isOmegaUnlocked() {
    return this.enabled && (
      this.scene.upgradeSystem?.godModeActive === true
      || this.scene.upgradeSystem?.getUpgradeLevel?.(OMEGA_ARC_CORE_UPGRADE_ID) > 0
    );
  }

  getActiveProfile() {
    return this.isOmegaUnlocked() ? ARC_CORE_CONFIG.omega : ARC_CORE_CONFIG;
  }

  isActive() {
    return this.active;
  }

  syncOwnership() {
    if (!this.enabled) {
      this.active = false;
      return false;
    }
    const unlocked = this.isUnlocked();
    this.visuals?.setProfile(this.isOmegaUnlocked(), unlocked);
    if (!unlocked && this.active) this.setActive(false, { silent: true });
    return unlocked;
  }

  setActive(active, options = {}) {
    const next = this.enabled && Boolean(active) && this.isUnlocked();
    if (next === this.active) return this.active;
    const transitionStarted = !options.silent
      && this.visuals?.beginTransition(
        next ? "enter" : "exit",
        this.scene.time?.now || 0,
      );
    this.active = next;
    this.scene.player?.setAlpha?.(1);
    this.scene.player?.setVisible?.(transitionStarted ? true : !next);
    this.scene.playerBodyLanguage?.setEnabled?.(!next);
    if (!options.silent) {
      const profile = this.getActiveProfile();
      const visual = ARC_CORE_CONFIG.visual;
      this.scene.hudSystem?.flashStatus?.(
        next
          ? `${profile.displayName || "Arc Core"} online — ${profile.dig.widthTiles} wide × ${profile.dig.depthTiles} deep mining`
          : `${profile.displayName || "Arc Core"} parked`,
        next
          ? (this.isOmegaUnlocked()
            ? visual.omegaOnlineColor
            : visual.smallOnlineColor)
          : visual.parkedColor,
        visual.onlineStatusDurationMs,
      );
    }
    return this.active;
  }

  resolveBottomAnchor() {
    const tileSize = this.scene.config.tileSize;
    if (this.active) {
      const body = this.scene.playerController?.physicsBody;
      if (body) {
        return { x: body.x + body.w / 2, y: body.y + body.h };
      }
      return { x: this.scene.player.x, y: this.scene.player.y };
    }
    const parking = ARC_CORE_CONFIG.parking;
    return {
      x: (parking.tileX + 0.5) * tileSize,
      y: (parking.tileY + 1) * tileSize,
    };
  }

  updateVisualPresentation() {
    const anchor = this.resolveBottomAnchor();
    const aimDirection = this.scene.playerController?.getAimLabel?.() || "RIGHT";
    this.visuals
      .setAnchor(anchor.x, anchor.y)
      .setDirection(aimDirection)
      .setProfile(this.isOmegaUnlocked(), this.isUnlocked());
    const state = this.visuals.update(this.scene.time?.now || 0);
    if (state.transitionActive) {
      this.scene.player?.setVisible?.(true);
      this.scene.player?.setAlpha?.(state.playerAlpha);
    } else {
      this.scene.player?.setAlpha?.(1);
      this.scene.player?.setVisible?.(!this.active);
    }
    return anchor;
  }

  positionPrompt(anchor) {
    const tileSize = this.scene.config.tileSize;
    const top = anchor.y - this.visuals.getDisplaySizePx();
    this.prompt.setPosition(
      anchor.x,
      top - tileSize * ARC_CORE_CONFIG.visual.promptGapTiles,
    );
  }

  update(playerTile, keys) {
    this._interactConsumed = false;
    if (!this.enabled || !this.sprite || !playerTile) return false;

    const parking = ARC_CORE_CONFIG.parking;
    const distance = Math.abs(playerTile.tx - parking.tileX) + Math.abs(playerTile.ty - parking.tileY);
    const inRange = distance <= ARC_CORE_CONFIG.interactRangeTiles;
    const anchor = this.updateVisualPresentation();
    this.positionPrompt(anchor);

    if (this.visuals.isTransitioning()) {
      this.prompt.setVisible(false);
      return false;
    }

    if (this.active) {
      const vehiclePressed = keys?.arcCoreVehicle
        && Phaser.Input.Keyboard.JustDown(keys.arcCoreVehicle);
      this.prompt
        .setText(`[${USER_SETTINGS.getKeyLabel("arcCoreVehicle")}] Exit Arc Core`)
        .setVisible(true);

      if (vehiclePressed) {
        this._interactConsumed = true;
        this.setActive(false);
      }
      return this._interactConsumed;
    }

    if (!inRange) {
      this.prompt.setVisible(false);
      return false;
    }

    const vehiclePressed = keys?.arcCoreVehicle
      && Phaser.Input.Keyboard.JustDown(keys.arcCoreVehicle);
    const unlocked = this.syncOwnership();
    const profile = this.getActiveProfile();
    this.prompt
      .setText(unlocked
        ? `[${USER_SETTINGS.getKeyLabel("arcCoreVehicle")}] Pilot ${profile.displayName || "Arc Core"}`
        : "Arc Core locked\nForge it with the Molten Money Monster")
      .setVisible(true);

    if (vehiclePressed) {
      this._interactConsumed = true;
      if (unlocked) this.setActive(true);
      else this.scene.hudSystem?.flashStatus?.(
        "Complete the Heavenblocks, then forge this Arc Core with the Molten Money Monster.",
        ARC_CORE_CONFIG.visual.lockedColor,
        ARC_CORE_CONFIG.visual.lockedStatusDurationMs,
      );
    }
    return this._interactConsumed;
  }

  resolveDigTargets(primaryTarget, aimDirection) {
    if (!this.enabled) return [];
    return resolveArcCoreDigFootprint(primaryTarget, aimDirection, this.getActiveProfile().dig);
  }

  playDigAnimation(targets, aimDirection, timeMs) {
    if (!this.enabled) return false;
    return this.visuals.startDig(targets, aimDirection, timeMs);
  }

  destroy() {
    this.scene.player?.setVisible(true);
    this.scene.player?.setAlpha?.(1);
    this.prompt?.destroy();
    this.visuals?.destroy();
    this.sprite = null;
    this.prompt = null;
    this.visuals = null;
  }
}
