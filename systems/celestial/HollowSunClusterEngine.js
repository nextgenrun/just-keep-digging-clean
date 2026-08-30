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

/** Owns one Hollow Sun activation containing two to five staggered black holes. */
export class HollowSunClusterEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = this.definitionOverride;
    this.holeCount = Math.max(
      1,
      Math.floor(Number(this.definition?.simultaneousHoles) || 1),
    );
    this.children = [];
    this.completions = [];
    this.targetKeys = new Set();
    this.active = true;
    try {
      this._createHoles();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  _createHoles() {
    const childDefinition = scaledDefinition(this.definition);
    const centerIndex = (this.holeCount - 1) / 2;
    const spacingPx = (Number(this.definition.clusterSpacingTiles) || 0)
      * this.tileSize;
    const arcPx = (Number(this.definition.clusterArcTiles) || 0) * this.tileSize;
    const spawnDelayMs = Math.max(
      0,
      Math.round(Number(this.definition.clusterSpawnDelayMs) || 0),
    );
    const perpendicular = { x: -this.direction.y, y: this.direction.x };

    for (let index = 0; index < this.holeCount; index += 1) {
      const centeredIndex = index - centerIndex;
      const delayMs = index * spawnDelayMs;
      const childBudget = new CelestialActivationBudget(
        this.budget.engineId,
        `${this.budget.activationId}:hole:${index + 1}`,
        this.budget.startedAtMs + delayMs,
        childDefinition,
      );
      const lateralOffset = centeredIndex * spacingPx;
      const forwardOffset = Math.abs(centeredIndex) * arcPx;
      const child = new HollowSunEngine({
        scene: this.scene,
        budget: childBudget,
        definitionOverride: childDefinition,
        direction: this.direction,
        tileSize: this.tileSize,
        assetKey: this.assetKey,
        probeTile: this.probeTile,
        toTile: this.toTile,
        x: this.x
          + perpendicular.x * lateralOffset
          + this.direction.x * forwardOffset,
        y: this.y
          + perpendicular.y * lateralOffset
          + this.direction.y * forwardOffset,
        visualDelayMs: delayMs,
        onImpact: (tx, ty, hitId, nowMs) => (
          this._handleImpact(tx, ty, hitId, nowMs)
        ),
        onPulse: this.onPulse,
        onComplete: (reason, health) => (
          this._completeHole(index, reason, health)
        ),
      });
      this.children.push(child);
    }
  }

  _handleImpact(tx, ty, hitId, nowMs) {
    const key = `${tx},${ty}`;
    if (this.targetKeys.has(key)) return null;
    this.targetKeys.add(key);
    return this.onImpact?.(tx, ty, hitId, nowMs) || null;
  }

  update(nowMs, deltaMs) {
    if (!this.active) return;
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
    const clusterLifetimeMs = this.definition.lifetimeMs
      + Math.max(0, this.holeCount - 1) * this.definition.clusterSpawnDelayMs;
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
    };
  }

  destroy() {
    this.active = false;
    for (const child of this.children) child.destroy();
    this.children = [];
  }
}
