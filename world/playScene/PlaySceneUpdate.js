/**
 * PlayScene Update Module
 * Handles the main game loop, state management, and input processing
 * Uses GameInputHandler for clean separation of input handling
 */

import { UI_CONFIG } from "../../values/uiConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";

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

/**
 * Main update loop - called from PlayScene.update()
 * @param {number} time - Current time
 * @param {number} delta - Delta time in ms
 */
export function updateScene(time, delta) {
  // Safety guard: if setup hasn't completed, skip update
  if (!this.gameInputHandler) return;

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
        this.playerLevelSystem.applyChoiceReward(choice);
      }
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
}

/**
 * Update game systems (HUD, UI, etc.)
 * @private
 */
function _updateSystems(time, delta, keys) {
  // HUD updates
  this.hudSystem.update(time);
  this.uiResourceBar?.setResources(this.digSystem.getResourceTotals());
  this.uiResourceBar?.setMoney(this.upgradeSystem.getMoney());

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

  if (this.lightSystem && this.playerController) {
    const lightPlayerTile = this.playerController.getPlayerTile();
    const lightDepth = lightPlayerTile
      ? Math.max(0, lightPlayerTile.ty - this.config.topAirRows + 1)
      : 0;
    const gameplayActive = this.gameState === "playing"
      && !this._pillarViewActive
      && !this.campfireSystem?.isSelecting?.();
    this.lightSystem.update(time, delta, lightDepth, gameplayActive);
  }

  if (this.shaderSystem) {
    this.shaderSystem.update(time, delta);
  }

  // Update atmosphere system (clouds, horizon glow, mist, fireflies, wind particles)
  if (this.atmosphereSystem) {
    this.atmosphereSystem.update(time, delta);
  }


    // Update sky tile glow effects (always active)
    if (this.worldRenderer && this.playerController) {
      const playerTile = this.playerController.getPlayerTile();
      this.worldRenderer.updateSkyTileGlow(playerTile, 20);
    }

    // Update root overlay decorations (always active)
    if (this.worldRenderer && this.playerController) {
      const playerTile = this.playerController.getPlayerTile();
      this.worldRenderer.updateRootOverlays(playerTile, 20);
    }

    // Update chest glow effects (always active — golden pulsing light around treasure chests)
    if (this.worldRenderer && this.playerController) {
      const playerTile = this.playerController.getPlayerTile();
      this.worldRenderer.updateChestGlow(playerTile, 25);
    }

    // Update glow crystal effects (always active — pretty colored crystal clusters)
    if (this.worldRenderer && this.playerController) {
      const playerTile = this.playerController.getPlayerTile();
      this.worldRenderer.updateGlowCrystals(playerTile, 25);
    }

  // Update Star Pillar System (always active — handles proximity + zoom view)
  if (this.starPillarSystem && this.playerController) {
    const playerTile = this.playerController.getPlayerTile();
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

  // Update player controller (physics, movement, jump logic)
  this.playerController.update(delta);
  
  // NPC interaction
  this.npcManager.checkNPCInteraction();
  
  // Update NPC interact prompts (floating "Press E" text visibility)
  playerTile = this.playerController.getPlayerTile();
  this.npcManager.updateInteractPrompts(playerTile);

    // Special tile system (gamble and teleport tiles)
    this.specialTileSystem.update();

    // Milestone board system (left side town board)
    if (this.milestoneBoardSystem && this.inputHandler) {
      const mKeys = this.inputHandler.getKeys();
      this.milestoneBoardSystem.update(playerTile, mKeys);
    }


  // Aim handling
  const aimTargetTile = this.inputHandler.resolveAimTargetTile();
  this.inputHandler.updateAimBox(aimTargetTile, this.inputHandler.isSolidAimTarget(aimTargetTile));

  // Mining
  const abilities = this.playerController.abilities;
  const isQuickslashActive = abilities && abilities.isQuickslashActive && abilities.isQuickslashActive();
  
  // Track previous quickslash state to detect when Q is released
  const wasQuickslashActive = this._wasQuickslashActive || false;
  this._wasQuickslashActive = isQuickslashActive;
  
  // Quickslash: auto-trigger attacks when Q is held
  if (isQuickslashActive) {
    const tileType = aimTargetTile ? this.worldModel.getTileType(aimTargetTile.tx, aimTargetTile.ty) : null;
    const quickslashDir = abilities.getQuickslashDirection();
    
    // Determine aim label based on quickslash direction
    const quickslashAim = quickslashDir === 1 ? "RIGHT" : "LEFT";
    const quickslashTarget = {
      tx: this.playerController.getPlayerTile().tx + quickslashDir,
      ty: this.playerController.getPlayerTile().ty
    };
    
    const result = this.digSystem.tryMine(quickslashTarget, time, quickslashAim, abilities);
    
    if (result.reason !== "cooldown") {
      // Play quickslash attack animation
      const quickslashAnimKey = ASSET_KEYS.player.quickslashAnim;
      this.isDigAnimating = true;
      // Flip sprite for right-facing attacks (similar to dig animation)
      const flipX = quickslashDir === 1;
      this.player.setFlipX(flipX);
      this.player.play(quickslashAnimKey, true);
      // Keep sprite size consistent with other character animations
      this.player.setDisplaySize(this.config.playerDisplaySizePx, this.config.playerDisplaySizePx);
      
      // Scale animation speed to match quickslash speed - DISABLED for visibility
      if (this._gamefeelConfig && this.digSystem) {
        // Keep animation at normal speed while keeping mining effect fast
        this.player.anims.timeScale = 1;
      }
      
      // Start pickaxe trail
      this.pickaxeTrailSystem?.start();
    }
    
    if (result.success) {
      this.playMineImpactFx(quickslashTarget, result.destroyed);
      this.playMineFeedbackAudio(result, tileType);
      this.applyMineFeedback(result, quickslashTarget);
      
      // Show damage number for quickslash hit
      if (this.floatingTextSystem) {
        const worldX = quickslashTarget.tx * this.config.tileSize + this.config.tileSize / 2;
        const worldY = quickslashTarget.ty * this.config.tileSize + this.config.tileSize / 2;
        this.floatingTextSystem.showDamage(worldX, worldY, result.damage);
      }
      
      // Handle level up events from quickslash (same as normal mining)
      if (result.levelUp && this.levelUpPopup) {
        const rewards = Array.isArray(result.rewards) ? result.rewards : [];
        if (!this.levelUpPopup.visible) {
          this.levelUpPopup.show(result.newLevel, result.hasChoice, rewards);
        } else {
          this._pendingLevelUp = {
            level: result.newLevel,
            hasChoice: result.hasChoice,
            rewards: rewards
          };
        }
      }
    }
  }
  
  // Reset to normal state when Q is released
  if (wasQuickslashActive && !isQuickslashActive) {
    this.isDigAnimating = false;
    this.updatePlayerVisualState(true);
  }
  
  // Normal mining (F key)
  if (this.playerController.consumeMineInput() && !isQuickslashActive) {
    const tileType = aimTargetTile ? this.worldModel.getTileType(aimTargetTile.tx, aimTargetTile.ty) : null;
    const result = this.digSystem.tryMine(aimTargetTile, time, this.playerController.getAimLabel(), abilities);

    if (result.reason !== "cooldown") {
      this.startDigAnimation({ result, targetTile: aimTargetTile, tileType });
    }

    if (result.success) {
      // Show damage number for every successful hit
      if (this.floatingTextSystem) {
        const worldX = aimTargetTile.tx * this.config.tileSize + this.config.tileSize / 2;
        const worldY = aimTargetTile.ty * this.config.tileSize + this.config.tileSize / 2;
        
        // Show damage number
        this.floatingTextSystem.showDamage(worldX, worldY, result.damage);
      }
      
      if (result.destroyed) {
        this.queueDugTilesSave();
        
        // Show resource collection text
        if (this.floatingTextSystem && result.resourceType) {
          const worldX = aimTargetTile.tx * this.config.tileSize + this.config.tileSize / 2;
          const worldY = aimTargetTile.ty * this.config.tileSize + this.config.tileSize / 2;
          const resourceLabel = result.resourceType.charAt(0).toUpperCase() + result.resourceType.slice(1);
          const resourceColor = result.resourceType === 'gold' ? '#FFD700' :
                                result.resourceType === 'silver' ? '#C0C0C0' :
                                result.resourceType === 'steel' ? '#4682B4' :
                                result.resourceType === 'iron' ? '#71797E' :
                                result.resourceType === 'bronze' ? '#CD7F32' :
                                result.resourceType === 'copper' ? '#B87333' :
                                result.resourceType === 'stone' ? '#808080' : '#8B4513';
          this.floatingTextSystem.showResource(worldX, worldY, resourceLabel, resourceColor, result.resourceAmount);
        }
        
        // Visual feedback for critical hits
        if (result.isCriticalHit && this.floatingTextSystem) {
          const worldX = aimTargetTile.tx * this.config.tileSize + this.config.tileSize / 2;
          const worldY = aimTargetTile.ty * this.config.tileSize + this.config.tileSize / 2;
          const damage = this.digSystem._getDamage(5, tileType) * this.playerLevelSystem.getCriticalHitDamageMultiplier();
          this.floatingTextSystem.showCriticalHit(worldX, worldY, damage, 1.5);
        }
        
        // Visual feedback for resource luck
        if (result.isLuckyDrop && this.floatingTextSystem) {
          const worldX = aimTargetTile.tx * this.config.tileSize + this.config.tileSize / 2;
          const worldY = aimTargetTile.ty * this.config.tileSize + this.config.tileSize / 2;
          this.floatingTextSystem.showResourceLuckBonus(worldX, worldY, result.resourceType || "Resource", "#00ff00", 1);
        }
      }
    }

    const refreshedAim = this.inputHandler.resolveAimTargetTile();
    this.inputHandler.updateAimBox(refreshedAim, this.inputHandler.isSolidAimTarget(refreshedAim));
    
    // Handle level up events
    if (result.levelUp && this.levelUpPopup) {
      // Ensure rewards is always an array
      const rewards = Array.isArray(result.rewards) ? result.rewards : [];
      console.log('[LEVEL UP] Showing popup - Level:', result.newLevel, 'hasChoice:', result.hasChoice, 'rewards:', rewards);
      
      // Only show popup if not already visible (prevent duplicate popups)
      if (!this.levelUpPopup.visible) {
        this.levelUpPopup.show(result.newLevel, result.hasChoice, rewards);
      } else {
        console.warn('[LEVEL UP] Popup already visible, queuing level up event');
        // Store pending level up to show after current popup closes
        this._pendingLevelUp = {
          level: result.newLevel,
          hasChoice: result.hasChoice,
          rewards: rewards
        };
      }
    }
  }

  // Special tile interaction (E key for gamble/teleport tiles)
  if (Phaser.Input.Keyboard.JustDown(keys.interact)) {
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

  // Thunder Strike (C key) — follows same pattern as quickslash:
  //   isDigAnimating stays true while ability is active,
  //   reset only happens on a later frame when the animation finishes.
  const playerAbilities = this.playerController.abilities;
  const cInput = this.playerController.input.getThunderStrikeInput();

  if (cInput && !this._thunderStrikeAnimating) {
    const started = playerAbilities.startThunderStrikeCharge();
    if (started) {
      this.isDigAnimating = true;
      this._thunderStrikeAnimating = true;  // Track active state across frames
      this.player.play(ASSET_KEYS.player.thunderStrikeChargeAnim, true);
    }
  }

  // Update thunder strike charge / strike animation
  if (this._thunderStrikeAnimating) {
    if (playerAbilities.isThunderStrikeCharging()) {
      const chargeResult = playerAbilities.updateThunderStrikeCharge();

      if (chargeResult.complete) {
        // Execute the strike
        const strikeResult = playerAbilities.executeThunderStrike();

        if (strikeResult.success) {
          // Play strike animation on the player sprite
          this.player.play(ASSET_KEYS.player.thunderStrikeStrikeAnim, true);
          this.player.setDisplaySize(this.config.playerDisplaySizePx, this.config.playerDisplaySizePx);
          this.player.anims.timeScale = 1;

          // Mark timestamp so we hold the strike sprite for a visible duration
          this._thunderStrikeHoldUntil = time + 350; // hold strike sprite ~350ms

          // Get player position for lightning effect
          const playerTile = this.playerController.getPlayerTile();

          if (!playerTile || playerTile.tx === undefined || playerTile.ty === undefined) {
            // Safety: player tile unavailable — still play sound, release on next frame
            if (this.soundSystem) this.soundSystem.playTileBreak();
            this._thunderStrikeHoldUntil = time; // release immediately
          } else if (strikeResult.results.length === 0) {
            // No tiles hit — release immediately
            this._thunderStrikeHoldUntil = time;
          } else {
            const startX = playerTile.tx * this.config.tileSize + this.config.tileSize / 2;
            const startY = playerTile.ty * this.config.tileSize + this.config.tileSize / 2;
            const bottomResult = strikeResult.results[strikeResult.results.length - 1];
            const endY = bottomResult.ty * this.config.tileSize + this.config.tileSize / 2;

            // Show lightning bolt visual effect
            if (this.floatingTextSystem) {
              this.floatingTextSystem.showThunderStrikeLightning(
                this.player.x, this.player.y,
                startX, startY, endY,
                this.config.tileSize
              );
            }

            // Update tiles that were damaged + grant rewards for destroyed tiles
            strikeResult.results.forEach(result => {
              this.worldRenderer.applyTileUpdate(result.tx, result.ty);

              if (this.floatingTextSystem) {
                const worldX = result.tx * this.config.tileSize + this.config.tileSize / 2;
                const worldY = result.ty * this.config.tileSize + this.config.tileSize / 2;
                this.floatingTextSystem.showHeavyPunchDamage(worldX, worldY, result.damage);
              }

              if (result.destroyed) {
                const reward = this.digSystem.processDestroyedTile(result.tx, result.ty, result.tileType, time, false, result.wasRubble);

                if (reward.levelUp && this.levelUpPopup) {
                  const rewards = Array.isArray(reward.rewards) ? reward.rewards : [];
                  if (!this.levelUpPopup.visible) {
                    this.levelUpPopup.show(reward.newLevel, reward.hasChoice, rewards);
                  } else {
                    this._pendingLevelUp = { level: reward.newLevel, hasChoice: reward.hasChoice, rewards };
                  }
                }

                this.queueDugTilesSave();
              }
            });

            // Play sound effect
            if (this.soundSystem) {
              this.soundSystem.playTileBreak();
            }
          }
        } else {
          // Strike failed (e.g. not-charging race) — release immediately
          this._thunderStrikeAnimating = false;
          this.isDigAnimating = false;
          this.updatePlayerVisualState(true);
        }
      }
      // else: still charging — isDigAnimating stays true, charge anim keeps playing
    } else if (this._thunderStrikeHoldUntil && time >= this._thunderStrikeHoldUntil) {
      // Strike animation hold time elapsed — restore normal state (same as quickslash Q-release)
      this._thunderStrikeAnimating = false;
      this._thunderStrikeHoldUntil = null;
      this.player.setFlipX(false);
      this.player.anims.timeScale = 1.0;
      this.pickaxeTrailSystem?.stop();
      this.isDigAnimating = false;
      this.updatePlayerVisualState(true);
    }
    // else: strike anim is still displaying — hold it (isDigAnimating stays true)
  }

  // Visual state
  if (!this.isDigAnimating) {
    this.updatePlayerVisualState();
  }

  // HUD updates - reuse playerTile from line 162 (no const to avoid redeclaration)
  playerTile = this.playerController.getPlayerTile();
  
  // Safety check: if playerTile is undefined (player about to die), skip depth calculation
  if (!playerTile) {
    return;
  }
  
  const depth = Math.max(0, playerTile.ty - this.config.topAirRows + 1);

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

// -- Per-frame camera & UI-zoom updates ------------------------------------
// Runs every frame AFTER all game systems have updated so the camera
// tracks the player's actual position. Three concerns, one place:
//
//   1. shakeSystem.update()     � apply active camera-shake offset
//   2. updateCameraLookAhead()  � bias the camera target along the
//                                 player's last movement direction so the
//                                 action sits ahead of the crosshair.
//   3. updateDepthBandZoom()    � smooth zoom transition when crossing
//                                 a depth band (surface <-> underground).
//   4. updateUiZoom()           � inversely scale UI elements registered
//                                 in _zoomCompensationTargets so the HUD
//                                 does not shrink when the camera zooms.
export function updateCameraSystems(scene, time, delta) {
  // 1. Apply active shake offset (custom multi-frequency, see CameraShakeSystem)
  if (scene.shakeSystem) scene.shakeSystem.update(time, delta);

  // 2. Look-ahead: lerp the camera target offset toward the player's
  //    movement direction. We use delta-time-aware lerp so the offset
  //    feels identical on 30fps and 144fps.
  if (scene.player && scene.cameras && scene.cameras.main) {
    const dx = scene.player.x - (scene._lastPlayerX ?? scene.player.x);
    const dy = scene.player.y - (scene._lastPlayerY ?? scene.player.y);
    scene._lastPlayerX = scene.player.x;
    scene._lastPlayerY = scene.player.y;

    // Normalize per-frame velocity into a unit vector, scaled by config
    const speed = Math.hypot(dx, dy);
    if (speed > 0.1) {
      const inv = 1 / speed;
      const maxLead = scene.config?.cameraLookAheadPx ?? 40;
      const targetX = dx * inv * maxLead;
      const targetY = dy * inv * maxLead;
      const a = scene.config?.cameraLookAheadLerp ?? 0.06;
      scene._cameraLookAheadX += (targetX - scene._cameraLookAheadX) * a;
      scene._cameraLookAheadY += (targetY - scene._cameraLookAheadY) * a;
    } else {
      // Decay back to zero
      scene._cameraLookAheadX *= 0.85;
      scene._cameraLookAheadY *= 0.85;
    }

    // NOTE: We DO NOT push the look-ahead into setFollowOffset here
    // because the shake system also uses setFollowOffset for its own
    // offset, and the two are not coordinated. Calling setFollowOffset
    // here would clobber the shake every frame. We track the value
    // internally so it can be applied properly once a two-camera
    // system is in place.
    scene._lastAppliedLookAhead = { x: scene._cameraLookAheadX, y: scene._cameraLookAheadY };
  }

  // NOTE: Camera zoom is intentionally NOT changed at runtime.
  //   - Zooming the main camera would scale the HUD/menus (which use
  //     setScrollFactor(0)) and break UI layout (bars off-screen, dark
  //     backdrops too small, etc.).
  //   - The proper fix is a two-camera system (UI on its own camera at
  //     zoom 1.0) which is a follow-up improvement.
  //   - The character size was bumped (48px -> 64px display) so the hero
  //     already feels substantially larger without any zoom.
}
