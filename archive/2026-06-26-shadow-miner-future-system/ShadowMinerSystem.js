/**
 * Shadow Miner System
 * A mysterious entity that watches, digs, and steals resources from the player
 */

import { SHADOW_MINER_CONFIG, getProgressionForDepth } from "../../values/shadowMinerConfig.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { ShadowMinerPhysicsBody } from "./ShadowMinerPhysicsBody.js";
import { TileCollisionSystem } from "../../systems/mining/TileCollisionSystem.js";

export class ShadowMinerSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    
    // State
    this.isActive = SHADOW_MINER_CONFIG.enabled;
    this.isVisible = false;
    this.spawnTime = 0;
    this.despawnTime = 0;
    this.lastSpawnCheck = 0;
    this.lastInteractionTime = 0;
    
    // Sprite
    this.sprite = null;
    
    // Physics body (mirrors player)
    this.physicsBody = null;
    
    // Current behavior
    this.currentBehavior = null;
    this.behaviorTimer = null;
    this.blocksDug = 0;
    this.blocksToDig = 0;
    
    // Movement state
    this.isMoving = false;
    this.moveTarget = null;
    this.moveTimer = 0;
    this.digMoveDelayTimer = 0;
    
    // Human-like movement state
    this.targetVx = 0; // Target horizontal velocity
    this.acceleration = 2000; // Acceleration rate (px/s²)
    this.deceleration = 3000; // Deceleration rate (px/s²)
    this.turnSpeed = 0.15; // How fast to turn (0-1, lower is smoother)
    this.currentFacing = 1; // 1 = right, -1 = left
    
    // Animation state
    this.currentAnim = null;
    
    // Debug
    this.debugHealthLogTimer = 0;
    
    // Initialize
    if (this.isActive) {
      this.createSprite();
      this.createPhysicsBody();
      this.createAnimations();
      this.logDebug('[ShadowMiner] System initialized');
    }
  }
  
  createSprite() {
    // Create sprite (initially invisible) - start with idle pose
    const idleTexture = this.scene.textures.exists(ASSET_KEYS.shadowMiner.idleSheet)
      ? ASSET_KEYS.shadowMiner.idleSheet
      : ASSET_KEYS.shadowMiner.sheet;
    const idleFrame = idleTexture === ASSET_KEYS.shadowMiner.idleSheet ? 0 : ASSET_KEYS.shadowMiner.idleFrame;
    this.sprite = this.scene.add.sprite(
      0,
      0,
      idleTexture,
      idleFrame
    );
    this.sprite.setVisible(false);
    this.sprite.setAlpha(SHADOW_MINER_CONFIG.visual.alpha);
    this.sprite.setDisplaySize(89, 89);
    
    // Set origin to bottom-center like player
    this.sprite.setOrigin(
      SHADOW_MINER_CONFIG.visual.spriteOrigin.x,
      SHADOW_MINER_CONFIG.visual.spriteOrigin.y
    );
    
    // Set depth to appear in front of tiles
    this.sprite.setDepth(50);
    
    this.logDebug('[ShadowMiner] Sprite created');
  }
  
  createPhysicsBody() {
    // Create physics body with same dimensions as player
    this.physicsBody = new ShadowMinerPhysicsBody(
      SHADOW_MINER_CONFIG.physics,
      0,
      0
    );
    
    // Create collision system for proper tile collision
    this.collisionSystem = new TileCollisionSystem(this.scene.worldModel, this.config);
    
    this.logDebug('[ShadowMiner] Physics body created');
  }
  
  createAnimations() {
    // Note: Animations would be created here if we had frame data
    // For now, we'll use texture switching as a simple animation system
    this.logDebug('[ShadowMiner] Animations created (texture-based)');
  }
  
  /**
   * Play animation based on state
   */
  playAnimation(animName) {
    if (this.currentAnim === animName) return;
    
    this.currentAnim = animName;
    
    switch (animName) {
      case 'idle':
        if (this.scene.anims.exists(ASSET_KEYS.shadowMiner.idleAnim)) {
          this.sprite.play(ASSET_KEYS.shadowMiner.idleAnim, true);
        } else {
          this.sprite.stop();
          this.sprite.setTexture(ASSET_KEYS.shadowMiner.sheet, ASSET_KEYS.shadowMiner.idleFrame);
        }
        break;
      case 'dig':
        this.sprite.stop();
        this.sprite.setTexture(ASSET_KEYS.shadowMiner.sheet, ASSET_KEYS.shadowMiner.digSidewaysFrame);
        break;
      case 'walk':
        // Use run-float animation for walking
        this.sprite.play(ASSET_KEYS.shadowMiner.runAnim, true);
        break;
    }
  }
  
  /**
   * Update physics - apply gravity and cap velocities
   * Uses proper TileCollisionSystem for collision resolution
   * @param {number} dt - Delta time in seconds
   */
  updatePhysics(dt) {
    if (!this.physicsBody || !this.collisionSystem) return;
    
    // Update physics body
    this.physicsBody.update(dt);
    
    // Enforce maximum velocity hard cap to prevent extreme tunneling
    // Critical for 2x speed (400 px/sec) to prevent clipping through tiles
    const MAX_VELOCITY = this.config.tileSize * 30;
    this.physicsBody.vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, this.physicsBody.vx));
    this.physicsBody.vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, this.physicsBody.vy));
    
    // Apply horizontal movement with collision resolution
    const horizMove = this.physicsBody.vx * dt;
    if (horizMove !== 0) {
      this.collisionSystem.moveAndCollideX(this.physicsBody, horizMove);
    }
    
    // Apply vertical movement with collision resolution
    const vertMove = this.physicsBody.vy * dt;
    if (vertMove !== 0) {
      this.collisionSystem.moveAndCollideY(this.physicsBody, vertMove);
    }
    
    // Sync sprite with physics body (bottom-center origin)
    this._syncSpriteWithPhysics();
  }
  
  /**
   * Sync sprite position with physics body
   * Physics body uses top-left, sprite origin is bottom-center (0.5, 1)
   */
  _syncSpriteWithPhysics() {
    if (!this.physicsBody || !this.sprite) return;
    
    // Sprite x is center of physics body
    this.sprite.x = this.physicsBody.x + this.physicsBody.w / 2;
    
    // Sprite y is bottom of physics body (feet)
    this.sprite.y = this.physicsBody.y + this.physicsBody.h;
  }
  
  /**
   * Move toward a target position
   */
  moveTowards(targetX, targetY, speed, dt) {
    if (!this.physicsBody) return;
    
    const dx = targetX - this.physicsBody.x;
    const dy = targetY - this.physicsBody.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      // Move toward target
      const moveX = (dx / dist) * speed * dt;
      const moveY = (dy / dist) * speed * dt;
      
      this.physicsBody.x += moveX;
      this.physicsBody.y += moveY;
      
      // Set animation
      this.playAnimation('walk');
      
      // Set facing direction
      if (dx > 0) {
        this.sprite.setFlipX(false);
      } else if (dx < 0) {
        this.sprite.setFlipX(true);
      }
      
      return false; // Not at target yet
    } else {
      // At target
      this.playAnimation('idle');
      return true; // Reached target
    }
  }
  
  /**
   * Set sprite texture based on current behavior
   */
  setSpriteForBehavior() {
    if (this.currentBehavior === 'dig') {
      this.playAnimation('dig');
    } else {
      this.playAnimation('idle');
    }
  }
  
  /**
   * Update system - called every frame
   * @param {number} deltaTime - Time since last update (ms)
   * @param {number} playerDepth - Current player depth (tiles)
   * @param {Object} playerPosition - Player position {x, y}
   */
  update(deltaTime, playerDepth, playerPosition) {
    if (!this.isActive) return;
    
    const dt = Math.min(deltaTime / 1000, 0.05); // Cap at 50ms
    
    // Debug health logging
    if (SHADOW_MINER_CONFIG.debug.logHealth) {
      this.updateHealthLog(deltaTime, playerPosition);
    }
    
    // Check for spawn
    this.checkSpawn(playerDepth);
    
    // Update if visible
    if (this.isVisible) {
      this.updateVisible(dt, playerPosition);
      
      // Update physics
      this.updatePhysics(dt);
    }
  }
  
  /**
   * Debug logging - logs health constantly for dev purposes
   * Only logs when Shadow Miner is actually visible to reduce console spam
   */
  updateHealthLog(deltaTime, playerPosition) {
    // Only log when Shadow Miner is visible to avoid spam
    if (!this.isVisible) return;
    
    this.debugHealthLogTimer += deltaTime;
    
    if (this.debugHealthLogTimer >= SHADOW_MINER_CONFIG.debug.logInterval) {
      this.debugHealthLogTimer = 0;
      
      const playerTile = this.worldToTile(playerPosition.x, playerPosition.y);
      const depth = Math.max(0, playerTile.ty - this.config.topAirRows);
      
      console.log(`[sh-miner on] Depth: ${depth} tiles, Position: (${playerTile.tx}, ${playerTile.ty})`);
      console.log(`[sh-miner on] Shadow Miner VISIBLE - Behavior: ${this.currentBehavior}, Blocks Dug: ${this.blocksDug}/${this.blocksToDig}, Moving: ${this.isMoving}`);
    }
  }
  
  /**
   * Check if Shadow Miner should spawn
   */
  checkSpawn(playerDepth) {
    // Use debug settings if debug mode is enabled
    const isDebugMode = this.config.debugMode;
    const minDepth = isDebugMode ? SHADOW_MINER_CONFIG.debugMinDepth : SHADOW_MINER_CONFIG.minDepth;
    const checkInterval = isDebugMode ? SHADOW_MINER_CONFIG.debugSpawnCheckInterval : SHADOW_MINER_CONFIG.spawnCheckInterval;
    
    // Don't spawn if already visible or below minimum depth
    if (this.isVisible || playerDepth < minDepth) {
      return;
    }
    
    // Check spawn interval
    const now = Date.now();
    if (now - this.lastSpawnCheck < checkInterval) {
      return;
    }
    
    this.lastSpawnCheck = now;
    
    // Get progression settings for current depth
    const progression = getProgressionForDepth(playerDepth);
    
    // Use debug spawn chance in debug mode
    const spawnChance = isDebugMode ? SHADOW_MINER_CONFIG.debugSpawnChance : progression.spawnChance;
    
    // Roll for spawn
    const roll = Math.random();
    if (roll < spawnChance) {
      this.spawn(playerDepth, progression);
      if (isDebugMode) {
        this.logDebug(`[ShadowMiner] DEBUG SPAWN at depth ${playerDepth} (${(roll * 100).toFixed(0)}% < ${(spawnChance * 100).toFixed(0)}%)`);
      }
    } else {
      this.logDebug(`[ShadowMiner] Spawn check failed (${(roll * 100).toFixed(2)}% < ${(spawnChance * 100).toFixed(2)}%)`);
    }
  }
  
  /**
   * Find best spawn position using smart selection
   * Ensures spawn is within player's visible range and has line of sight
   * @param {Object} playerPos - Player position {x, y}
   * @returns {Object|null} Best spawn position {tx, ty, score} or null if no valid position found
   */
  findBestSpawnPosition(playerPos) {
    const playerTile = this.worldToTile(playerPos.x, playerPos.y);
    let bestPosition = null;
    let bestScore = -Infinity;
    
    // Use new spawn visibility config
    const minDist = SHADOW_MINER_CONFIG.spawnVisibility.minVisibleTiles;
    const maxDist = SHADOW_MINER_CONFIG.spawnVisibility.maxVisibleTiles;
    const requireLineOfSight = SHADOW_MINER_CONFIG.spawnVisibility.requireLineOfSight;
    const maxAttempts = SHADOW_MINER_CONFIG.spawnVisibility.maxSpawnAttempts;
    
    // Try multiple positions to find the best one
    for (let i = 0; i < maxAttempts; i++) {
      // Calculate random position within visible range
      const angle = Math.random() * Math.PI * 2;
      const distance = minDist + Math.random() * (maxDist - minDist);
      
      const spawnX = playerPos.x + Math.cos(angle) * distance * this.config.tileSize;
      const spawnY = playerPos.y + Math.sin(angle) * distance * this.config.tileSize;
      
      const spawnTile = this.worldToTile(spawnX, spawnY);
      
      // Check if position is in bounds
      if (!this.scene.worldModel.inBounds(spawnTile.tx, spawnTile.ty)) {
        continue;
      }
      
      // Check if bedrock (hard fail)
      const tileType = this.scene.worldModel.getTileType(spawnTile.tx, spawnTile.ty);
      if (tileType === 4) { // 4 = bedrock
        continue;
      }
      
      // Calculate tile distance
      const tileDist = Math.abs(spawnTile.tx - playerTile.tx) + Math.abs(spawnTile.ty - playerTile.ty);
      
      // Check if within visible range
      if (tileDist < minDist || tileDist > maxDist) {
        continue;
      }
      
      // Check line of sight if required
      if (requireLineOfSight) {
        const hasLineOfSight = this.hasClearLineOfSight(spawnTile, playerTile);
        if (!hasLineOfSight) {
          continue; // Skip positions without line of sight
        }
      }
      
      // Calculate score for this position
      let score = 0;
      
      // Prefer air over solid (score +10 for air, -5 for solid)
      if (tileType === 0) { // air
        score += 10;
      } else {
        score -= 5;
      }
      
      // Prefer positions closer to optimal distance
      const optimalDistance = (minDist + maxDist) / 2;
      const distanceDiff = Math.abs(tileDist - optimalDistance);
      score -= distanceDiff * 0.5; // -0.5 points per tile from optimal distance
      
      // Prefer horizontal positions (easier to see)
      const verticalDiff = Math.abs(spawnTile.ty - playerTile.ty);
      score -= verticalDiff * 0.3; // -0.3 points per vertical tile difference
      
      this.logDebug(`[ShadowMiner] Position ${i}: (${spawnTile.tx}, ${spawnTile.ty}) - Score: ${score.toFixed(1)}, Type: ${tileType}, Distance: ${tileDist}`);
      
      if (score > bestScore) {
        bestScore = score;
        bestPosition = spawnTile;
      }
    }
    
    return bestPosition;
  }
  
  /**
   * Check if there's a clear line of sight between two tiles
   * @param {Object} fromTile - Starting tile {tx, ty}
   * @param {Object} toTile - Ending tile {tx, ty}
   * @returns {boolean} True if line of sight is clear
   */
  hasClearLineOfSight(fromTile, toTile) {
    const dx = Math.sign(toTile.tx - fromTile.tx);
    const dy = Math.sign(toTile.ty - fromTile.ty);
    
    let cx = fromTile.tx;
    let cy = fromTile.ty;
    
    // Check all tiles between start and end (exclusive of end)
    while (cx !== toTile.tx || cy !== toTile.ty) {
      if (this.scene.worldModel.inBounds(cx, cy)) {
        const type = this.scene.worldModel.getTileType(cx, cy);
        // If any tile is solid (not air), line of sight is blocked
        if (type !== 0) {
          return false;
        }
      }
      
      if (cx !== toTile.tx) cx += dx;
      if (cy !== toTile.ty) cy += dy;
    }
    
    return true;
  }
  
  /**
   * Check line of sight between two tiles (counts how many tiles are blocking)
   * @param {Object} fromTile - Starting tile {tx, ty}
   * @param {Object} toTile - Ending tile {tx, ty}
   * @returns {number} Number of unblocked tiles (0 = fully blocked, max = diagonal distance)
   */
  checkLineOfSight(fromTile, toTile) {
    let unblockedTiles = 0;
    
    const dx = Math.sign(toTile.tx - fromTile.tx);
    const dy = Math.sign(toTile.ty - fromTile.ty);
    
    let cx = fromTile.tx;
    let cy = fromTile.ty;
    
    while (cx !== toTile.tx || cy !== toTile.ty) {
      if (this.scene.worldModel.inBounds(cx, cy)) {
        const type = this.scene.worldModel.getTileType(cx, cy);
        if (type === 0) { // air
          unblockedTiles++;
        }
      }
      
      if (cx !== toTile.tx) cx += dx;
      if (cy !== toTile.ty) cy += dy;
    }
    
    return unblockedTiles;
  }
  
  /**
   * Spawn Shadow Miner
   */
  spawn(playerDepth, progression) {
    this.logDebug(`[ShadowMiner] SPAWNING at depth ${playerDepth}`);
    
    // Get player position
    const playerPos = this.scene.playerController?.getPlayerPosition();
    if (!playerPos) {
      this.logDebug('[ShadowMiner] Failed to spawn - no player position');
      return;
    }
    
    // SMART SPAWN: Find best position
    const bestPosition = this.findBestSpawnPosition(playerPos);
    
    if (!bestPosition) {
      this.logDebug('[ShadowMiner] Failed to spawn - no valid position found');
      return;
    }
    
    const { tx: spawnTx, ty: spawnTy } = bestPosition;
    
    const tileType = this.scene.worldModel.getTileType(spawnTx, spawnTy);
    
    // If tile is solid (not air), destroy it to create space for Shadow Miner
    if (tileType !== 0) { // 0 = air
      // Check if tile is diggable
      if (this.scene.worldModel.isDiggable(spawnTx, spawnTy)) {
        // Destroy the tile to create space
        this.scene.worldModel.setTile(spawnTx, spawnTy, 0, 0); // Set to air
        this.scene.worldRenderer?.applyTileUpdate(spawnTx, spawnTy);
        this.logDebug(`[ShadowMiner] Created space by destroying tile at (${spawnTx}, ${spawnTy}), Type: ${tileType}`);
      } else {
        // Tile is not diggable, skip spawn
        this.logDebug(`[ShadowMiner] Failed to spawn - tile not diggable (type: ${tileType})`);
        return;
      }
    }
    
    // Set physics body position (top-left of body)
    const spawnX = spawnTx * this.config.tileSize;
    const spawnY = spawnTy * this.config.tileSize;
    
    if (this.physicsBody) {
      this.physicsBody.x = spawnX;
      this.physicsBody.y = spawnY;
      this.physicsBody.vx = 0;
      this.physicsBody.vy = 0;
      this.physicsBody.onGround = false;
    }
    
    // Sync sprite position
    this._syncSpriteWithPhysics();
    
    // Determine facing direction based on player position
    const dx = playerPos.x - this.sprite.x;
    if (dx > 0) {
      this.sprite.setFlipX(false); // Facing right
    } else {
      this.sprite.setFlipX(true);  // Facing left
    }
    
    // Fade in
    this.sprite.setVisible(true);
    this.sprite.setAlpha(0);
    
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: SHADOW_MINER_CONFIG.visual.alpha,
      duration: SHADOW_MINER_CONFIG.visual.fadeInDuration,
      onComplete: () => {
        this.logDebug('[ShadowMiner] Fade in complete');
      }
    });
    
    // Set state
    this.isVisible = true;
    const now = Date.now();
    this.spawnTime = now;
    
    // Randomize duration for unpredictability (sometimes short, sometimes long)
    const randomDuration = progression.visibleDurationMin + 
                           Math.random() * (progression.visibleDurationMax - progression.visibleDurationMin);
    this.despawnTime = this.spawnTime + randomDuration;
    
    // Reset movement state
    this.isMoving = false;
    this.moveTarget = null;
    this.moveTimer = 0;
    this.digMoveDelayTimer = 0;
    this.digPauseTimer = 0;
    
    // Choose behavior
    this.chooseBehavior();
    
    // Set appropriate sprite for behavior
    this.setSpriteForBehavior();
    
    this.logDebug(`[ShadowMiner] Spawned at (${spawnTx}, ${spawnTy}), Duration: ${progression.visibleDuration}ms, Behavior: ${this.currentBehavior}`);
  }
  
  /**
   * Choose behavior based on probabilities
   */
  chooseBehavior() {
    const roll = Math.random();
    const probs = SHADOW_MINER_CONFIG.behaviorProbabilities;
    
    if (roll < probs.watch) {
      this.currentBehavior = 'watch';
      this.logDebug('[ShadowMiner] Behavior: WATCH');
    } else if (roll < probs.watch + probs.dig) {
      this.currentBehavior = 'dig';
      this.blocksToDig = SHADOW_MINER_CONFIG.dig.blocksMin + 
                         Math.floor(Math.random() * (SHADOW_MINER_CONFIG.dig.blocksMax - SHADOW_MINER_CONFIG.dig.blocksMin + 1));
      this.blocksDug = 0;
      this.behaviorTimer = Date.now();
      this.logDebug(`[ShadowMiner] Behavior: DIG (${this.blocksToDig} blocks)`);
    } else if (roll < probs.watch + probs.dig + probs.tease) {
      this.currentBehavior = 'tease';
      this.logDebug('[ShadowMiner] Behavior: TEASE (watch briefly, no digging)');
    } else {
      this.currentBehavior = 'steal';
      this.logDebug('[ShadowMiner] Behavior: STEAL');
    }
  }
  
  /**
   * Update while visible
   */
  updateVisible(dt, playerPosition) {
    const now = Date.now();
    
    // Check if should despawn
    if (now >= this.despawnTime) {
      this.despawn();
      return;
    }
    
    // Execute behavior
    switch (this.currentBehavior) {
      case 'watch':
        // Watch behavior: Move slowly toward player
        this.updateWatchBehavior(dt, playerPosition);
        break;
        
      case 'dig':
        this.updateDigBehavior(dt, playerPosition);
        break;
        
      case 'tease':
        // Tease behavior: Watch briefly without digging, then leave
        this.updateTeaseBehavior(dt, playerPosition);
        break;
        
      case 'steal':
        // Steal immediately on spawn
        if (!this.lastInteractionTime || now - this.lastInteractionTime >= SHADOW_MINER_CONFIG.interactionCooldown) {
          this.executeSteal();
          this.despawn();
        }
        break;
    }
    
    // Update sprite position to face player
    const dx = playerPosition.x - this.sprite.x;
    if (dx > 0) {
      this.sprite.setFlipX(false);
    } else {
      this.sprite.setFlipX(true);
    }
  }
  
  /**
   * Update watch behavior - move slowly toward player with smooth acceleration
   */
  updateWatchBehavior(dt, playerPosition) {
    if (!this.physicsBody) return;
    
    // Move slowly toward player
    const dx = playerPosition.x - this.physicsBody.x;
    const dy = playerPosition.y - this.physicsBody.y;
    
    // Only move horizontally (creepy watching behavior)
    if (Math.abs(dx) > this.config.tileSize) {
      const moveSpeed = SHADOW_MINER_CONFIG.movement.movementSpeed * 0.3; // Slow movement
      
      // Set target velocity
      if (dx > 0) {
        this.targetVx = moveSpeed;
      } else {
        this.targetVx = -moveSpeed;
      }
    } else {
      this.targetVx = 0;
    }
    
    // Apply smooth acceleration/deceleration
    this.applySmoothMovement(dt);
    
    // Keep vertical velocity for gravity
    this.playAnimation('idle');
  }
  
  /**
   * Update tease behavior - watch briefly without digging, then leave
   * This makes ShadowMiner unpredictable - sometimes it just watches and leaves!
   */
  updateTeaseBehavior(dt, playerPosition) {
    if (!this.physicsBody) return;
    
    // Move slowly toward player (same as watch behavior)
    const dx = playerPosition.x - this.physicsBody.x;
    const dy = playerPosition.y - this.physicsBody.y;
    
    // Only move horizontally (creepy watching behavior)
    if (Math.abs(dx) > this.config.tileSize) {
      const moveSpeed = SHADOW_MINER_CONFIG.movement.movementSpeed * 0.3; // Slow movement
      
      // Set target velocity
      if (dx > 0) {
        this.targetVx = moveSpeed;
      } else {
        this.targetVx = -moveSpeed;
      }
    } else {
      this.targetVx = 0;
    }
    
    // Apply smooth acceleration/deceleration
    this.applySmoothMovement(dt);
    
    // Keep vertical velocity for gravity
    this.playAnimation('idle');
    
    // Tease behavior: Just watch, no digging, will despawn when duration ends
    // This is handled by the main updateVisible() loop checking despawnTime
  }
  
  /**
   * Apply smooth acceleration and deceleration for human-like movement
   * @param {number} dt - Delta time in seconds
   */
  applySmoothMovement(dt) {
    if (!this.physicsBody) return;
    
    const currentVx = this.physicsBody.vx;
    const target = this.targetVx;
    
    if (target > currentVx) {
      // Accelerating right
      this.physicsBody.vx = Math.min(target, currentVx + this.acceleration * dt);
    } else if (target < currentVx) {
      // Accelerating left
      this.physicsBody.vx = Math.max(target, currentVx - this.acceleration * dt);
    } else {
      // At target, apply deceleration
      if (currentVx > 0) {
        this.physicsBody.vx = Math.max(0, currentVx - this.deceleration * dt);
      } else if (currentVx < 0) {
        this.physicsBody.vx = Math.min(0, currentVx + this.deceleration * dt);
      }
    }
    
    // Update facing direction smoothly
    if (this.physicsBody.vx > 10) {
      this.currentFacing = this.lerp(this.currentFacing, 1, this.turnSpeed);
    } else if (this.physicsBody.vx < -10) {
      this.currentFacing = this.lerp(this.currentFacing, -1, this.turnSpeed);
    }
    
    // Apply facing to sprite
    if (this.currentFacing > 0) {
      this.sprite.setFlipX(false);
    } else {
      this.sprite.setFlipX(true);
    }
  }
  
  /**
   * Linear interpolation for smooth transitions
   * @param {number} start - Start value
   * @param {number} end - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Interpolated value
   */
  lerp(start, end, t) {
    return start + (end - start) * t;
  }
  
  /**
   * Find best tile to dig using strategic selection
   * Scores adjacent tiles based on value, direction to player, and resources
   * @param {Object} currentTile - Shadow Miner's current position {tx, ty}
   * @param {Object} playerTile - Player's position {tx, ty}
   * @returns {Object|null} Best tile to dig {tx, ty, score, type} or null
   */
  findBestTileToDig(currentTile, playerTile) {
    let bestTile = null;
    let bestScore = -Infinity;
    
    // Check all adjacent tiles
    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 },  // Right
    ];
    
    for (const dir of directions) {
      const targetTx = currentTile.tx + dir.dx;
      const targetTy = currentTile.ty + dir.dy;
      
      // Check if tile is in bounds
      if (!this.scene.worldModel.inBounds(targetTx, targetTy)) {
        continue;
      }
      
      const tileType = this.scene.worldModel.getTileType(targetTx, targetTy);
      
      // Skip air and bedrock
      if (tileType === 0 || tileType === 4) {
        continue;
      }
      
      // Calculate score for this tile
      let score = 0;
      
      // STRATEGY 1: Prefer valuable resources
      // Tile types: 1=dirt, 2=stone, 3=copper, 5=bronze, 6=steel, 7=iron, 8=silver, 9=gold
      const resourceValue = {
        1: 1,   // dirt - low value
        2: 3,   // stone - medium
        3: 5,   // copper - high
        5: 7,   // bronze - very high
        6: 8,   // steel - very high
        7: 9,   // iron - very high
        8: 10,  // silver - highest
        9: 15,  // gold - highest
      };
      score += resourceValue[tileType] || 0;
      
      // STRATEGY 2: Dig toward player (menacing behavior)
      const dx = playerTile.tx - targetTx;
      const dy = playerTile.ty - targetTy;
      const manhattanDist = Math.abs(dx) + Math.abs(dy);
      
      // Prefer tiles that reduce distance to player
      const currentDist = Math.abs(playerTile.tx - currentTile.tx) + Math.abs(playerTile.ty - currentTile.ty);
      if (manhattanDist < currentDist) {
        score += 3; // +3 for moving toward player
      } else {
        score -= 1; // -1 for moving away
      }
      
      // STRATEGY 3: Prefer horizontal movement (sideways digging looks better)
      if (dir.dx !== 0 && dir.dy === 0) {
        score += 2; // +2 for horizontal digging
      }
      
      // STRATEGY 4: Random factor for variety
      score += Math.random() * 2;
      
      this.logDebug(`[ShadowMiner] Dig candidate: (${targetTx}, ${targetTy}) - Type: ${tileType}, Score: ${score.toFixed(1)}, Distance: ${manhattanDist}`);
      
      if (score > bestScore) {
        bestScore = score;
        bestTile = { tx: targetTx, ty: targetTy, type: tileType, score };
      }
    }
    
    return bestTile;
  }
  
  /**
   * Update dig behavior with natural pauses and varied timing
   */
  updateDigBehavior(dt, playerPosition) {
    const now = Date.now();
    
    // Initialize pause timer if not set
    if (!this.digPauseTimer) {
      this.digPauseTimer = 0;
    }
    
    // If not moving, check if time to dig
    if (!this.isMoving) {
      // Check if we're in a pause
      if (this.digPauseTimer > 0) {
        this.digPauseTimer -= dt * 1000;
        
        // During pause, play idle animation to make it look like he's thinking
        this.playAnimation('idle');
        
        if (this.digPauseTimer <= 0) {
          this.digPauseTimer = 0;
          this.logDebug('[ShadowMiner] Pause ended, resuming digging');
        }
        return;
      }
      
      this.digMoveDelayTimer += dt * 1000;
      
      // Calculate varied dig interval for natural feel
      const digInterval = SHADOW_MINER_CONFIG.dig.digIntervalMin + 
                         Math.random() * (SHADOW_MINER_CONFIG.dig.digIntervalMax - SHADOW_MINER_CONFIG.dig.digIntervalMin);
      
      if (this.digMoveDelayTimer >= digInterval) {
        this.digMoveDelayTimer = 0;
        
        // Get positions
        const pos = { x: this.physicsBody.x, y: this.physicsBody.y };
        const currentTile = this.worldToTile(pos.x, pos.y);
        const playerPos = this.scene.playerController?.getPlayerPosition();
        const playerTile = playerPos ? this.worldToTile(playerPos.x, playerPos.y) : currentTile;
        
        // STRATEGIC DIGGING: Find best tile to dig
        const bestTile = this.findBestTileToDig(currentTile, playerTile);
        
        if (bestTile) {
          // Move to the tile before digging
          const targetX = bestTile.tx * this.config.tileSize;
          const targetY = bestTile.ty * this.config.tileSize;
          
          this.moveTarget = { x: targetX, y: targetY };
          this.isMoving = true;
          this.playAnimation('walk');
          
          this.logDebug(`[ShadowMiner] Moving to dig tile: (${bestTile.tx}, ${bestTile.ty}), Type: ${bestTile.type}`);
        } else {
          this.logDebug('[ShadowMiner] No valid tiles to dig, despawning');
          this.despawn();
        }
      } else {
        // Waiting before moving - play dig animation
        this.playAnimation('dig');
      }
    } else {
      // Currently moving to dig target
      if (this.moveTarget) {
        const reached = this.moveTowards(
          this.moveTarget.x,
          this.moveTarget.y,
          SHADOW_MINER_CONFIG.movement.moveToDigSpeed,
          dt
        );
        
        if (reached) {
          // Reached target, dig it
          this.isMoving = false;
          this.moveTarget = null;
          
          // Dig the tile we're on
          const pos = { x: this.physicsBody.x, y: this.physicsBody.y };
          const currentTile = this.worldToTile(pos.x, pos.y);
          const tileType = this.scene.worldModel.getTileType(currentTile.tx, currentTile.ty);
          
          if (tileType !== 0 && tileType !== 4) {
            this.scene.worldModel.setTile(currentTile.tx, currentTile.ty, 0, 0);
            this.scene.worldRenderer?.applyTileUpdate(currentTile.tx, currentTile.ty);
            
            this.blocksDug++;
            this.logDebug(`[ShadowMiner] DUG: (${currentTile.tx}, ${currentTile.ty}), Type: ${tileType}, Progress: ${this.blocksDug}/${this.blocksToDig}`);
            
            // Random chance to pause after digging (natural behavior)
            if (Math.random() < SHADOW_MINER_CONFIG.dig.pauseChance) {
              const pauseDuration = SHADOW_MINER_CONFIG.dig.pauseDurationMin + 
                                   Math.random() * (SHADOW_MINER_CONFIG.dig.pauseDurationMax - SHADOW_MINER_CONFIG.dig.pauseDurationMin);
              this.digPauseTimer = pauseDuration;
              this.logDebug(`[ShadowMiner] Pausing for ${pauseDuration.toFixed(0)}ms (natural behavior)`);
            }
          }
          
          // Check if done digging
          if (this.blocksDug >= this.blocksToDig) {
            this.logDebug('[ShadowMiner] Strategic digging complete, despawning');
            this.despawn();
          }
        }
      }
    }
  }
  
  /**
   * Execute steal behavior
   */
  executeSteal() {
    if (!SHADOW_MINER_CONFIG.theft.enabled) return;
    
    this.logDebug('[ShadowMiner] Executing STEAL');
    
    // Get player resources
    const resources = this.scene.digSystem?.getResourceTotals();
    if (!resources) {
      this.logDebug('[ShadowMiner] Failed to steal - no dig system');
      return;
    }
    
    // Find most valuable resource
    let stolenResource = null;
    let stolenAmount = 0;
    
    for (const resourceType of SHADOW_MINER_CONFIG.theft.priority) {
      const amount = resources[resourceType];
      if (amount > 0) {
        stolenResource = resourceType;
        stolenAmount = Math.min(
          amount,
          SHADOW_MINER_CONFIG.theft.amountMin + 
          Math.floor(Math.random() * (SHADOW_MINER_CONFIG.theft.amountMax - SHADOW_MINER_CONFIG.theft.amountMin + 1))
        );
        break;
      }
    }
    
    if (stolenResource) {
      // Steal the resource
      this.scene.digSystem.spendResource(stolenResource, stolenAmount);
      
      this.lastInteractionTime = Date.now();
      
      // Show floating text
      const pos = { x: this.sprite.x, y: this.sprite.y };
      if (this.scene.floatingTextSystem) {
        this.scene.floatingTextSystem.showFloatingText(
          pos.x,
          pos.y - 50,
          `Shadow Miner stole ${stolenAmount} ${stolenResource}!`,
          '#ff0000'
        );
      }
      
      this.logDebug(`[ShadowMiner] STOLE ${stolenAmount} ${stolenResource}`);
    } else {
      this.logDebug('[ShadowMiner] Nothing to steal');
    }
  }
  
  /**
   * Despawn Shadow Miner
   */
  despawn() {
    if (!this.isVisible) return;
    
    this.logDebug('[ShadowMiner] Despawning');
    
    // Fade out
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: SHADOW_MINER_CONFIG.visual.fadeOutDuration,
      onComplete: () => {
        this.sprite.setVisible(false);
        this.isVisible = false;
        this.currentBehavior = null;
        this.blocksDug = 0;
        this.blocksToDig = 0;
        this.isMoving = false;
        this.moveTarget = null;
        this.logDebug('[ShadowMiner] Despawn complete');
      }
    });
  }
  
  /**
   * Force spawn for testing
   */
  forceSpawn() {
    const playerPos = this.scene.playerController?.getPlayerPosition();
    if (!playerPos) return;
    
    const playerTile = this.worldToTile(playerPos.x, playerPos.y);
    const depth = Math.max(0, playerTile.ty - this.config.topAirRows);
    
    const progression = getProgressionForDepth(depth);
    this.spawn(depth, progression);
  }
  
  /**
   * Force despawn for testing
   */
  forceDespawn() {
    if (this.isVisible) {
      this.despawn();
    }
  }
  
  /**
   * Convert world coordinates to tile coordinates
   */
  worldToTile(x, y) {
    return {
      tx: Math.floor(x / this.config.tileSize),
      ty: Math.floor(y / this.config.tileSize)
    };
  }
  
  /**
   * Debug logging
   */
  logDebug(message) {
    if (SHADOW_MINER_CONFIG.debug.enabled) {
      console.log(message);
    }
  }
  
  /**
   * Destroy system
   */
  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    
    if (this.behaviorTimer) {
      clearTimeout(this.behaviorTimer);
    }
    
    this.isActive = false;
    this.isVisible = false;
    this.physicsBody = null;
    
    this.logDebug('[ShadowMiner] System destroyed');
  }
}
