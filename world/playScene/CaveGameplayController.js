/**
 * CaveGameplayController — runs the normal player, mining, and ability stack in CaveScene.
 */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { MINING_CONFIG } from "../../values/miningConfig.js";
import { resolvePlayerDisplaySizePx } from "../../values/playerAssetProfiles.js";
import { RESOURCE_COLORS, getResourceDisplayName } from "../../values/resourceTypes.js";
import { PlayerController } from "../../player/PlayerController.js";
import { resolvePlayerTargetDirection } from "../../player/playerDirectionalTargets.js";
import { DigSystem } from "../../systems/mining/DigSystem.js";
import { TileCollisionSystem } from "../../systems/mining/TileCollisionSystem.js";
import { FloatingTextSystem } from "../../systems/visual/FloatingTextSystem.js";
import { PlayerSolidOcclusionSystem } from "../../systems/visual/PlayerSolidOcclusionSystem.js";
import { PlayerKinematicMotionSystem } from "../../systems/visual/PlayerKinematicMotionSystem.js";
import { PlayerRigContactSystem } from "../../systems/visual/PlayerRigContactSystem.js";
import { FlightFootParticleSystem } from "../../systems/visual/FlightFootParticleSystem.js";
import { CaveActionAnimationRuntime } from "./CaveActionAnimationRuntime.js";
import { PlayerInputHandler } from "./PlayerInputHandler.js";

function copyAbilityState(source, target) {
  if (!source || !target) return;
  target.setProgressionGemPowerMaxBonus?.(source._progressionGemPowerMaxBonus || 0);
  target.setGodMode?.(source._godMode === true);
  target.gemPower = Math.min(target.getGemPowerMax(), Math.max(0, source.gemPower || 0));
}

export class CaveGameplayController {
  constructor(scene, worldModel, worldRenderer) {
    this.scene = scene;
    this.originScene = scene.originScene;
    this.worldModel = worldModel;
    this.worldRenderer = worldRenderer;
    this.inputHandler = null;
    this.playerController = null;
    this.digSystem = null;
    this.floatingTextSystem = null;
    this.playerSolidOcclusion = null;
    this.playerKinematicMotion = null;
    this.playerRigContact = null;
    this.flightFootParticleSystem = null;
    this.actionAnimationRuntime = new CaveActionAnimationRuntime(this);
    this._actionUntilMs = 0;
  }

  create() {
    const origin = this.originScene;
    this.inputHandler = new PlayerInputHandler(this.scene);
    this.floatingTextSystem = new FloatingTextSystem(this.scene, origin.saveSlot);
    this.scene.inputHandler = this.inputHandler;
    this.scene.floatingTextSystem = this.floatingTextSystem;
    this.scene.specialBlockEffectsManager = origin.specialBlockEffectsManager;
    this.scene.ancientRelicSystem = origin.ancientRelicSystem;
    this.scene.weatherSystem = origin.weatherSystem;

    this.digSystem = new DigSystem(
      this.worldModel,
      this.worldRenderer,
      this.scene.config,
      origin.upgradeSystem,
      origin.playerLevelSystem,
      this.floatingTextSystem,
      origin.comboSystem,
      origin.specialBlockEffectsManager
    );
    this.digSystem.setAncientRelicSystem(origin.ancientRelicSystem);
    this.digSystem.setCampfireSystem(origin.campfireSystem);
    this.digSystem.setResourceTotals(origin.digSystem.getResourceTotals());

    const collisionSystem = new TileCollisionSystem(this.worldModel, this.scene.config);
    this.playerController = new PlayerController(
      this.scene,
      this.scene.player,
      this.worldModel,
      this.scene.config,
      origin.upgradeSystem,
      this.inputHandler,
      origin.playerLevelSystem,
      origin.comboSystem,
      collisionSystem
    );
    copyAbilityState(origin.playerController?.abilities, this.playerController.abilities);
    this.scene.digSystem = this.digSystem;
    this.scene.playerController = this.playerController;
    this.playerKinematicMotion = new PlayerKinematicMotionSystem(
      this.scene,
      this.scene.player,
      this.playerController,
      this.scene.playerAssetProfile,
    );
    this.scene.playerKinematicMotion = this.playerKinematicMotion;
    this.playerRigContact = new PlayerRigContactSystem(
      this.scene,
      this.scene.player,
      this.playerController,
      this.scene.playerAssetProfile,
    );
    this.scene.playerRigContact = this.playerRigContact;
    this.playerRigContact.create();
    this.flightFootParticleSystem = new FlightFootParticleSystem(
      this.scene,
      this.scene.player,
      this.scene.playerAssetProfile,
    );
    this.actionAnimationRuntime.create();
    this.playerSolidOcclusion = new PlayerSolidOcclusionSystem(
      this.scene,
      this.scene.player,
      this.worldModel,
      this.scene.playerAssetProfile,
    );
    this.playerSolidOcclusion.create();
  }

  update(time, delta) {
    this.playerController.update(delta);
    this.playerKinematicMotion?.samplePhysics(delta);
    this.playerRigContact?.update(delta);
    const playerTile = this.playerController.getPlayerTile();
    const targetTile = this.inputHandler.resolveAimTargetTile();
    this.inputHandler.updateAimBox(targetTile, this.inputHandler.isSolidAimTarget(targetTile));
    this._updateMining(time, playerTile, targetTile);
    this._updateThunderStrike(time);
    this._updateLocomotionVisual(time);
    this.flightFootParticleSystem?.update(
      delta,
      !this.actionAnimationRuntime.isUalActionLocked
        && this.playerController.abilities?.isFlying?.() === true,
    );
  }

  syncToOrigin() {
    const origin = this.originScene;
    copyAbilityState(this.playerController?.abilities, origin.playerController?.abilities);
    origin.digSystem?.setResourceTotals(this.digSystem?.getResourceTotals());
    const totals = origin.digSystem?.getResourceTotals();
    origin.uiResourceBar?.setResources?.(totals);
    origin.uiInventoryPopup?.setResources?.(totals);
  }

  destroy() {
    this.actionAnimationRuntime.destroy();
    this.playerSolidOcclusion?.destroy();
    this.playerKinematicMotion?.destroy();
    this.playerRigContact?.destroy();
    this.flightFootParticleSystem?.destroy();
    this.scene.playerKinematicMotion = null;
    this.scene.playerRigContact = null;
    this.inputHandler?.destroy();
  }

  _updateMining(time, playerTile, targetTile) {
    const abilities = this.playerController.abilities;
    if (this.actionAnimationRuntime.isUalActionLocked) return;
    if (abilities.isQuickslashActive()) {
      const direction = abilities.getQuickslashDirection();
      const quickslashTarget = this.inputHandler.resolveAimTargetTileForVector({
        x: direction,
        y: 0,
      });
      this._tryMine(
        quickslashTarget,
        time,
        direction > 0 ? "RIGHT" : "LEFT",
        abilities,
        "quickslash"
      );
      return;
    }
    if (this.playerController.consumeMineInput()) {
      this._tryMine(targetTile, time, this.playerController.getAimLabel(), abilities, "mine");
    }
  }

  _tryMine(targetTile, time, aim, abilities, action) {
    const targetDirection = resolvePlayerTargetDirection(
      this.playerController?.physicsBody,
      this.scene.config?.tileSize,
      targetTile,
    );
    const resolvedAim = targetDirection?.aimLabel || aim;
    const profile = this.scene.playerAssetProfile || ASSET_KEYS.player;
    if (profile.isUalNative) {
      if (!targetTile) return;
      this._playMiningAnimation(action, resolvedAim, time, abilities, (contactEvent) => {
        const contactDirection = targetDirection || resolvePlayerTargetDirection(
          this.playerController?.physicsBody,
          this.scene.config?.tileSize,
          targetTile,
        );
        if (!contactDirection) return;
        this._lastPlayerRigContactValidation = this.playerRigContact?.validateContact({
          targetTile,
          direction: contactDirection,
        });
        const contactTime = this.scene.time?.now ?? time;
        const result = this.digSystem.tryMine(
          targetTile,
          contactTime,
          contactDirection.aimLabel,
          abilities,
          { actionStartedAtMs: time },
        );
        if (result.success) this._applyMineResult(result, targetTile);
        else this._showBlockedMineFeedback(result, targetTile);
      }, targetTile, targetDirection);
      return;
    }

    const result = this.digSystem.tryMine(targetTile, time, resolvedAim, abilities);
    if (result.reason !== "cooldown") this._playMiningAnimation(action, resolvedAim, time);
    if (result.success) this._applyMineResult(result, targetTile);
    else this._showBlockedMineFeedback(result, targetTile);
  }

  _showBlockedMineFeedback(result, targetTile = null) {
    if (!result?.blockedByBedrock) return;
    const feedback = MINING_CONFIG.blockedUi;
    this.scene.flashStatus?.(feedback.bedrockMessage, feedback.color, feedback.durationMs);
    if (!targetTile) return;
    const tileSize = this.scene.config.tileSize;
    const worldX = targetTile.tx * tileSize + tileSize / 2;
    const worldY = targetTile.ty * tileSize + tileSize / 2;
    this.floatingTextSystem?.showFloatingText(
      worldX,
      worldY,
      feedback.zeroDamageText,
      feedback.zeroDamageColor,
      feedback.zeroDamageDurationMs,
      feedback.zeroDamageFontSize,
    );
  }

  _applyMineResult(result, targetTile) {
    this._scaleCaveReward(result, "resourceType", "resourceAmount");
    this._scaleCaveReward(result, "behindResourceType", "behindResourceAmount");
    const tileSize = this.scene.config.tileSize;
    const worldX = targetTile.tx * tileSize + tileSize / 2;
    const worldY = targetTile.ty * tileSize + tileSize / 2;

    if (result.frontDamageApplied !== false) this.floatingTextSystem.showDamage(worldX, worldY, result.damage);
    if (result.heavyPunchHit && result.heavyPunchTile) {
      const heavyX = result.heavyPunchTile.tx * tileSize + tileSize / 2;
      const heavyY = result.heavyPunchTile.ty * tileSize + tileSize / 2;
      this.floatingTextSystem.showHeavyPunchDamage(heavyX, heavyY, result.behindDamage);
    }
    if (result.destroyed) {
      this.scene.markCaveTileDug(targetTile.tx, targetTile.ty);
      this._showResource(result.resourceType, result.resourceAmount, worldX, worldY);
    }
    if (result.behindDestroyed && result.heavyPunchTile) {
      this.scene.markCaveTileDug(result.heavyPunchTile.tx, result.heavyPunchTile.ty);
      const behindX = result.heavyPunchTile.tx * tileSize + tileSize / 2;
      const behindY = result.heavyPunchTile.ty * tileSize + tileSize / 2;
      this._showResource(result.behindResourceType, result.behindResourceAmount, behindX, behindY);
    }
    if (result.levelUp) this.scene.flashStatus(`Level ${result.newLevel || "up"}!`);
    const sounds = this.originScene.soundSystem;
    if (result.destroyed) sounds?.playTileBreak?.();
    else sounds?.playTileHit?.();
    this._syncResources();
  }

  _scaleCaveReward(result, resourceField, amountField) {
    const resourceType = result[resourceField];
    const amount = result[amountField] || 0;
    const multiplier = this.scene.caveRewardMultiplier || 1;
    if (!resourceType || amount <= 0 || multiplier <= 1) return;
    const bonus = amount * (multiplier - 1);
    const totals = this.digSystem.getResourceTotals();
    totals[resourceType] = (totals[resourceType] || 0) + bonus;
    this.digSystem.setResourceTotals(totals);
    result[amountField] = amount + bonus;
  }

  _showResource(resourceType, amount, worldX, worldY) {
    if (!resourceType || amount <= 0) return;
    this.floatingTextSystem.showResource(
      worldX,
      worldY,
      getResourceDisplayName(resourceType),
      RESOURCE_COLORS[resourceType],
      amount
    );
  }

  _syncResources() {
    const totals = this.digSystem.getResourceTotals();
    this.originScene.digSystem.setResourceTotals(totals);
    this.originScene.uiResourceBar?.setResources?.(totals);
    this.originScene.uiInventoryPopup?.setResources?.(totals);
    this.originScene.queueDugTilesSave?.();
  }

  _updateThunderStrike(time) {
    const thunderPressed = this.playerController.input.getThunderStrikeInput();
    this.actionAnimationRuntime.updateThunderStrike(time, thunderPressed);
  }

  _applyThunderStrikeResult(strike, time) {
    for (const hit of strike.results) {
      this.worldRenderer.applyTileUpdate(hit.tx, hit.ty);
      const tileSize = this.scene.config.tileSize;
      this.floatingTextSystem.showHeavyPunchDamage(
        hit.tx * tileSize + tileSize / 2,
        hit.ty * tileSize + tileSize / 2,
        hit.damage,
      );
      if (!hit.destroyed) continue;
      if (hit.breachedBedrock) {
        this.scene.markCaveTileDug(hit.tx, hit.ty);
        continue;
      }
      const reward = this.digSystem.processDestroyedTile(hit.tx, hit.ty, hit.tileType, time, false, hit.wasRubble);
      this._applyMineResult({
        ...reward,
        success: true,
        destroyed: true,
        frontDamageApplied: false,
        damage: hit.damage,
        tileType: hit.tileType,
      }, hit);
    }
  }

  _playMiningAnimation(
    action,
    aim,
    time,
    abilities = null,
    onContact = null,
    targetTile = null,
    direction = null,
  ) {
    return this.actionAnimationRuntime.playMiningAnimation(
      action,
      aim,
      time,
      abilities,
      onContact,
      targetTile,
      direction,
    );
  }

  _playAnim(key, time, holdMs) {
    if (key && this.scene.anims.exists(key)) this.scene.player.play(key, true);
    this._applyPlayerDisplaySize(key);
    this._actionUntilMs = holdMs === Infinity ? Infinity : time + holdMs;
  }

  _applyPlayerDisplaySize(animationKey = this.scene.player?.anims?.currentAnim?.key) {
    const profile = this.scene.playerAssetProfile || ASSET_KEYS.player;
    if (profile.isLivingDrill) {
      this.scene.player.setScale(profile.visualScale || 1);
      return;
    }
    const displaySize = resolvePlayerDisplaySizePx(
      profile,
      this.scene.config.playerDisplaySizePx,
      animationKey,
    );
    this.scene.player.setDisplaySize(displaySize, displaySize);
  }

  _updateLocomotionVisual(time) {
    this.actionAnimationRuntime.updateLocomotionVisual(time);
  }
}
