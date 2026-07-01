/**
 * PlayScene Gameplay Module
 * Handles digging, mining, animations, and gameplay mechanics
 */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { MINING_CONFIG } from "../../values/miningConfig.js";
import { UI_CONFIG } from "../../values/uiConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { LIVING_DRILL_CONFIG } from "../../values/livingDrillConfig.js";

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
    if (body?.blocked?.[motionState === "walk-left" ? "left" : "right"] || body?.touching?.[motionState === "walk-left" ? "left" : "right"]) return true;
    const physicsBody = scene.playerController?.physicsBody;
    const world = scene.worldModel;
    const tileSize = scene.config?.tileSize || 0;
    if (!physicsBody || !world || !tileSize) return false;
    const side = motionState === "walk-left" ? "left" : "right";
    const probeX = side === "left" ? physicsBody.x - 1 : physicsBody.x + physicsBody.w + 1;
    const upperY = physicsBody.y + physicsBody.h * 0.35;
    const lowerY = physicsBody.y + physicsBody.h * 0.85;
    const tx = Math.floor(probeX / tileSize);
    return Boolean(
      world.isSolid?.(tx, Math.floor(upperY / tileSize)) ||
      world.isSolid?.(tx, Math.floor(lowerY / tileSize))
    );
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
  const isLivingDrill = (scene) => getP(scene).isLivingDrill === true;
  const aimToDirection = (aim, facingRight = true) => {
    if (aim === "UP") return { x: 0, y: -1, angle: -90 };
    if (aim === "DOWN") return { x: 0, y: 1, angle: 90 };
    if (aim === "LEFT" || aim === "DOWN-LEFT" || aim === "UP-LEFT") return { x: -1, y: 0, angle: 0 };
    if (aim === "RIGHT" || aim === "DOWN-RIGHT" || aim === "UP-RIGHT") return { x: 1, y: 0, angle: 0 };
    return facingRight ? { x: 1, y: 0, angle: 0 } : { x: -1, y: 0, angle: 0 };
  };
  const aimFromTargetTile = (scene, targetTile, fallbackAim) => {
    const playerTile = scene.playerController?.getPlayerTile?.();
    if (!targetTile || !playerTile) return fallbackAim;
    const dx = Math.sign((targetTile.tx ?? playerTile.tx) - playerTile.tx);
    const dy = Math.sign((targetTile.ty ?? playerTile.ty) - playerTile.ty);
    if (dy < 0 && dx < 0) return "UP-LEFT";
    if (dy < 0 && dx > 0) return "UP-RIGHT";
    if (dy < 0) return "UP";
    if (dy > 0) return "DOWN";
    if (dx < 0) return "LEFT";
    if (dx > 0) return "RIGHT";
    return fallbackAim;
  };
  const tileColorFor = (tileType) => {
    switch (tileType) {
      case TILE_TYPES.DIRT: return 0x8d765b;
      case TILE_TYPES.DARK_DIRT_NORMAL: return 0x71533b;
      case TILE_TYPES.DARK_DIRT_STRONG: return 0x5b412f;
      case TILE_TYPES.STONE: return 0x787c80;
      case TILE_TYPES.COPPER: return 0xb87333;
      case TILE_TYPES.STEEL: return 0x7f9099;
      case TILE_TYPES.IRON: return 0x9a9a93;
      case TILE_TYPES.BRONZE: return 0xaa6f35;
      case TILE_TYPES.SILVER: return 0xbfc7cc;
      case TILE_TYPES.GOLD: return 0xd8ad3f;
      case TILE_TYPES.SKY_TILE: return 0x668fd8;
      default: return 0x7c6a58;
    }
  };
  const getLivingDrillBaseSpritePosition = (scene) => {
    const body = scene.playerController?.physicsBody;
    if (!body) return null;
    if (scene.config.playerVisualOriginCenter) {
      return { x: body.x + body.w / 2, y: body.y + body.h / 2 };
    }
    return { x: body.x + body.w / 2, y: body.y + body.h };
  };
  const setLivingDrillVisualOffset = (scene, x = 0, y = 0) => {
    if (!scene.player) return;
    const offset = Math.abs(x) > 0.001 || Math.abs(y) > 0.001 ? { x, y } : null;
    scene.player.setData("visualOffset", offset);
    scene.playerController?._syncSpriteWithPhysics?.();
  };
  const lockLivingDrillBodyAnchor = (scene, engagement) => {
    const body = scene.playerController?.physicsBody;
    if (!body || !engagement || engagement.phase === "committing" || engagement.phase === "settled") return;
    if (!Number.isFinite(engagement.anchorBodyX) || !Number.isFinite(engagement.anchorBodyY)) return;
    body.setPosition(engagement.anchorBodyX, engagement.anchorBodyY);
    body.resetVelocity();
  };
  const commitLivingDrillToTile = (scene, targetTile, direction) => {
    if (!targetTile || !scene.playerController?.physicsBody || !scene.worldModel) return false;
    const tx = targetTile.tx;
    const ty = targetTile.ty;
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return false;
    if (scene.worldModel.isSolid?.(tx, ty)) return false;
    const ts = scene.config.tileSize;
    const visualX = scene.player?.x;
    const visualY = scene.player?.y;
    scene.playerController.physicsBody.setPosition(tx * ts, ty * ts);
    scene.playerController.physicsBody.resetVelocity();
    const base = getLivingDrillBaseSpritePosition(scene);
    if (base && Number.isFinite(visualX) && Number.isFinite(visualY)) {
      setLivingDrillVisualOffset(scene, visualX - base.x, visualY - base.y);
    } else {
      setLivingDrillVisualOffset(scene, direction?.x ? -direction.x * ts : 0, direction?.y ? -direction.y * ts : 0);
    }
    return true;
  };
  const livingDrillTargetKey = (targetTile) => targetTile ? `${targetTile.tx},${targetTile.ty}` : "";
  const livingDrillDirectionKey = (direction) => `${direction.x},${direction.y}`;
  const livingDrillDamageProgress = (scene, result, targetTile, tileType) => {
    if (result?.destroyed) return LIVING_DRILL_CONFIG.dig.breakDepth;
    const hp = Number(result?.hp);
    const maxHp = Number(scene.worldModel?.getTileMaxHp?.(targetTile.tx, targetTile.ty, tileType));
    if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0) return 0;
    return Phaser.Math.Clamp(1 - hp / maxHp, 0, 1);
  };
  const livingDrillBiteForProgress = (progress, destroyed = false) => {
    const cfg = LIVING_DRILL_CONFIG.dig;
    if (destroyed) return cfg.breakDepth;
    return Phaser.Math.Linear(cfg.biteStartDepth, cfg.biteMaxPartialDepth, Phaser.Math.Clamp(progress, 0, 1));
  };
  const getLivingDrillCooldownMs = (scene) => {
    const cooldown = Number(scene.digSystem?.getEffectiveCooldownMs?.());
    return Number.isFinite(cooldown) && cooldown > 0 ? cooldown : 750;
  };
  const isLivingDrillMineHeld = (scene) => scene.playerController?.input?.keys?.mine?.isDown === true;
  const drawLivingDrillDamageOverlay = (scene, state, progress) => {
    if (!state?.targetTile) return;
    if (!scene._livingDrillOccluder) {
      scene._livingDrillOccluder = scene.add.graphics().setDepth(HUD_LAYOUT.playerDepth + 1);
    }
    const g = scene._livingDrillOccluder;
    const ts = scene.config.tileSize;
    const tx = state.targetTile.tx * ts;
    const ty = state.targetTile.ty * ts;
    const dir = state.direction;
    const perp = { x: -dir.y, y: dir.x };
    const faceX = dir.x > 0 ? tx : dir.x < 0 ? tx + ts : tx + ts / 2;
    const faceY = dir.y > 0 ? ty : dir.y < 0 ? ty + ts : ty + ts / 2;
    const bite = Phaser.Math.Clamp(progress, 0, 1);
    const baseColor = tileColorFor(state.tileType);

    g.clear();
    if (bite <= 0.04) return;

    const capDepth = Phaser.Math.Linear(4, 16, bite);
    const capWidth = Phaser.Math.Linear(18, 42, bite);
    const capX = faceX + dir.x * capDepth * 0.5;
    const capY = faceY + dir.y * capDepth * 0.5;
    g.fillStyle(0x120f0d, 0.42);
    if (dir.x !== 0) {
      g.fillRect(faceX + (dir.x > 0 ? -2 : -capDepth + 2), faceY - capWidth / 2, capDepth, capWidth);
    } else {
      g.fillRect(faceX - capWidth / 2, faceY + (dir.y > 0 ? -2 : -capDepth + 2), capWidth, capDepth);
    }
    g.lineStyle(2, baseColor, 0.38);
    g.lineBetween(faceX + perp.x * -capWidth * 0.48, faceY + perp.y * -capWidth * 0.48, faceX + perp.x * capWidth * 0.48, faceY + perp.y * capWidth * 0.48);

    const holeX = faceX + dir.x * Phaser.Math.Linear(5, 14, bite);
    const holeY = faceY + dir.y * Phaser.Math.Linear(5, 14, bite);
    const holeR = Phaser.Math.Linear(5, 18, bite);
    g.fillStyle(0x17120f, 0.88);
    g.fillEllipse(holeX, holeY, dir.x !== 0 ? holeR * 1.4 : holeR, dir.y !== 0 ? holeR * 1.4 : holeR);
    g.lineStyle(3, 0x3b332b, 0.76);
    g.strokeEllipse(holeX, holeY, dir.x !== 0 ? holeR * 1.65 : holeR * 1.12, dir.y !== 0 ? holeR * 1.65 : holeR * 1.12);

    if (bite > 0.16) {
      const crack = Phaser.Math.Clamp((bite - 0.16) / 0.84, 0, 1);
      g.lineStyle(2, 0x211b16, 0.85);
      [
        { forward: 20, side: -27 },
        { forward: 30, side: 4 },
        { forward: 18, side: 29 },
      ].forEach(c => {
        g.beginPath();
        g.moveTo(holeX, holeY);
        g.lineTo(holeX + dir.x * c.forward * crack + perp.x * c.side * crack, holeY + dir.y * c.forward * crack + perp.y * c.side * crack);
        g.strokePath();
      });
      g.lineStyle(2, 0xffd77d, 0.75);
      g.lineBetween(faceX + perp.x * -18, faceY + perp.y * -18, faceX + perp.x * 18, faceY + perp.y * 18);
      g.fillStyle(0xffd77d, 0.45);
      g.fillCircle(capX + perp.x * 16, capY + perp.y * 16, 2);
      g.fillCircle(capX + perp.x * -18, capY + perp.y * -12, 1.5);
    }
  };

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
      this.showLootPickupFeedback?.(result, targetTile);
    }
  };

  prototype.showLootPickupFeedback = function(reward, targetTile, overrides = {}) {
    if (!reward || !targetTile || !this.lootPickupFxSystem) return;
    const resourceType = overrides.resourceType ?? reward.resourceType ?? reward.resource;
    const amount = overrides.amount ?? reward.resourceAmount ?? 1;
    if (!resourceType || amount <= 0) return;

    const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
    const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
    const isSkyTileBonus = overrides.isSkyTileBonus ?? ((reward.skyTileMultiplier ?? 1) > 1);
    this.lootPickupFxSystem.showResourcePickup({
      worldX,
      worldY,
      resourceType,
      amount,
      isLuckyDrop: overrides.isLuckyDrop ?? reward.isLuckyDrop ?? false,
      isSkyTileBonus,
    });
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
    if (isLivingDrill(this)) {
      this.startLivingDrillDigAnimation(mineFeedback);
      return;
    }
    const profile = getP(this);
    const aim = aimFromTargetTile(this, mineFeedback?.targetTile, this.playerController.getAimLabel());
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
    const displaySize = profile.displaySizePx || this.config.playerDisplaySizePx;
    this.player.setDisplaySize(displaySize, displaySize);

    if (this._gamefeelConfig && this.digSystem) {
      const baseCooldown = this._gamefeelConfig.animSpeed.baseCooldownMs;
      const effective = this.digSystem.getEffectiveCooldownMs();
      const mult = Math.min(baseCooldown / effective, this._gamefeelConfig.animSpeed.maxSpeedMultiplier);
      this.player.anims.timeScale = mult;
    }
    this.pickaxeTrailSystem?.start();
  };

  prototype.updateLivingDrillVisualState = function(force = false) {
    if (!this.player || !isLivingDrill(this)) return;
    const profile = getP(this);
    const aim = this.playerController?.getAimLabel?.() || (this.playerController?.isFacingRight?.() ? "RIGHT" : "LEFT");
    const motionState = this.playerController?.getMotionState?.() || "idle";
    const isFlyingVisual = this.playerController?.abilities?.isFlying?.() === true || motionState === "airborne" || motionState === "climb";
    const targetAnim = isFlyingVisual ? (profile.flyAnim || profile.idleAnim) : profile.idleAnim;
    const targetSheet = isFlyingVisual ? (profile.flySheet || profile.idleSheet) : profile.idleSheet;
    if (this.player.texture?.key !== targetSheet) this.player.setTexture(targetSheet);
    const useAim = aim === "UP" || aim === "DOWN" || this.isDigAnimating;
    const dir = useAim
      ? aimToDirection(aim, this.playerController?.isFacingRight?.() !== false)
      : aimToDirection(motionState === "walk-left" ? "LEFT" : motionState === "walk-right" ? "RIGHT" : null, this.playerController?.isFacingRight?.() !== false);
    this.player.setFlipX(dir.x < 0);
    this.player.setAngle(dir.angle);
    this.player.setScale(profile.visualScale || 1);
    if (!this.player.anims.currentAnim || this.player.anims.currentAnim.key !== targetAnim || force) {
      this.player.play(targetAnim, true);
    }
  };

  prototype.applyLivingDrillEngagementVisual = function(engagement, angleOffset = 0) {
    if (!this.player || !engagement) return;
    lockLivingDrillBodyAnchor(this, engagement);
    const direction = engagement.direction;
    const bitePx = Math.round(this.config.tileSize * Phaser.Math.Clamp(engagement.bite, 0, 1));
    setLivingDrillVisualOffset(this, direction.x * bitePx, direction.y * bitePx);
    this.player.setFlipX(direction.x < 0);
    this.player.setAngle(direction.angle + angleOffset);
    drawLivingDrillDamageOverlay(this, engagement, Math.max(engagement.bite, engagement.damageProgress || 0));
  };

  prototype.clearLivingDrillEngagement = function({ updateVisual = true } = {}) {
    this._livingDrillTween?.stop();
    this._livingDrillTween = null;
    this._livingDrillEngagement = null;
    this._livingDrillOccluder?.clear();
    this._livingDrillDigState = null;
    this.player?.setData?.("visualOffset", null);
    this.playerController?._syncSpriteWithPhysics?.();
    this.isDigAnimating = false;
    if (updateVisual) this.updatePlayerVisualState(true);
  };

  prototype.retractLivingDrillEngagement = function(duration = 180) {
    const engagement = this._livingDrillEngagement;
    if (!engagement || engagement.retracting) return;
    engagement.retracting = true;
    this._livingDrillTween?.stop();
    this._livingDrillTween = this.tweens.add({
      targets: engagement,
      bite: 0,
      angleOffset: 0,
      duration,
      ease: "Sine.easeOut",
      onUpdate: () => this.applyLivingDrillEngagementVisual(engagement, engagement.angleOffset || 0),
      onComplete: () => this.clearLivingDrillEngagement(),
    });
  };

  prototype.updateLivingDrillEngagementTimeout = function(time = 0) {
    if (!isLivingDrill(this)) return;
    const engagement = this._livingDrillEngagement;
    if (!engagement || engagement.retracting) return;
    if (engagement.phase === "committing" || engagement.phase === "settled") {
      return;
    }
    const aim = this.playerController?.getAimLabel?.();
    const direction = aimToDirection(aim, this.playerController?.isFacingRight?.() !== false);
    const directionChanged = livingDrillDirectionKey(direction) !== engagement.directionKey;
    const targetStillSolid = this.worldModel?.isSolid?.(engagement.targetTile.tx, engagement.targetTile.ty) === true;
    if (directionChanged || !targetStillSolid) {
      this.retractLivingDrillEngagement(LIVING_DRILL_CONFIG.dig.targetChangeRetractMs);
      return;
    }
    if (isLivingDrillMineHeld(this)) {
      this.applyLivingDrillEngagementVisual(engagement, 0);
      return;
    }
    const elapsed = time - (engagement.lastHitTime || 0);
    const timeoutMs = Math.max(950, getLivingDrillCooldownMs(this) + 360);
    if (elapsed > timeoutMs) this.retractLivingDrillEngagement(LIVING_DRILL_CONFIG.dig.releaseRetractMs);
  };

  prototype.startLivingDrillDigAnimation = function(mineFeedback = null) {
    if (!this.player || !this.playerController) return;
    const aim = this.playerController.getAimLabel();
    const direction = aimToDirection(aim, this.playerController.isFacingRight());
    const targetTile = mineFeedback?.targetTile ? { ...mineFeedback.targetTile } : this.playerController.getAimTargetTile();
    const tileType = mineFeedback?.tileType ?? mineFeedback?.result?.typeBeforeDamage ?? mineFeedback?.result?.tileType ?? null;
    const result = mineFeedback?.result || null;
    const hasSolidTarget = targetTile && result?.reason !== "no-target" && result?.reason !== "cooldown";
    const destroyedTarget = hasSolidTarget && result?.destroyed === true;

    if (!hasSolidTarget || !result?.success) {
      this.queueDigImpactFeedback(mineFeedback);
      this.flushPendingDigImpactFeedback?.();
      this.retractLivingDrillEngagement(LIVING_DRILL_CONFIG.dig.invalidRetractMs);
      return;
    }

    const targetKey = livingDrillTargetKey(targetTile);
    const directionKey = livingDrillDirectionKey(direction);
    const previous = this._livingDrillEngagement;
    const sameEngagement = previous && previous.targetKey === targetKey && previous.directionKey === directionKey && !previous.destroyed;
    if (previous && !sameEngagement) {
      this.clearLivingDrillEngagement({ updateVisual: false });
    }

    const damageProgress = livingDrillDamageProgress(this, result, targetTile, tileType);
    const targetBite = livingDrillBiteForProgress(damageProgress, destroyedTarget);
    const engagement = sameEngagement ? previous : {
      targetKey,
      directionKey,
      targetTile,
      direction,
      tileType,
      maxHp: this.worldModel?.getTileMaxHp?.(targetTile.tx, targetTile.ty, tileType) || 1,
      bite: 0,
      angleOffset: 0,
      damageProgress: 0,
      lastHitTime: 0,
      destroyed: false,
      retracting: false,
      phase: "biting",
      anchorBodyX: this.playerController?.physicsBody?.x ?? 0,
      anchorBodyY: this.playerController?.physicsBody?.y ?? 0,
    };
    engagement.targetTile = targetTile;
    engagement.direction = direction;
    engagement.tileType = tileType;
    engagement.damageProgress = Math.max(engagement.damageProgress || 0, damageProgress);
    engagement.lastHitTime = this.time?.now || 0;
    engagement.destroyed = destroyedTarget;
    engagement.retracting = false;
    engagement.phase = destroyedTarget ? "breaking" : "biting";
    this._livingDrillEngagement = engagement;
    this._livingDrillDigState = engagement;
    this.isDigAnimating = true;
    this.queueDigImpactFeedback(mineFeedback);
    this.player.setFlipX(direction.x < 0);
    this.player.setAngle(direction.angle);
    this.player.setTexture(getP(this).digSheet || getP(this).idleSheet);
    this.player.setScale(getP(this).visualScale || 1);
    this.player.anims.timeScale = 1;
    this.player.play(getP(this).digSidewaysAnim || getP(this).digDownAnim || getP(this).digAnims?.[0] || getP(this).idleAnim, true);
    this.pickaxeTrailSystem?.stop();

    this._livingDrillTween?.stop();
    const cfg = LIVING_DRILL_CONFIG.dig;
    const biteStart = Math.max(0, engagement.bite);
    const cooldownMs = getLivingDrillCooldownMs(this);
    const hardnessRatio = destroyedTarget ? 0 : Phaser.Math.Clamp(1 - engagement.damageProgress, 0, 1);
    const biteDuration = destroyedTarget
      ? Phaser.Math.Clamp(cooldownMs * cfg.breakCooldownMultiplier, cfg.breakDurationMinMs, cfg.breakDurationMaxMs)
      : Phaser.Math.Clamp(cooldownMs * (cfg.partialCooldownBaseMultiplier + hardnessRatio * cfg.partialHardnessMultiplier), cfg.partialDurationMinMs, cfg.partialDurationMaxMs);
    engagement.bite = biteStart;
    engagement.angleOffset = destroyedTarget ? 0 : cfg.impactAngleOffsetDeg;
    this.applyLivingDrillEngagementVisual(engagement, engagement.angleOffset);
    this._livingDrillTween = this.tweens.add({
      targets: engagement,
      bite: Math.max(targetBite, engagement.bite),
      angleOffset: 0,
      duration: biteDuration,
      ease: "Cubic.easeOut",
      onUpdate: () => this.applyLivingDrillEngagementVisual(engagement, engagement.angleOffset || 0),
      onComplete: () => {
        this.flushPendingDigImpactFeedback?.();
        if (destroyedTarget) {
          engagement.bite = cfg.breakDepth;
          engagement.phase = "committing";
          this.applyLivingDrillEngagementVisual(engagement, 0);
          const committed = commitLivingDrillToTile(this, targetTile, direction);
          this._livingDrillTween = null;
          this._livingDrillOccluder?.clear();
          this.player.setTexture(getP(this).idleSheet);
          this.player.play(getP(this).idleAnim, true);
          this.player.setScale(getP(this).visualScale || 1);
          if (!committed) {
            this.clearLivingDrillEngagement();
            return;
          }
          const currentOffset = this.player.getData("visualOffset") || { x: 0, y: 0 };
          const commitOffset = { x: currentOffset.x || 0, y: currentOffset.y || 0 };
          this._livingDrillTween = this.tweens.add({
            targets: commitOffset,
            x: 0,
            y: 0,
            duration: cfg.commitDurationMs,
            ease: cfg.commitEase,
            onUpdate: () => setLivingDrillVisualOffset(this, commitOffset.x, commitOffset.y),
            onComplete: () => {
              engagement.phase = "settled";
              this._livingDrillTween = null;
              this._livingDrillDigState = null;
              this._livingDrillEngagement = null;
              setLivingDrillVisualOffset(this, 0, 0);
              this.isDigAnimating = false;
              this.updatePlayerVisualState(true);
            },
          });
          return;
        }
        this._livingDrillTween = null;
        this.isDigAnimating = true;
        this.applyLivingDrillEngagementVisual(engagement, 0);
      },
    });
  };

  prototype.prepareLivingDrillMineAttempt = function(aimTargetTile) {
    if (!isLivingDrill(this)) {
      return { allow: true, targetTile: aimTargetTile };
    }

    const engagement = this._livingDrillEngagement;
    if (!engagement || engagement.retracting) {
      return { allow: true, targetTile: aimTargetTile };
    }

    const aim = this.playerController?.getAimLabel?.();
    const direction = aimToDirection(aim, this.playerController?.isFacingRight?.() !== false);
    const directionKey = livingDrillDirectionKey(direction);
    if (directionKey !== engagement.directionKey) {
      this.retractLivingDrillEngagement(LIVING_DRILL_CONFIG.dig.targetChangeRetractMs);
      return { allow: false, targetTile: aimTargetTile };
    }

    if (engagement.phase === "committing" || engagement.phase === "settled") {
      return { allow: false, targetTile: engagement.targetTile };
    }

    const lockedTile = engagement.targetTile;
    const lockedStillSolid = lockedTile && this.worldModel?.isSolid?.(lockedTile.tx, lockedTile.ty) === true;
    if (lockedStillSolid) {
      return { allow: true, targetTile: lockedTile };
    }

    return { allow: false, targetTile: lockedTile || aimTargetTile };
  };

  prototype.activateDevCheat = function() {
    console.log('[DEVCHEAT] ========================================');
    console.log('[DEVCHEAT] activateDevCheat() called!');
    this.digSystem.setResourceTotals({ dirt: 5000, stone: 5000, copper: 5000, bronze: 5000, silver: 5000, gold: 5000 });
    this.upgradeSystem.addMoney(50000);
    this.upgradeSystem.setGodMode(true);
    if (this.playerController && this.playerController.abilities) { this.playerController.abilities.setGodMode(true); }
    this.uiResourceBar?.setResources(this.digSystem.getResourceTotals());
    this.uiResourceBar?.setMoney(this.upgradeSystem.getMoney());
    this.uiInventoryPopup?.setResources(this.digSystem.getResourceTotals());
    this.uiInventoryPopup?.setMoney(this.upgradeSystem.getMoney());
    this.hudSystem.flashStatus("TRUE GODMODE! Buy Bobo's tunnel key to open World Two.", "#ff00ff", 2000);
    console.log('[DEVCHEAT] ========================================');
  };

  prototype.updatePlayerVisualState = function(force = false) {
    if (this.isDigAnimating) return;
    if (isLivingDrill(this)) {
      this.updateLivingDrillVisualState(force);
      return;
    }
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
    } else if (motionState === "airborne") {
      targetAnim = isFallingDownward(this) ? (profile.fallingAnim || ASSET_KEYS.player.fallingAnim) : (profile.airborneAnim || ASSET_KEYS.player.airborneAnim);
      flipX = !this.playerController.isFacingRight();
    } else if (isWalkingIntoBlockedSide(this, motionState)) {
      targetAnim = profile.leanAgainstWallAnim || profile.wallPushAnim || ASSET_KEYS.player.leanAgainstWallAnim || ASSET_KEYS.player.wallPushAnim;
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
      const now = this.time?.now || 0;
      const combatRecoverUntil = this._combatIdleRecoverUntilMs || 0;
      const combatRecoverActive = combatRecoverUntil > now;
      const combatReturnActive = this._combatIdleReturnActive === true;
      const combatReturnDue = combatRecoverUntil > 0 && !combatRecoverActive && this._combatIdleReturnPlayed !== true;
      targetAnim = this.playerController.isGrounded() && aimLabel === "DOWN"
        ? (profile.duckAnim || ASSET_KEYS.player.duckAnim)
        : (combatReturnActive || combatReturnDue)
          ? (profile.combatIdleToNormalIdleAnim || ASSET_KEYS.player.combatIdleToNormalIdleAnim || profile.idleAnim || ASSET_KEYS.player.idleAnim)
          : isUpAim(aimLabel)
        ? (profile.digUpLookAnim || ASSET_KEYS.player.digUpLookAnim)
        : combatRecoverActive
          ? (profile.combatIdleRecoverAnim || ASSET_KEYS.player.combatIdleRecoverAnim)
          : (profile.idleAnim || ASSET_KEYS.player.idleAnim);
      if (combatReturnDue && targetAnim !== (profile.idleAnim || ASSET_KEYS.player.idleAnim)) {
        this._combatIdleRecoverUntilMs = 0;
        this._combatIdleReturnActive = true;
      }
      if (aimLabel === "UP-LEFT") { flipX = true; }
      else if (aimLabel === "UP-RIGHT") { flipX = false; }
      else { flipX = !this.playerController.isFacingRight(); }
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
    const displaySize = profile.displaySizePx || this.config.playerDisplaySizePx;
    this.player.setDisplaySize(displaySize, displaySize);
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
