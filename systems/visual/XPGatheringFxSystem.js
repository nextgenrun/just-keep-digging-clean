import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { REWARD_FLIGHT_CHANNELS } from "../../values/rewardFlightMotions.js";
import { XP_GATHERING_CONFIG } from "../../values/xpGathering.js";
import { isNearXpViewport, isXpGatheringEnabled, resolveXpGatheringIconId, resolveXpGatheringVariation, resolveXpRewardEntry, resolveXpSourceColor, worldToScreen } from "./XPGatheringFxMath.js";
import { XPGatheringFlightView } from "./XPGatheringFlightView.js";
import { RewardFlightMotionSystem } from "./RewardFlightMotionSystem.js";
export class XPGatheringFxSystem {
  constructor(scene, targetProvider, motionProvider = null) {
    this.scene = scene;
    this.targetProvider = targetProvider;
    const sharedMotionProvider = motionProvider || scene?.rewardFlightMotionSystem;
    this.motionProvider = sharedMotionProvider || new RewardFlightMotionSystem();
    this.ownsMotionProvider = !sharedMotionProvider;
    this.pending = []; this.activeSprites = []; this.activeLabels = [];
    this.iconSequence = 0; this.recentIconIds = [];
    this.flushTimer = null; this.destroyed = false;
    this.flightView = new XPGatheringFlightView(scene, {
      addImage: (...args) => this._addImage(...args),
      removeSprite: sprite => this._removeSprite(sprite),
    });
  }
  queueGain(entry = {}) {
    const xpGained = Math.max(0, Number(entry.xpGained) || 0);
    if (this.destroyed || !isXpGatheringEnabled(this.scene) || xpGained <= 0) return;
    if (!Number.isFinite(entry.worldX) || !Number.isFinite(entry.worldY)) return;
    const screen = worldToScreen(this.scene, entry.worldX, entry.worldY);
    if (!isNearXpViewport(this.scene, screen)) return;
    this.pending.push({ ...entry, xpGained, screen });
    if (this.flushTimer) return;
    this.flushTimer = this.scene.time.delayedCall(
      XP_GATHERING_CONFIG.pickup.coalesceWindowMs,
      () => this._flush(),
    );
  }
  queueReward(reward, targetTile, overrides = {}) {
    const entry = resolveXpRewardEntry(this.scene, reward, targetTile, overrides);
    if (entry) this.queueGain(entry);
  }
  _flush() {
    this.flushTimer = null;
    const entries = this.pending.splice(0);
    if (this.destroyed || entries.length === 0) return;
    const variationId = resolveXpGatheringVariation(entries);
    const profile = XP_GATHERING_CONFIG.pickup.variations[variationId];
    const origin = entries.reduce((sum, entry) => ({
      x: sum.x + entry.screen.x / entries.length,
      y: sum.y + entry.screen.y / entries.length,
    }), { x: 0, y: 0 });
    const sourceColors = [...new Set(entries.map(entry => resolveXpSourceColor(this.scene, entry)))];
    const xpGained = entries.reduce((sum, entry) => sum + entry.xpGained, 0);
    const iconIds = this._selectIconIds(variationId, entries, profile.pickupCount);
    this.lastVariationId = variationId;
    this.lastIconIds = [...iconIds];
    const target = this.targetProvider?.getGatheringTarget?.(variationId)
      || this._fallbackTarget();
    this._spawnSourceFlecks(
      origin,
      sourceColors,
      profile.particleCount,
      ASSET_KEYS.ui.xpGathering[iconIds[0]],
    );
    for (let index = 0; index < profile.pickupCount; index += 1) {
      this._spawnPickup({
        origin,
        sourceColor: sourceColors[index % sourceColors.length],
        rewardEntry: entries[index % entries.length],
        variationId,
        profile,
        index,
        xpGained,
        iconId: iconIds[index],
        target,
      });
    }
  }
  _selectIconIds(variationId, entries, count) {
    const selected = [];
    for (let index = 0; index < count; index += 1) {
      const iconId = resolveXpGatheringIconId(
        variationId,
        entries,
        index,
        this.iconSequence,
        this.recentIconIds,
      );
      this.iconSequence += 1;
      this.recentIconIds.push(iconId);
      if (this.recentIconIds.length > XP_GATHERING_CONFIG.iconSelection.recentWindow) {
        this.recentIconIds.shift();
      }
      selected.push(iconId);
    }
    return selected;
  }
  _spawnPickup({ origin, sourceColor, rewardEntry, variationId, profile, index, xpGained, iconId, target }) {
    const pickup = XP_GATHERING_CONFIG.pickup;
    const iconKey = ASSET_KEYS.ui.xpGathering[iconId];
    const offsetX = pickup.spawnOffsetsPx[index % pickup.spawnOffsetsPx.length];
    const sprite = this._addImage(origin.x + offsetX, origin.y, iconKey, true);
    if (!sprite) return;
    const opticalScale = XP_GATHERING_CONFIG.iconScaleById[iconId] || 1;
    const displaySize = pickup.displaySizePx * profile.sizeMultiplier * opticalScale;
    sprite.setDisplaySize(displaySize, displaySize);
    const baseScaleX = sprite.scaleX;
    const baseScaleY = sprite.scaleY;
    sprite
      .setAlpha(0)
      .setScale(baseScaleX * pickup.popStartScale, baseScaleY * pickup.popStartScale)
      .setRotation((index % 2 === 0 ? -1 : 1) * pickup.popRotationRadians);
    this.scene.tweens.add({
      targets: sprite,
      alpha: profile.alpha,
      y: sprite.y - pickup.popRisePx,
      scaleX: baseScaleX * pickup.popEndScale,
      scaleY: baseScaleY * pickup.popEndScale,
      delay: index * pickup.staggerMs,
      duration: pickup.popDurationMs,
      ease: pickup.popEase,
      onComplete: () => this._flyToBar({
        sprite,
        sourceColor,
        rewardEntry,
        variationId,
        profile,
        index,
        pickupCount: profile.pickupCount,
        xpGained,
        baseScaleX,
        baseScaleY,
        target,
      }),
    });
  }
  _flyToBar(details) {
    const { sprite, profile, index, pickupCount } = details;
    if (!sprite?.active) return;
    const target = details.target;
    const startX = sprite.x;
    const startY = sprite.y;
    const rewardEntry = details.rewardEntry || {};
    const motionPlan = this.motionProvider.createPlan({
      channel: REWARD_FLIGHT_CHANNELS.xp,
      start: { x: startX, y: startY },
      target,
      resourceType: rewardEntry.resourceType,
      skyTileRarity: rewardEntry.skyTileRarity,
      xpGained: details.xpGained,
      special: profile.soundSpecial,
      levelUp: details.variationId === "levelUp",
      index,
      count: pickupCount,
    });
    if (!motionPlan) { this._removeSprite(sprite); return; }
    this.lastMotionProfileId = motionPlan.profileId;
    this.flightView.animate({
      ...details,
      target,
      motionPlan,
      isFinalPickup: index === pickupCount - 1,
      onFinalArrival: arrivalTarget => this._arrive(arrivalTarget, details),
    });
  }

  _spawnSourceFlecks(origin, colors, count, key) {
    const particles = XP_GATHERING_CONFIG.pickup.particles;
    for (let index = 0; index < count; index += 1) {
      const angle = particles.sourceAngleStartRadians + index * particles.sourceAngleStepRadians;
      const color = colors[index % colors.length];
      const fleck = this._addImage(origin.x, origin.y, key, false);
      if (!fleck) continue;
      fleck.setDisplaySize(particles.sourceDisplaySizePx, particles.sourceDisplaySizePx)
        .setTintFill(color).setAlpha(particles.sourceAlpha);
      this.scene.tweens.add({
        targets: fleck,
        x: origin.x + Math.cos(angle) * (particles.sourceDistanceBasePx + index * particles.sourceDistanceStepPx),
        y: origin.y + Math.sin(angle) * (particles.sourceDistanceBasePx + index * particles.sourceDistanceStepPx),
        alpha: 0,
        duration: particles.sourceDurationBaseMs + index * particles.sourceDurationStepMs,
        ease: particles.sourceEase,
        onComplete: () => this._removeSprite(fleck),
      });
    }
  }

  _arrive(target, details) {
    this.targetProvider?.pulseGatheringTarget?.(
      details.profile.pulseStrength,
      details.variationId,
      target.segmentIndex,
    );
    if (details.profile.showLabel) this._showGainLabel(target, details.xpGained);
    this.scene.soundSystem?.playXpGather?.({
      special: details.profile.soundSpecial,
      levelUp: details.variationId === "levelUp",
      segmentIndex: target.segmentIndex || 0,
    });
  }

  _showGainLabel(target, xpGained) {
    const config = XP_GATHERING_CONFIG.gainText;
    const text = this.scene.add.text(
      target.x,
      target.y - config.startOffsetYPx,
      `+${Math.round(xpGained).toLocaleString()} XP`,
      {
        fontFamily: config.fontFamily,
        fontSize: `${config.fontSizePx}px`,
        fontStyle: config.fontStyle,
        color: config.color,
        stroke: config.stroke,
        strokeThickness: config.strokeThickness,
      },
    ).setOrigin(0.5, 1).setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + 63)
      .setAlpha(0)
      .setScale(config.startScale);
    this.activeLabels.push(text);
    this.scene.tweens.add({
      targets: text,
      alpha: config.maxAlpha,
      scaleX: 1,
      scaleY: 1,
      duration: config.durationMs * config.fadeInRatio,
      ease: "Sine.easeOut",
    });
    this.scene.tweens.add({
      targets: text,
      y: text.y - config.risePx,
      alpha: 0,
      delay: config.durationMs * config.fadeOutStartRatio,
      duration: config.durationMs * (1 - config.fadeOutStartRatio),
      ease: config.ease,
      onComplete: () => this._removeLabel(text),
    });
  }

  _addImage(x, y, key, evictOldest) {
    const max = XP_GATHERING_CONFIG.pickup.maxActiveSprites;
    if (this.activeSprites.length >= max) {
      if (!evictOldest) return null;
      this._removeSprite(this.activeSprites[0]);
    }
    if (!this.scene.textures.exists(key)) return null;
    const sprite = this.scene.add.image(x, y, key)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + 62);
    this.activeSprites.push(sprite);
    return sprite;
  }

  _fallbackTarget() {
    return {
      x: (this.scene.scale?.width || 1280) / 2,
      y: (this.scene.scale?.height || 720) - 34,
      segmentIndex: 0,
    };
  }
  _removeSprite(sprite) {
    if (!sprite) return;
    if (sprite._xpTravelState) this.scene.tweens.killTweensOf(sprite._xpTravelState);
    this.scene.tweens.killTweensOf(sprite);
    const index = this.activeSprites.indexOf(sprite);
    if (index !== -1) this.activeSprites.splice(index, 1);
    sprite.destroy();
  }

  _removeLabel(label) {
    if (!label) return;
    this.scene.tweens.killTweensOf(label);
    const index = this.activeLabels.indexOf(label);
    if (index !== -1) this.activeLabels.splice(index, 1);
    label.destroy();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.flushTimer?.remove?.();
    this.flushTimer = null;
    this.pending = [];
    [...this.activeSprites].forEach(sprite => this._removeSprite(sprite));
    [...this.activeLabels].forEach(label => this._removeLabel(label));
    if (this.ownsMotionProvider) this.motionProvider.destroy();
  }
}
