import {
  performanceNow,
  recordPerformanceSpan,
} from "../../systems/health/performanceTelemetryBridge.js";
import { WorldRenderWindowScheduler } from "./WorldRenderWindowScheduler.js";

export class WorldRenderWindowBuffer {
  constructor(renderer, config, worldDepth) {
    this.renderer = renderer;
    this.config = config;
    this.scheduler = new WorldRenderWindowScheduler(config, worldDepth);
    this.layer = null;
    this.pendingStartedAtMs = null;
    this.performance = {
      batches: 0,
      commits: 0,
      immediateCommits: 0,
      rowsPainted: 0,
      lastBatchRows: 0,
      lastBatchDurationMs: 0,
      maxBatchDurationMs: 0,
      lastShiftDurationMs: 0,
      maxShiftDurationMs: 0,
    };
  }

  attach(layer) {
    this.layer = layer;
    return this;
  }

  update(playerTile, currentTop) {
    if (!this.layer) return false;
    const plan = this.scheduler.next(playerTile, currentTop);
    if (!plan) {
      this.pendingStartedAtMs = null;
      return false;
    }
    if (plan.started) this.begin(plan.targetTop);

    const batchStartedAtMs = performanceNow();
    this.renderer.paintWorldRows(
      this.layer,
      plan.targetTop,
      plan.localStartRow,
      plan.rowCount,
      true,
    );
    const batchDurationMs = recordPerformanceSpan(
      this.config.batchMetricName,
      batchStartedAtMs,
      {
        rows: plan.rowCount,
        targetTop: plan.targetTop,
        immediate: plan.immediate,
      },
    );
    this.performance.batches += 1;
    this.performance.rowsPainted += plan.rowCount;
    this.performance.lastBatchRows = plan.rowCount;
    this.performance.lastBatchDurationMs = batchDurationMs;
    this.performance.maxBatchDurationMs = Math.max(
      this.performance.maxBatchDurationMs,
      batchDurationMs,
    );

    if (!plan.complete) return false;
    this.commit(plan.targetTop, plan.immediate);
    return true;
  }

  begin(targetTop) {
    const worldY = targetTop * this.renderer.config.tileSize;
    this.layer.setY(worldY).setVisible(false);
    this.pendingStartedAtMs = performanceNow();
  }

  commit(targetTop, immediate) {
    const previousLayer = this.renderer.layer;
    this.renderer.layer = this.layer;
    this.layer = previousLayer;
    this.renderer._streamTopTile = targetTop;
    this.renderer.layer.setVisible(true);
    this.layer.setVisible(false);

    const shiftDurationMs = recordPerformanceSpan(
      this.config.shiftMetricName,
      this.pendingStartedAtMs ?? performanceNow(),
      { targetTop, immediate },
    );
    this.performance.commits += 1;
    if (immediate) this.performance.immediateCommits += 1;
    this.performance.lastShiftDurationMs = shiftDurationMs;
    this.performance.maxShiftDurationMs = Math.max(
      this.performance.maxShiftDurationMs,
      shiftDurationMs,
    );
    this.pendingStartedAtMs = null;
  }

  getPendingWindow() {
    const targetTop = this.scheduler.pending?.targetTop;
    if (!Number.isFinite(targetTop) || !this.layer) return null;
    return {
      targetTop,
      layer: this.layer,
    };
  }

  cancel() {
    this.scheduler.cancel();
    this.pendingStartedAtMs = null;
    this.layer?.setVisible(false);
  }

  snapshot(currentTop) {
    return {
      streamTopTile: currentTop,
      pendingTargetTop: this.scheduler.pending?.targetTop ?? null,
      streamHeightTiles: this.config.heightTiles,
      rowsPerFrame: this.config.rowsPerFrame,
      ...this.performance,
    };
  }

  destroy() {
    this.cancel();
    this.layer?.destroy();
    this.layer = null;
  }
}
