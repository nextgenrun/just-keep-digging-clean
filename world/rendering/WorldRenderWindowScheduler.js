export class WorldRenderWindowScheduler {
  constructor(config, worldDepth) {
    this.config = config;
    this.worldDepth = worldDepth;
    this.pending = null;
  }

  next(playerTile, currentTop) {
    const targetTop = this.resolveTargetTop(playerTile, currentTop);
    if (targetTop === currentTop) {
      this.pending = null;
      return null;
    }

    const started = !this.pending || this.pending.targetTop !== targetTop;
    if (started) {
      this.pending = {
        targetTop,
        nextLocalRow: 0,
      };
    }

    const outsideCurrentWindow = playerTile.ty < currentTop
      || playerTile.ty >= currentTop + this.config.heightTiles;
    const immediate = outsideCurrentWindow
      || Math.abs(targetTop - currentTop) >= this.config.immediateShiftDistanceTiles;
    const remainingRows = this.config.heightTiles - this.pending.nextLocalRow;
    const rowCount = immediate
      ? remainingRows
      : Math.min(this.config.rowsPerFrame, remainingRows);
    const plan = {
      targetTop,
      localStartRow: this.pending.nextLocalRow,
      rowCount,
      started,
      immediate,
      complete: rowCount === remainingRows,
    };
    this.pending.nextLocalRow += rowCount;
    if (plan.complete) this.pending = null;
    return plan;
  }

  resolveTargetTop(playerTile, currentTop) {
    if (!playerTile || !Number.isFinite(playerTile.ty)) return currentTop;
    const minSafeY = currentTop + this.config.marginTiles;
    const maxSafeY = currentTop
      + this.config.heightTiles
      - this.config.marginTiles
      - 1;
    if (playerTile.ty >= minSafeY && playerTile.ty <= maxSafeY) return currentTop;

    const maxTop = Math.max(0, this.worldDepth - this.config.heightTiles);
    if (playerTile.ty > maxSafeY) {
      const steps = Math.ceil(
        (playerTile.ty - maxSafeY) / this.config.stepTiles
      );
      return Math.min(maxTop, currentTop + steps * this.config.stepTiles);
    }
    const steps = Math.ceil(
      (minSafeY - playerTile.ty) / this.config.stepTiles
    );
    return Math.max(0, currentTop - steps * this.config.stepTiles);
  }

  cancel() {
    this.pending = null;
  }
}
