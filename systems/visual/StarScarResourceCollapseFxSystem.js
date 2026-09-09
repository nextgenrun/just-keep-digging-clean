import { RESOURCE_BY_TILE_TYPE } from "../../values/resourceTypes.js";
import { STAR_SANCTUARY_CONFIG } from "../../values/starSanctuary.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function resolveStarScarCollapseDelayMs(distanceTiles, spreadConfig) {
  const start = Math.max(0, Number(spreadConfig.postBreakStartRadiusTiles) || 0);
  const end = Math.max(start, Number(spreadConfig.postBreakEndRadiusTiles) || start);
  const duration = Math.max(0, Number(spreadConfig.postBreakDurationMs) || 0);
  if (distanceTiles <= start || end <= start) return 0;
  const radiusProgress = clamp01((distanceTiles - start) / (end - start));
  const exponent = Math.max(1, Number(spreadConfig.easingExponent) || 1);
  const timeProgress = 1 - (1 - radiusProgress) ** (1 / exponent);
  return Math.round(timeProgress * duration);
}

export function selectStarScarCollapseCells(cells, maximum) {
  const limit = Math.max(0, Math.floor(Number(maximum) || 0));
  if (limit === 0 || cells.length === 0) return [];
  const ordered = [...cells].sort((left, right) => (
    left.distanceTiles - right.distanceTiles
      || left.ty - right.ty
      || left.tx - right.tx
  ));
  if (ordered.length <= limit) return ordered;
  if (limit === 1) return [ordered[0]];
  const selected = [];
  for (let index = 0; index < limit; index += 1) {
    selected.push(ordered[Math.round(index * (ordered.length - 1) / (limit - 1))]);
  }
  return selected;
}

export class StarScarResourceCollapseFxSystem {
  constructor(
    scene,
    worldModel,
    territorySystem,
    config = STAR_SANCTUARY_CONFIG,
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.territorySystem = territorySystem;
    this.config = config;
    this.activeTimers = new Set();
    this.reducedMotion = globalThis.matchMedia?.(
      config.scar.resourceDepletion.presentation.reducedMotionMediaQuery,
    )?.matches === true;
    this.snapshot = {
      siteKey: "",
      candidateCount: 0,
      scheduledCount: 0,
      playedCount: 0,
    };
  }

  play(profile) {
    if (!profile?.key || !this.territorySystem?.getNearestSite) return false;
    const candidates = this._collectCandidates(profile);
    const presentation = this.config.scar.resourceDepletion.presentation;
    const maximum = this.reducedMotion
      ? presentation.reducedMotionMaxAnimatedCells
      : presentation.maxAnimatedCells;
    const selected = selectStarScarCollapseCells(candidates, maximum);
    this.snapshot = {
      siteKey: profile.key,
      candidateCount: candidates.length,
      scheduledCount: selected.length,
      playedCount: 0,
    };
    for (const cell of selected) {
      const delay = resolveStarScarCollapseDelayMs(
        cell.distanceTiles,
        this.config.scar.spread,
      );
      this._schedule(delay, () => this._playCell(cell));
    }
    return selected.length > 0;
  }

  _collectCandidates(profile) {
    const bounds = this._visibleBounds();
    if (!bounds) return [];
    const cells = [];
    for (let ty = bounds.top; ty < bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx < bounds.right; tx += 1) {
        const tileType = this.worldModel.getTileType?.(tx, ty);
        if (!RESOURCE_BY_TILE_TYPE[tileType]) continue;
        if (this.territorySystem.getNearestSite(tx, ty)?.key !== profile.key) continue;
        cells.push({
          tx,
          ty,
          tileType,
          distanceTiles: Math.hypot(tx - profile.tx, ty - profile.ty),
        });
      }
    }
    return cells;
  }

  _visibleBounds() {
    const view = this.scene?.cameras?.main?.worldView;
    if (!view || !this.worldModel) return null;
    const tileSize = Math.max(1, Number(this.worldModel.tileSize) || 1);
    const margin = this.config.scar.resourceDepletion.presentation.cullMarginTiles;
    const width = this.worldModel.widthTiles ?? this.worldModel.width ?? 0;
    const depth = this.worldModel.depthTiles ?? this.worldModel.depth ?? 0;
    return {
      left: Math.max(0, Math.floor(view.x / tileSize) - margin),
      right: Math.min(width, Math.ceil((view.x + view.width) / tileSize) + margin),
      top: Math.max(0, Math.floor(view.y / tileSize) - margin),
      bottom: Math.min(depth, Math.ceil((view.y + view.height) / tileSize) + margin),
    };
  }

  _schedule(delayMs, callback) {
    if (delayMs <= 0 || !this.scene?.time?.delayedCall) {
      callback();
      return;
    }
    let timer = null;
    timer = this.scene.time.delayedCall(delayMs, () => {
      this.activeTimers.delete(timer);
      callback();
    });
    this.activeTimers.add(timer);
  }

  _playCell(cell) {
    const tileSize = Math.max(1, Number(this.worldModel?.tileSize) || 1);
    const played = this.scene?.tileDestructionFxSystem?.play?.({
      worldX: (cell.tx + 0.5) * tileSize,
      worldY: (cell.ty + 0.5) * tileSize,
      tileType: cell.tileType,
    }) === true;
    if (played) this.snapshot.playedCount += 1;
  }

  getSnapshot() {
    return { ...this.snapshot };
  }

  destroy() {
    for (const timer of this.activeTimers) timer.remove?.(false);
    this.activeTimers.clear();
    this.scene = null;
    this.worldModel = null;
    this.territorySystem = null;
  }
}
