import { CelestialActivationBudget } from "./CelestialActivationBudget.js";
import { HollowSunEngine } from "./HollowSunEngine.js";

function scaledDefinition(definition) {
  const scale = Math.max(0.1, Number(definition.clusterDisplayScale) || 1);
  return Object.freeze({
    ...definition,
    displaySizePx: definition.displaySizePx * scale,
    coreRadiusPx: definition.coreRadiusPx * scale,
  });
}

function childDefinition(definition, holeCount, waveOrder, visualDelayMs) {
  const scaled = scaledDefinition(definition);
  const waveStepMs = Math.max(0, Number(definition.pulseWaveStepMs) || 0);
  if (waveStepMs <= 0) return scaled;
  const maximumWaveDelayMs = Math.max(0, holeCount - 1) * waveStepMs;
  const pulseTimesMs = scaled.pulseTimesMs.map((time, pulseIndex) => {
    const order = pulseIndex % 2 === 0
      ? waveOrder
      : holeCount - 1 - waveOrder;
    return Math.max(0, Math.round(time + order * waveStepMs - visualDelayMs));
  });
  return Object.freeze({
    ...scaled,
    pulseTimesMs: Object.freeze(pulseTimesMs),
    lifetimeMs: Math.max(1, scaled.lifetimeMs + maximumWaveDelayMs - visualDelayMs),
  });
}

/** Owns one Hollow Sun activation containing a staggered, player-steered cluster. */
export class HollowSunClusterEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = this.definitionOverride;
    this.holeCount = Math.max(
      1,
      Math.floor(Number(this.definition?.simultaneousHoles) || 1),
    );
    this.children = [];
    this.holeOrigins = [];
    this.completions = [];
    this.targetKeys = new Set();
    this.pulseEvents = [];
    this.currentDrift = { x: 0, y: 0 };
    this.targetDrift = { x: 0, y: 0 };
    this.followCenter = { x: this.x, y: this.y };
    this.followDirection = { x: this.direction.x, y: this.direction.y };
    this.digNudges = 0;
    this.controlPulses = 0;
    this.active = true;
    try {
      this._createHoles();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  _createHoles() {
    const centerIndex = (this.holeCount - 1) / 2;
    const spacingPx = (Number(this.definition.clusterSpacingTiles) || 0)
      * this.tileSize;
    const arcPx = (Number(this.definition.clusterArcTiles) || 0) * this.tileSize;
    const spawnDelayMs = Math.max(
      0,
      Math.round(Number(this.definition.clusterSpawnDelayMs) || 0),
    );
    const perpendicular = { x: -this.direction.y, y: this.direction.x };

    const placements = Array.from({ length: this.holeCount }, (_, index) => {
      const centeredIndex = index - centerIndex;
      const delayMs = index * spawnDelayMs;
      const lateralOffset = centeredIndex * spacingPx;
      const forwardOffset = Math.abs(centeredIndex) * arcPx;
      return {
        index,
        delayMs,
        x: this.x + perpendicular.x * lateralOffset + this.direction.x * forwardOffset,
        y: this.y + perpendicular.y * lateralOffset + this.direction.y * forwardOffset,
      };
    });
    [...placements]
      .sort((left, right) => left.y - right.y || left.x - right.x || left.index - right.index)
      .forEach((placement, waveOrder) => { placement.waveOrder = waveOrder; });

    for (const placement of placements) {
      const { index, delayMs, waveOrder } = placement;
      const scheduledDefinition = childDefinition(
        this.definition,
        this.holeCount,
        waveOrder,
        delayMs,
      );
      const childBudget = new CelestialActivationBudget(
        this.budget.engineId,
        `${this.budget.activationId}:hole:${index + 1}`,
        this.budget.startedAtMs + delayMs,
        scheduledDefinition,
      );
      const child = new HollowSunEngine({
        scene: this.scene,
        budget: childBudget,
        definitionOverride: scheduledDefinition,
        direction: this.direction,
        tileSize: this.tileSize,
        assetKey: this.assetKey,
        probeTile: this.probeTile,
        toTile: this.toTile,
        x: placement.x,
        y: placement.y,
        visualDelayMs: delayMs,
        onImpact: (tx, ty, hitId, nowMs) => (
          this._handleImpact(tx, ty, hitId, nowMs)
        ),
        onPulse: (x, y, pulseNumber, nowMs) => (
          this._handlePulse(index, waveOrder, x, y, pulseNumber, nowMs)
        ),
        onComplete: (reason, health) => (
          this._completeHole(index, reason, health)
        ),
      });
      this.holeOrigins[index] = {
        x: placement.x - this.x,
        y: placement.y - this.y,
        waveOrder,
      };
      this.children.push(child);
    }
  }

  _handleImpact(tx, ty, hitId, nowMs) {
    const key = `${tx},${ty}`;
    if (this.targetKeys.has(key)) return null;
    this.targetKeys.add(key);
    return this.onImpact?.(tx, ty, hitId, nowMs) || null;
  }

  _handlePulse(index, waveOrder, x, y, pulseNumber, nowMs) {
    const event = {
      holeIndex: index + 1,
      waveOrder,
      pulseNumber,
      atMs: Number(nowMs) || 0,
    };
    this.pulseEvents.push(event);
    this.onPulse?.(x, y, pulseNumber, event);
  }

  nudge(direction) {
    if (!this.active) {
      this.lastNudgeResult = "inactive";
      return false;
    }
    const rawX = Number(direction?.x) || 0;
    const rawY = Number(direction?.y) || 0;
    const axis = Math.abs(rawY) > Math.abs(rawX)
      ? { x: 0, y: Math.sign(rawY) }
      : { x: Math.sign(rawX), y: 0 };
    if (axis.x === 0 && axis.y === 0) {
      this.lastNudgeResult = "no-direction";
      return false;
    }
    this.followDirection = axis;
    const stepPx = Math.max(0, Number(this.definition.digDriftStepTiles) || 0)
      * this.tileSize;
    if (stepPx <= 0) {
      this.lastNudgeResult = "disabled";
      return false;
    }
    let nextX = this.targetDrift.x + axis.x * stepPx;
    let nextY = this.targetDrift.y + axis.y * stepPx;
    const maximumQueuePx = Math.max(
      stepPx,
      (Number(this.definition.digDriftMaximumQueuedTiles) || 0) * this.tileSize,
    );
    const queuedX = nextX - this.currentDrift.x;
    const queuedY = nextY - this.currentDrift.y;
    const queuedDistance = Math.hypot(queuedX, queuedY);
    if (queuedDistance > maximumQueuePx) {
      const scale = maximumQueuePx / queuedDistance;
      nextX = this.currentDrift.x + queuedX * scale;
      nextY = this.currentDrift.y + queuedY * scale;
    }
    const inBounds = this.holeOrigins.every(origin => {
      const tile = this.toTile(
        this.followCenter.x + origin.x + nextX,
        this.followCenter.y + origin.y + nextY,
      );
      return this.probeTile(tile.tx, tile.ty)?.inBounds !== false;
    });
    if (!inBounds) {
      this.lastNudgeResult = "out-of-bounds";
      return false;
    }
    this.targetDrift = { x: nextX, y: nextY };
    this.digNudges += 1;
    this.lastNudgeResult = "accepted";
    this._tryControlPulse();
    return true;
  }

  _tryControlPulse() {
    const every = Math.max(
      0,
      Math.floor(Number(this.definition.controlPulseEveryNudges) || 0),
    );
    if (every <= 0 || this.digNudges % every !== 0) return false;
    const index = (Math.floor(this.digNudges / every) - 1) % this.children.length;
    const child = this.children[index];
    const nowMs = this.scene.time?.now || 0;
    const impacts = child?.triggerControlPulse?.(
      nowMs,
      this.definition.controlPulseRadiusTiles,
      this.definition.controlPulseImpactCap,
    ) || 0;
    this.controlPulses += 1;
    const event = {
      holeIndex: index + 1,
      waveOrder: this.holeOrigins[index]?.waveOrder || 0,
      pulseNumber: "CONTROL",
      atMs: nowMs,
      impacts,
    };
    this.pulseEvents.push(event);
    this.onPulse?.(child?.x, child?.y, "CONTROL", event);
    return true;
  }

  _updateDrift(deltaMs) {
    const deltaSeconds = Math.min(0.1, Math.max(0, Number(deltaMs) || 0) / 1000);
    const speedPx = Math.max(0, Number(this.definition.digDriftSpeedTilesPerSecond) || 0)
      * this.tileSize;
    const dx = this.targetDrift.x - this.currentDrift.x;
    const dy = this.targetDrift.y - this.currentDrift.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0 && speedPx > 0 && deltaSeconds > 0) {
      const travel = Math.min(distance, speedPx * deltaSeconds);
      this.currentDrift.x += dx / distance * travel;
      this.currentDrift.y += dy / distance * travel;
    }
    this._decayDigDrift(deltaSeconds);
    this._updateFollowCenter(deltaSeconds);
    this.children.forEach((child, index) => {
      const origin = this.holeOrigins[index];
      child.setPosition(
        this.followCenter.x + origin.x + this.currentDrift.x,
        this.followCenter.y + origin.y + this.currentDrift.y,
      );
    });
  }

  _decayDigDrift(deltaSeconds) {
    const speed = Math.max(0, Number(this.definition.digDriftReturnTilesPerSecond) || 0)
      * this.tileSize;
    const distance = Math.hypot(this.targetDrift.x, this.targetDrift.y);
    if (distance <= 0 || speed <= 0 || deltaSeconds <= 0) return;
    const travel = Math.min(distance, speed * deltaSeconds);
    this.targetDrift.x -= this.targetDrift.x / distance * travel;
    this.targetDrift.y -= this.targetDrift.y / distance * travel;
  }

  _updateFollowCenter(deltaSeconds) {
    const anchor = this.getAnchor?.();
    if (!anchor || deltaSeconds <= 0) return;
    const lead = Math.max(0, Number(this.definition.softFollowDistanceTiles) || 0)
      * this.tileSize;
    const desiredX = anchor.x + this.followDirection.x * lead;
    const desiredY = anchor.y + this.followDirection.y * lead;
    const dx = desiredX - this.followCenter.x;
    const dy = desiredY - this.followCenter.y;
    const distance = Math.hypot(dx, dy);
    const deadzone = Math.max(0, Number(this.definition.softFollowDeadzoneTiles) || 0)
      * this.tileSize;
    if (distance <= deadzone) return;
    const speed = Math.max(0, Number(this.definition.softFollowSpeedTilesPerSecond) || 0)
      * this.tileSize;
    const travel = Math.min(distance - deadzone, speed * deltaSeconds);
    if (travel <= 0) return;
    this.followCenter.x += dx / distance * travel;
    this.followCenter.y += dy / distance * travel;
  }

  update(nowMs, deltaMs) {
    if (!this.active) return;
    this._updateDrift(deltaMs);
    for (const child of this.children) child.update(nowMs, deltaMs);
  }

  _completeHole(index, reason, health) {
    this.completions[index] = { reason, health };
    if (this.completions.filter(Boolean).length < this.holeCount) return;
    this.active = false;
    this.onComplete?.("cluster-imploded", {
      ...this.getSnapshot(this.scene.time?.now || 0),
      holes: [...this.completions],
    });
  }

  getSnapshot(nowMs) {
    const snapshots = this.children.map(child => child.getSnapshot(nowMs));
    const pulseImpacts = [];
    for (const snapshot of snapshots) {
      snapshot.pulseImpacts.forEach((count, index) => {
        pulseImpacts[index] = (pulseImpacts[index] || 0) + count;
      });
    }
    const ageMs = Math.max(0, Number(nowMs) - this.budget.startedAtMs);
    const clusterLifetimeMs = this.definition.lifetimeMs + Math.max(0, this.holeCount - 1)
      * Math.max(0, Number(this.definition.pulseWaveStepMs) || 0);
    const impacts = snapshots.reduce((sum, item) => sum + item.impacts, 0);
    const maxImpacts = snapshots.reduce((sum, item) => sum + item.maxImpacts, 0);
    return {
      engineId: this.budget.engineId,
      activationId: this.budget.activationId,
      active: this.active,
      ageMs,
      lifetimeMs: clusterLifetimeMs,
      remainingMs: Math.max(0, clusterLifetimeMs - ageMs),
      impacts,
      maxImpacts,
      bounces: 0,
      maxBounces: 0,
      redirects: 0,
      maxRedirects: 0,
      uniqueTargets: this.targetKeys.size,
      pulseImpacts,
      completedPulses: snapshots.reduce(
        (sum, item) => sum + item.completedPulses,
        0,
      ),
      totalPulses: snapshots.reduce((sum, item) => sum + item.totalPulses, 0),
      holeCount: this.holeCount,
      activeHoles: this.children.filter(child => child.active).length,
      completedHoles: this.completions.filter(Boolean).length,
      pulseWaveStepMs: Math.max(0, Number(this.definition.pulseWaveStepMs) || 0),
      pulseEvents: this.pulseEvents.map(event => ({ ...event })),
      digNudges: this.digNudges,
      controlPulses: this.controlPulses,
      lastNudgeResult: this.lastNudgeResult || null,
      driftOffsetTiles: {
        x: this.currentDrift.x / this.tileSize,
        y: this.currentDrift.y / this.tileSize,
      },
      driftTargetTiles: {
        x: this.targetDrift.x / this.tileSize,
        y: this.targetDrift.y / this.tileSize,
      },
      followOffsetTiles: (() => {
        const anchor = this.getAnchor?.() || this.followCenter;
        return {
          x: (this.followCenter.x - anchor.x) / this.tileSize,
          y: (this.followCenter.y - anchor.y) / this.tileSize,
        };
      })(),
    };
  }

  destroy() {
    this.active = false;
    for (const child of this.children) child.destroy();
    this.children = [];
    this.holeOrigins = [];
  }
}
