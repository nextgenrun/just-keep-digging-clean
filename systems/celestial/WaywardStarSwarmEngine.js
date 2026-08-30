import { CelestialActivationBudget } from "./CelestialActivationBudget.js";
import { WaywardStarEngine } from "./WaywardStarEngine.js";

function rotateDirection(direction, degrees) {
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const x = Number(direction?.x) || 0;
  const y = Number(direction?.y) || 0;
  const length = Math.hypot(x, y) || 1;
  return {
    x: (x * cos - y * sin) / length,
    y: (x * sin + y * cos) / length,
  };
}

/** Owns one charged Wayward activation containing one to five independent stars. */
export class WaywardStarSwarmEngine {
  constructor(options) {
    Object.assign(this, options);
    this.definition = this.definitionOverride;
    this.starCount = Math.max(
      1,
      Math.floor(Number(this.definition?.simultaneousStars) || 1),
    );
    this.children = [];
    this.completions = [];
    this.active = true;
    try {
      this._createStars();
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  _createStars() {
    const centerIndex = (this.starCount - 1) / 2;
    const spreadDegrees = Number(this.definition.swarmSpreadDegrees) || 0;
    const spawnOffsetPx = (Number(this.definition.swarmSpawnOffsetTiles) || 0)
      * this.tileSize;
    const perpendicular = { x: -this.direction.y, y: this.direction.x };
    for (let index = 0; index < this.starCount; index += 1) {
      const centeredIndex = index - centerIndex;
      const childBudget = new CelestialActivationBudget(
        this.budget.engineId,
        `${this.budget.activationId}:star:${index + 1}`,
        this.budget.startedAtMs,
        this.definition,
      );
      const child = new WaywardStarEngine({
        scene: this.scene,
        budget: childBudget,
        direction: rotateDirection(
          this.direction,
          centeredIndex * spreadDegrees,
        ),
        tileSize: this.tileSize,
        definitionOverride: this.definition,
        probeTile: this.probeTile,
        toTile: this.toTile,
        onImpact: this.onImpact,
        onBounce: this.onBounce,
        assetKey: this.assetKey,
        startX: this.startX + perpendicular.x * centeredIndex * spawnOffsetPx,
        startY: this.startY + perpendicular.y * centeredIndex * spawnOffsetPx,
        onComplete: (reason, health) => this._completeStar(index, reason, health),
      });
      this.children.push(child);
    }
  }

  update(nowMs, deltaMs) {
    if (!this.active) return;
    for (const child of this.children) child.update(nowMs, deltaMs);
  }

  _completeStar(index, reason, health) {
    this.completions[index] = { reason, health };
    if (this.completions.filter(Boolean).length < this.starCount) return;
    this.active = false;
    this.onComplete?.("swarm-complete", {
      ...this.getSnapshot(this.scene.time?.now || 0),
      stars: [...this.completions],
    });
  }

  getSnapshot(nowMs) {
    const budgets = this.children.map(child => child.budget);
    const childSnapshots = this.children.map(child => child.getSnapshot(nowMs));
    const routeTargets = new Set();
    const allTargets = new Set();
    for (const child of this.children) {
      for (const key of child.budget._targetKeys) {
        routeTargets.add(key);
        allTargets.add(key);
      }
      for (const key of child.supernovaTargetKeys) allTargets.add(key);
    }
    const ageMs = Math.max(0, Number(nowMs) - this.budget.startedAtMs);
    const routeImpacts = childSnapshots.reduce(
      (sum, snapshot) => sum + snapshot.routeImpacts,
      0,
    );
    const maxRouteImpacts = childSnapshots.reduce(
      (sum, snapshot) => sum + snapshot.maxRouteImpacts,
      0,
    );
    const supernovaImpacts = childSnapshots.reduce(
      (sum, snapshot) => sum + snapshot.supernovaImpacts,
      0,
    );
    const maxSupernovaImpacts = childSnapshots.reduce(
      (sum, snapshot) => sum + snapshot.maxSupernovaImpacts,
      0,
    );
    return {
      engineId: this.budget.engineId,
      activationId: this.budget.activationId,
      active: this.active,
      ageMs,
      lifetimeMs: this.definition.lifetimeMs,
      remainingMs: Math.max(0, this.definition.lifetimeMs - ageMs),
      routeImpacts,
      maxRouteImpacts,
      supernovaImpacts,
      maxSupernovaImpacts,
      impacts: routeImpacts + supernovaImpacts,
      maxImpacts: maxRouteImpacts + maxSupernovaImpacts,
      bounces: budgets.reduce((sum, budget) => sum + budget.bounces, 0),
      maxBounces: budgets.reduce((sum, budget) => sum + budget.maxBounces, 0),
      redirects: 0,
      maxRedirects: 0,
      uniqueRouteTargets: routeTargets.size,
      uniqueTargets: allTargets.size,
      starCount: this.starCount,
      activeStars: this.children.filter(child => child.active).length,
      completedStars: this.completions.filter(Boolean).length,
    };
  }

  destroy() {
    this.active = false;
    for (const child of this.children) child.destroy();
    this.children = [];
  }
}
