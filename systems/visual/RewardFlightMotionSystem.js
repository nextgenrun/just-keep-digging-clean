import { REWARD_FLIGHT_CHANNELS, REWARD_FLIGHT_MOTION_CONFIG } from "../../values/rewardFlightMotions.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
function sampleCubic(start, control1, control2, target, t) {
  const inverse = 1 - t;
  const inverseSquared = inverse * inverse, tSquared = t * t;
  return {
    x: inverseSquared * inverse * start.x + 3 * inverseSquared * t * control1.x
      + 3 * inverse * tSquared * control2.x + tSquared * t * target.x,
    y: inverseSquared * inverse * start.y + 3 * inverseSquared * t * control1.y
      + 3 * inverse * tSquared * control2.y + tSquared * t * target.y,
  };
}
function sampleCubicTangent(start, control1, control2, target, t) {
  const inverse = 1 - t;
  return {
    x: 3 * inverse * inverse * (control1.x - start.x)
      + 6 * inverse * t * (control2.x - control1.x) + 3 * t * t * (target.x - control2.x),
    y: 3 * inverse * inverse * (control1.y - start.y)
      + 6 * inverse * t * (control2.y - control1.y) + 3 * t * t * (target.y - control2.y),
  };
}
function sampleRoutedCubic(start, control1, control2, target, t, route, geometry) {
  const progress = clamp(t, 0, 1);
  const point = sampleCubic(start, control1, control2, target, progress);
  if (progress <= 0 || progress >= 1 || route.amplitudePx <= 0) return point;
  const tangent = sampleCubicTangent(start, control1, control2, target, progress);
  const length = Math.max(geometry.routeWaveTangentMinimum, Math.hypot(tangent.x, tangent.y));
  const envelope = 4 * progress * (1 - progress);
  const wavePhase = route.phaseRadians
    + geometry.routeWaveFullTurnRadians * route.cycles * progress;
  const offset = Math.sin(wavePhase) * route.amplitudePx * envelope;
  return {
    x: point.x - (tangent.y / length) * offset,
    y: point.y + (tangent.x / length) * offset,
  };
}
export class RewardFlightMotionSystem {
  constructor(config = REWARD_FLIGHT_MOTION_CONFIG) {
    this.config = config;
    this.sequence = 0;
    this.recentByChannel = new Map();
    this.lastSelectionByChannel = new Map();
  }
  createPlan(context = {}) {
    const normalized = this._normalizeContext(context);
    if (!normalized) return null;
    const sequence = this.sequence;
    this.sequence += 1;
    const candidates = this._buildWeightedProfiles(normalized, true);
    const selected = this._selectWeighted(candidates, normalized, sequence);
    if (!selected) return null;
    this._remember(normalized.channel, selected.profile.id);
    const plan = this._buildPlan(normalized, selected, sequence);
    this.lastSelectionByChannel.set(normalized.channel, Object.freeze({
      profileId: plan.profileId, triggerRate: plan.triggerRate,
      resourceFamily: plan.resourceFamily, amountBand: plan.amountBand,
      routingBand: plan.routingBand, route: plan.route,
    }));
    return plan;
  }
  describeTriggerRates(context = {}) {
    const normalized = this._normalizeContext(context);
    if (!normalized) return [];
    return this._buildWeightedProfiles(normalized, false).map(entry => Object.freeze({
      profileId: entry.profile.id, weight: entry.weight, triggerRate: entry.triggerRate,
    }));
  }
  getLastSelection(channel) { return this.lastSelectionByChannel.get(channel) || null; }
  _normalizeContext(context) {
    const channel = context.channel === REWARD_FLIGHT_CHANNELS.xp
      ? REWARD_FLIGHT_CHANNELS.xp
      : REWARD_FLIGHT_CHANNELS.loot;
    const start = context.start;
    const target = context.target;
    if (![start?.x, start?.y, target?.x, target?.y].every(Number.isFinite)) return null;
    const rawAmount = channel === REWARD_FLIGHT_CHANNELS.xp
      ? context.xpGained ?? context.amount
      : context.amount ?? context.xpGained;
    const amount = Math.max(0, Number(rawAmount) || 0);
    const rarityNumber = Number(context.skyTileRarity);
    const hasSkyTileRarity = context.skyTileRarity != null && Number.isFinite(rarityNumber);
    const skyTileRarity = hasSkyTileRarity ? Math.max(0, Math.floor(rarityNumber)) : null;
    const isStarResource = context.isStarResource === true
      || context.isSkyTileBonus === true || hasSkyTileRarity;
    const resourceFamily = isStarResource
      ? this.config.starResourceFamily
      : this.config.resourceFamilies[context.resourceType] || this.config.neutralResourceFamily;
    const amountBands = this.config.amountBands[channel];
    const amountBand = amountBands.find(band => band.max === null || amount <= band.max)
      || amountBands[amountBands.length - 1];
    const actualBandIndex = this.config.amountBandOrder.indexOf(amountBand.id);
    const floorIndex = id => Math.max(0, this.config.amountBandOrder.indexOf(id));
    let routingBandIndex = actualBandIndex;
    if (context.special) routingBandIndex = Math.max(
      routingBandIndex, floorIndex(this.config.selector.routingFloorBands.special),
    );
    if (isStarResource) {
      const floorId = skyTileRarity !== null && skyTileRarity >= this.config.selector.starRareMinimumRarity
        ? this.config.selector.routingFloorBands.rareStar
        : this.config.selector.routingFloorBands.star;
      routingBandIndex = Math.max(routingBandIndex, floorIndex(floorId));
    }
    if (context.levelUp) routingBandIndex = Math.max(
      routingBandIndex, floorIndex(this.config.selector.routingFloorBands.levelUp),
    );
    const rawIdentityIndex = context.identityIndex ?? context.skyTileIdentity
      ?? context.descriptor?.identityIndex;
    const identityIndex = rawIdentityIndex != null && Number.isFinite(Number(rawIdentityIndex))
      ? Math.max(0, Math.floor(Number(rawIdentityIndex)))
      : null;
    return {
      ...context,
      channel, amount,
      start: { x: start.x, y: start.y },
      target: { x: target.x, y: target.y },
      resourceFamily, amountBand: amountBand.id, amountBandIndex: actualBandIndex,
      routingBand: this.config.amountBandOrder[routingBandIndex],
      routingBandIndex, isStarResource, skyTileRarity, identityIndex,
      semanticId: String(context.semanticId ?? context.variationId ?? context.specialBlockEffect
        ?? context.specialEffect ?? context.identityId ?? context.descriptor?.visualId
        ?? context.rarityId ?? context.tileType ?? ""),
      index: Math.max(0, Math.floor(Number(context.index) || 0)),
      count: Math.max(1, Math.floor(Number(context.count) || 1)),
    };
  }
  _buildWeightedProfiles(context, includeHistory) {
    const recent = includeHistory ? this.recentByChannel.get(context.channel) || [] : [];
    const lastProfileId = recent[recent.length - 1];
    const requiresSemanticFloor = context.isStarResource || context.special || context.levelUp;
    const weights = this.config.profiles.map(profile => {
      const baseWeight = context.channel === REWARD_FLIGHT_CHANNELS.xp
        ? profile.xpWeight
        : profile.lootWeight;
      const resourceMultiplier = profile.resourceAffinity === this.config.neutralResourceFamily
        ? this.config.selector.neutralResourceMultiplier
        : profile.resourceAffinity === context.resourceFamily
          ? this.config.selector.matchingResourceMultiplier
          : this.config.selector.otherResourceMultiplier;
      const profileBandIndex = this.config.amountBandOrder.indexOf(profile.amountAffinity);
      const bandDistance = Math.abs(profileBandIndex - context.routingBandIndex);
      const amountMultiplier = bandDistance === 0
        ? this.config.selector.matchingAmountMultiplier
        : bandDistance === 1
          ? this.config.selector.adjacentAmountMultiplier
          : this.config.selector.otherAmountMultiplier;
      let weight = requiresSemanticFloor && profileBandIndex < context.routingBandIndex
        ? 0 : baseWeight * resourceMultiplier * amountMultiplier;
      if (context.special && profileBandIndex >= this.config.selector.specialMinimumBandIndex) {
        weight *= this.config.selector.specialLargeMultiplier;
      }
      if (context.levelUp && profileBandIndex >= this.config.selector.levelUpMinimumBandIndex) {
        weight *= this.config.selector.levelUpSurgeMultiplier;
      }
      return { profile, weight };
    });
    const hasFreshCandidate = includeHistory
      && weights.some(entry => entry.weight > 0 && !recent.includes(entry.profile.id));
    const hasAlternative = weights.some(
      entry => entry.weight > 0 && entry.profile.id !== lastProfileId,
    );
    const adjusted = weights.map(entry => {
      let weight = entry.weight;
      if (this.config.selector.strictRecentExclusion && hasFreshCandidate
        && recent.includes(entry.profile.id)) {
        weight = 0;
      } else if (includeHistory && entry.profile.id === lastProfileId && hasAlternative) {
        weight *= this.config.selector.immediateRepeatMultiplier;
      } else if (includeHistory && recent.includes(entry.profile.id)) {
        weight *= this.config.selector.recentProfileMultiplier;
      }
      return { ...entry, weight };
    });
    const totalWeight = adjusted.reduce((sum, entry) => sum + entry.weight, 0);
    return adjusted.map(entry => ({
      ...entry,
      triggerRate: totalWeight > 0 ? entry.weight / totalWeight : 0,
    }));
  }
  _selectWeighted(candidates, context, sequence) {
    const totalWeight = candidates.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return candidates[0] || null;
    let cursor = this._unit(context, sequence, this.config.random.selectionSalt) * totalWeight;
    for (const entry of candidates) {
      cursor -= entry.weight;
      if (cursor <= 0) return entry;
    }
    return candidates[candidates.length - 1] || null;
  }

  _buildPlan(context, selected, sequence) {
    const { geometry } = this.config;
    const profile = selected.profile;
    const deltaX = context.target.x - context.start.x;
    const deltaY = context.target.y - context.start.y;
    const distance = Math.max(geometry.minimumDistancePx, Math.hypot(deltaX, deltaY));
    const sideScale = clamp(
      distance * geometry.sideDistanceFactor,
      geometry.sideMinimumPx,
      geometry.sideMaximumPx,
    );
    const liftScale = clamp(
      distance * geometry.liftDistanceFactor,
      geometry.liftMinimumPx,
      geometry.liftMaximumPx,
    );
    const jitter = (salt, maximum) => (
      (this._unit(context, sequence, salt) * 2 - 1) * maximum
    );
    const control1 = {
      x: context.start.x + deltaX * profile.control1Progress
        + sideScale * profile.side1 + jitter(this.config.random.control1XSalt, geometry.controlJitterXPx),
      y: context.start.y + deltaY * profile.control1Progress
        - liftScale * profile.lift1 + jitter(this.config.random.control1YSalt, geometry.controlJitterYPx),
    };
    const control2 = {
      x: context.start.x + deltaX * profile.control2Progress
        + sideScale * profile.side2 + jitter(this.config.random.control2XSalt, geometry.controlJitterXPx),
      y: context.start.y + deltaY * profile.control2Progress
        - liftScale * profile.lift2 + jitter(this.config.random.control2YSalt, geometry.controlJitterYPx),
    };
    const channel = this.config.channels[context.channel];
    const durationJitter = jitter(this.config.random.durationSalt, geometry.durationJitterRatio);
    const durationMs = clamp(
      (channel.baseDurationMs + channel.durationPerIndexMs * context.index)
        * profile.durationMultiplier * (1 + durationJitter),
      geometry.durationMinimumMs,
      geometry.durationMaximumMs,
    );
    const waveBase = clamp(
      distance * geometry.routeWaveDistanceFactor,
      geometry.routeWaveMinimumPx,
      geometry.routeWaveMaximumPx,
    );
    const waveRatio = geometry.routeWaveAmplitudeMinimumRatio
      + this._unit(context, sequence, this.config.random.routeAmplitudeSalt)
        * (1 - geometry.routeWaveAmplitudeMinimumRatio);
    const route = Object.freeze({
      id: `${profile.id}:${geometry.routeVariationId}`,
      amplitudePx: Math.min(
        geometry.routeWaveMaximumPx,
        waveBase * (1 + context.routingBandIndex * geometry.routeWaveBandStepRatio) * waveRatio,
      ),
      cycles: geometry.routeWaveCyclesMinimum
        + this._unit(context, sequence, this.config.random.routeCyclesSalt)
          * (geometry.routeWaveCyclesMaximum - geometry.routeWaveCyclesMinimum),
      phaseRadians: this._unit(context, sequence, this.config.random.routePhaseSalt)
        * geometry.routeWaveFullTurnRadians,
      routingBand: context.routingBand, semanticId: context.semanticId,
      skyTileRarity: context.skyTileRarity, isStarResource: context.isStarResource,
      special: Boolean(context.special), levelUp: Boolean(context.levelUp),
      rareReward: profile.amountAffinity === "surge", sequence,
    });
    return Object.freeze({
      profileId: profile.id,
      triggerRate: selected.triggerRate,
      resourceFamily: context.resourceFamily,
      amountBand: context.amountBand,
      routingBand: context.routingBand,
      routeId: route.id, route,
      durationMs,
      ease: profile.ease,
      rotationRadians: channel.rotationRadians * profile.rotationMultiplier,
      start: Object.freeze(context.start),
      control1: Object.freeze(control1),
      control2: Object.freeze(control2),
      target: Object.freeze(context.target),
      sample: t => sampleRoutedCubic(context.start, control1, control2, context.target, t, route, geometry),
    });
  }

  _unit(context, sequence, salt) {
    const key = [
      context.channel, context.resourceType || context.resourceFamily, Math.round(context.amount),
      context.amountBand, context.routingBand, context.isStarResource ? 1 : 0,
      context.skyTileRarity ?? "", context.identityIndex ?? "", context.special ? 1 : 0,
      context.levelUp ? 1 : 0, context.semanticId, context.index, context.count,
      Math.round(context.start.x), Math.round(context.start.y),
      Math.round(context.target.x), Math.round(context.target.y), sequence, salt,
    ].join("|");
    let hash = this.config.random.hashOffset;
    for (let index = 0; index < key.length; index += 1) {
      hash ^= key.charCodeAt(index);
      hash = Math.imul(hash, this.config.random.hashPrime);
    }
    return (hash >>> 0) / this.config.random.unsignedDivisor;
  }

  _remember(channel, profileId) {
    const recent = this.recentByChannel.get(channel) || [];
    recent.push(profileId);
    if (recent.length > this.config.selector.recentWindow) recent.shift();
    this.recentByChannel.set(channel, recent);
  }

  destroy() {
    this.recentByChannel.clear();
    this.lastSelectionByChannel.clear();
  }
}
