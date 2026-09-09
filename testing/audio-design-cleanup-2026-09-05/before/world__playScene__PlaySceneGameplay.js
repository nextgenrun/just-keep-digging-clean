/**
 * PlayScene Gameplay Module
 * Handles digging, mining, animations, and gameplay mechanics
 */
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { LIVING_DRILL_CONFIG } from "../../values/livingDrillConfig.js";
import { getMaterialFeedback, getMineShakeSignature, GLINT_CONFIG } from "../../values/materialFeedback.js";
import { ARC_CORE_UPGRADE_ID, OMEGA_ARC_CORE_UPGRADE_ID } from "../../values/arcCoreConfig.js";
import { PLAYER_MOTION_POLISH_CONFIG } from "../../values/playerMotionPolish.js";
import { GOD_MODE_CONFIG } from "../../values/godMode.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import {
  UAL_NATIVE_ACTION_TUNING,
  resolveUalActionContact,
  resolveUalActionTimeScale,
  resolveUalFlightBankAlpha,
  resolveUalFlightPoseAngle,
  resolveUalFlightTravel,
  resolveUalFlightTimeScale,
} from "../../values/ualNativeActionTuning.js";
import { UalMiningComboSelector } from "../../player/UalMiningComboSelector.js";
import { canStartUalMiningAction } from "../../player/ualMiningActionCadence.js";
import { resolveMovingDiagonalDigAnimation } from "../../player/UalMovingDiagonalDigSelector.js";
import { resolveMovingSideDigAnimation } from "../../player/UalMovingSideDigSelector.js?rev=20260821-moving-complex-dig-v1";
import {
  normalizeHorizontalDirection,
  resolveAuthoredHorizontalFlipX,
  resolvePlayerTargetDirection,
} from "../../player/playerDirectionalTargets.js";
import { resolvePlayerDisplaySizePx } from "../../values/playerAssetProfiles.js?rev=20260821-moving-complex-dig-v1";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";
import { setBlockingSurfaceOpen } from "./SceneModeBridge.js";
import {
  prewarmComplexDigSelection,
  resolveComplexDigSelection,
  resolveComplexDigSourceFacesRight,
} from "./ComplexDigAnimationRuntime.js";
import { resolveUalCrouchTransitionAnimation } from
  "../../systems/visual/ualCrouchTransitionSelection.js";
import {
  resolveHeldTorchAnimationKey,
  resolveHeldTorchBaseAnimationKey,
} from "../../systems/visual/heldTorchAnimationSelection.js";

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
    if (scene.isDigAnimating || scene.inputHandler?.getKeys?.()?.mine?.isDown === true) return false;
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
  const selectComboAnim = (scene, family, direction, anims, fallback, targetTile) => {
    if (!scene.ualMiningComboSelector) {
      scene.ualMiningComboSelector = new UalMiningComboSelector();
    }
    return scene.ualMiningComboSelector.select({
      family,
      direction,
      animationKeys: anims,
      fallback,
      targetTile,
      nowMs: scene.time?.now || 0,
    });
  };
  const isUpAim = (aim) => aim === "UP" || aim === "UP-LEFT" || aim === "UP-RIGHT";
  const isFallingDownward = (scene) => scene.playerKinematicMotion?.isFalling?.(
    scene.playerController?.physicsBody?.vy ?? 0,
  ) ?? scene.playerMotionPolish?.isFallingDownward?.(
    scene.playerController?.physicsBody?.vy ?? 0,
  ) ?? (scene.playerController?.physicsBody?.vy ?? 0) > PLAYER_MOTION_POLISH_CONFIG.fallingVyThresholdPxPerSec;
  const getP = (scene) => scene.playerAssetProfile || ASSET_KEYS.player;
  const isLivingDrill = (scene) => getP(scene).isLivingDrill === true;
  const flipXForDirectionX = (directionX) => directionX < 0;
  const flipXForSidewaysDigDirectionX = (scene, directionX, animationKey = null) => {
    const profile = getP(scene);
    const sourceFacesRight = resolveComplexDigSourceFacesRight(
      profile,
      animationKey,
      profile.digSidewaysSourceFacesRight === true,
    );
    return sourceFacesRight ? directionX < 0 : directionX > 0;
  };
  const flipXForUpSidewaysDirectionX = (scene, directionX) => {
    const sourceFacesRight = getP(scene).digUpSidewaysSourceFacesRight !== false;
    return sourceFacesRight ? directionX < 0 : directionX > 0;
  };
  const aimToDirection = (aim, facingRight = true) => {
    if (aim === "UP") return { x: 0, y: -1, angle: -90 };
    if (aim === "DOWN") return { x: 0, y: 1, angle: 90 };
    if (aim === "LEFT" || aim === "DOWN-LEFT" || aim === "UP-LEFT") return { x: -1, y: 0, angle: 0 };
    if (aim === "RIGHT" || aim === "DOWN-RIGHT" || aim === "UP-RIGHT") return { x: 1, y: 0, angle: 0 };
    return facingRight ? { x: 1, y: 0, angle: 0 } : { x: -1, y: 0, angle: 0 };
  };
  const aimFromTargetTile = (scene, targetTile, fallbackAim) => {
    const direction = resolvePlayerTargetDirection(
      scene.playerController?.physicsBody,
      scene.config?.tileSize,
      targetTile,
    );
    return direction?.aimLabel || fallbackAim;
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
    const placed = scene.playerController.physicsBody.setPosition(tx * ts, ty * ts);
    if (placed === false) return false;
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

  prototype._getWalkAnimationTimeScale = function(
    animationKey = null,
    speedOverridePxPerSec = null,
  ) {
    const profile = getP(this);
    const resolvedKey = animationKey || this._getMovingWalkLoopAnim();
    const animation = resolvedKey ? this.anims.get(resolvedKey) : null;
    const matched = this.playerKinematicMotion?.resolveLocomotionTimeScale?.(
      resolvedKey,
      animation,
      speedOverridePxPerSec,
    );
    if (Number.isFinite(matched)) return matched;
    const cfg = profile.walkAnimation || ASSET_KEYS.player.walkAnimation;
    const ratio = this.playerController?.getWalkSpeedRatio?.() ?? 1;
    return Phaser.Math.Clamp(ratio, cfg.minTimeScale, cfg.maxTimeScale);
  };

  prototype._getMovingWalkLoopAnim = function() {
    const profile = getP(this);
    const walkRunFrames = profile.walkRunFrames || ASSET_KEYS.player.walkRunFrames;
    const walkRunAnim = walkRunFrames?.length
      ? profile.walkRunAnim || ASSET_KEYS.player.walkRunAnim
      : null;
    return this.playerController?.isRunning?.() === true && walkRunAnim
      ? walkRunAnim
      : profile.walkLoopAnim || ASSET_KEYS.player.walkLoopAnim;
  };

  prototype._applyWalkAnimationTimeScale = function(
    animationKey = null,
    speedOverridePxPerSec = null,
  ) {
    if (!this.player?.anims) return;
    this.player.anims.timeScale = this._getWalkAnimationTimeScale(
      animationKey,
      speedOverridePxPerSec,
    );
  };

  prototype.canReplaceUalDigRecovery = function(
    now = this.time?.now || 0,
    abilities = this.playerController?.abilities,
  ) {
    const profile = getP(this);
    if (!profile.isUalNative || !this.isDigAnimating) return false;
    if (this.ualActionContactTimeline?.allContactsFired !== true) return false;
    const contactAtMs = this._ualActionContactAtMs;
    const cadence = abilities?.isQuickslashActive?.() === true
      ? UAL_NATIVE_ACTION_TUNING.cadence.quickslash
      : UAL_NATIVE_ACTION_TUNING.cadence.normal;
    const recoveryDelayMs = cadence.recoveryCancelDelayMs;
    if (!Number.isFinite(contactAtMs) || now - contactAtMs < recoveryDelayMs) return false;
    if (typeof this.digSystem?.isMineCooldownReady === "function") {
      return this.digSystem.isMineCooldownReady(now, abilities);
    }
    const lastMineTime = Number.isFinite(this.digSystem?.lastMineTime)
      ? this.digSystem.lastMineTime
      : -Infinity;
    const cooldownMs = this.digSystem?.getEffectiveCooldownMs?.(abilities) || 0;
    return now - lastMineTime >= cooldownMs;
  };

  prototype.cancelUalDigRecovery = function(now, abilities) {
    if (!this.canReplaceUalDigRecovery(now, abilities)) return false;
    this.ualActionContactTimeline?.cancel();
    this.playerRigContact?.endAction();
    this.isDigAnimating = false;
    this._ualMiningActionKind = null;
    this._ualActionContactAtMs = -Infinity;
    if (this.player?.anims) this.player.anims.timeScale = 1;
    return true;
  };

  prototype.playMineImpactFx = function(targetTile) {
    if (!targetTile) return;
    this.worldRenderer?.applyTileUpdate(targetTile.tx, targetTile.ty);
  };

  prototype.applyMineFeedback = function(result, targetTile, contactEvent = null) {
    if (!result || !targetTile) return;
    this._lastMinedTileType = result.typeBeforeDamage ?? result.tileType ?? null;
    let queued = false;
    if (result.success) {
      this.playerBodyLanguage?.onDigImpact(result.destroyed === true);
      queued = this.digImpactFxSystem?.play({ result, targetTile, contactEvent });
      if (!queued) this.speedBlockFxSystem?.onMineImpact(targetTile);
    }
    if (!queued || !this.digImpactFxSystem?.feedback?.enabled) this._applyMineShake?.(result);
    if (result.destroyed) {
      const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
      const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
      this._applyDestroyParticles?.(worldX, worldY, result.typeBeforeDamage ?? result.tileType);
      this.showLootPickupFeedback?.(result, targetTile);
      this.showXpGatheringFeedback?.(result, targetTile);
    }
  };

  prototype.showLootPickupFeedback = function(reward, targetTile, overrides = {}) {
    if (!reward || !targetTile || !this.lootPickupFxSystem) return;
    const worldX = targetTile.tx * this.config.tileSize + this.config.tileSize / 2;
    const worldY = targetTile.ty * this.config.tileSize + this.config.tileSize / 2;
    const hasResourceOverride = Object.prototype.hasOwnProperty.call(
      overrides,
      "resourceType",
    );
    const specialBlockDestroyed = overrides.specialBlockDestroyed
      ?? (!hasResourceOverride && reward.specialBlockDestroyed === true);
    if (specialBlockDestroyed) {
      this.lootPickupFxSystem.showSpecialBlockPickup?.(Object.freeze({
        worldX,
        worldY,
        tileX: targetTile.tx,
        tileY: targetTile.ty,
        tileType: overrides.tileType
          ?? reward.typeBeforeDamage
          ?? reward.tileType
          ?? null,
        specialBlockEffect: overrides.specialBlockEffect
          ?? reward.specialBlockEffect
          ?? null,
        gemPowerTierId: overrides.gemPowerTierId
          ?? reward.gemPowerTierId
          ?? null,
      }));
    }

    const skyTileRarity = overrides.skyTileRarity ?? reward.skyTileRarity;
    const rewardTileType = overrides.tileType
      ?? reward.typeBeforeDamage
      ?? reward.tileType
      ?? null;
    const isStarResource = overrides.isStarResource ?? (
      !hasResourceOverride
      && rewardTileType === TILE_TYPES.SKY_TILE
    );
    if (isStarResource) return;

    const resourceType = overrides.resourceType ?? reward.resourceType ?? reward.resource;
    const amount = overrides.amount ?? reward.resourceAmount ?? 1;
    if (!resourceType || amount <= 0) return;

    const isSkyTileBonus = overrides.isSkyTileBonus ?? ((reward.skyTileMultiplier ?? 1) > 1);
    this.lootPickupFxSystem.showResourcePickup({
      worldX,
      worldY,
      resourceType,
      amount,
      tileX: targetTile.tx,
      tileY: targetTile.ty,
      isSkyTileBonus,
      skyTileRarity,
      isStarResource,
    });
  };

  prototype.playMineFeedbackAudio = function(result, tileType) {
    if (!this.soundSystem) return;
    if (result.reason === "cooldown") return;
    if (result.reason === "blocked") { this.soundSystem.playTileHit(); return; }
    if (result.reason === "no-target") return;

    if (result.success) {
      const material = getMaterialFeedback(tileType);
      if (tileType === TILE_TYPES.SKY_TILE) {
        if (result.destroyed) this.soundSystem.playStarDestruction();
        else this.soundSystem.playStarDig();
      } else {
        this.soundSystem.playDig({ rate: material.digRate, tileType });
        if (result.destroyed) {
          this.soundSystem.playTileBreak({
            tileType,
            rate: material.breakRate,
            volume: material.breakVolume,
          });
        }
      }
    }
  };

  prototype.setShopOpen = function(open) { setBlockingSurfaceOpen(this, open); };

  prototype.queueDigImpactFeedback = function(feedback) {
    if (!feedback?.result) { this._pendingDigImpactFeedback = null; return; }
    // Preserve every contact if a skipped frame crosses two hits. The legacy
    // audio/shake slot stays singular; play() deduplicates its later flush.
    this.digImpactFxSystem?.play({
      result: feedback.result,
      targetTile: feedback.targetTile,
      contactEvent: feedback.contactEvent,
    });
    this._pendingDigImpactFeedback = {
      result: feedback.result,
      targetTile: feedback.targetTile ? { ...feedback.targetTile } : null,
      tileType: feedback.tileType ?? null,
      contactEvent: feedback.contactEvent || null,
    };
  };

  prototype.flushPendingDigImpactFeedback = function() {
    const pending = this._pendingDigImpactFeedback;
    this._pendingDigImpactFeedback = null;
    if (!pending?.result) return;
    const { result, targetTile, tileType, contactEvent } = pending;
    if (result.success) this.playMineImpactFx(targetTile, result.destroyed);
    this.playMineFeedbackAudio(result, tileType);
    this.applyMineFeedback(result, targetTile, contactEvent);
  };

  prototype.startDigAnimation = function(mineFeedback = null) {
    if (isLivingDrill(this)) {
      this.startLivingDrillDigAnimation(mineFeedback);
      return;
    }
    const profile = getP(this);
    const aim = aimFromTargetTile(this, mineFeedback?.targetTile, this.playerController.getAimLabel());
    const actionKind = mineFeedback?.actionKind === "quickslash" ? "quickslash" : "normal";
    if (actionKind === "normal" && aim.startsWith("DOWN")) {
      this.playerDeferredAnimationAssetController?.ensureForAnimation?.(
        profile.downwardDigPrewarmAnimationKey,
      );
    }
    if (profile.immediateDigImpactFeedback) {
      this.queueDigImpactFeedback(mineFeedback);
      this.flushPendingDigImpactFeedback();
    }
    const activeActionKey = this.player.anims.currentAnim?.key ?? null;
    const nativePunchInProgress = profile.isUalNative
      && this.isDigAnimating
      && (this.player.anims.isPlaying || this.digImpactFxSystem?.feedback?.holding)
      && (profile.punchActionAnims || profile.digAnims || []).includes(activeActionKey);
    if (nativePunchInProgress && !this.cancelUalDigRecovery(
      this.time?.now || 0,
      this.playerController?.abilities,
    )) return false;
    if (
      profile.isUalNative
      && !canStartUalMiningAction({
        digSystem: this.digSystem,
        nowMs: this.time?.now || 0,
        abilities: this.playerController?.abilities,
        actionKind,
      })
    ) return false;

    let animKey = profile.digDownAnim || ASSET_KEYS.player.digDownAnim;
    let deferredFallbackAnimKey = animKey;
    let flipX = false;
    let postActionFacingFlipX = !this.playerController.isFacingRight();
    if (mineFeedback?.animationKeyOverride) {
      animKey = mineFeedback.animationKeyOverride;
    }

    if (actionKind === "quickslash") {
      const aimDirectionX = aim.includes("LEFT") ? -1 : aim.includes("RIGHT") ? 1 : 0;
      const quickslashDirectionX = normalizeHorizontalDirection(
        mineFeedback?.actionDirectionX || aimDirectionX,
        this.playerController.isFacingRight(),
      );
      const sourceFacesRight = profile.quickslashSourceFacesRight
        ?? ASSET_KEYS.player.quickslashSourceFacesRight;
      flipX = resolveAuthoredHorizontalFlipX(quickslashDirectionX, sourceFacesRight);
      postActionFacingFlipX = quickslashDirectionX < 0;
    } else if (aim === "UP-LEFT") {
      animKey = selectComboAnim(this, "up-side", aim, profile.digUpSidewaysHitAnims || ASSET_KEYS.player.digUpSidewaysHitAnims, profile.digUpSidewaysAnim || ASSET_KEYS.player.digUpSidewaysAnim, mineFeedback?.targetTile);
      flipX = flipXForUpSidewaysDirectionX(this, -1);
      postActionFacingFlipX = true;
    } else if (aim === "UP-RIGHT") {
      animKey = selectComboAnim(this, "up-side", aim, profile.digUpSidewaysHitAnims || ASSET_KEYS.player.digUpSidewaysHitAnims, profile.digUpSidewaysAnim || ASSET_KEYS.player.digUpSidewaysAnim, mineFeedback?.targetTile);
      flipX = flipXForUpSidewaysDirectionX(this, 1);
      postActionFacingFlipX = false;
    } else if (profile.isUalNative && aim === "DOWN-LEFT") {
      animKey = selectComboAnim(this, "down-side", aim, profile.digDownSidewaysHitAnims, profile.digDownAnim || ASSET_KEYS.player.digDownAnim, mineFeedback?.targetTile);
      flipX = flipXForSidewaysDigDirectionX(this, -1);
      postActionFacingFlipX = true;
    } else if (profile.isUalNative && aim === "DOWN-RIGHT") {
      animKey = selectComboAnim(this, "down-side", aim, profile.digDownSidewaysHitAnims, profile.digDownAnim || ASSET_KEYS.player.digDownAnim, mineFeedback?.targetTile);
      flipX = flipXForSidewaysDigDirectionX(this, 1);
      postActionFacingFlipX = false;
    } else if (aim === "LEFT" || aim === "DOWN-LEFT") {
      const selection = resolveComplexDigSelection(this, profile, "side", profile.digSidewaysHitAnims || ASSET_KEYS.player.digSidewaysHitAnims, profile.digSidewaysAnim || ASSET_KEYS.player.digSidewaysAnim);
      prewarmComplexDigSelection(this, selection);
      deferredFallbackAnimKey = selection.fallback;
      animKey = selectComboAnim(this, selection.family, aim, selection.animationKeys, selection.fallback, mineFeedback?.targetTile);
      flipX = flipXForSidewaysDigDirectionX(this, -1, animKey);
      postActionFacingFlipX = true;
    } else if (aim === "RIGHT" || aim === "DOWN-RIGHT") {
      const selection = resolveComplexDigSelection(this, profile, "side", profile.digSidewaysHitAnims || ASSET_KEYS.player.digSidewaysHitAnims, profile.digSidewaysAnim || ASSET_KEYS.player.digSidewaysAnim);
      prewarmComplexDigSelection(this, selection);
      deferredFallbackAnimKey = selection.fallback;
      animKey = selectComboAnim(this, selection.family, aim, selection.animationKeys, selection.fallback, mineFeedback?.targetTile);
      flipX = flipXForSidewaysDigDirectionX(this, 1, animKey);
      postActionFacingFlipX = false;
    } else if (aim === "UP") {
      const selection = resolveComplexDigSelection(this, profile, "up", profile.digUpHitAnims || ASSET_KEYS.player.digUpHitAnims, profile.digUpAnim || ASSET_KEYS.player.digUpAnim);
      deferredFallbackAnimKey = selection.fallback;
      animKey = selectComboAnim(this, selection.family, aim, selection.animationKeys, selection.fallback, mineFeedback?.targetTile);
      flipX = postActionFacingFlipX;
    } else if (aim === "DOWN") {
      animKey = selectComboAnim(this, "down", aim, profile.digDownHitAnims, profile.digDownAnim || ASSET_KEYS.player.digDownAnim, mineFeedback?.targetTile);
      if (profile.isUalNative) {
        flipX = postActionFacingFlipX;
      } else {
        this._digDownCount = (this._digDownCount || 0) + 1;
        flipX = (this._digDownCount % 2 === 0) ? !postActionFacingFlipX : postActionFacingFlipX;
      }
    }

    const stationaryAnimKey = animKey;
    const movingSideDig = resolveMovingSideDigAnimation({
      profile,
      animationKey: animKey,
      aim,
      actionKind,
      grounded: this.playerController?.isGrounded?.() === true,
      motionState: this.playerController?.getMotionState?.(),
      horizontalVelocity: this.playerController?.physicsBody?.vx
        ?? this.player?.body?.velocity?.x
        ?? 0,
      currentAnimationKey: activeActionKey,
      currentFrameIndex: this.player.anims.currentFrame?.index ?? 0,
      currentTextureFrame: Number(this.player.anims.currentFrame?.textureFrame),
    });
    animKey = movingSideDig.animationKey;
    const movingDiagonalDig = resolveMovingDiagonalDigAnimation({
      profile,
      animationKey: animKey,
      aim,
      actionKind,
      grounded: this.playerController?.isGrounded?.() === true,
      motionState: this.playerController?.getMotionState?.(),
      horizontalVelocity: this.playerController?.physicsBody?.vx
        ?? this.player?.body?.velocity?.x
        ?? 0,
      currentAnimationKey: activeActionKey,
      currentFrameIndex: this.player.anims.currentFrame?.index ?? 0,
      currentTextureFrame: Number(this.player.anims.currentFrame?.textureFrame),
    });
    animKey = movingDiagonalDig.animationKey;
    if (!this.anims.exists(animKey)) {
      const availableFallback = this.anims.exists(stationaryAnimKey)
        ? stationaryAnimKey
        : deferredFallbackAnimKey;
      animKey = this.playerDeferredAnimationAssetController?.resolveOrRequest?.(
        animKey,
        availableFallback,
      ) || availableFallback;
    }
    if (!this.anims.exists(animKey)) {
      const safeFallback = profile.digDownAnim || ASSET_KEYS.player.digDownAnim;
      this.playerDeferredAnimationAssetController?.ensureForAnimation?.(animKey);
      animKey = this.anims.exists(safeFallback) ? safeFallback : null;
    }
    this._ualMovingSideDigResumeJogFrame = movingDiagonalDig.resumeJogFrame
      ?? movingSideDig.resumeJogFrame;
    if (!animKey) {
      this.ualActionContactTimeline?.cancel();
      this.playerRigContact?.endAction();
      this.isDigAnimating = false;
      this._ualMiningActionKind = null;
      mineFeedback?.onContact?.({
        now: this.time?.now || 0,
        aim,
        targetTile: mineFeedback?.targetTile || null,
        trigger: "missing-animation-fallback",
      });
      return false;
    }
    const animation = this.anims.get(animKey);
    const frameCount = animation?.frames?.length || 1;
    const frameRate = animation?.frameRate || profile.digSidewaysAnimationFps || 30;
    const effectiveCooldownMs = this.digSystem?.getEffectiveCooldownMs?.(
      this.playerController?.abilities,
    ) || 0;
    const actionTimeScale = profile.isUalNative
      ? resolveUalActionTimeScale({
          frameCount, frameRate, effectiveCooldownMs, kind: actionKind,
          miningSpeedMultiplier: this.digSystem?.getMiningSpeedBoostMultiplier?.() || 1,
        })
      : 1;
    const contactSpec = profile.isUalNative
      ? resolveUalActionContact(profile, animKey, actionKind)
      : null;

    this.isDigAnimating = true;
    this._ualMiningActionKind = actionKind;
    this._ualActionContactAtMs = -Infinity;
    this._actionFlipX = flipX;
    this._postActionFacingFlipX = postActionFacingFlipX;
    if (!profile.immediateDigImpactFeedback && mineFeedback?.result) this.queueDigImpactFeedback(mineFeedback);
    this.player.setFlipX(flipX);
    const displaySize = resolvePlayerDisplaySizePx(
      profile,
      this.config.playerDisplaySizePx,
      animKey,
    );
    this.player.play(animKey, true);
    this.soundSystem?.playDigSwing?.();
    // Phaser keeps the previous frame's scale when a new atlas frame becomes
    // active. Apply authored geometry after play() so 256px <-> 192px sheet
    // handoffs cannot flash at 75% or 133% size for one rendered frame.
    this.player.setDisplaySize(displaySize, displaySize);

    if (profile.isUalNative) {
      this.player.setAngle(0);
      this.player.anims.timeScale = actionTimeScale;
    } else if (profile.preserveNativeActionCadence) {
      this.player.anims.timeScale = 1;
    } else if (this._gamefeelConfig && this.digSystem) {
      const baseCooldown = this._gamefeelConfig.animSpeed.baseCooldownMs;
      const effective = this.digSystem.getEffectiveCooldownMs();
      const mult = Math.min(baseCooldown / effective, this._gamefeelConfig.animSpeed.maxSpeedMultiplier);
      this.player.anims.timeScale = mult;
    }
    this.playerController?._syncSpriteWithPhysics?.();

    if (profile.isUalNative && contactSpec && this.ualActionContactTimeline) {
      const rigDirection = resolvePlayerTargetDirection(
        this.playerController?.physicsBody,
        this.config?.tileSize,
        mineFeedback?.targetTile,
      );
      this.playerRigContact?.beginAction({
        animationKey: animKey,
        contactSpec,
        targetTile: mineFeedback?.targetTile,
        direction: rigDirection,
      });
      if (
        movingSideDig.movingSideDigActive === true
        && animKey === movingSideDig.animationKey
      ) {
        this.playerController?.beginMovingSideDigStandOff?.({
          targetTile: mineFeedback?.targetTile,
          directionX: movingSideDig.targetDirectionX,
        });
      }
      const contactActionId = this.ualActionContactTimeline.begin({
        animationKey: animKey,
        contactFrame: contactSpec.textureFrame,
        contactSequenceIndex: contactSpec.sequenceIndex,
        contacts: contactSpec.contacts,
        onContact: (event) => {
          const contactNow = this.time?.now || 0;
          this._ualActionContactAtMs = contactNow;
          mineFeedback?.onContact?.({
            ...event,
            now: contactNow,
            aim,
            targetTile: mineFeedback?.targetTile || null,
          });
        },
        onComplete: () => this.playerRigContact?.endAction(),
      });
      // A long frame can advance past contact before the listener is armed.
      // Sample the already-current frame once so mining cannot stay latched
      // forever waiting for an animation event that has already happened.
      this.ualActionContactTimeline.handleAnimationUpdate(
        this.player.anims.currentAnim,
        this.player.anims.currentFrame,
        this.player,
      );
      const finalContactSpec = contactSpec.contacts?.[contactSpec.contacts.length - 1]
        || contactSpec;
      const contactPosition = finalContactSpec.sequenceIndex ?? finalContactSpec.textureFrame ?? 0;
      const contactFallbackDelayMs = Math.max(
        250,
        Math.ceil(((contactPosition + 1) / Math.max(1, frameRate) / Math.max(0.1, actionTimeScale)) * 1000) + 250,
      );
      globalThis.setTimeout?.(() => {
        if (this.gameState !== "playing" || this.scene?.isActive?.() === false) return;
        this.ualActionContactTimeline?.fireContactFallback(
          contactActionId,
          "wall-clock-contact-watchdog",
        );
      }, contactFallbackDelayMs);
    } else {
      mineFeedback?.onContact?.({
        now: this.time?.now || 0,
        aim,
        targetTile: mineFeedback?.targetTile || null,
        trigger: "immediate-fallback",
      });
    }
    if (profile.weaponPolicy !== "none") this.pickaxeTrailSystem?.start();
    return true;
  };

  prototype.updateLivingDrillVisualState = function(force = false) {
    if (!this.player || !isLivingDrill(this)) return;
    const profile = getP(this);
    const aim = this.playerController?.getAimLabel?.() || (this.playerController?.isFacingRight?.() ? "RIGHT" : "LEFT");
    const motionState = this.playerController?.getMotionState?.() || "idle";
    const isFlyingVisual = this.playerController?.abilities?.isFlying?.() === true || motionState === "airborne";
    const targetAnim = isFlyingVisual ? (profile.flyAnim || profile.idleAnim) : profile.idleAnim;
    const targetSheet = isFlyingVisual ? (profile.flySheet || profile.idleSheet) : profile.idleSheet;
    if (this.player.texture?.key !== targetSheet) this.player.setTexture(targetSheet);
    const useAim = aim === "UP" || aim === "DOWN" || this.isDigAnimating;
    const dir = useAim
      ? aimToDirection(aim, this.playerController?.isFacingRight?.() !== false)
      : aimToDirection(motionState === "walk-left" ? "LEFT" : motionState === "walk-right" ? "RIGHT" : null, this.playerController?.isFacingRight?.() !== false);
    this.player.setFlipX(dir.x > 0);
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
    this.player.setFlipX(direction.x > 0);
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
    this.player.setFlipX(direction.x > 0);
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

  prototype.prepareLivingDrillMineAttempt = function(aimTargetTile, aimOverride = null) {
    if (!isLivingDrill(this)) {
      return { allow: true, targetTile: aimTargetTile };
    }

    const engagement = this._livingDrillEngagement;
    if (!engagement || engagement.retracting) {
      return { allow: true, targetTile: aimTargetTile };
    }

    const aim = aimOverride || this.playerController?.getAimLabel?.();
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
    if (
      !GAME_CONFIG.debugMode
      || !isGameplayFeatureEnabled(
        GAMEPLAY_FEATURE_IDS.GOD_MODE,
        this.gameplayCapabilities,
      )
    ) return false;
    const requestedActive = this.upgradeSystem?.isGodModeActive?.() !== true;
    this.upgradeSystem?.setGodMode?.(requestedActive);
    const active = this.upgradeSystem?.isGodModeActive?.() === true;
    this.playerController?.abilities?.setGodMode?.(active);

    if (active) {
      this.digSystem?.setResourceTotals?.({
        ...GOD_MODE_CONFIG.activationGrant.resourceTotals,
      });
      this.upgradeSystem?.addMoney?.(GOD_MODE_CONFIG.activationGrant.money);
      this.upgradeSystem?.grantUpgrade?.("worldTwoTunnelAccess");
      this.upgradeSystem?.grantUpgrade?.(ARC_CORE_UPGRADE_ID);
      this.upgradeSystem?.grantUpgrade?.(OMEGA_ARC_CORE_UPGRADE_ID);
    }

    this.starHeartProgressionSystem?.refreshGodMode?.();
    this.celestialActionBarSystem?.sync?.();
    this.surfaceTunnelDoorSystem?.syncFromUpgrade?.(active);
    this.arcCoreVehicleSystem?.syncOwnership?.();
    this.uiResourceBar?.setResources?.(this.digSystem?.getResourceTotals?.());
    this.uiResourceBar?.setMoney?.(this.upgradeSystem?.getMoney?.());
    this.uiInventoryPopup?.setResources?.(this.digSystem?.getResourceTotals?.());
    this.uiInventoryPopup?.setMoney?.(this.upgradeSystem?.getMoney?.());
    this.hudSystem?.flashStatus?.(
      active
        ? GOD_MODE_CONFIG.presentation.enabledText
        : GOD_MODE_CONFIG.presentation.disabledText,
      GOD_MODE_CONFIG.presentation.color,
      GOD_MODE_CONFIG.presentation.durationMs,
    );
    console.log(`[GOD MODE] ${active ? "enabled" : "disabled"}`);
    return true;
  };
  prototype.playTeleportInAnimation = function() {
    const profile = getP(this);
    const animationKey = profile.teleportInAnim;
    if (!this.player || !this.playerDeferredAnimationAssetController?.isReadyOrRequest(animationKey)) return false;
    this.ualActionContactTimeline?.cancel();
    this.playerRigContact?.endAction();
    this.isDigAnimating = false;
    this._thunderStrikeAnimating = false;
    this._thunderStrikePhase = null;
    this._thunderStrikeHoldUntil = null;
    this._thunderStrikeFacingFlipX = null;
    this._teleportInAnimating = true;
    this._ualMovingSideDigResumeJogFrame = null;
    this._actionFlipX = null;
    this._postActionFacingFlipX = null;
    this._combatIdleFlipX = null;
    this._combatIdleRecoverUntilMs = 0;
    this._combatIdleReturnActive = false;
    this._combatIdleReturnPlayed = true;
    this.player.anims.timeScale = 1;
    this.player.setAngle(0);
    this.player.setFlipX(false);
    this.ualLocomotionTransitionSelector?.reset({
      grounded: this.playerController?.isGrounded?.() !== false,
      flying: this.playerController?.abilities?.isFlying?.() === true,
      facingFlipX: false,
    });
    const displaySize = profile.teleportInDisplaySizePx || resolvePlayerDisplaySizePx(
      profile,
      this.config.playerDisplaySizePx,
      animationKey,
    );
    this.player.play(animationKey, true);
    this.player.setDisplaySize(displaySize, displaySize);
    this.playerController?._syncSpriteWithPhysics?.();
    this.pickaxeTrailSystem?.stop();
    return true;
  };

  prototype.playPlayerImpactReaction = function() {
    const now = this.time?.now || 0;
    if (!this.playerMotionPolish?.queueImpactReaction?.(now)) return false;
    if (!this.isDigAnimating && !this._teleportInAnimating) {
      this.updatePlayerVisualState(true);
    }
    return true;
  };

  prototype.updatePlayerVisualState = function(force = false) {
    if (this._isShuttingDown || !this.player?.anims || !this.playerController) {
      return false;
    }
    if (this.isDigAnimating || this._teleportInAnimating) {
      this.playerMotionPolish?.interruptForAction?.(this.time?.now || 0);
      return;
    }
    if (isLivingDrill(this)) {
      this.updateLivingDrillVisualState(force);
      return;
    }
    const profile = getP(this);
    const ledgeVisual = this.playerController.getLedgeVisualState?.() || null;
    const motionState = this.playerController.getMotionState();
    const traversalBody = this.playerController?.physicsBody;
    if (
      profile.ledgeAssistEnabled
      && !ledgeVisual
      && motionState === "airborne"
      && Number(traversalBody?.vy) > 0
    ) {
      void this.playerDeferredAnimationAssetController
        ?.ensureForAnimation?.(profile.ledgeCatchAnim);
    }
    const aimLabel = this.playerController.getAimLabel();
    const currentRuntimeAnimKey = this.player.anims.currentAnim?.key ?? null;
    const currentAnimKey = resolveHeldTorchBaseAnimationKey(profile, currentRuntimeAnimKey);
    const currentWalkAnim = (profile.walkAnims || ASSET_KEYS.player.walkAnims).includes(currentAnimKey);
    const currentMovingWalkAnim = (profile.walkMovingAnims || ASSET_KEYS.player.walkMovingAnims).includes(currentAnimKey);
    const currentWalkStopAnim = currentAnimKey === (profile.walkStopAnim || ASSET_KEYS.player.walkStopAnim);
    let targetAnim = profile.idleAnim || ASSET_KEYS.player.idleAnim;
    let flipX = false;
    let isWalking = false;
    let flightTravelVisual = false;
    let locomotionSelection = null;
    const now = this.time?.now || 0;
    const poweredFlight = this.playerController.abilities?.isFlying?.() === true;
    if (!poweredFlight) this._ualFlightTravelVisual = false;
    const verticalAim = this.playerController.getVerticalAim?.() || { up: false, down: false };
    const forcedCrouchVisual = this.playerController.requiresCrouchVisual?.() === true;
    const wallBlocked = isWalkingIntoBlockedSide(this, motionState);
    let combatRecoverUntil = this._combatIdleRecoverUntilMs || 0;
    let combatRecoverActive = combatRecoverUntil > now;
    let combatReturnActive = this._combatIdleReturnActive === true;
    let combatReturnDue = combatRecoverUntil > 0
      && !combatRecoverActive
      && this._combatIdleReturnPlayed !== true;
    const idleAnimationKey = profile.idleAnim || ASSET_KEYS.player.idleAnim;
    const combatReturnAnimationKey = profile.combatIdleToNormalIdleAnim
      || ASSET_KEYS.player.combatIdleToNormalIdleAnim
      || idleAnimationKey;
    if (combatReturnDue && combatReturnAnimationKey === idleAnimationKey) {
      this._combatIdleRecoverUntilMs = 0;
      this._combatIdleReturnActive = false;
      this._combatIdleReturnPlayed = true;
      this._combatIdleFlipX = null;
      combatRecoverUntil = 0;
      combatRecoverActive = false;
      combatReturnActive = false;
      combatReturnDue = false;
    }
    const specialIdleVisual = forcedCrouchVisual || (motionState === "idle" && (
      verticalAim.down
      || (verticalAim.up && isUpAim(aimLabel))
      || combatRecoverActive
      || combatReturnActive
      || combatReturnDue
    ));
    const idleFidgetAllowed = motionState === "idle"
      && !combatRecoverActive
      && !combatReturnActive
      && !combatReturnDue;
    const ledgeOverride = ledgeVisual && profile.ledgeAssistEnabled
      ? {
        animationKey: ledgeVisual.phase === "climb"
          ? profile.ledgeClimbAnim
          : ledgeVisual.phase === "catch"
            ? profile.ledgeCatchAnim
          : profile.ledgeHangAnim,
        flipX: ledgeVisual.direction < 0
          ? profile.ledgeSourceFacesRight === true
          : profile.ledgeSourceFacesRight !== true,
      }
      : null;
    const motionOverride = ledgeOverride || this.playerMotionPolish?.resolveOverride?.({
      now,
      motionState,
      grounded: this.playerController.isGrounded(),
      verticalAim,
      wallBlocked,
      wallFlipX: motionState === "walk-left",
      facingFlipX: !this.playerController.isFacingRight(),
      idleFidgetAllowed,
      actionLocked: false,
      currentAnimationKey: currentAnimKey,
      isPlaying: this.player.anims.isPlaying === true,
    }) || null;
    const wallRunResumeFrame = this.playerMotionPolish?.consumeWallRunResumeFrame?.();
    if (Number.isFinite(wallRunResumeFrame)) {
      this.ualLocomotionTransitionSelector?.requestRunResume(wallRunResumeFrame);
    }


    if (motionOverride) {
      targetAnim = motionOverride.animationKey;
      flipX = motionOverride.flipX;
    } else if (
      profile.isUalNative
      && this.ualLocomotionTransitionSelector
      && !wallBlocked
      && !specialIdleVisual
    ) {
      const body = this.playerController?.physicsBody;
      const horizontalVelocity = this.playerKinematicMotion?.getResolvedVelocityX?.()
        ?? body?.vx
        ?? 0;
      const resolvedVerticalVelocity = this.playerKinematicMotion?.getResolvedVelocityY?.()
        ?? body?.vy
        ?? 0;
      const bodyVerticalVelocity = body?.vy || 0;
      const verticalVelocity = Math.abs(bodyVerticalVelocity) > Math.abs(resolvedVerticalVelocity)
        ? bodyVerticalVelocity
        : resolvedVerticalVelocity;
      locomotionSelection = this.ualLocomotionTransitionSelector.resolve({
        grounded: this.playerController.isGrounded(),
        flying: poweredFlight,
        running: this.playerController.isRunning?.() === true,
        horizontalVelocity,
        verticalVelocity,
        currentAnimationKey: currentAnimKey,
        isPlaying: this.player.anims.isPlaying,
        currentFrameIndex: this.player.anims.currentFrame?.index ?? 0,
        currentTextureFrame: Number(this.player.anims.currentFrame?.textureFrame),
        facingFlipX: !this.playerController.isFacingRight(),
      });
      targetAnim = locomotionSelection.animationKey;
      flipX = locomotionSelection.facingFlipX;
      isWalking = (profile.walkAnims || []).includes(targetAnim);
      flightTravelVisual = locomotionSelection.phase === "flight-travel-enter"
        || locomotionSelection.phase === "flight-travel-loop";
      this._ualFlightTravelVisual = flightTravelVisual;
    } else if (poweredFlight) {
      const body = this.playerController?.physicsBody;
      const horizontalSpeed = this.playerKinematicMotion?.getHorizontalSpeedPxPerSec?.()
        ?? Math.abs(body?.vx || 0);
      const verticalSpeed = this.playerKinematicMotion?.getVerticalSpeedPxPerSec?.()
        ?? Math.abs(body?.vy || 0);
      flightTravelVisual = resolveUalFlightTravel({
        horizontalSpeedPxPerSec: horizontalSpeed,
        verticalSpeedPxPerSec: verticalSpeed,
        wasTraveling: this._ualFlightTravelVisual === true,
      });
      this._ualFlightTravelVisual = flightTravelVisual;
      targetAnim = flightTravelVisual
        ? (profile.flyAnim || ASSET_KEYS.player.flyAnim)
        : (profile.flyAnim || ASSET_KEYS.player.flyAnim || profile.idleAnim || ASSET_KEYS.player.idleAnim);
      flipX = !this.playerController.isFacingRight();
    } else if (motionState === "airborne") {
      targetAnim = isFallingDownward(this) ? (profile.fallingAnim || ASSET_KEYS.player.fallingAnim) : (profile.airborneAnim || ASSET_KEYS.player.airborneAnim);
      flipX = !this.playerController.isFacingRight();
    } else if (wallBlocked) {
      targetAnim = profile.idleAnim || ASSET_KEYS.player.idleAnim;
      flipX = motionState === "walk-left";
    } else if (motionState === "walk-left") {
      isWalking = true;
      targetAnim = profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim;
      flipX = true;
      this._combatIdleFlipX = true;
    } else if (motionState === "walk-right") {
      isWalking = true;
      targetAnim = profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim;
      flipX = false;
      this._combatIdleFlipX = false;
    } else if (motionState === "idle") {
      const useCombatFlip = typeof this._combatIdleFlipX === "boolean"
        && (combatRecoverActive || combatReturnActive || combatReturnDue);
      targetAnim = this.playerController.isGrounded() && (verticalAim.down || forcedCrouchVisual)
        ? (profile.duckAnim || ASSET_KEYS.player.duckAnim)
        : (combatReturnActive || combatReturnDue)
          ? (profile.combatIdleToNormalIdleAnim || ASSET_KEYS.player.combatIdleToNormalIdleAnim || profile.idleAnim || ASSET_KEYS.player.idleAnim)
          : verticalAim.up && isUpAim(aimLabel)
        ? (profile.digUpLookAnim || ASSET_KEYS.player.digUpLookAnim)
        : combatRecoverActive
          ? (profile.combatIdleRecoverAnim || ASSET_KEYS.player.combatIdleRecoverAnim)
          : (profile.idleAnim || ASSET_KEYS.player.idleAnim);
      if (combatReturnDue && targetAnim !== (profile.idleAnim || ASSET_KEYS.player.idleAnim)) {
        this._combatIdleRecoverUntilMs = 0;
        this._combatIdleReturnActive = true;
      }
      if (useCombatFlip) { flipX = this._combatIdleFlipX; }
      else if (aimLabel === "UP-LEFT") { flipX = flipXForUpSidewaysDirectionX(this, -1); }
      else if (aimLabel === "UP-RIGHT") { flipX = flipXForUpSidewaysDirectionX(this, 1); }
      else { flipX = !this.playerController.isFacingRight(); }
      if (!useCombatFlip && !combatRecoverActive && !combatReturnActive && !combatReturnDue) {
        this._combatIdleFlipX = null;
      }
    }

    if (motionOverride) {
      this.player.anims.timeScale = 1.0;
    } else if (locomotionSelection) {
      if (Number.isFinite(locomotionSelection.timeScale)) {
        this.player.anims.timeScale = locomotionSelection.timeScale;
      } else if (isWalking) {
        const body = this.playerController?.physicsBody;
        this._applyWalkAnimationTimeScale(targetAnim, Math.abs(body?.vx || 0));
      } else {
        const body = this.playerController?.physicsBody;
        const flightActive = poweredFlight;
        const kinematicSpeed = this.playerKinematicMotion?.getTravelSpeedPxPerSec?.();
        this.player.anims.timeScale = flightActive
          ? resolveUalFlightTimeScale(
            Number.isFinite(kinematicSpeed) ? kinematicSpeed : Math.hypot(body?.vx || 0, body?.vy || 0),
            flightTravelVisual,
          )
          : 1.0;
      }
    } else if (isWalking) {
      if (currentAnimKey === (profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim) && this.player.anims.isPlaying && !force) {
        targetAnim = profile.walkStartAnim || ASSET_KEYS.player.walkStartAnim;
      } else if (currentMovingWalkAnim && !force) {
        targetAnim = this._getMovingWalkLoopAnim();
      }
      this._applyWalkAnimationTimeScale(targetAnim);
    } else {
      const shouldWindDown = !force && currentWalkAnim && !currentWalkStopAnim && isIdleLikeMotionState(motionState);
      if (shouldWindDown) {
        targetAnim = profile.walkStopAnim || ASSET_KEYS.player.walkStopAnim;
      } else if (currentWalkStopAnim && this.player.anims.isPlaying && !force && isIdleLikeMotionState(motionState)) {
        targetAnim = profile.walkStopAnim || ASSET_KEYS.player.walkStopAnim;
      } else {
        const body = this.playerController?.physicsBody;
        const kinematicSpeed = this.playerKinematicMotion?.getTravelSpeedPxPerSec?.();
        this.player.anims.timeScale = poweredFlight
          ? resolveUalFlightTimeScale(
            Number.isFinite(kinematicSpeed) ? kinematicSpeed : Math.hypot(body?.vx || 0, body?.vy || 0),
            flightTravelVisual,
          )
          : 1.0;
      }
    }

    const duckAnim = profile.duckAnim || ASSET_KEYS.player.duckAnim;
    const crouchEnterAnim = profile.crouchEnterAnim || null;
    const crouchExitAnim = profile.crouchExitAnim || null;
    if (!ledgeVisual && forcedCrouchVisual) {
      targetAnim = duckAnim;
      isWalking = false;
      flipX = !this.playerController.isFacingRight();
    }
    const wantsCrouch = targetAnim === duckAnim;
    if (!ledgeVisual) {
      const crouchTransitionAnim = resolveUalCrouchTransitionAnimation({
        wantsCrouch,
        currentAnimationKey: currentAnimKey,
        isPlaying: this.player.anims.isPlaying === true,
        crouchIdleAnimationKey: duckAnim,
        crouchEnterAnimationKey: crouchEnterAnim,
        crouchExitAnimationKey: crouchExitAnim,
      });
      if (crouchTransitionAnim && crouchTransitionAnim !== targetAnim) {
        targetAnim = crouchTransitionAnim;
        locomotionSelection = null;
        this.player.anims.timeScale = 1.0;
      }
    }
    if (targetAnim === duckAnim && profile.duckSourceFacesRight === false) {
      // Legacy Miner duck frames are authored facing left while the standing
      // frames face right. Invert only once the duck animation is actually
      // selected, so a preceding walk-stop keeps its normal orientation.
      flipX = !flipX;
    }

    const baseTargetAnim = targetAnim;
    targetAnim = resolveHeldTorchAnimationKey(
      profile,
      baseTargetAnim,
      this.lightSystem?.isTorchActive?.() === true,
    );
    const requestedTargetAnim = targetAnim;
    targetAnim = this.playerDeferredAnimationAssetController.resolveOrRequest(
      requestedTargetAnim,
      profile.idleAnim || ASSET_KEYS.player.idleAnim,
    );
    if (targetAnim !== requestedTargetAnim) {
      locomotionSelection = null;
      this.player.anims.timeScale = 1.0;
    }
    this.player.setFlipX(flipX);
    if (profile.isUalNative && ledgeVisual) {
      this.player.setAngle(0);
    } else if (profile.isUalNative) {
      const body = this.playerController?.physicsBody;
      const horizontalVelocity = this.playerKinematicMotion?.getResolvedVelocityX?.()
        ?? body?.vx
        ?? 0;
      const flightActive = poweredFlight;
      const flightMotion = this.playerController?.flightMotion?.getSnapshot?.();
      const targetAngle = flightActive
        ? resolveUalFlightPoseAngle({
          horizontalVelocityPxPerSec: horizontalVelocity,
          verticalVelocityPxPerSec: body?.vy || 0,
          verticalAccelerationPxPerSecondSquared: flightMotion?.accelerationY,
          facingFlipX: flipX,
        })
        : 0;
      const currentAngle = Number(this.player.angle) || 0;
      const bankAlpha = resolveUalFlightBankAlpha(this.game?.loop?.delta);
      this.player.setAngle(currentAngle + (targetAngle - currentAngle) * bankAlpha);
    }
    const oneShotHoldAnims = [
      duckAnim,
      crouchEnterAnim,
      crouchExitAnim,
      profile.ledgeCatchAnim,
      profile.ledgeHangAnim,
      profile.ledgeClimbAnim,
      profile.fallingAnim || ASSET_KEYS.player.fallingAnim,
      profile.wallPushAnim || ASSET_KEYS.player.wallPushAnim,
      profile.leanAgainstWallAnim || ASSET_KEYS.player.leanAgainstWallAnim,
      ...(this.playerMotionPolish?.oneShotAnimationKeys || []),
    ];
    const shouldHoldCompletedOneShot = (
      !force || motionOverride?.holdCompleted === true
    )
      && currentRuntimeAnimKey === targetAnim
      && !this.player.anims.isPlaying
      && (
        oneShotHoldAnims.includes(baseTargetAnim)
        || motionOverride?.holdCompleted === true
      );
    const displaySize = resolvePlayerDisplaySizePx(
      profile,
      this.config.playerDisplaySizePx,
      targetAnim,
    );
    if (!shouldHoldCompletedOneShot) {
      const startFrame = locomotionSelection?.animationKey === baseTargetAnim
        && Number.isFinite(locomotionSelection.startFrame)
        ? locomotionSelection.startFrame
        : 0;
      const restartRequested = (
        locomotionSelection?.animationKey === baseTargetAnim
        && locomotionSelection.restart === true
      ) || (
        motionOverride?.animationKey === baseTargetAnim
        && motionOverride.restart === true
      );
      const ignoreIfPlaying = restartRequested ? false : !force;
      this.player.play(targetAnim, ignoreIfPlaying, startFrame);
    }
    // Always size from the frame that play() actually selected. This is also
    // required for completed one-shots, where no new play call is made.
    this.player.setDisplaySize(displaySize, displaySize);
    if (!motionOverride && baseTargetAnim === (profile.idleAnim || ASSET_KEYS.player.idleAnim) && motionState === "idle") {
      this.player.anims.timeScale = this.playerMotionPolish?.getIdleTimeScale?.(now) ?? 1.0;
    }
    this.playerController._syncSpriteWithPhysics?.();
    this._lastPlayedAnim = targetAnim;
  };

  prototype._applyMineShake = function(result) {
    if (!result?.success || !this._gamefeelConfig) return;
    if (this.game.loop.actualFps < this._gamefeelConfig.shake.minFps) return;
    const tileType = result.typeBeforeDamage ?? result.tileType ?? null;
    const signature = getMineShakeSignature(tileType);
    const material = getMaterialFeedback(tileType);
    const intensityScale = (result.destroyed ? 1 : 0.65) * (material.shakeScale || 1);
    this.shakeSystem?.shake(signature, intensityScale);
  };

  prototype._applyDestroyParticles = function(worldX, worldY, tileType) {
    if (!this._gamefeelConfig) return;
    const material = getMaterialFeedback(tileType);
    if (material.glint) this._applyGlintBurst?.(worldX, worldY, material.glintColor);
    this.tileDestructionFxSystem?.play({
      worldX,
      worldY,
      tileType,
    });
  };

  // Precious-material sparkle burst (gold/silver/sky) — small rising glints
  prototype._applyGlintBurst = function(worldX, worldY, color) {
    const g = GLINT_CONFIG;
    if (!this._activeParticleChips) this._activeParticleChips = [];
    for (let i = 0; i < g.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = g.distMin + Math.random() * (g.distMax - g.distMin);
      const px = worldX + Math.cos(angle) * dist;
      const py = worldY + Math.sin(angle) * dist;
      const size = g.sizeMin + Math.random() * (g.sizeMax - g.sizeMin);
      const spark = this.add.star(px, py, 4, size * 0.45, size, color, 1);
      spark.setDepth(g.depth);
      spark.setBlendMode(Phaser.BlendModes.ADD);
      this._activeParticleChips.push(spark);
      this.tweens.add({
        targets: spark,
        y: py - (g.riseMin + Math.random() * (g.riseMax - g.riseMin)),
        angle: 90 + Math.random() * 180,
        alpha: 0,
        scale: 0.2,
        duration: g.durationMin + Math.random() * (g.durationMax - g.durationMin),
        ease: 'Sine.easeOut',
        onComplete: () => {
          const idx = this._activeParticleChips.indexOf(spark);
          if (idx !== -1) this._activeParticleChips.splice(idx, 1);
          spark.destroy();
        },
      });
    }
  };
}
