/**
 * PlayScene Update Module
 * Handles the main game loop, state management, and input processing
 * Uses GameInputHandler for clean separation of input handling
 */

import { UI_CONFIG } from "../../values/uiConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { RESOURCE_COLORS, getResourceDisplayName } from "../../values/resourceTypes.js";
import { RESOURCE_PRICES_CONFIG, getCargoSellValue } from "../../values/resourcePrices.js";
import { RETENTION_CONFIG, RETENTION_EVENT_TYPES } from "../../values/retentionConfig.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { resolvePlayerTargetDirection } from "../../player/playerDirectionalTargets.js";
import {
  recordGraveborerWurmMiningNoise,
  updateGraveborerWurmRuntime,
} from "./GraveborerWurmBridge.js";

function hasEscapeClosableOverlay(scene) {
  return Boolean(
    scene.depthGateSystem?.isOpen?.() ||
    scene.levelUpPopup?.visible ||
    scene.shopOverlay?.isVisible ||
    scene.campfireSystem?.isSelecting?.() ||
    scene.milestoneBoardSystem?._isBoardOpen ||
    (scene._pillarViewActive && scene.starPillarSystem) ||
    scene.uiInventoryPopup?.isOpen
  );
}

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

function _handleLevelUpResult(scene, result) {
  if (!result?.levelUp || !scene.levelUpPopup) return;
  if (scene.openingFlightArtifactSystem?.handleStarterLevelUp?.(result) === true) return;

  const rewards = Array.isArray(result.rewards) ? result.rewards : [];
  const level = Number.isFinite(result.newLevel)
    ? result.newLevel
    : scene.playerLevelSystem?.level;
  const hasChoice = Boolean(result.hasChoice);

  syncProgressionGemPowerMax(scene);
  scene.queueDugTilesSave?.();
  if (!hasChoice) {
    scene.uiNotifications?.success?.(
      `LEVEL ${level}  •  Mining power and Gem Power increased`,
      {
        key: "routine-level-up",
        durationMs: RETENTION_CONFIG.notifications.routineLevelMs,
      }
    );
    return;
  }

  if (scene.levelUpPopup.visible) {
    scene._pendingLevelUp = {
      level,
      hasChoice,
      rewards,
    };
    return;
  }

  scene.levelUpPopup.show(level, hasChoice, rewards);
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

  const overkill = Math.max(0, Number(result.overkillDamage) || 0);
  const maxHp = Math.max(1, Number(result.maxHp) || 1);
  if (result.destroyed && overkill >= maxHp * feedback.overkillMinHpRatio) {
    scene.floatingTextSystem.showFloatingText(
      worldX,
      worldY - 52,
      `${feedback.overkillPrefix} +${Math.floor(overkill)}`,
      feedback.overkillColor,
      feedback.overkillDurationMs,
      feedback.overkillFontSize
    );
    scene._applyDestroyParticles?.(worldX, worldY, result.tileType);
    scene.shakeSystem?.shake?.("mining.crit", 0.7);
  }

  if (options.consumeUpgradePayoff !== false) {
    const payoff = scene.retentionProgressSystem?.consumeUpgradePayoff?.();
    if (payoff && (
      payoff.afterDamage > payoff.beforeDamage
      || (payoff.beforeHits > 0 && payoff.afterHits < payoff.beforeHits)
    )) {
      const breakpoint = payoff.beforeHits > 0 && payoff.afterHits < payoff.beforeHits
        ? `  •  ${payoff.beforeHits} hits → ${payoff.afterHits}`
        : "";
      scene.uiNotifications?.success?.(
        `${payoff.upgradeName.toUpperCase()} FEELS STRONGER${breakpoint}`,
        {
          key: "upgrade-payoff",
          durationMs: RETENTION_CONFIG.notifications.upgradePayoffMs,
        }
      );
    }
  }
}

function formatExpeditionSummary(scene, event) {
  const summary = event.summary || {};
  const previous = event.previous || {};
  const cargoValue = getCargoSellValue(
    scene.digSystem?.getResourceTotals?.() || {},
    scene.upgradeSystem?.getUpgradeEffects?.() || {}
  );
  const parts = [
    `RETURNED  •  ${summary.maxDepth || 0}m`,
    `${summary.tilesBroken || 0} tiles`,
    `${cargoValue.toLocaleString()} M cargo`,
  ];
  if (summary.bestMaterial) parts.push(`best: ${getResourceDisplayName(summary.bestMaterial)}`);
  if (summary.stars > 0) parts.push(`${summary.stars} star${summary.stars === 1 ? "" : "s"}`);
  if (summary.chests > 0) parts.push(`${summary.chests} chest${summary.chests === 1 ? "" : "s"}`);
  const gains = [];
  if ((summary.maxDepth || 0) > (previous.maxDepth || 0) && previous.maxDepth > 0) {
    gains.push(`+${summary.maxDepth - previous.maxDepth}m deeper`);
  }
  if ((summary.resourceUnits || 0) > (previous.resourceUnits || 0) && previous.resourceUnits > 0) {
    const percent = Math.round(
      ((summary.resourceUnits - previous.resourceUnits) / previous.resourceUnits) * 100
    );
    if (percent > 0) gains.push(`+${percent}% more cargo`);
  }
  return `${parts.join("  •  ")}${gains.length ? `\nNEW HIGH: ${gains[0]}` : ""}`;
}

function handleRetentionEvents(scene) {
  const retention = scene.retentionProgressSystem;
  if (!retention) return;
  const display = USER_SETTINGS.getDisplay();
  retention.drainEvents().forEach(event => {
    switch (event.type) {
      case RETENTION_EVENT_TYPES.DISCOVERY: {
        if (display.showMaterialDiscoveryCards === false) break;
        const price = RESOURCE_PRICES_CONFIG.basePrices[event.key] || 0;
        scene.uiNotifications?.success?.(
          `NEW MATERIAL  •  ${getResourceDisplayName(event.key)}`
            + (price > 0 ? `  •  Base value ${price} M each` : ""),
          {
            durationMs: RETENTION_CONFIG.notifications.discoveryMs,
            noDedupe: true,
          }
        );
        break;
      }
      case RETENTION_EVENT_TYPES.TUTORIAL:
        scene.uiNotifications?.info?.(event.message, {
          key: "first-run-contract",
          durationMs: RETENTION_CONFIG.notifications.tutorialMs,
        });
        break;
      case RETENTION_EVENT_TYPES.OBJECTIVE_COMPLETE: {
        const reward = Math.max(0, Number(event.objective?.rewardMoney) || 0);
        scene.upgradeSystem?.addMoney?.(reward);
        retention.recordMoneyEarned(reward);
        scene.uiNotifications?.success?.(
          `SESSION GOAL COMPLETE  •  +${reward} M  •  No streak, no reset penalty`,
          {
            key: "session-objective",
            durationMs: RETENTION_CONFIG.notifications.objectiveMs,
          }
        );
        scene.queueDugTilesSave?.();
        break;
      }
      case RETENTION_EVENT_TYPES.PERSONAL_BEST:
        scene.uiNotifications?.success?.(`NEW DEPTH RECORD  •  ${event.depth}m`, {
          key: "personal-best",
          durationMs: RETENTION_CONFIG.notifications.personalBestMs,
        });
        scene.screenFlashSystem?.flashLucky?.();
        break;
      case RETENTION_EVENT_TYPES.EXPEDITION_SUMMARY:
        if (display.showExpeditionSummaries !== false) {
          scene.uiNotifications?.info?.(formatExpeditionSummary(scene, event), {
            key: "expedition-summary",
            durationMs: RETENTION_CONFIG.notifications.summaryMs,
          });
        }
        scene.queueDugTilesSave?.();
        break;
      case RETENTION_EVENT_TYPES.EARTHQUAKE_RECAP:
        scene.uiNotifications?.info?.(
          `EARTHQUAKE CLEARED  •  ${String(event.intensity).toUpperCase()}`
            + `  •  endured ${event.distanceEndured || 0} tiles from the epicenter`
            + `  •  ${event.passagesOpened} new passage${event.passagesOpened === 1 ? "" : "s"}`,
          {
            key: "earthquake-recap",
            durationMs: RETENTION_CONFIG.notifications.earthquakeRecapMs,
          }
        );
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
  if (result.levelUp && scene.levelUpPopup) _handleLevelUpResult(scene, result);
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

  const refreshedAim = scene.inputHandler.resolveAimTargetTile();
  scene.inputHandler.updateAimBox(refreshedAim, scene.inputHandler.isSolidAimTarget(refreshedAim));
  if (result.levelUp && scene.levelUpPopup) _handleLevelUpResult(scene, result);
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
    if (result.breachedBedrock) {
      scene.queueDugTilesSave?.();
      return;
    }

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
    if (reward.levelUp && scene.levelUpPopup) _handleLevelUpResult(scene, reward);
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
  if (areaResult.levelUp && scene.levelUpPopup) _handleLevelUpResult(scene, areaResult);
  const refreshedAim = scene.inputHandler.resolveAimTargetTile();
  scene.inputHandler.updateAimBox(refreshedAim, scene.inputHandler.isSolidAimTarget(refreshedAim));
  return areaResult;
}

/**
 * Main update loop - called from PlayScene.update()
 * @param {number} time - Current time
 * @param {number} delta - Delta time in ms
 */
export function updateScene(time, delta) {
  // Safety guard: if setup hasn't completed, skip update
  if (!this.gameInputHandler) return;

  this.worldBackgroundMasterSystem?.update();

  // 0. Handle global input (works in any state, including during popups)
  if (this.gameInputHandler.handleGlobalInput()) {
    return; // Global input consumed, exit early
  }

  if (this._settingsKeyCaptureActive) {
    return;
  }

  const keys = this.inputHandler.getKeys();
  const escPressed = hasEscapeClosableOverlay(this)
    && ((keys.escape && Phaser.Input.Keyboard.JustDown(keys.escape))
      || (keys.hardEscape && Phaser.Input.Keyboard.JustDown(keys.hardEscape)));
  if (escPressed && this.closeTopOverlay?.("escape")) {
    return;
  }

  // 1. Check for level up popup input (has highest priority after global)
  if (this.levelUpPopup && this.levelUpPopup.visible) {
    const choice = this.levelUpPopup.handleInput();
      if (choice) {
        if (choice !== "continue") {
          const applied = this.playerLevelSystem.applyChoiceReward(choice);
          if (applied) {
            this.uiNotifications?.success?.(
              `${applied.reward?.name || choice} chosen  •  permanent bonus saved`,
              { durationMs: RETENTION_CONFIG.notifications.routineLevelMs }
            );
            this.queueDugTilesSave?.();
          }
        }
        syncProgressionGemPowerMax(this);
        // Check if there's a pending level up after closing current popup
        if (this._pendingLevelUp && !this.levelUpPopup.visible) {
          console.log('[LEVEL UP] Showing pending level up - Level:', this._pendingLevelUp.level);
          this.levelUpPopup.show(this._pendingLevelUp.level, this._pendingLevelUp.hasChoice, this._pendingLevelUp.rewards);
          this._pendingLevelUp = null;
        }
      }
    return; // Skip all other updates while level up popup is visible
  }

  // 2. Check for shop overlay closing (R key)
  if (this.shopOverlay && this.shopOverlay.isVisible && Phaser.Input.Keyboard.JustDown(keys.restart)) {
    if (this.soundSystem) this.soundSystem.playUiConfirm();
    this.shopOverlay.hide();
    return; // Input consumed, exit early
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
    return;
  }

  // 4. Update systems for all states
  _updateSystems.call(this, time, delta, keys);

  // Update underground loop background visibility based on player depth
  if (this.backgroundRenderer && this.playerController) {
    const playerPos = this.playerController.getPlayerPosition();
    if (playerPos) {
      this.backgroundRenderer.updateUndergroundLoopVisibility(playerPos.y);
    }
  }

  // Per-frame camera shake / look-ahead / depth-band zoom / UI zoom compensation
  updateCameraSystems(this, time, delta);
  updateLightingSystems(this, time, delta);
}

/**
 * Update game systems (HUD, UI, etc.)
 * @private
 */
function _updateSystems(time, delta, keys) {
  // HUD updates
  this.hudSystem.update(time);
  this.nextPromiseHudSystem?.update(time);
  handleRetentionEvents(this);
  this.uiResourceBar?.setResources(this.digSystem.getResourceTotals());
  this.uiResourceBar?.setMoney(this.upgradeSystem.getMoney());

  // Capture the pre-movement tile once for systems updated in this section.
  // PlayerState.getPlayerTile() calculates the body's center and returns a new
  // tile object, so repeated calls here add avoidable work and allocations.
  const playerTile = this.playerController?.getPlayerTile?.() ?? null;
  this.worldRenderer?.updateRenderWindow?.(playerTile);

  // Update XP progress bar
  if (this.xpProgressBar && this.playerLevelSystem) {
    const level = this.playerLevelSystem.level;
    const currentXP = this.playerLevelSystem.currentXP;
    const xpRequired = this.playerLevelSystem.getXPRequiredForNextLevel();
    this.xpProgressBar.update(level, currentXP, xpRequired);
  }

  // Shop overlay state
  if (this.shopOverlay && this.shopOverlay.isVisible) {
    this.shopOverlay.update(delta);
    return;
  }

  // Playing state specific updates
  if (this.gameState === "playing") {
    _updatePlayingState.call(this, time, delta, keys);
  }

  // Update combo system timer (always active — checks expiry)
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

  // Update day/night cycle (always active)
  if (this.dayNightCycle) {
    this.dayNightCycle.update(delta);
  }

  // Update dynamic weather before lighting so sunlight, storm flashes, and cave
  // pulses feed the current frame's compositor.
  if (this.weatherSystem) {
    this.weatherSystem.update(time, delta);
  }
  this.worldRenderer?.update?.(time, delta, { playerTile });
  this.backgroundRenderer?.updateUniverseSky();
  this.startZoneScenicBackgroundSystem?.update();
  this.levelOneGroundFacadeSystem?.update(time);
  this.startZoneGroundFacadeSystem?.update(time);
  this.worldScenicFacadeSystem?.update(time, delta);

  // Update atmosphere system (clouds, horizon glow, mist, fireflies, wind particles)
  if (this.atmosphereSystem) {
    this.atmosphereSystem.update(time, delta);
  }

  this.worldBackgroundAmbientMotionSystem?.update(time, delta);
  this.levelOneLivingBackdropSystem?.update(time, delta);
  this.deepWorldLivingBackdropSystem?.update(time, delta);


    // Update sky tile glow effects (always active)
    if (this.worldRenderer && playerTile) {
      this.worldRenderer.updateSkyTileGlow(playerTile, 20);
    }

    // Update chest glow effects (always active — golden pulsing light around treasure chests)
    if (this.worldRenderer && playerTile) {
      this.worldRenderer.updateChestGlow(playerTile, 25);
    }

    // Update glow crystal effects (always active — pretty colored crystal clusters)
    if (this.worldRenderer && playerTile) {
      this.worldRenderer.updateGlowCrystals(playerTile, 25);
    }

    if (this.caveAtmosphereSystem && playerTile) {
      this.caveAtmosphereSystem.update(playerTile, time);
    }

    if (this.caveHazardSystem && playerTile) {
      this.caveHazardSystem.update(time, playerTile, this.gameState === "playing");
    }

    if (this.caveInteriorOcclusionSystem && playerTile) {
      this.caveInteriorOcclusionSystem.update(playerTile);
    }

  // Update Star Pillar System (always active — handles proximity + zoom view)
  if (this.starPillarSystem && playerTile) {
    this.starPillarSystem.update(time, delta, playerTile, keys);
  }
}

/**
 * Update playing state specific logic
 * @private
 */
function _updatePlayingState(time, delta, keys) {
  // Block all gameplay while star chart view is open
  if (this._pillarViewActive) return;

  // Depth gates have priority over movement, mining, and active hazards.
  if (this.depthGateSystem?.update()) return;

  this.earthquakeSystem?.update(delta);
  this.earthquakeFeedbackUI?.update();
  this.earthquakeHazardOverlay?.update();

  // Get player tile early (needed for campfire proximity check)
  let playerTile = null;
  if (this.playerController) {
    playerTile = this.playerController.getPlayerTile();
  }

  // Campfire system (surface buff station) — MUST run before player controller
  // so W/S/E input handling works while menu is open, and so player can't move
  if (this.campfireSystem && this.inputHandler) {
    const handlerKeys = this.inputHandler.getKeys();
    this.campfireSystem.update(playerTile, handlerKeys, delta);
  }

  // Block all gameplay while campfire menu is open (like shop overlay does)
  if (this.campfireSystem && this.campfireSystem.isSelecting()) return;

  // Update player controller (physics, movement, flight logic)
  this.playerController.update(delta);
  this.celestialEngineController?.update(time, delta, keys);
  this.openingFlightArtifactSystem?.update(delta);
  this.playerKinematicMotion?.samplePhysics(delta);
  this.playerRigContact?.update(delta);

  playerTile = this.playerController.getPlayerTile();
  updateGraveborerWurmRuntime(this, time, delta, playerTile);
  this.npcManager?.updateActivities?.(time, delta, playerTile);
  const arcCoreConsumedInteraction = this.arcCoreVehicleSystem?.update(playerTile, keys) === true;

  const milestoneDistance = this.milestoneBoardSystem?.getInteractionDistance?.(playerTile)
    ?? Number.POSITIVE_INFINITY;
  const nearestNpcDistance = this.npcManager?.getNearestInteractionDistance?.(playerTile)
    ?? Number.POSITIVE_INFINITY;
  const milestoneConsumedInteraction = this.milestoneBoardSystem?.update?.(
    playerTile,
    this.inputHandler?.getKeys?.(),
    { allowOpen: milestoneDistance < nearestNpcDistance },
  ) === true;

  // NPC interaction
  if (!arcCoreConsumedInteraction && !milestoneConsumedInteraction) {
    this.npcManager.checkNPCInteraction();
  }
  
  // Update NPC interact prompts (floating "Press E" text visibility)
  this.npcManager.updateInteractPrompts(playerTile, milestoneDistance);

  // Integrated caves stay in PlayScene. Only explicit compact review mouths
  // open CaveScene; geodes always remain in the authoritative world.
  if (!arcCoreConsumedInteraction && this.caveEntryController?.update(playerTile, keys)) return;

    // Special tile system (gamble and teleport tiles)
    this.specialTileSystem.update();
    this.heavenblocksAccessSystem?.update?.(playerTile);

  // Aim handling
  const rawAimTargetTile = this.inputHandler.resolveAimTargetTile();
  const aimTargetTile = this.inputHandler.resolveStableMineTarget(
    rawAimTargetTile,
    keys.mine?.isDown === true,
    this.playerController.getAimLabel()
  );
  this.inputHandler.updateAimBox(aimTargetTile, this.inputHandler.isSolidAimTarget(aimTargetTile));
  this.miningIntentPreviewSystem?.update(aimTargetTile, keys);

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

    if (arcCoreActive) {
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

  // Normal mining (F key)
  if (!this._teleportInAnimating && this.playerController.consumeMineInput() && !isQuickslashActive) {
    if (arcCoreActive) {
      handleArcCoreMine(this, aimTargetTile, time, abilities);
    } else {
      const mineAttempt = this.prepareLivingDrillMineAttempt?.(aimTargetTile)
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
        const resolvedAim = committedDirection?.aimLabel || this.playerController.getAimLabel();
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
  if (!arcCoreConsumedInteraction && Phaser.Input.Keyboard.JustDown(keys.interact)) {
    const heavenblocksResult = this.heavenblocksAccessSystem?.handleInteract?.()
      || { success: false };
    if (heavenblocksResult.success) {
      console.log("[HEAVENBLOCKS] Interaction successful:", heavenblocksResult.type, heavenblocksResult);
      return;
    }
    const interactResult = this.specialTileSystem?.handleInteract?.() || { success: false };
    if (interactResult.success) {
      console.log('[SPECIAL TILE] Interaction successful:', interactResult.type, interactResult);
      // Refresh resources after gamble
      if (interactResult.type === 'gamble') {
        this.uiResourceBar?.setResources(this.digSystem.getResourceTotals());
      }
      return;
    }

    // Star Pillar is the fallback when no special tile consumed E.
    if (this.starPillarSystem && this.starPillarSystem._playerInRange) {
      this.starPillarSystem.openConstellationView();
      return;
    }
  }

  // Thunder Strike: one paid charge, then two exact-timing free follow-up slams.
  const cInput = this.playerController.input.getThunderStrikeInput();
  this.thunderStrikeActionRuntime?.update(
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

  // HUD updates - reuse playerTile from line 162 (no const to avoid redeclaration)
  playerTile = this.playerController.getPlayerTile();
  
  // Safety check: if playerTile is undefined (player about to die), skip depth calculation
  if (!playerTile) {
    return;
  }
  
  const depth = Math.max(0, playerTile.ty - this.config.topAirRows + 1);
  const inTown = playerTile.ty >= this.config.topAirRows - 4
    && playerTile.ty <= this.config.topAirRows;
  this.retentionProgressSystem?.updateDepth?.(depth, { isTown: inTown });

  // Update biome system with current depth
  if (this.biomeSystem) {
    this.biomeSystem.update(depth);
  }

  // Check depth milestones
  if (this.milestoneBoardSystem) {
    const milestone = this.milestoneBoardSystem.checkDepthMilestone(depth);
    if (milestone) {
      // Play milestone fanfare
      if (this.soundSystem) {
        this.soundSystem.playSfx('reward');
      }
      this.shakeSystem?.shake("misc.depthMilestone");
      // Trigger cinematic for curated depths (100, 300, 500, 750, 1000, 1500, 2000)
      this.depthMilestoneCinematic?.trigger?.(depth, milestone);
      // Flash status
      if (this.hudSystem) {
        this.hudSystem.flashStatus(
          `✦ MILESTONE: ${milestone.depth}m - ${milestone.name}! ${milestone.reward}`,
          '#FFD700',
          3000
        );
      }
      // Update the milestone board counter
      const bonuses = this.milestoneBoardSystem.getBonuses();
      if (this.hudSystem) {
        this.hudSystem.flashStatus(
          `Total: +${bonuses.gpMaxBonus} GP | +${bonuses.miningSpeedPct}% Speed | +${bonuses.critChancePct}% Crit`,
          '#88AACC',
          3000
        );
      }
    }
  }

  this.hudSystem.setDepth(depth);
  this.hudSystem.setXTile(playerTile.tx);
  this.hudSystem.setTilesBroken(this.digSystem.getTilesBroken());
  this.hudSystem.setAim(this.playerController.getAimLabel());
  syncProgressionGemPowerMax(this);

  const gemPowerPct = this.playerController.getGemPowerPercent();
  this.hudSystem.setGemPower(gemPowerPct);
  this.hudSystem.setGemPowerValues(
    this.playerController.getGemPowerRaw(),
    this.playerController.getGemPowerMax()
  );

  // Low gem power warning
  if (gemPowerPct < HUD_LAYOUT.gpWarningPercent && gemPowerPct > 0 && !this._lowGemPowerWarned) {
    this._lowGemPowerWarned = true;
    this.hudSystem.flashStatus("Gem Power low! Head up!", "#ffaa33", UI_CONFIG.flashGemPowerLow);
  }
  if (gemPowerPct >= 50) {
    this._lowGemPowerWarned = false;
  }

  // Flight height indicator (always visible)
  const flightAbilities = this.playerController.abilities;
  if (flightAbilities && typeof flightAbilities.getFlightHeightTiles === 'function') {
    const currentHeight = flightAbilities.getFlightHeightTiles();
    const maxHeight = flightAbilities.getMaxFlightHeightTiles();
    this.hudSystem.setFlightHeight(currentHeight, maxHeight);
  }
  
  this.hudSystem.setDashCooldown(
    this.playerController.getDashCooldownMs(),
    this.upgradeSystem.isGemDashUnlocked()
  );

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
    this.enterDeathState(depth);
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

export function updateLightingSystems(scene, time, delta) {
  const playerTile = scene.playerController?.getPlayerTile?.() ?? null;
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
