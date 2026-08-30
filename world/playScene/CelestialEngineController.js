import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_IDS,
  isCelestialEnginesEnabled,
} from "../../values/celestialEngines.js";
import { resolveCelestialTalentEngineDefinition } from "../../values/celestialTalentEffects.js";
import { getResourceDisplayName, RESOURCE_COLORS } from "../../values/resourceTypes.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { CelestialActivationBudget, resolveCardinalDirection } from "../../systems/celestial/CelestialActivationBudget.js";
import { HollowSunClusterEngine } from "../../systems/celestial/HollowSunClusterEngine.js";
import { StellarRageEngine } from "../../systems/celestial/StellarRageEngine.js";
import { WaywardStarSwarmEngine } from "../../systems/celestial/WaywardStarSwarmEngine.js";
import { CelestialEngineHudSystem } from "../../systems/visual/CelestialEngineHudSystem.js";

export class CelestialEngineController {
  constructor(scene, progression, options = {}) {
    this.scene = scene;
    this.progression = progression;
    this.talentProgression = options.talentProgression || null;
    this.enabled = isCelestialEnginesEnabled();
    this.activeEffect = null;
    this.activeBudget = null;
    this.activeDefinition = null;
    this.lastCompletion = null;
    this.scene.digSystem?.setCelestialEmpowerProvider?.(
      () => this.getEmpowerSnapshot(),
    );
    this.scene.digSystem?.setCelestialProjectileListener?.(
      projectile => this._handleProjectile(projectile),
    );
    this.hud = this.enabled && options.showLegacyHud !== false
      ? new CelestialEngineHudSystem(
          scene,
          progression,
          () => USER_SETTINGS.getKeyLabel("celestialEngine"),
        )
      : null;
  }

  update(nowMs, deltaMs) {
    if (!this.enabled) return false;
    this.activeEffect?.update(nowMs, deltaMs);
    if (this.activeBudget) {
      const snapshot = this.activeEffect?.getSnapshot?.(nowMs)
        || this.activeEffect?.getBuffSnapshot?.(nowMs)
        || this.activeBudget.getSnapshot(nowMs);
      this.hud?.setActiveSnapshot(snapshot);
    }
    return this.activeEffect?.active === true;
  }

  activateEngine(engineId, nowMs = this.scene.time?.now || 0) {
    if (!this.enabled) return { ok: false, reason: "disabled" };
    if (this.activeEffect) {
      this.scene.hudSystem?.flashStatus?.(
        CELESTIAL_ENGINE_CONFIG.copy.activeBlocked,
        "#7896A8",
        1200,
      );
      return { ok: false, reason: "active-engine" };
    }

    const talentSnapshot = this.talentProgression?.getSnapshot?.();
    const talentOwned = talentSnapshot?.unlockedAbilityIds?.includes?.(engineId) === true;
    const godMode = this.progression?.isGodModeActive?.() === true;
    if (!talentOwned && !godMode) {
      this.scene.hudSystem?.flashStatus?.(
        "UNLOCK THIS ENGINE AT THE STAR PILLAR",
        "#7896A8",
        1500,
      );
      return { ok: false, reason: "talent-locked" };
    }

    if (talentOwned) {
      this.progression?.syncTalentUnlockedEngines?.([engineId]);
    }
    const selected = this.progression?.chooseEngine?.(engineId);
    if (selected?.ok === false) return selected;
    return this.tryActivate(nowMs);
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
    const abilities = this.scene.playerController?.abilities;
    const godMode = this.progression?.isGodModeActive?.() === true
      || this.scene.upgradeSystem?.godModeActive === true;
    const gpCost = godMode ? 0 : CELESTIAL_ENGINE_CONFIG.activation.gpCost;
    const gpContext = {
      source: "celestial-engine",
      abilityId: snapshot.selectedEngine,
    };
    if (gpCost > 0 && abilities?.canSpendGemPower?.(gpCost, gpContext) !== true) {
      const currentGp = Math.floor(Number(abilities?.getGemPowerExact?.()) || 0);
      this.scene.hudSystem?.flashStatus?.(
        `REQUIRES ${gpCost} GP  •  CURRENT GP ${currentGp}`,
        "#7896A8",
        1700,
      );
      return { ok: false, reason: "insufficient-gp", gpCost };
    }

    const gpSpent = gpCost > 0
      ? Number(abilities.consumeGemPower(gpCost, gpContext)) || 0
      : 0;
    if (gpSpent + Number.EPSILON < gpCost) {
      if (gpSpent > 0) {
        abilities.restoreGemPower?.(gpSpent, {
          source: "celestial-engine-refund",
          abilityId: snapshot.selectedEngine,
        });
      }
      return { ok: false, reason: "insufficient-gp", gpCost };
    }

    const consumed = this.progression.consumeActivation(nowMs, { spendCharge: false });
    if (!consumed.ok) {
      if (gpSpent > 0) {
        abilities.restoreGemPower?.(gpSpent, {
          source: "celestial-engine-refund",
          abilityId: snapshot.selectedEngine,
        });
      }
      return consumed;
    }
    const direction = this._getDirection();
    const talentEffects = this.talentProgression
      ?.getSnapshot?.()
      ?.unlockedEffectIds || [];
    const definition = resolveCelestialTalentEngineDefinition(
      consumed.engineId,
      talentEffects,
    );
    const budget = new CelestialActivationBudget(
      consumed.engineId,
      consumed.activationId,
      nowMs,
      definition,
    );

    try {
      this.activeDefinition = definition;
      this.activeBudget = budget;
      this.activeEffect = this._createEffect(consumed.engineId, direction, budget, definition);
    } catch (error) {
      this.progression.refundActivation(consumed.activationId);
      if (gpSpent > 0) {
        abilities.restoreGemPower?.(gpSpent, {
          source: "celestial-engine-refund",
          abilityId: consumed.engineId,
        });
      }
      this.activeDefinition = null;
      this.activeBudget = null;
      this.activeEffect = null;
      console.error("[CelestialEngine] Activation failed:", error);
      return { ok: false, reason: "activation-failed", error };
    }

    const displayDefinition = CELESTIAL_ENGINE_CONFIG.engines[consumed.engineId];
    this.scene.hudSystem?.flashStatus?.(
      `${displayDefinition.shortName} ${consumed.engineId === CELESTIAL_ENGINE_IDS.STELLAR_RAGE
        ? "AWAKENED"
        : "RELEASED"}`,
      displayDefinition.cssAccent,
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
    return {
      ok: true,
      activationId: consumed.activationId,
      engineId: consumed.engineId,
      gpSpent,
    };
  }

  _createEffect(engineId, direction, budget, definitionOverride = null) {
    const position = this._getPlayerCenter();
    const common = {
      scene: this.scene,
      budget,
      direction,
      tileSize: this.scene.config.tileSize,
      definitionOverride,
      probeTile: (tx, ty) => this._probeTile(tx, ty),
      toTile: (x, y) => this.scene.worldModel.worldToTile(x, y),
      onImpact: (tx, ty, hitId, nowMs) => this._handleImpact(tx, ty, hitId, nowMs),
      onComplete: (reason, health) => this._handleComplete(reason, health),
    };

    if (engineId === CELESTIAL_ENGINE_IDS.WAYWARD_STAR) {
      return new WaywardStarSwarmEngine({
        ...common,
        assetKey: ASSET_KEYS.celestialEngines.waywardStar,
        startX: position.x + direction.x * this.scene.config.tileSize * 0.7,
        startY: position.y + direction.y * this.scene.config.tileSize * 0.7,
        onBounce: () => this._impactFeedback(),
      });
    }

    if (engineId === CELESTIAL_ENGINE_IDS.HOLLOW_SUN) {
      const definition = definitionOverride || CELESTIAL_ENGINE_CONFIG.engines[engineId];
      const playerTile = this.scene.playerController.getPlayerTile();
      const targetTile = {
        tx: playerTile.tx + direction.x * definition.placementTiles,
        ty: playerTile.ty + direction.y * definition.placementTiles,
      };
      if (!this.scene.worldModel.inBounds(targetTile.tx, targetTile.ty)) {
        throw new Error("Hollow Sun target is out of bounds");
      }
      const target = this.scene.worldModel.tileToWorld(targetTile.tx, targetTile.ty);
      return new HollowSunClusterEngine({
        ...common,
        assetKey: ASSET_KEYS.celestialEngines.hollowSun,
        direction,
        x: target.x,
        y: target.y,
        onPulse: () => this._impactFeedback(),
      });
    }

    if (engineId === CELESTIAL_ENGINE_IDS.STELLAR_RAGE) {
      return new StellarRageEngine({
        ...common,
        assetKey: ASSET_KEYS.celestialEngines.cometEngine,
        getAnchor: () => this._getPlayerCenter(),
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
    this.scene.showXpGatheringFeedback?.(reward, { tx, ty });
    this._handleLevelUp(reward);
    this.scene.queueDugTilesSave?.();
    this._impactFeedback();
    return result;
  }

  _handleLevelUp(reward) {
    if (!reward?.levelUp) return;
    const levelBonus = this.scene.playerLevelSystem?.getGemPowerMaxBonus?.() ?? 0;
    const milestoneBonus = this.scene.milestoneBoardSystem?.getBonuses?.()?.gpMaxBonus ?? 0;
    this.scene.playerController?.setProgressionGemPowerMaxBonus?.(
      levelBonus + milestoneBonus,
    );
    this.scene.hudSystem?.pulseGemPower?.(true);
  }

  _impactFeedback() {
    this.scene.soundSystem?.playTileBreak?.();
    this.scene.shakeSystem?.shake(CELESTIAL_ENGINE_CONFIG.fx.hitShakeSignature);
  }

  _handleProjectile(projectile) {
    if (!(this.activeEffect instanceof StellarRageEngine)) return false;
    return this.activeEffect.launchProjectile(projectile);
  }

  _handleComplete(reason, health) {
    this.lastCompletion = { reason, health, completedAtMs: this.scene.time?.now || 0 };
    this.activeEffect = null;
    this.activeDefinition = null;
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

  isEngineActive(engineId) {
    return Boolean(this.activeEffect && this.activeBudget?.engineId === engineId);
  }

  isActivationAvailable() {
    return this.enabled && !this.activeEffect;
  }

  getEmpowerSnapshot(nowMs = this.scene.time?.now || 0) {
    if (!(this.activeEffect instanceof StellarRageEngine)) return null;
    const snapshot = this.activeEffect.getBuffSnapshot(nowMs);
    return snapshot.active ? snapshot : null;
  }

  getHealthSnapshot(nowMs = this.scene.time?.now || 0) {
    return {
      enabled: this.enabled,
      activeCount: this.activeEffect ? 1 : 0,
      activation: this.activeEffect?.getSnapshot?.(nowMs)
        || this.activeEffect?.getBuffSnapshot?.(nowMs)
        || this.activeBudget?.getSnapshot(nowMs)
        || null,
      empower: this.getEmpowerSnapshot(nowMs),
      lastCompletion: this.lastCompletion,
    };
  }

  resize() {
    this.hud?.resize();
  }

  destroy() {
    this.activeEffect?.destroy();
    this.activeEffect = null;
    this.activeDefinition = null;
    this.activeBudget = null;
    this.scene.digSystem?.setCelestialEmpowerProvider?.(null);
    this.scene.digSystem?.setCelestialProjectileListener?.(null);
    this.hud?.destroy();
  }
}
