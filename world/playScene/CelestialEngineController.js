import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_IDS,
  isCelestialEnginesEnabled,
} from "../../values/celestialEngines.js";
import { getResourceDisplayName, RESOURCE_COLORS } from "../../values/resourceTypes.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { CelestialActivationBudget, resolveCardinalDirection } from "../../systems/celestial/CelestialActivationBudget.js";
import { CometEngine } from "../../systems/celestial/CometEngine.js";
import { HollowSunEngine } from "../../systems/celestial/HollowSunEngine.js";
import { WaywardStarEngine } from "../../systems/celestial/WaywardStarEngine.js";
import { CelestialEngineHudSystem } from "../../systems/visual/CelestialEngineHudSystem.js";

export class CelestialEngineController {
  constructor(scene, progression) {
    this.scene = scene;
    this.progression = progression;
    this.enabled = isCelestialEnginesEnabled();
    this.activeEffect = null;
    this.activeBudget = null;
    this.lastCompletion = null;
    this.hud = this.enabled
      ? new CelestialEngineHudSystem(
          scene,
          progression,
          () => USER_SETTINGS.getKeyLabel("celestialEngine"),
        )
      : null;
  }

  update(nowMs, deltaMs, keys) {
    if (!this.enabled) return false;
    this.activeEffect?.update(nowMs, deltaMs);
    if (this.activeBudget) this.hud?.setActiveSnapshot(this.activeBudget.getSnapshot(nowMs));

    const activatePressed = keys?.celestialEngine
      && Phaser.Input.Keyboard.JustDown(keys.celestialEngine);
    if (!activatePressed) return false;

    if (this.activeEffect instanceof WaywardStarEngine) {
      const direction = this._getDirection();
      const redirected = this.activeEffect.redirect(direction, nowMs);
      this.scene.hudSystem?.flashStatus?.(
        redirected
          ? `WAYWARD REDIRECT ${this.activeBudget.redirects}/${this.activeBudget.maxRedirects}`
          : "WAYWARD REDIRECTS EXHAUSTED",
        redirected ? "#65E8FF" : "#7896A8",
        1100,
      );
      return true;
    }

    if (this.activeEffect) {
      this.scene.hudSystem?.flashStatus?.(
        CELESTIAL_ENGINE_CONFIG.copy.activeBlocked,
        "#7896A8",
        1200,
      );
      return true;
    }

    this.tryActivate(nowMs);
    return true;
  }

  tryActivate(nowMs = this.scene.time?.now || 0) {
    const snapshot = this.progression.getSnapshot();
    if (!snapshot.selectedEngine) {
      this.scene.hudSystem?.flashStatus?.(
        snapshot.unlocked ? "CHOOSE AN ENGINE AT THE STAR PILLAR" : CELESTIAL_ENGINE_CONFIG.copy.unavailable,
        "#7896A8",
        1700,
      );
      return { ok: false, reason: "not-attuned" };
    }
    if (!snapshot.charged) {
      this.scene.hudSystem?.flashStatus?.(
        `CELESTIAL CHARGE ${snapshot.charge}/${snapshot.chargeCapacity}  •  FIND SKY STARS`,
        "#7896A8",
        1700,
      );
      return { ok: false, reason: "not-charged" };
    }

    const consumed = this.progression.consumeActivation(nowMs);
    if (!consumed.ok) return consumed;
    const direction = this._getDirection();
    const budget = new CelestialActivationBudget(
      consumed.engineId,
      consumed.activationId,
      nowMs,
    );

    try {
      this.activeBudget = budget;
      this.activeEffect = this._createEffect(consumed.engineId, direction, budget);
    } catch (error) {
      this.progression.refundActivation(consumed.activationId);
      this.activeBudget = null;
      this.activeEffect = null;
      console.error("[CelestialEngine] Activation failed:", error);
      return { ok: false, reason: "activation-failed", error };
    }

    const definition = CELESTIAL_ENGINE_CONFIG.engines[consumed.engineId];
    this.scene.hudSystem?.flashStatus?.(
      `${definition.shortName} RELEASED`,
      definition.cssAccent,
      1900,
    );
    this.scene.soundSystem?.playUiConfirm?.();
    this.scene.screenFlashSystem?.flashLucky?.();
    this.scene.shakeSystem?.shake(CELESTIAL_ENGINE_CONFIG.fx.hitShakeSignature);
    this.hud?.pulse();
    this.scene._lastCelestialActivation = {
      activationId: consumed.activationId,
      engineId: consumed.engineId,
      startedAtMs: nowMs,
    };
    return { ok: true, activationId: consumed.activationId, engineId: consumed.engineId };
  }

  _createEffect(engineId, direction, budget) {
    const position = this._getPlayerCenter();
    const common = {
      scene: this.scene,
      budget,
      direction,
      tileSize: this.scene.config.tileSize,
      probeTile: (tx, ty) => this._probeTile(tx, ty),
      toTile: (x, y) => this.scene.worldModel.worldToTile(x, y),
      onImpact: (tx, ty, hitId, nowMs) => this._handleImpact(tx, ty, hitId, nowMs),
      onComplete: (reason, health) => this._handleComplete(reason, health),
    };

    if (engineId === CELESTIAL_ENGINE_IDS.WAYWARD_STAR) {
      return new WaywardStarEngine({
        ...common,
        assetKey: ASSET_KEYS.celestialEngines.waywardStar,
        startX: position.x + direction.x * this.scene.config.tileSize * 0.7,
        startY: position.y + direction.y * this.scene.config.tileSize * 0.7,
        onBounce: () => this._impactFeedback(),
        onRedirect: () => this.scene.soundSystem?.playUiSelect?.(),
      });
    }

    if (engineId === CELESTIAL_ENGINE_IDS.HOLLOW_SUN) {
      const definition = CELESTIAL_ENGINE_CONFIG.engines[engineId];
      const playerTile = this.scene.playerController.getPlayerTile();
      const targetTile = {
        tx: playerTile.tx + direction.x * definition.placementTiles,
        ty: playerTile.ty + direction.y * definition.placementTiles,
      };
      if (!this.scene.worldModel.inBounds(targetTile.tx, targetTile.ty)) {
        throw new Error("Hollow Sun target is out of bounds");
      }
      const target = this.scene.worldModel.tileToWorld(targetTile.tx, targetTile.ty);
      return new HollowSunEngine({
        ...common,
        assetKey: ASSET_KEYS.celestialEngines.hollowSun,
        x: target.x,
        y: target.y,
        onPulse: () => this._impactFeedback(),
      });
    }

    if (engineId === CELESTIAL_ENGINE_IDS.COMET_ENGINE) {
      const definition = CELESTIAL_ENGINE_CONFIG.engines[engineId];
      this.scene.playerController?.applyExternalKnockback?.(
        direction.x * definition.rideSpeedPxPerSecond,
        direction.y * definition.rideSpeedPxPerSecond,
      );
      return new CometEngine({
        ...common,
        assetKey: ASSET_KEYS.celestialEngines.cometEngine,
        startX: position.x,
        startY: position.y,
        onBlocked: () => this.scene.hudSystem?.flashStatus?.(
          "PROTECTED STRUCTURE  •  COMET STOPPED",
          "#FFCF75",
          1500,
        ),
      });
    }

    throw new Error(`Unsupported Celestial Engine: ${engineId}`);
  }

  _handleImpact(tx, ty, hitId, nowMs) {
    const result = this.scene.digSystem.applyCelestialDamage({
      activationId: this.activeBudget.activationId,
      engineId: this.activeBudget.engineId,
      hitId,
      tx,
      ty,
      nowMs,
    });
    if (!result.success || !result.destroyed) return result;

    const worldX = tx * this.scene.config.tileSize + this.scene.config.tileSize / 2;
    const worldY = ty * this.scene.config.tileSize + this.scene.config.tileSize / 2;
    this.scene.floatingTextSystem?.showHeavyPunchDamage?.(worldX, worldY, result.damage);
    const reward = result.reward;
    if (reward?.resourceType) {
      this.scene.floatingTextSystem?.showResource?.(
        worldX,
        worldY,
        getResourceDisplayName(reward.resourceType),
        RESOURCE_COLORS[reward.resourceType] || "#65E8FF",
        reward.resourceAmount,
      );
    }
    this.scene.showLootPickupFeedback?.(reward, { tx, ty });
    this._handleLevelUp(reward);
    this.scene.queueDugTilesSave?.();
    this._impactFeedback();
    return result;
  }

  _handleLevelUp(reward) {
    if (!reward?.levelUp || !this.scene.levelUpPopup) return;
    const level = reward.newLevel ?? this.scene.playerLevelSystem?.level;
    if (reward.hasChoice && this.scene.levelUpPopup.visible) {
      this.scene._pendingLevelUp = {
        level,
        hasChoice: true,
        rewards: reward.rewards || [],
      };
    } else if (reward.hasChoice) {
      this.scene.levelUpPopup.show(level, true, reward.rewards || []);
    }
  }

  _impactFeedback() {
    this.scene.soundSystem?.playTileBreak?.();
    this.scene.shakeSystem?.shake(CELESTIAL_ENGINE_CONFIG.fx.hitShakeSignature);
  }

  _handleComplete(reason, health) {
    this.lastCompletion = { reason, health, completedAtMs: this.scene.time?.now || 0 };
    this.activeEffect = null;
    this.activeBudget = null;
    this.hud?.setActiveSnapshot(null);
    this.scene.queueDugTilesSave?.();
  }

  _probeTile(tx, ty) {
    const inBounds = this.scene.worldModel.inBounds(tx, ty);
    return {
      inBounds,
      solid: inBounds && this.scene.worldModel.isSolid(tx, ty),
      diggable: inBounds && this.scene.worldModel.isDiggable(tx, ty),
      type: inBounds ? this.scene.worldModel.getTileType(tx, ty) : null,
    };
  }

  _getDirection() {
    return resolveCardinalDirection(
      this.scene.playerController?.getAimVector?.(),
      this.scene.playerController?.isFacingRight?.() !== false,
    );
  }

  _getPlayerCenter() {
    return this.scene.playerController?.physicsBody?.getCenter?.()
      || this.scene.playerController?.getPlayerPosition?.()
      || { x: 0, y: 0 };
  }

  getHealthSnapshot(nowMs = this.scene.time?.now || 0) {
    return {
      enabled: this.enabled,
      activeCount: this.activeEffect ? 1 : 0,
      activation: this.activeBudget?.getSnapshot(nowMs) || null,
      lastCompletion: this.lastCompletion,
    };
  }

  resize() {
    this.hud?.resize();
  }

  destroy() {
    this.activeEffect?.destroy();
    this.activeEffect = null;
    this.activeBudget = null;
    this.hud?.destroy();
  }
}
