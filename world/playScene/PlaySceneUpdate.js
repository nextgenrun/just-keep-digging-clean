/**
 * PlayScene Update Module
 * Handles the main game loop, state management, and input processing
 * Uses GameInputHandler for clean separation of input handling
 */

import { ASSET_KEYS } from "../../values/assetKeys.js";
import { RESOURCE_COLORS, getResourceDisplayName } from "../../values/resourceTypes.js";
import { RETENTION_CONFIG, RETENTION_EVENT_TYPES } from "../../values/retentionConfig.js";
import { PERFORMANCE_TELEMETRY_CONFIG } from "../../values/performanceTelemetryConfig.js";
import {
  performanceNow,
  recordPerformanceSpan,
  shouldSamplePerformancePhases,
} from "../../systems/health/performanceTelemetryBridge.js";
import { resolvePlayerTargetDirection } from "../../player/playerDirectionalTargets.js";
import {
  recordGraveborerWurmMiningNoise,
  updateGraveborerWurmRuntime,
} from "./GraveborerWurmBridge.js";
import { updateHardcoreModeRuntime } from "./HardcoreModeBridge.js";
import { hasEscapeClosableUi } from "./hasEscapeClosableUi.js";
import { resolveInteractionPriorities } from "./interactionPriority.js";
import { isRequiredTownTutorialDigTarget } from
  "../../systems/onboarding/TownSquareTutorialDigSite.js";

function syncProgressionGemPowerMax(scene) {
  const levelBonus = scene.playerLevelSystem?.getGemPowerMaxBonus?.() ?? 0;
  const milestoneBonus = scene.milestoneBoardSystem?.getBonuses?.()?.gpMaxBonus ?? 0;
  scene.playerController?.setProgressionGemPowerMaxBonus?.(levelBonus + milestoneBonus);
}

function resolveLiveContactDirection(scene, targetTile) {
  return resolvePlayerTargetDirection(
    scene.playerController?.physicsBody,
    scene.config?.tileSize,
    targetTile,
  );
}

function refreshMiningTargetVisual(scene) {
  const state = scene.inputHandler.resolveMiningInputState();
  const targetTile = state.targetTile;
  scene.inputHandler.updateAimBox(
    targetTile,
    scene.inputHandler.isSolidAimTarget(targetTile),
    state,
  );
}

function _handleLevelUpResult(scene, result) {
  if (!result?.levelUp) return;
  syncProgressionGemPowerMax(scene);
  scene.hudSystem?.pulseGemPower?.(true);
  scene.queueDugTilesSave?.();
}

function showMiningRetentionFeedback(scene, result, targetTile, options = {}) {
  if (!result?.success || !targetTile || !scene.floatingTextSystem) return;
  const worldX = targetTile.tx * scene.config.tileSize + scene.config.tileSize / 2;
  const worldY = targetTile.ty * scene.config.tileSize + scene.config.tileSize / 2;
  const feedback = RETENTION_CONFIG.miningFeedback;

  if (result.isCriticalHit) {
    const multiplier = Number.isFinite(result.critMultiplier)
      ? result.critMultiplier
      : scene.playerLevelSystem?.getCriticalHitDamageMultiplier?.() || 1;
    scene.floatingTextSystem.showCriticalHit(worldX, worldY, result.damage || 0, multiplier);
    scene.screenFlashSystem?.flashCrit?.();
  }

  const rarity = feedback.rarity[result.rarityId];
  if (result.destroyed && rarity) {
    scene.floatingTextSystem.showFloatingText(
      worldX,
      worldY - 34,
      `${rarity.label}  ${Number(result.rarityMultiplier || 1).toFixed(1)}x`,
      rarity.color,
      feedback.rarityDurationMs,
      19
    );
  }

  if (result.isLuckyDrop) {
    scene.floatingTextSystem.showResourceLuckBonus(
      worldX,
      worldY,
      result.resourceType || "Resource",
      feedback.luckyColor,
      1
    );
  }

  if (options.consumeUpgradePayoff !== false) {
    const payoff = scene.retentionProgressSystem?.consumeUpgradePayoff?.();
    if (payoff) {
      const measured = payoff.afterDamage > payoff.beforeDamage
        ? `  •  DAMAGE ${payoff.beforeDamage} → ${payoff.afterDamage}`
        : "  •  ITS EFFECT IS ACTIVE";
      scene.uiNotifications?.warning?.(
        `${payoff.upgradeName.toUpperCase()} FELT ON THIS DIG${measured}`,
        { key: "first-upgrade-payoff", durationMs: 4200 },
      );
    }
  }
}

function isSystemFeatureAvailable(scene, feature) {
  if (
    feature === "abilities"
    && scene.upgradeSystem?.isGodModeActive?.() === true
  ) {
    return true;
  }
  return scene.systemIntroductionSystem?.isFeatureAvailable?.(feature) !== false;
}

function isTutorialDescentBlocked(scene) {
  return scene.townSquareTutorialSystem?.isDescentBlocked?.() === true;
}

function isTutorialDownwardMineBlocked(scene, targetTile) {
  const tutorial = scene.townSquareTutorialSystem;
  if (tutorial?.shouldBlockDownwardMine) {
    return tutorial.shouldBlockDownwardMine(targetTile) === true;
  }
  return isTutorialDescentBlocked(scene);
}

function isDownwardAimLabel(label) {
  return String(label || "").startsWith("DOWN");
}

function handleRetentionEvents(scene) {
  const retention = scene.retentionProgressSystem;
  if (!retention) return;
  retention.drainEvents().forEach(event => {
    switch (event.type) {
      case RETENTION_EVENT_TYPES.DISCOVERY:
      case RETENTION_EVENT_TYPES.PERSONAL_BEST:
      case RETENTION_EVENT_TYPES.EARTHQUAKE_RECAP:
        break;
      case RETENTION_EVENT_TYPES.TUTORIAL:
        break;
      case RETENTION_EVENT_TYPES.OBJECTIVE_COMPLETE: {
        const reward = Math.max(0, Number(event.objective?.rewardMoney) || 0);
        scene.upgradeSystem?.addMoney?.(reward);
        retention.recordMoneyEarned(reward);
        scene.queueDugTilesSave?.();
        break;
      }
      case RETENTION_EVENT_TYPES.EXPEDITION_SUMMARY:
        scene.queueDugTilesSave?.();
        break;
      default:
        break;
    }
  });
}

function handleQuickslashMineResult(scene, result, targetTile, tileType) {
  if (!result || result.reason === "cooldown" || !targetTile) return;
  scene.queueDigImpactFeedback?.({ result, targetTile, tileType });
  scene.flushPendingDigImpactFeedback?.();
  if (!result.success) return;
  recordGraveborerWurmMiningNoise(scene, "quickslash", targetTile);
  if (result.heavyPunchHit) {
    recordGraveborerWurmMiningNoise(scene, "heavyPunch", result.heavyPunchTile || targetTile);
  }
  showMiningRetentionFeedback(scene, result, targetTile);

  if (result.heavyPunchHit && result.heavyPunchTile && scene.floatingTextSystem) {
    const worldX = result.heavyPunchTile.tx * scene.config.tileSize + scene.config.tileSize / 2;
    const worldY = result.heavyPunchTile.ty * scene.config.tileSize + scene.config.tileSize / 2;
    scene.floatingTextSystem.showHeavyPunchDamage(worldX, worldY, result.behindDamage);
    showMiningRetentionFeedback(scene, {
      success: true,
      destroyed: result.behindDestroyed,
      tileType: scene.worldModel.getTileType(result.heavyPunchTile.tx, result.heavyPunchTile.ty),
      damage: result.behindDamage,
      maxHp: result.behindMaxHp,
      overkillDamage: result.behindOverkillDamage,
      rarityId: result.behindRarityId,
      rarityMultiplier: result.behindRarityMultiplier,
      isLuckyDrop: result.behindIsLuckyDrop,
      resourceType: result.behindResourceType,
    }, result.heavyPunchTile, { consumeUpgradePayoff: false });
  }
  if (result.behindDestroyed) scene.queueDugTilesSave?.();
  if (result.behindDestroyed && result.behindResourceType && result.heavyPunchTile) {
    scene.showLootPickupFeedback?.(result, result.heavyPunchTile, {
      resourceType: result.behindResourceType,
      amount: result.behindResourceAmount,
      isLuckyDrop: result.behindIsLuckyDrop,
    });
  }
  if (scene.floatingTextSystem && result.frontDamageApplied !== false) {
    const worldX = targetTile.tx * scene.config.tileSize + scene.config.tileSize / 2;
    const worldY = targetTile.ty * scene.config.tileSize + scene.config.tileSize / 2;
    scene.floatingTextSystem.showDamage(worldX, worldY, result.damage);
  }
  if (result.levelUp) _handleLevelUpResult(scene, result);
}

function handleNormalMineResult(scene, result, targetTile, tileType, { flushContactFeedback = true } = {}) {
  if (!result || result.reason === "cooldown" || !targetTile) return;
  if (flushContactFeedback) {
    scene.queueDigImpactFeedback?.({ result, targetTile, tileType });
    scene.flushPendingDigImpactFeedback?.();
  }

  if (result.success) {
    recordGraveborerWurmMiningNoise(scene, "normal", targetTile);
    if (result.heavyPunchHit) {
      recordGraveborerWurmMiningNoise(scene, "heavyPunch", result.heavyPunchTile || targetTile);
    }
    showMiningRetentionFeedback(scene, result, targetTile);
    if (scene.floatingTextSystem && result.frontDamageApplied !== false) {
      const worldX = targetTile.tx * scene.config.tileSize + scene.config.tileSize / 2;
      const worldY = targetTile.ty * scene.config.tileSize + scene.config.tileSize / 2;
      scene.floatingTextSystem.showDamage(worldX, worldY, result.damage);
    }
    if (result.heavyPunchHit && result.heavyPunchTile && scene.floatingTextSystem) {
      const worldX = result.heavyPunchTile.tx * scene.config.tileSize + scene.config.tileSize / 2;
      const worldY = result.heavyPunchTile.ty * scene.config.tileSize + scene.config.tileSize / 2;
      scene.floatingTextSystem.showHeavyPunchDamage(worldX, worldY, result.behindDamage);
      showMiningRetentionFeedback(scene, {
        success: true,
        destroyed: result.behindDestroyed,
        damage: result.behindDamage,
        maxHp: result.behindMaxHp,
        overkillDamage: result.behindOverkillDamage,
        rarityId: result.behindRarityId,
        rarityMultiplier: result.behindRarityMultiplier,
        isLuckyDrop: result.behindIsLuckyDrop,
        resourceType: result.behindResourceType,
      }, result.heavyPunchTile, { consumeUpgradePayoff: false });
    }
    if (result.destroyed) {
      scene.queueDugTilesSave?.();
      if (scene.floatingTextSystem && result.resourceType) {
        const worldX = targetTile.tx * scene.config.tileSize + scene.config.tileSize / 2;
        const worldY = targetTile.ty * scene.config.tileSize + scene.config.tileSize / 2;
        const resourceLabel = getResourceDisplayName(result.resourceType);
        const resourceColor = RESOURCE_COLORS[result.resourceType] || "#8B4513";
        scene.floatingTextSystem.showResource(worldX, worldY, resourceLabel, resourceColor, result.resourceAmount);
      }
    }
    if (result.behindDestroyed) scene.queueDugTilesSave?.();
    if (result.behindDestroyed && result.behindResourceType && result.heavyPunchTile) {
      scene.showLootPickupFeedback?.(result, result.heavyPunchTile, {
        resourceType: result.behindResourceType,
        amount: result.behindResourceAmount,
        isLuckyDrop: result.behindIsLuckyDrop,
      });
    }
  }

  refreshMiningTargetVisual(scene);
  if (result.levelUp) _handleLevelUpResult(scene, result);
}

function handleThunderStrikeResult(scene, strikeResult, now) {
  if (!strikeResult?.success) return false;
  if (!Array.isArray(strikeResult.results) || strikeResult.results.length === 0) return true;
  const firstStrikeTile = strikeResult.results[0];
  recordGraveborerWurmMiningNoise(scene, "thunderStrike", {
    tx: firstStrikeTile.tx,
    ty: firstStrikeTile.ty,
  });

  strikeResult.results.forEach((result) => {
    scene.worldRenderer.applyTileUpdate(result.tx, result.ty);
    if (scene.floatingTextSystem) {
      const worldX = result.tx * scene.config.tileSize + scene.config.tileSize / 2;
      const worldY = result.ty * scene.config.tileSize + scene.config.tileSize / 2;
      scene.floatingTextSystem.showHeavyPunchDamage(worldX, worldY, result.damage);
    }
    if (!result.destroyed) return;

    const reward = scene.digSystem.processDestroyedTile(
      result.tx,
      result.ty,
      result.tileType,
      now,
      false,
      result.wasRubble,
    );
    showMiningRetentionFeedback(scene, {
      ...result,
      ...reward,
      success: true,
      damage: result.damage,
      overkillDamage: result.overkillDamage,
      maxHp: result.maxHp,
      tileType: result.tileType,
    }, { tx: result.tx, ty: result.ty });
    scene.showLootPickupFeedback?.(reward, { tx: result.tx, ty: result.ty });
    if (reward.levelUp) _handleLevelUpResult(scene, reward);
    scene.queueDugTilesSave?.();
  });
  scene.soundSystem?.playTileBreak();
  return true;
}

function handleArcCoreMine(scene, aimTargetTile, time, abilities, aimDirectionOverride = null) {
  const aimDirection = aimDirectionOverride || scene.playerController.getAimLabel();
  const targets = scene.arcCoreVehicleSystem.resolveDigTargets(aimTargetTile, aimDirection);
  const areaResult = scene.digSystem.tryMineArea(targets, time, aimDirection, abilities);
  if (areaResult.reason === "cooldown") return areaResult;

  scene.arcCoreVehicleSystem.playDigAnimation(
    targets,
    aimDirection,
    time,
  );
  let audioPlayed = false;
  let shouldSave = false;
  let blockedBedrockHit = null;

  for (const hit of areaResult.hits) {
    const result = hit.result;
    if (!result?.success) {
      if (!blockedBedrockHit && result?.blockedByBedrock) blockedBedrockHit = hit;
      continue;
    }
    const targetTile = { tx: hit.tx, ty: hit.ty };
    scene.playMineImpactFx(targetTile, result.destroyed);
    if (!audioPlayed) {
      scene.playMineFeedbackAudio(result, hit.tileType);
      audioPlayed = true;
    }
    scene.applyMineFeedback(result, targetTile);

    const worldX = hit.tx * scene.config.tileSize + scene.config.tileSize / 2;
    const worldY = hit.ty * scene.config.tileSize + scene.config.tileSize / 2;
    if (scene.floatingTextSystem && result.frontDamageApplied !== false) {
      scene.floatingTextSystem.showDamage(worldX, worldY, result.damage);
    }
    if (result.destroyed) {
      shouldSave = true;
      if (result.resourceType && scene.floatingTextSystem) {
        const label = getResourceDisplayName(result.resourceType);
        const color = RESOURCE_COLORS[result.resourceType] || "#FFB347";
        scene.floatingTextSystem.showResource(worldX, worldY, label, color, result.resourceAmount);
      }
      if (result.isCriticalHit && scene.floatingTextSystem) {
        scene.floatingTextSystem.showCriticalHit(worldX, worldY, result.damage, 1.5);
      }
      if (result.isLuckyDrop && scene.floatingTextSystem) {
        scene.floatingTextSystem.showResourceLuckBonus(worldX, worldY, result.resourceType || "Resource", "#00ff00", 1);
      }
    }
  }

  if (blockedBedrockHit) {
    const result = blockedBedrockHit.result;
    const targetTile = { tx: blockedBedrockHit.tx, ty: blockedBedrockHit.ty };
    if (!audioPlayed) scene.playMineFeedbackAudio(result, blockedBedrockHit.tileType);
    scene.applyMineFeedback(result, targetTile);
  }

  if (areaResult.hits.some(hit => hit.result?.success)) {
    recordGraveborerWurmMiningNoise(scene, "arcCore", aimTargetTile);
  }
  if (shouldSave) scene.queueDugTilesSave?.();
  if (areaResult.levelUp) _handleLevelUpResult(scene, areaResult);
  refreshMiningTargetVisual(scene);
  return areaResult;
}

/**
 * Main update loop - called from PlayScene.update()
 * @param {number} time - Current time
 * @param {number} delta - Delta time in ms
 */
export function updateScene(time, delta) {
  // Safety guard: if setup hasn't completed, skip update
  if (!this.gameInputHandler) return false;
  const comboShouldPause = this.gameState !== "playing" || hasEscapeClosableUi(this);
  if (comboShouldPause) this.comboSystem?.pause?.(this.time?.now ?? time);
  else this.comboSystem?.resume?.(this.time?.now ?? time);
  if (this._hardcoreRuntime?.modal?.isVisible || this._randomEventModalVisible) {
    this.uiNotifications?.setPaused?.(true);
    return false;
  }

  const notificationInputBlocked = this.gameState !== "playing"
    || this._settingsKeyCaptureActive
    || this.depthMilestoneCinematic?.isActive?.()
    || hasEscapeClosableUi(this);
  this.uiNotifications?.setPaused?.(notificationInputBlocked);

  // 0. Handle global input (works in any state, including during popups)
  if (this.gameInputHandler.handleGlobalInput()) {
    return false; // Global input consumed, exit early
  }

  if (this._settingsKeyCaptureActive) {
    return false;
  }

  if (this.gameInputHandler.handleEscapeInput()) {
    return false;
  }

  const keys = this.inputHandler.getKeys();

  if (!notificationInputBlocked && this.uiNotifications?.handleInput?.()) {
    return false;
  }

  // 2. Check for shop overlay closing (R key)
  if (this.shopOverlay && this.shopOverlay.isVisible && Phaser.Input.Keyboard.JustDown(keys.restart)) {
    if (this.soundSystem) this.soundSystem.playUiConfirm();
    this.shopOverlay.hide();
    return false; // Input consumed, exit early
  }

  // 3. Handle game-state-specific input
  let inputHandled = false;
  switch (this.gameState) {
    case "title":
      inputHandled = this.gameInputHandler.handleTitleStateInput();
      break;
    case "dialog":
      inputHandled = this.gameInputHandler.handleDialogStateInput();
      break;
    case "dead":
      inputHandled = this.gameInputHandler.handleDeadStateInput();
      break;
    case "playing":
      inputHandled = this.gameInputHandler.handlePlayingStateInput();
      break;
    case "paused":
      inputHandled = this.gameInputHandler.handlePausedStateInput();
      break;
  }

  // If input was handled in a non-playing state, skip the rest
  if (inputHandled && this.gameState !== "playing") {
    return false;
  }

  const samplePerformancePhases = shouldSamplePerformancePhases(this);
  this._samplePerformancePhases = samplePerformancePhases;

  // 4. Update systems for all states
  _updateSystems.call(this, time, delta, keys, samplePerformancePhases);

  return true;
}

/**
 * Update game systems (HUD, UI, etc.)
 * @private
 */
function _updateSystems(time, delta, keys, samplePerformancePhases = false) {
  let phaseStartedAtMs = samplePerformancePhases ? performanceNow() : null;

  // HUD updates
  this.systemIntroductionSystem?.update?.();
  this.hudSystem.update(time);
  this.nextPromiseHudSystem?.update(time);
  handleRetentionEvents(this);
  this.journeySystem?.update?.(time);
  this.uiResourceBar?.setResources(this.digSystem.getResourceTotals());
  this.uiResourceBar?.setMoney(this.upgradeSystem.getMoney());

  // Capture the pre-movement tile once for systems updated in this section.
  // PlayerState.getPlayerTile() calculates the body's center and returns a new
  // tile object, so repeated calls here add avoidable work and allocations.
  const playerTile = this.playerController?.getPlayerTile?.() ?? null;
  this._framePlayerTile = playerTile;
  this.worldRenderer?.updateRenderWindow?.(playerTile);
  this.townSquareTutorialSystem?.update?.(delta);

  // Update XP progress bar
  if (this.xpProgressBar && this.playerLevelSystem) {
    const level = this.playerLevelSystem.level;
    const currentXP = this.playerLevelSystem.currentXP;
    const xpRequired = this.playerLevelSystem.getXPRequiredForNextLevel();
    this.xpProgressBar.update(level, currentXP, xpRequired);
  }
  this.celestialActionBarSystem?.sync?.();
  this.celestialCurrencyHudSystem?.update?.();
  if (samplePerformancePhases) {
    recordPerformanceSpan(
      PERFORMANCE_TELEMETRY_CONFIG.phases.playHudProgression,
      phaseStartedAtMs
    );
  }

  // Shop overlay state
  if (this.shopOverlay && this.shopOverlay.isVisible) {
    this.shopOverlay.update(delta);
    return;
  }

  // Playing state specific updates
  phaseStartedAtMs = samplePerformancePhases ? performanceNow() : null;
  if (this.gameState === "playing") {
    _updatePlayingState.call(this, time, delta, keys, playerTile);
  }
  if (samplePerformancePhases) {
    recordPerformanceSpan(
      PERFORMANCE_TELEMETRY_CONFIG.phases.playGameplay,
      phaseStartedAtMs
    );
  }
  const activePlayerTile = this._framePlayerTile;

  phaseStartedAtMs = samplePerformancePhases ? performanceNow() : null;
  // UI suspension preserves the remaining combo window.
  if (this.comboSystem) {
    this.comboSystem.update(this.time.now);
    this.retentionProgressSystem?.recordComboCount?.(
      this.comboSystem.getComboCount?.() || 0
    );
  }

  // Update special block effects (always active — checks expiry)
  if (this.specialBlockEffectsManager) {
    this.specialBlockEffectsManager.update();
  }

  // Clock progression begins with the first-return system introduction.
  if (isSystemFeatureAvailable(this, "clock") && this.dayNightCycle) {
    this.dayNightCycle.update(delta);
  }

  // Weather progression begins with the first-return system introduction so
  // the opening loop is not quietly altered by unseen precipitation rules.
  if (isSystemFeatureAvailable(this, "weather") && this.weatherSystem) {
    this.weatherSystem.update(time, delta);
  }
  this.worldRenderer?.update?.(time, delta, { playerTile: activePlayerTile });
  this.v11SkyIslandVisualSystem?.update?.(time, delta);
  this.backgroundRenderer?.updateUniverseSky();
  this.startZoneScenicBackgroundSystem?.update();
  this.levelOneGroundFacadeSystem?.update(time);
  this.startZoneGroundFacadeSystem?.update(time);
  this.worldScenicFacadeSystem?.update(time, delta);
  if (samplePerformancePhases) {
    recordPerformanceSpan(
      PERFORMANCE_TELEMETRY_CONFIG.phases.playWorldEnvironment,
      phaseStartedAtMs
    );
  }

  phaseStartedAtMs = samplePerformancePhases ? performanceNow() : null;
  // Update atmosphere system (clouds, horizon glow, mist, fireflies, wind particles)
  if (this.atmosphereSystem) {
    this.atmosphereSystem.update(time, delta);
  }

  this.worldBackgroundAmbientMotionSystem?.update(time, delta);
  this.levelOneLivingBackdropSystem?.update(time, delta);
  this.deepWorldLivingBackdropSystem?.update(time, delta);


    // Update sky tile glow effects (always active)
    if (this.worldRenderer && activePlayerTile) {
      this.worldRenderer.updateSkyTileGlow(activePlayerTile, 20);
    }

    // Update chest glow effects (always active — golden pulsing light around treasure chests)
    if (this.worldRenderer && activePlayerTile) {
      this.worldRenderer.updateChestGlow(activePlayerTile, 25);
    }

    // Update glow crystal effects (always active — pretty colored crystal clusters)
    if (this.worldRenderer && activePlayerTile) {
      this.worldRenderer.updateGlowCrystals(activePlayerTile, 25);
    }

    if (isSystemFeatureAvailable(this, "caves") && this.caveAtmosphereSystem && activePlayerTile) {
      this.caveAtmosphereSystem.update(activePlayerTile, time);
    }

    if (isSystemFeatureAvailable(this, "hazards") && this.caveHazardSystem && activePlayerTile) {
      this.caveHazardSystem.update(time, activePlayerTile, this.gameState === "playing");
    }

    if (isSystemFeatureAvailable(this, "caves") && this.caveInteriorOcclusionSystem && activePlayerTile) {
      this.caveInteriorOcclusionSystem.update(activePlayerTile);
    }

  // Update Star Pillar System (always active — handles proximity + zoom view)
  if (isSystemFeatureAvailable(this, "constellations") && this.starPillarSystem && activePlayerTile) {
    this.starPillarSystem.update(time, delta, activePlayerTile, keys);
  }
  if (samplePerformancePhases) {
    recordPerformanceSpan(
      PERFORMANCE_TELEMETRY_CONFIG.phases.playVisualEffects,
      phaseStartedAtMs
    );
  }
}

/**
 * Update playing state specific logic
 * @private
 */
function _updatePlayingState(time, delta, keys, framePlayerTile = null) {
  // Block all gameplay while star chart view is open
  const featureAvailable = feature => isSystemFeatureAvailable(this, feature);
  if (this._pillarViewActive) return;
  const featureDistance = (feature, getter) => featureAvailable(feature) ? getter?.() ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;

  // Depth gates have priority over movement, mining, and active hazards.
  if (this.depthGateSystem?.update()) return;

  // Get player tile early (needed for campfire proximity check)
  let playerTile = framePlayerTile;

  // Campfire system (surface buff station) — MUST run before player controller
  // so W/S/E input handling works while menu is open, and so player can't move
  if (featureAvailable("campfire") && this.campfireSystem && this.inputHandler) {
    const handlerKeys = this.inputHandler.getKeys();
    this.campfireSystem.update(playerTile, handlerKeys, delta);
  }

  // Block all gameplay while campfire menu is open (like shop overlay does)
  if (featureAvailable("campfire") && this.campfireSystem && this.campfireSystem.isSelecting()) return;

  this.celestialActionBarInputBridge?.update?.();
  this.debrisShieldSystem?.update?.(delta, keys.q, this.earthquakeSystem);
  // Update player controller (physics, movement, flight logic)
  this.playerController.update(delta);
  // A player can still enter the authored surface shaft by walking into it;
  // rescue that route immediately while the tutorial has not taught Flight.
  this.townSquareTutorialSystem?.enforceSurfaceSafety?.();
  // Honor the player's current-frame fly/dodge input before a falling rock
  // resolves its swept collision.
  if (featureAvailable("hazards")) {
    this.earthquakeSystem?.update(delta);
    this.earthquakeFeedbackUI?.update();
    this.earthquakeHazardOverlay?.update();
  } else {
    this.earthquakeSystem?.setPaused?.(true);
  }
  if (this.gameState !== "playing") return;

  this.celestialEngineController?.update(time, delta, keys);
  this.openingFlightArtifactSystem?.update(delta);
  this.playerKinematicMotion?.samplePhysics(delta);
  this.playerRigContact?.update(delta);
  this.playerContactShadow?.update(delta);

  playerTile = this.playerController.getPlayerTile();
  this._framePlayerTile = playerTile;
  this.hardcoreMemorialSystem?.update?.();
  updateHardcoreModeRuntime(this, time, delta, playerTile);
  if (this.gameState !== "playing") return;
  updateGraveborerWurmRuntime(this, time, delta, playerTile);
  if (this.gameState !== "playing") return;
  if (featureAvailable("randomEvents")) {
    this.randomEventBridge?.update?.(time, delta, playerTile, {
      pauseTimer: hasEscapeClosableUi(this),
    });
  }
  this.npcManager?.updateActivities?.(time, delta, playerTile);
  const arcCoreConsumedInteraction = featureAvailable("arcCore") && this.arcCoreVehicleSystem?.update(playerTile, keys) === true;

  // Portals are part of the core return route and remain interactive from the
  // first session. SpecialTileSystem gates optional chests/gamble tiles itself.
  this.specialTileSystem?.update?.();
  this.animatedCacheVisualSystem?.update?.(time, playerTile);
  if (featureAvailable("relics")) this.memoryReliquaryWorldSystem?.update?.(time, playerTile);
  this.interactiveWorldStateTextureBank?.update?.(time);
  const milestoneDistance = featureDistance("milestones", () => this.milestoneBoardSystem?.getInteractionDistance?.(playerTile));
  const nearestNpcDistance = featureDistance("core", () => this.npcManager?.getNearestInteractionDistance?.(playerTile));
  const titanStatueDistance = featureDistance("titans", () => this.worldRenderer?.getTitanSurfaceInspectionDistance?.(playerTile));
  const specialTileDistance = this.specialTileSystem?.getInteractionDistance?.(playerTile)
    ?? Number.POSITIVE_INFINITY;
  const eventDistance = featureDistance("randomEvents", () => this.randomEventBridge?.getInteractionDistance?.(playerTile));
  const memoryReliquaryDistance = featureDistance("relics", () => this.memoryReliquaryWorldSystem?.getInteractionDistance?.(playerTile));
  const pillarDistance = featureDistance("constellations", () => this.starPillarSystem?.getInteractionDistance?.(playerTile));
  const understarDistance = this.understarEndingSystem?.getInteractionDistance?.(playerTile)
    ?? Number.POSITIVE_INFINITY;
  const priority = resolveInteractionPriorities({
    milestone: milestoneDistance,
    npc: nearestNpcDistance,
    titan: titanStatueDistance,
    specialTile: specialTileDistance,
    event: eventDistance,
    memoryReliquary: memoryReliquaryDistance,
    pillar: pillarDistance,
    understar: understarDistance,
  });
  this.memoryReliquaryWorldSystem?.setInteractionAllowed?.(
    !arcCoreConsumedInteraction && priority.memoryReliquary,
  );
  const milestoneConsumedInteraction = featureAvailable("milestones") && this.milestoneBoardSystem?.update?.(
    playerTile,
    this.inputHandler?.getKeys?.(),
    {
      allowOpen: !arcCoreConsumedInteraction
        && priority.milestone,
    },
  ) === true;
  const titanConsumedInteraction = featureAvailable("titans") && this.worldRenderer
    ?.updateTitanSurfaceInspection?.(
      playerTile,
      keys,
      {
          allowInspect: !arcCoreConsumedInteraction
          && !milestoneConsumedInteraction
          && priority.titan,
      },
    ) === true;

  // NPC interaction
  if (
    !arcCoreConsumedInteraction
    && !milestoneConsumedInteraction
    && !titanConsumedInteraction
    && !priority.specialTile
    && !priority.event
    && !priority.memoryReliquary
    && !priority.pillar
    && !priority.understar
  ) {
    this.npcManager.checkNPCInteraction();
  }
  
  // Update NPC interact prompts (floating "Press E" text visibility)
  this.npcManager.updateInteractPrompts(
    playerTile,
    priority.npcCompetitionDistance,
  );

  // Integrated caves stay in PlayScene. Only explicit compact review mouths
  // open CaveScene; geodes always remain in the authoritative world.
  if (
    !arcCoreConsumedInteraction
    && !milestoneConsumedInteraction
    && !titanConsumedInteraction
    && !priority.specialTile
    && !priority.event
    && !priority.memoryReliquary
    && !priority.pillar
    && !priority.understar
    && featureAvailable("caves")
    && this.caveEntryController?.update(playerTile, keys)
  ) return;

    // Special tile system (gamble and teleport tiles)
    if (featureAvailable("heavenblocks")) this.heavenblocksAccessSystem?.update?.(playerTile);

  // Aim handling
  const miningInputState = this.inputHandler.resolveMiningInputState();
  const rawAimTargetTile = miningInputState.targetTile;
  const effectiveAimLabel = miningInputState.aimLabel
    || this.playerController.getAimLabel();
  const mineInputHeld = keys.mine?.isDown === true
    || miningInputState.mouseHeld
    || miningInputState.mouseRequested;
  const aimTargetTile = this.inputHandler.resolveStableMineTarget(
    rawAimTargetTile,
    mineInputHeld,
    effectiveAimLabel,
  );
  this.inputHandler.updateAimBox(
    aimTargetTile,
    this.inputHandler.isSolidAimTarget(aimTargetTile),
    miningInputState,
  );
  this.miningIntentPreviewSystem?.update(aimTargetTile, keys, effectiveAimLabel);
  this._effectiveMineAimLabel = effectiveAimLabel;

  // Mining
  const abilities = this.playerController.abilities;
  const isQuickslashActive = abilities && abilities.isQuickslashActive && abilities.isQuickslashActive();
  const arcCoreActive = this.arcCoreVehicleSystem?.isActive?.() === true;
  
  // Track previous quickslash state to detect when Q is released
  const wasQuickslashActive = this._wasQuickslashActive || false;
  this._wasQuickslashActive = isQuickslashActive;
  
  // Quickslash: one native action owns one GP cost, one contact, and one hit.
  if (isQuickslashActive && !this._teleportInAnimating) {
    const quickslashDir = abilities.getQuickslashDirection();
    const quickslashAim = quickslashDir > 0 ? "RIGHT" : "LEFT";
    const quickslashTarget = this.inputHandler.resolveAimTargetTileForVector({
      x: quickslashDir,
      y: 0,
    });
    const quickslashCommittedDirection = resolvePlayerTargetDirection(
      this.playerController?.physicsBody,
      this.config.tileSize,
      quickslashTarget,
    );

    if (this.randomEventBridge?.shouldConsumeMineTarget?.(quickslashTarget)) {
      this.randomEventBridge.handleMineContact(quickslashTarget);
      this.updatePlayerVisualState(true);
    } else if (arcCoreActive) {
      handleArcCoreMine(this, quickslashTarget, time, abilities, quickslashAim);
    } else if (
      (!this.isDigAnimating || this.canReplaceUalDigRecovery?.(time, abilities))
      && quickslashTarget
    ) {
      const profile = this.playerAssetProfile || ASSET_KEYS.player;
      const tileType = this.worldModel.getTileType(quickslashTarget.tx, quickslashTarget.ty);
      this.startDigAnimation({
        targetTile: quickslashTarget,
        tileType,
        actionKind: "quickslash",
        actionDirectionX: quickslashDir,
        animationKeyOverride: profile.quickslashAnim || ASSET_KEYS.player.quickslashAnim,
        onContact: (contactEvent) => {
          const now = contactEvent?.now ?? this.time?.now ?? time;
          const contactDirection = quickslashCommittedDirection
            || resolveLiveContactDirection(this, quickslashTarget);
          if (!contactDirection) return;
          this._lastPlayerRigContactValidation = this.playerRigContact?.validateContact({
            targetTile: quickslashTarget,
            direction: contactDirection,
          });
          const result = this.digSystem.tryMine(
            quickslashTarget,
            now,
            contactDirection.aimLabel || quickslashAim,
            abilities,
            { actionStartedAtMs: time },
          );
          handleQuickslashMineResult(this, result, quickslashTarget, tileType);
        },
      });
    }
  }

  // Releasing Q never cuts a committed native contact/recovery short.
  if (wasQuickslashActive && !isQuickslashActive && !this.isDigAnimating) {
    this.updatePlayerVisualState(true);
    this._actionFlipX = null;
  }

  // Normal mining (configured dig key or primary mouse click/hold).
  const keyboardMineRequested = this.playerController.consumeMineInput();
  const normalMineRequested = keyboardMineRequested || miningInputState.mouseRequested;
  const tutorialDownwardMineBlocked = isTutorialDownwardMineBlocked(
    this,
    aimTargetTile,
  )
    && isDownwardAimLabel(effectiveAimLabel)
    && !isRequiredTownTutorialDigTarget(this, aimTargetTile);
  if (tutorialDownwardMineBlocked && normalMineRequested && !isQuickslashActive) {
    if (miningInputState.mouseRequested) {
      this.inputHandler.acknowledgeMouseMineRequest();
    }
    this.townSquareTutorialSystem?.handleDescentBlocked?.();
  }
  if (
    !this._teleportInAnimating
    && normalMineRequested
    && !isQuickslashActive
    && !tutorialDownwardMineBlocked
  ) {
    if (miningInputState.mouseRequested) {
      this.inputHandler.acknowledgeMouseMineRequest();
    }
    if (this.randomEventBridge?.shouldConsumeMineTarget?.(aimTargetTile)) {
      const eventTileType = this.worldModel.getTileType(aimTargetTile.tx, aimTargetTile.ty);
      const eventProfile = this.playerAssetProfile || ASSET_KEYS.player;
      if (eventProfile.isLivingDrill) {
        this.randomEventBridge.handleMineContact(aimTargetTile);
        this.updatePlayerVisualState(true);
      } else if (!this.isDigAnimating || this.canReplaceUalDigRecovery?.(time, abilities)) {
        this.startDigAnimation({
          targetTile: aimTargetTile,
          tileType: eventTileType,
          actionKind: "normal",
          onContact: () => {
            this.randomEventBridge?.handleMineContact?.(aimTargetTile);
          },
        });
      }
    } else if (arcCoreActive) {
      handleArcCoreMine(this, aimTargetTile, time, abilities, effectiveAimLabel);
    } else {
      const mineAttempt = this.prepareLivingDrillMineAttempt?.(
        aimTargetTile,
        effectiveAimLabel,
      )
        || { allow: true, targetTile: aimTargetTile };
      if (mineAttempt.allow) {
        const mineTargetTile = mineAttempt.targetTile;
        const tileType = mineTargetTile
          ? this.worldModel.getTileType(mineTargetTile.tx, mineTargetTile.ty)
          : null;
        const committedDirection = resolvePlayerTargetDirection(
          this.playerController?.physicsBody,
          this.config.tileSize,
          mineTargetTile,
        );
        const resolvedAim = committedDirection?.aimLabel || effectiveAimLabel;
        const profile = this.playerAssetProfile || ASSET_KEYS.player;

        if (profile.isUalNative) {
          if (
            (!this.isDigAnimating || this.canReplaceUalDigRecovery?.(time, abilities))
            && mineTargetTile
          ) {
            this.startDigAnimation({
              targetTile: mineTargetTile,
              tileType,
              actionKind: "normal",
              onContact: (contactEvent) => {
                const now = contactEvent?.now ?? this.time?.now ?? time;
                const contactDirection = committedDirection
                  || resolveLiveContactDirection(this, mineTargetTile);
                if (!contactDirection) return;
                this._lastPlayerRigContactValidation = this.playerRigContact?.validateContact({
                  targetTile: mineTargetTile,
                  direction: contactDirection,
                });
                const result = this.digSystem.tryMine(
                  mineTargetTile,
                  now,
                  contactDirection.aimLabel || resolvedAim,
                  abilities,
                  { actionStartedAtMs: time },
                );
                handleNormalMineResult(this, result, mineTargetTile, tileType);
              },
            });
          }
        } else {
          const result = this.digSystem.tryMine(mineTargetTile, time, resolvedAim, abilities);
          if (result.reason !== "cooldown") {
            this.startDigAnimation({ result, targetTile: mineTargetTile, tileType });
          }
          handleNormalMineResult(this, result, mineTargetTile, tileType, {
            flushContactFeedback: false,
          });
        }
      }
    }
  }

  // Special tile interaction (E key for gamble/teleport tiles)
  if (
    !arcCoreConsumedInteraction
    && this.inputHandler.consumeSpecialTileInteractInput()
  ) {
    if (priority.understar && this.understarEndingSystem?.handleInteract?.(playerTile)) {
      return;
    }

    if (priority.pillar && this.starPillarSystem?.handleInteract?.(playerTile)) {
      return;
    }

    if (featureAvailable("randomEvents") && priority.event && this.randomEventBridge?.handleInteract?.()) {
      return;
    }

    const heavenblocksResult = featureAvailable("heavenblocks") ? (this.heavenblocksAccessSystem?.handleInteract?.() || { success: false }) : { success: false };
    if (heavenblocksResult.success) {
      console.log("[HEAVENBLOCKS] Interaction successful:", heavenblocksResult.type, heavenblocksResult);
      return;
    }
    if (featureAvailable("relics") && priority.memoryReliquary) {
      const memoryResult = this.memoryReliquaryWorldSystem?.handleInteract?.()
        || { success: false };
      if (memoryResult.success) {
        console.log("[MEMORY RELIQUARY] Interaction successful:", memoryResult.type, memoryResult);
        return;
      }
    }
    const interactResult = this.specialTileSystem?.handleInteract?.()
      || { success: false };
    if (interactResult.success) {
      console.log('[SPECIAL TILE] Interaction successful:', interactResult.type, interactResult);
      // Refresh resources after gamble
      if (interactResult.type === 'gamble') {
        this.uiResourceBar?.setResources(this.digSystem.getResourceTotals());
      }
      return;
    }
  }

  // Thunder Strike: one paid charge, then exact-timing free follow-up slams.
  const cInput = this.playerController.input.getThunderStrikeInput();
  if (featureAvailable("abilities")) this.thunderStrikeActionRuntime?.update(
    time,
    cInput,
    (strikeResult, contactTime) => handleThunderStrikeResult(
      this,
      strikeResult,
      contactTime,
    ),
  );

  // Visual state
  this.updateLivingDrillEngagementTimeout?.(time);
  if (!this.isDigAnimating) {
    this.updatePlayerVisualState();
  }
  this.flightFootParticleSystem?.update(
    delta,
    !this.isDigAnimating && this.playerController?.abilities?.isFlying?.() === true,
  );

  // Safety check: if playerTile is undefined (player about to die), skip depth calculation
  if (!playerTile) {
    return;
  }
  
  const depth = Math.max(0, playerTile.ty - this.config.topAirRows + 1);
  this.understarEndingSystem?.update?.(time, delta, playerTile, depth);
  const inTown = playerTile.ty >= this.config.topAirRows - 4
    && playerTile.ty <= this.config.topAirRows;
  this.retentionProgressSystem?.updateDepth?.(depth, {
    isTown: inTown,
    deltaMs: delta,
    gemPower: this.playerController?.abilities?.getGemPowerExact?.(),
  });
  if (featureAvailable("randomEvents")) this.randomEventBridge?.checkJackpotMaturity?.(depth);

  // Update biome system with current depth
  if (this.biomeSystem) {
    this.biomeSystem.update(depth);
  }

  // Check depth milestones
  if (featureAvailable("milestones") && this.milestoneBoardSystem && !this._randomEventModalVisible) {
    const milestone = this.milestoneBoardSystem.checkDepthMilestone(depth);
    if (milestone) {
      // Play milestone fanfare
      if (this.soundSystem) {
        this.soundSystem.playSfx('reward');
      }
      this.shakeSystem?.shake("misc.depthMilestone");
      // Trigger cinematic for curated depths (100, 300, 500, 750, 1000, 1500, 2000)
      if (!this.understarEndingSystem?.isFinaleDepth?.(depth)) {
        this.depthMilestoneCinematic?.trigger?.(depth, milestone);
      }
      // Exact permanent totals live in the Milestone board and ESC > Journey.
      // Curated depths already receive the centered cinematic; never enqueue
      // an additional normal notification card.
    }
  }

  this.hudSystem.setDepth(depth);
  this.hudSystem.setXTile(playerTile.tx);
  this.hudSystem.setTilesBroken(this.digSystem.getTilesBroken());
  this.hudSystem.setAim(
    this._effectiveMineAimLabel || this.playerController.getAimLabel(),
  );
  syncProgressionGemPowerMax(this);

  const gemPowerPct = this.playerController.getGemPowerPercent();
  this.hudSystem.setGemPower(gemPowerPct);
  this.hudSystem.setGemPowerValues(
    this.playerController.getGemPowerRaw(),
    this.playerController.getGemPowerMax()
  );

  // Flight height indicator (always visible)
  const flightAbilities = this.playerController.abilities;
  if (flightAbilities && typeof flightAbilities.getFlightHeightTiles === 'function') {
    const currentHeight = flightAbilities.getFlightHeightTiles();
    const maxHeight = flightAbilities.getMaxFlightHeightTiles();
    this.hudSystem.setFlightHeight(currentHeight, maxHeight);
  }
  

  // Refresh safe return line
  if (this.hudSystem.isDirty()) {
    this._refreshSafeReturnLine();
  }

  // UI updates
  this.uiInventoryPopup?.setResources(this.digSystem.getResourceTotals());
  this.uiInventoryPopup?.setMoney(this.upgradeSystem.getMoney());
  this.drawStatusBars(gemPowerPct,
    this.playerController.getGemPowerRaw(),
    this.playerController.getGemPowerMax()
  );

  // Death check
  if (playerTile.ty >= this.config.deathTileY) {
    this.handleCasualBoundaryRescue?.(depth);
  }
}

// -- Per-frame camera updates -----------------------------------------------
// Runs every frame after gameplay systems so active camera feedback is applied
// against the player's current position.
//
//   1. shakeSystem.update()     -- apply active camera-shake offset
export function updateCameraSystems(scene, time, delta) {
  // 1. Apply active shake offset (custom multi-frequency, see CameraShakeSystem)
  if (scene.shakeSystem) scene.shakeSystem.update(time, delta);

  // NOTE: Camera zoom is intentionally NOT changed at runtime.
  //   - Zooming the main camera would scale the HUD/menus (which use
  //     setScrollFactor(0)) and break UI layout (bars off-screen, dark
  //     backdrops too small, etc.).
  //   - The proper fix is a two-camera system (UI on its own camera at
  //     zoom 1.0) which is a follow-up improvement.
  //   - The character size was bumped (48px -> 64px display) so the hero
  //     already feels substantially larger without any zoom.
}

export function updateLightingSystems(scene, time, delta, framePlayerTile = undefined) {
  const playerTile = framePlayerTile === undefined
    ? scene.playerController?.getPlayerTile?.() ?? null
    : framePlayerTile;
  const lightDepth = playerTile
    ? Math.max(0, playerTile.ty - scene.config.topAirRows + 1)
    : undefined;
  const gameplayActive = scene.gameState === "playing"
    && !scene._pillarViewActive
    && !scene.campfireSystem?.isSelecting?.();

  if (scene.lightFrameSync) {
    scene.lightFrameSync.queue(time, delta, lightDepth, gameplayActive);
    return;
  }

  scene.lightSystem?.update?.(time, delta, lightDepth, gameplayActive);
  scene.shaderSystem?.update?.(time, delta);
}
