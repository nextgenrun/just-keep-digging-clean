/**
 * PlayScene Gameplay Module
 * Handles digging, mining, animations, and gameplay mechanics
 */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { MINING_CONFIG } from "../../values/miningConfig.js";
import { UI_CONFIG } from "../../values/uiConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";

export function setupGameplayMethods(prototype) {
  const formatResourceLabel = (resourceType) => {
    const resourceMap = { 1: "Dirt", 2: "Stone", 3: "Copper", 4: "Dark Dirt", 5: "Dark Dirt (S)", 6: "Steel", 7: "Iron", 8: "Bronze", 9: "Silver", 10: "Gold" };
    return resourceMap[resourceType] || "Resource";
  };
  const getResourceStatusColor = (resourceType) => {
    const colorMap = { 1: "#8B4513", 2: "#808080", 3: "#CD7F32", 4: "#8b5a2b", 5: "#6b4226", 6: "#b8c4cc", 7: "#d4d4d4", 8: "#cd7f32", 9: "#c0c0c0", 10: "#ffd700" };
    return colorMap[resourceType] || "#ffffff";
  };
  const isWalkMotionState = (motionState) => motionState === "walk-left" || motionState === "walk-right";
  const isIdleLikeMotionState = (motionState) => motionState === "idle";
  const isWalkingIntoBlockedSide = (scene, motionState) => {
    if (!isWalkMotionState(motionState) || scene.playerController?.isGrounded?.() !== true) return false;
    const body = scene.player?.body;
    if (!body) return false;
    const side = motionState === "walk-left" ? "left" : "right";
    return Boolean(body.blocked?.[side] || body.touching?.[side]);
  };
  const mineShakeSignatureForTile = (tileType) => {
    switch (tileType) {
      case TILE_TYPES.DIRT: case TILE_TYPES.DARK_DIRT_NORMAL: return "mining.light";
      case TILE_TYPES.STONE: case TILE_TYPES.COPPER: case TILE_TYPES.DARK_DIRT_STRONG: case TILE_TYPES.BRONZE: case TILE_TYPES.IRON: case TILE_TYPES.GEODE_INTERIOR: return "mining.medium";
      case TILE_TYPES.SKY_TILE: return "mining.skyTile";
      default: return "mining.heavy";
    }
  };
  const nextComboAnim = (scene, counterKey, anims, fallback) => {
    if (!Array.isArray(anims) || anims.length === 0) return fallback;
    const index = scene[counterKey] || 0;
    scene[counterKey] = (index + 1) % anims.length;
    return anims[index % anims.length] || fallback;
  };
  const isUpAim = (aim) => aim === "UP" || aim === "UP-LEFT" || aim === "UP-RIGHT";
  const isFallingDownward = (scene) => (scene.playerController?.physicsBody?.vy ?? 0) > 60;
  const getP = (scene) => scene.playerAssetProfile || ASSET_KEYS.player;

  prototype._getWalkAnimationTimeScale = function() {
    const profile = getP(this);
    const cfg = profile.walkAnimation || ASSET_KEYS.player.walkAnimation;
    const ratio = this.playerController?.getWalkSpeedRatio?.() ?? 1;
    return Phaser.Math.Clamp(ratio, cfg.minTimeScale, cfg.maxTimeScale);
  };

  prototype._getMovingWalkLoopAnim = function() {
    const profile = getP(this);
    const cfg = profile.walkAnimation || ASSET_KEYS.player.walkAnimation;
    const ratio = this.playerController?.getWalkSpeedRatio?.() ?? 1;
    return ratio >= (cfg.runSpeedRatioThreshold ?? 1.35)
      ? profile.walkRunAnim || ASSET_KEYS.player.walkRunAnim
      : profile.walkLoopAnim || ASSET_KEYS.player.walkLoopAnim;
  };

  prototype._applyWalkAnimationTimeScale = function() {
    if (!this.player?.anims) return;
    this.player.anims.timeScale = this._getWalkAnimationTimeScale();
  };

  prototype.playMineImpactFx = function(targetTile, destroyed) {
    if (!targetTile) return;
    const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
    const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
    if (destroyed) this._applyDestroyParticles?.(worldX, worldY, this._lastMinedTileType);
    this.worldRenderer?.applyTileUpdate(targetTile.tx, targetTile.ty);
  };

  prototype.applyMineFeedback = function(result, targetTile) {
    if (!result || !targetTile) return;
    this._lastMinedTileType = result.typeBeforeDamage ?? result.tileType ?? null;
    this._applyMineShake?.(result);
    if (result.destroyed) {
      const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
      const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
      this._applyDestroyParticles?.(worldX, worldY, result.typeBeforeDamage ?? result.tileType);
    }
  };

  prototype.playMineFeedbackAudio = function(result, tileType) {
    if (!this.soundSystem) return;
    if (result.reason === "cooldown") return;
    if (result.reason === "blocked") { this.soundSystem.playTileHit(); return; }
    if (result.reason === "no-target") return;
    if (result.success) {
      if (tileType === 16) { this.soundSystem.playStarDig(); }
      else if (tileType === 1 || tileType === 2 || tileType === 3) { this.soundSystem.playDig(); }
      if (result.destroyed) this.soundSystem.playTileBreak();
    }
  };

  prototype.setShopOpen = function(open) {
    if (this.playerController) this.playerController.setControlsEnabled(!open);
  };

  prototype.queueDigImpactFeedback = function(feedback) {
    if (!feedback?.result) { this._pendingDigImpactFeedback = null; return; }
    this._pendingDigImpactFeedback = {
      result: feedback.result,
      targetTile: feedback.targetTile ? { ...feedback.targetTile } : null,
      tileType: feedback.tileType ?? null,
    };
  };

  prototype.flushPendingDigImpactFeedback = function() {
    const pending = this._pendingDigImpactFeedback;
    this._pendingDigImpactFeedback = null;
    if (!pending?.result) return;
    const { result, targetTile, tileType } = pending;
    if (result.success) this.playMineImpactFx(targetTile, result.destroyed);
    this.playMineFeedbackAudio(result, tileType);
    this.applyMineFeedback(result, targetTile);
  };

  prototype.startDigAnimation = function(mineFeedback = null) {
    const profile = getP(this);
    const aim = this.playerController.getAimLabel();
    let animKey = profile.digDownAnim || ASSET_KEYS.player.digDownAnim;
    let flipX = false;

    if (aim === "UP-LEFT") {
      animKey = nextComboAnim(this, "_digUpSidewaysComboIndex", profile.digUpSidewaysHitAnims || ASSET_KEYS.player.digUpSidewaysHitAnims, profile.digUpSidewaysAnim || ASSET_KEYS.player.digUpSidewaysAnim);
      flipX = true;
    } else if (aim === "UP-RIGHT") {
      animKey = nextComboAnim(this, "_digUpSidewaysComboIndex", profile.digUpSidewaysHitAnims || ASSET_KEYS.player.digUpSidewaysHitAnims, profile.digUpSidewaysAnim || ASSET_KEYS.player.digUpSidewaysAnim);
    } else if (aim === "LEFT" || aim === "DOWN-LEFT") {
      animKey = nextComboAnim(this, "_digSidewaysComboIndex", profile.digSidewaysHitAnims || ASSET_KEYS.player.digSidewaysHitAnims, profile.digSidewaysAnim || ASSET_KEYS.player.digSidewaysAnim);
    } else if (aim === "RIGHT" || aim === "DOWN-RIGHT") {
      animKey = nextComboAnim(this, "_digSidewaysComboIndex", profile.digSidewaysHitAnims || ASSET_KEYS.player.digSidewaysHitAnims, profile.digSidewaysAnim || ASSET_KEYS.player.digSidewaysAnim);
      flipX = true;
    } else if (aim === "UP") {
      animKey = nextComboAnim(this, "_digUpComboIndex", profile.digUpHitAnims || ASSET_KEYS.player.digUpHitAnims, profile.digUpAnim || ASSET_KEYS.player.digUpAnim);
    } else if (aim === "DOWN") {
      animKey = profile.digDownAnim || ASSET_KEYS.player.digDownAnim;
      this._digDownCount = (this._digDownCount || 0) + 1;
      const facingFlip = !this.playerController.isFacingRight();
      flipX = (this._digDownCount % 3 === 0) ? !facingFlip : facingFlip;
    }

    this.isDigAnimating = true;
    this.queueDigImpactFeedback(mineFeedback);
    this.player.setFlipX(flipX);
    this.player.play(animKey, true);
    this.player.setDisplaySize(this.config.playerDisplaySizePx, this.config.playerDisplaySizePx);

    if (this._gamefeelConfig && this.digSystem) {
      const baseCooldown = this._gamefeelConfig.animSpeed.baseCooldownMs;
      const effective = this.digSystem.getEffectiveCooldownMs();
      const mult = Math.min(baseCooldown / effective, this._gamefeelConfig.animSpeed.maxSpeedMultiplier);
      this.player.anims.timeScale = mult;
    }
    this.pickaxeTrailSystem?.start();
  };

  prototype.activateDevCheat = function() {
    console.log('[DEVCHEAT] ========================================');
    console.log('[DEVCHEAT] activateDevCheat() called!');
    this.digSystem.setResourceTotals({ dirt: 5000, stone: 5000, copper: 5000, bronze: 5000, silver: 5000, gold: 5000 });
    this.upgradeSystem.addMoney(5000);
    this.upgradeSystem.grantUpgrade?.('worldTwoTunnelAccess');
    this.surfaceTunnelDoorSystem?.open?.();
    this.upgradeSystem.setGodMode(true);
    if (this.playerController && this.playerController.abilities) { this.playerController.abilities.setGodMode(true); }
    this.uiResourceBar?.setResources(this.digSystem.getResourceTotals());
    this.uiResourceBar?.setMoney(this.upgradeSystem.getMoney());
    this.uiInventoryPopup?.setResources(this.digSystem.getResourceTotals());
    this.uiInventoryPopup?.setMoney(this.upgradeSystem.getMoney());
    this.hudSystem.flashStatus("TRUE GODMODE! 99999 DMG | 75% SPD | INF FLY!", "#ff00ff", 2000);
    console.log('[DEVCHEAT] ========================================');
  };

  prototype.updatePlayerVisualState = function(force = false) {
    if (this.isDigAnimating) return;
    const profile = getP(this);
    const motionState = this.playerController.getMotionState();
    const aimLabel = this.playerController.getAimLabel();
    const currentAnimKey = this.player.anims.currentAnim?.key ?? null;
    const currentWalkAnim = (profile.walkAnims || ASSET_KEYS.player.walkAnims).includes(currentAnimKey);
    const currentMovingWalkAnim = (profile.walkMovingAnims || ASSET_KEYS.player.walkMovingAnims).includes(currentAnimKey);
    const currentWalkStopAnim = currentAnimKey === (profile.walkStopAnim || ASSET_KEYS.player.walkStopAnim);
    let targetAnim = profile.idleAnim || ASSET_KEYS.player.idleAnim;
    let flipX = false;
    let isWalking = false;

    const wasClimbing = this._isClimbing || false;
    const isClimbingNow = motionState === "climb";
    this._isClimbing = isClimbingNow;
    if (isClimbingNow && !wasClimbing) { this.climbTrailSystem?.start(); }
    else if (!isClimbingNow && wasClimbing) { this.climbTrailSystem?.stop(); }

    if (motionState === "climb") {
      const isFlying = this.playerController.abilities?.isFlying?.() === true;
      targetAnim = isFlying ? (profile.flyAnim || ASSET_KEYS.player.flyAnim) : (profile.climbAnim || ASSET_KEYS.player.climbAnim);
      flipX = !this.playerController.isFacingRight();
    } else if (motionState === "jump") {
      targetAnim = isFallingDownward(this) ? (profile.fallingAnim || ASSET_KEYS.player.fallingAnim) : (profile.jumpAnim || ASSET_KEYS.player.jumpAnim);
      flipX = !this.playerController.isFacingRight();
    } else if (isWalkingIntoBlockedSide(this, motionState)) {
      targetAnim = profile.wallPushAnim || ASSET_KEYS.player.wallPushAnim;
      flipX = motionState === "walk-left";
    } else if (motionState === "walk-left") {
      isWalking = true;
      targetAnim = profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim;
      flipX = true;
    } else if (motionState === "walk-right") {
      isWalking = true;
      targetAnim = profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim;
      flipX = false;
    } else if (motionState === "idle") {
      const combatRecoverActive = (this._combatIdleRecoverUntilMs || 0) > (this.time?.now || 0);
      targetAnim = isUpAim(aimLabel)
        ? (profile.digUpLookAnim || ASSET_KEYS.player.digUpLookAnim)
        : combatRecoverActive
          ? (profile.combatIdleRecoverAnim || ASSET_KEYS.player.combatIdleRecoverAnim)
          : (profile.idleAnim || ASSET_KEYS.player.idleAnim);
      if (aimLabel === "UP-LEFT") { flipX = true; }
      else if (aimLabel === "UP-RIGHT") { flipX = false; }
      else { flipX = !this.playerController.isFacingRight(); }
    } else if (this.playerController.isGrounded() && aimLabel === "DOWN") {
      targetAnim = profile.duckAnim || ASSET_KEYS.player.duckAnim;
      flipX = !this.playerController.isFacingRight();
    }

    if (isWalking) {
      if (currentAnimKey === (profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim) && this.player.anims.isPlaying && !force) {
        targetAnim = profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim;
      } else if (currentMovingWalkAnim && !force) {
        targetAnim = this._getMovingWalkLoopAnim();
      }
      this._applyWalkAnimationTimeScale();
    } else {
      const shouldWindDown = !force && currentWalkAnim && !currentWalkStopAnim && isIdleLikeMotionState(motionState);
      if (shouldWindDown) {
        targetAnim = profile.walkStopAnim || ASSET_KEYS.player.walkStopAnim;
      } else if (currentWalkStopAnim && this.player.anims.isPlaying && !force && isIdleLikeMotionState(motionState)) {
        targetAnim = profile.walkStopAnim || ASSET_KEYS.player.walkStopAnim;
      } else {
        this.player.anims.timeScale = 1.0;
      }
    }

    this.player.setFlipX(flipX);
    this.player.play(targetAnim, !force);
    this.player.setDisplaySize(this.config.playerDisplaySizePx, this.config.playerDisplaySizePx);
    this._lastPlayedAnim = targetAnim;
  };

  prototype._applyMineShake = function(result) {
    if (!this._gamefeelConfig) return;
    if (this.game.loop.actualFps < this._gamefeelConfig.shake.minFps) return;
    const tileType = result.tileType ?? result.typeBeforeDamage ?? null;
    const signature = result.isCriticalHit && result.destroyed && tileType !== TILE_TYPES.SKY_TILE
      ? "mining.crit" : mineShakeSignatureForTile(tileType);
    const intensityScale = result.destroyed ? 1 : 0.65;
    this.shakeSystem?.shake(signature, intensityScale);
  };

  prototype._applyDestroyParticles = function(worldX, worldY, tileType) {
    if (!this._gamefeelConfig) return;
    const cfg = this._gamefeelConfig.particles;
    const color = cfg.tileColors[tileType] || cfg.defaultColor;
    const count = cfg.count;
    if (!this._activeParticleChips) this._activeParticleChips = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 60;
      const chip = this.add.graphics();
      chip.fillStyle(color, 0.9);
      chip.fillCircle(0, 0, cfg.size * (0.6 + Math.random() * 0.7));
      chip.setPosition(worldX + (Math.random() - 0.5) * 16, worldY + (Math.random() - 0.5) * 16);
      chip.setDepth(cfg.depth);
      this._activeParticleChips.push(chip);
      const lifespan = cfg.lifespanMin + Math.random() * (cfg.lifespanMax - cfg.lifespanMin);
      this.tweens.add({
        targets: chip,
        x: chip.x + vx * (lifespan / 1000),
        y: chip.y + vy * (lifespan / 1000) + 0.5 * cfg.gravityY * Math.pow(lifespan / 1000, 2),
        alpha: 0,
        duration: lifespan,
        ease: 'Power1.out',
        onComplete: () => {
          const idx = this._activeParticleChips.indexOf(chip);
          if (idx !== -1) this._activeParticleChips.splice(idx, 1);
          chip.destroy();
        },
      });
    }
  };
}