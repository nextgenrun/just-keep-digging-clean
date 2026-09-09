import { GAME_CONFIG } from "../../values/gameConfig.js";
import {
  LOOT_PICKUP_PRESENTATION,
  resolveLootPickupMoment,
} from "../../values/lootPickupPresentation.js";
import { REWARD_FLIGHT_CHANNELS } from "../../values/rewardFlightMotions.js";
import { LootPickupFlightView } from "./LootPickupFlightView.js";
import { lootPickupUnit, normalizeLootPickupDescriptor } from "./LootPickupFxMath.js";
import { RewardFlightMotionSystem } from "./RewardFlightMotionSystem.js";
import { RewardPickupVisualResolver } from "./RewardPickupVisualResolver.js";
import { rememberRewardPickupVisual } from "./RewardPickupContinuityState.js";

function isLootVisualsEnabled(scene) {
  const config = scene?.config || GAME_CONFIG;
  if (config.lootVisuals === false) return false;
  if (config.featureFlags?.lootVisuals === false) return false;
  return config.featureFlags?.["loot-visuals"] !== false;
}
export class LootPickupFxSystem {
  constructor(scene, targetProvider = null, motionProvider = null, visualResolver = null) {
    this.scene = scene;
    this.targetProvider = targetProvider;
    const sharedMotionProvider = motionProvider || scene?.rewardFlightMotionSystem;
    this.motionProvider = sharedMotionProvider || new RewardFlightMotionSystem();
    this.ownsMotionProvider = !sharedMotionProvider;
    this.visualResolver = visualResolver || new RewardPickupVisualResolver(scene);
    this.activeFlights = [];
    this.activeSprites = this.activeFlights;
    this.maxActiveSprites = LOOT_PICKUP_PRESENTATION.limits.maxActiveFlights;
    this.eventSequence = 0;
    this.recentTelemetry = [];
    this._destroyed = false;
    this.flightView = new LootPickupFlightView(scene, {
      removeFlight: this._removeFlight.bind(this),
    });
  }

  showResourcePickup({
    worldX,
    worldY,
    resourceType,
    amount = 1,
    tileX = null,
    tileY = null,
    isSkyTileBonus = false,
    isStarResource = false,
    skyTileRarity = null,
  } = {}) {
    if (!this._canShow(worldX, worldY) || !resourceType) return false;
    const descriptor = normalizeLootPickupDescriptor(this.visualResolver.resolveResourcePickup({
      resourceType, tileX, tileY,
    }));
    if (!descriptor) return false;
    return this._show({
      worldX, worldY, resourceType, amount, descriptor,
      tileX, tileY, isSkyTileBonus, isStarResource, skyTileRarity,
      special: isSkyTileBonus,
    });
  }

  showSpecialTilePickup({
    worldX,
    worldY,
    tileType,
    tileY = null,
    depthTiles = null,
    gemPowerTierId = null,
    specialEffect = null,
    specialBlockEffect = null,
  } = {}) {
    if (!this._canShow(worldX, worldY)) return false;
    const resolvedDepth = Number.isFinite(depthTiles)
      ? depthTiles
      : (Number.isFinite(tileY) ? tileY : 0);
    const descriptor = normalizeLootPickupDescriptor(this.visualResolver.resolveSpecialPickup({
      tileType, depthTiles: resolvedDepth, gemPowerTierId,
    }));
    if (!descriptor) return false;
    return this._show({
      worldX, worldY, tileType, descriptor, amount: 1,
      specialEffect: specialEffect ?? specialBlockEffect, special: true, pickupCount: 1,
    });
  }
  showSpecialBlockPickup(detail = {}) {
    return this.showSpecialTilePickup(detail);
  }

  showStarPickup(detail = {}) {
    const worldX = detail.worldX ?? detail.startWorldX;
    const worldY = detail.worldY ?? detail.startWorldY;
    if (!this._canShow(worldX, worldY) || !detail.textureKey) return false;
    const progress = detail.progress || {};
    const descriptor = normalizeLootPickupDescriptor(Object.freeze({
      visualId: `star:${detail.identityId || progress.identityId || "unknown"}`,
      kind: "star",
      sourceId: "collected-star-release-entry",
      textureKey: detail.textureKey,
      textureFrame: detail.textureFrame ?? null,
      lightTextureKey: detail.lightTextureKey ?? null,
      lightTextureFrame: detail.lightTextureFrame ?? null,
      identityIndex: detail.identityIndex ?? progress.identityIndex ?? null,
      identityId: detail.identityId ?? progress.identityId ?? null,
      rarity: detail.rarity ?? progress.rarity ?? 0,
      exactWorldFrame: true,
      blendMode: globalThis.Phaser?.BlendModes?.SCREEN ?? "SCREEN",
    }));
    return this._show({
      worldX,
      worldY,
      descriptor,
      resourceType: detail.resourceType ?? progress.resourceType ?? null,
      amount: progress.materialAmount ?? 1,
      isStarResource: true,
      isSkyTileBonus: true,
      skyTileRarity: descriptor.rarity,
      identityId: descriptor.identityId,
      identityNewlyDiscovered: progress.identityNewlyDiscovered === true,
      special: true,
      pickupCount: 1,
    });
  }

  _show(context) {
    const eventId = this.eventSequence;
    this.eventSequence += 1;
    this.lastArrivalTarget = null;
    const count = context.pickupCount ?? this._getPickupCount(
      context.amount,
      context.isSkyTileBonus,
    );
    if (count <= 0) return false;
    let spawned = false;
    for (let index = 0; index < count; index += 1) {
      while (this.activeFlights.length >= this.maxActiveSprites) {
        this._removeFlight(this.activeFlights[0]);
      }
      spawned = this._spawn({ ...context, eventId, index, count }) || spawned;
    }
    return spawned;
  }

  _spawn(context) {
    const config = LOOT_PICKUP_PRESENTATION;
    const source = this._worldToScreen(context.worldX, context.worldY);
    const offsetX = (lootPickupUnit(context, 31) - 0.5) * config.spawn.spreadXPx
      + (context.index - (context.count - 1) / 2) * config.spawn.indexSpacingPx;
    const offsetY = (lootPickupUnit(context, 43) - 0.5) * config.spawn.spreadYPx;
    const rise = config.spawn.riseMinPx + lootPickupUnit(context, 59) * config.spawn.riseRangePx;
    const start = { x: source.x + offsetX, y: source.y + offsetY };
    const hover = { x: start.x, y: start.y - rise };
    const targetProvider = () => this._getTarget(context.resourceType);
    const target = targetProvider();
    const motionPlan = this.motionProvider.createPlan({
      ...context,
      channel: REWARD_FLIGHT_CHANNELS.loot,
      start: hover,
      target,
      index: context.index,
      count: context.count,
    });
    if (!motionPlan) return false;
    const moment = resolveLootPickupMoment(context);
    const displaySize = this._getDisplaySize(context);
    const flight = this.flightView.create({
      descriptor: context.descriptor,
      x: start.x,
      y: start.y,
      displaySize,
      trailCount: moment.trailCount,
    });
    if (!flight) return false;
    flight.motionPlan = motionPlan;
    this.activeFlights.push(flight);
    this._recordTelemetry(context, motionPlan, moment);
    flight.root.setScale(config.spawn.startScale)
      .setAlpha(0)
      .setRotation((lootPickupUnit(context, 71) - 0.5) * 0.12);
    this.scene.tweens.add({
      targets: flight.root,
      x: hover.x,
      y: hover.y,
      alpha: 1,
      scaleX: config.spawn.endScale,
      scaleY: config.spawn.endScale,
      duration: config.spawn.durationMs,
      ease: config.spawn.ease,
      onComplete: () => {
        if (!flight.root.active) return;
        const started = this.flightView.animate({
          flight,
          motionPlan,
          moment,
          targetProvider,
          onArrival: liveTarget => {
            if (this._destroyed) return;
            if (context.index === 0 && !context.isStarResource) this.scene.soundSystem?.playResourcePickup?.({ special: context.special });
            this.targetProvider?.pulseLootTarget?.(
              context.resourceType,
              context.special || context.isStarResource,
            );
            rememberRewardPickupVisual(this.scene, context);
            this.lastArrivalTarget = Object.freeze({ ...liveTarget });
          },
        });
        if (!started) this._removeFlight(flight);
      },
    });
    return true;
  }

  _recordTelemetry(context, plan, moment) {
    const entry = Object.freeze({
      visualId: context.descriptor.visualId,
      textureKey: context.descriptor.textureKey,
      textureFrame: context.descriptor.textureFrame,
      lightTextureKey: context.descriptor.lightTextureKey ?? null,
      lightTextureFrame: context.descriptor.lightTextureFrame ?? null,
      momentId: moment.id,
      profileId: plan.profileId,
      routeId: plan.routeId || null,
      rareRewardPath: plan.route?.rareReward === true,
      softEchoCount: moment.softEchoRatios.length,
      rarity: context.skyTileRarity ?? null,
    });
    this.recentTelemetry.push(entry);
    if (this.recentTelemetry.length > 16) this.recentTelemetry.shift();
    this.lastTelemetry = entry;
    this.lastMotionProfileId = plan.profileId;
  }

  _getPickupCount(amount, isSkyTileBonus = false) {
    const awarded = Math.max(1, Math.round(Number.isFinite(amount) ? amount : 1));
    const cap = isSkyTileBonus
      ? LOOT_PICKUP_PRESENTATION.limits.bonusPickupCap
      : LOOT_PICKUP_PRESENTATION.limits.routinePickupCap;
    return Math.min(awarded, cap);
  }

  _getDisplaySize(context) {
    const flight = LOOT_PICKUP_PRESENTATION.flight;
    if (context.isStarResource) {
      const rarity = Math.max(0, Math.floor(Number(context.skyTileRarity) || 0));
      return flight.starDisplaySizePx + rarity * flight.starRaritySizeStepPx;
    }
    if (context.descriptor.kind === "special") return flight.specialDisplaySizePx;
    return flight.resourceDisplaySizePx;
  }

  _getTarget(resourceType) {
    const target = this.targetProvider?.getLootPickupTarget?.(resourceType);
    return Number.isFinite(target?.x) && Number.isFinite(target?.y)
      ? target
      : this._fallbackTarget();
  }

  _canShow(worldX, worldY) {
    return !this._destroyed
      && isLootVisualsEnabled(this.scene)
      && Number.isFinite(worldX)
      && Number.isFinite(worldY);
  }

  _worldToScreen(worldX, worldY) {
    const camera = this.scene.cameras?.main;
    if (!camera) return { x: worldX, y: worldY };
    return {
      x: (worldX - camera.scrollX) * camera.zoom + camera.x,
      y: (worldY - camera.scrollY) * camera.zoom + camera.y,
    };
  }

  _fallbackTarget() {
    return {
      x: (this.scene.scale?.width || 1280) - 42,
      y: (this.scene.scale?.height || 720) - 42,
    };
  }

  _removeFlight(flight, preserveRoots = []) {
    if (!flight) return;
    const preserved = new Set(preserveRoots);
    if (flight.state) this.scene.tweens.killTweensOf(flight.state);
    for (const root of [flight.root, ...(flight.trails || []), ...(flight.softEchoes || []), ...(flight._arrivalRoots || [])]) {
      if (!root || preserved.has(root)) continue;
      this.scene.tweens.killTweensOf(root);
      if (root.active !== false) root.destroy();
    }
    const index = this.activeFlights.indexOf(flight);
    if (index !== -1) this.activeFlights.splice(index, 1);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    [...this.activeFlights].forEach(flight => this._removeFlight(flight));
    this.activeFlights.length = 0;
    this.recentTelemetry.length = 0;
    if (this.ownsMotionProvider) this.motionProvider.destroy();
  }
}
