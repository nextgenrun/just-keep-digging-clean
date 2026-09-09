/** Keeps a moving side-dig body outside the solid target tile face. */
export class MovingSideDigStandOffController {
  constructor(body, worldModel, tileSize, config = null) {
    this.body = body;
    this.worldModel = worldModel;
    this.tileSize = tileSize;
    this.config = config;
    this._active = null;
  }

  begin({ targetTile, directionX } = {}) {
    this.end();
    const direction = Math.sign(Number(directionX) || 0);
    if (
      this.config?.enabled !== true
      || !this.body
      || !(this.tileSize > 0)
      || !Number.isFinite(targetTile?.tx)
      || !Number.isFinite(targetTile?.ty)
      || direction === 0
    ) return false;
    this._active = {
      targetTile: { tx: targetTile.tx, ty: targetTile.ty },
      directionX: direction,
    };
    this.update();
    return this._active !== null;
  }

  update() {
    const active = this._active;
    const body = this.body;
    if (!active || !body) return false;
    if (
      this.config.releaseWhenTargetNotSolid === true
      && this.worldModel?.isSolid?.(active.targetTile.tx, active.targetTile.ty) !== true
    ) {
      this.end();
      return false;
    }

    const baseDistancePx = Math.max(0, Number(this.config.distancePx) || 0);
    const referenceBodyWidthPx = Number(this.config.referenceBodyWidthPx);
    const preserveVisualCenterToFace = this.config.preserveVisualCenterToFace === true
      && referenceBodyWidthPx > 0;
    const widthCompensationPx = preserveVisualCenterToFace
      ? Math.max(0, body.w - referenceBodyWidthPx) * 0.5
      : 0;
    const minimumDistancePx = Math.max(0, Number(this.config.minimumDistancePx) || 0);
    const distancePx = Math.max(minimumDistancePx, baseDistancePx - widthCompensationPx);
    const epsilonPx = Math.max(0, Number(this.config.epsilonPx) || 0);
    const directionX = active.directionX;
    const faceX = directionX > 0
      ? active.targetTile.tx * this.tileSize
      : (active.targetTile.tx + 1) * this.tileSize;
    const boundaryX = directionX > 0
      ? faceX - body.w - distancePx
      : faceX + distancePx;
    const tooClose = directionX > 0
      ? body.x > boundaryX + epsilonPx
      : body.x < boundaryX - epsilonPx;
    if (tooClose) {
      if (typeof body.setPosition === "function") {
        if (body.setPosition(boundaryX, body.y) === false) {
          this.end();
          body.vx = 0;
          return false;
        }
      } else {
        body.x = boundaryX;
      }
    }

    const movingTowardTarget = directionX * (Number(body.vx) || 0) > 0;
    const gapPx = directionX > 0
      ? faceX - (body.x + body.w)
      : body.x - faceX;
    if (
      this.config.stopTowardVelocity === true
      && movingTowardTarget
      && gapPx <= distancePx + epsilonPx
    ) {
      body.vx = 0;
    }
    return tooClose;
  }

  end() {
    const wasActive = this._active !== null;
    this._active = null;
    return wasActive;
  }

  get isActive() {
    return this._active !== null;
  }
}
