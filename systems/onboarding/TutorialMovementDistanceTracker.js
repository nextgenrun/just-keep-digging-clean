export class TutorialMovementDistanceTracker {
  constructor() {
    this.reset();
  }

  reset(positionX = null) {
    this.lastPositionX = Number.isFinite(positionX) ? positionX : null;
    this.distancePx = 0;
  }

  update(positionX) {
    if (!Number.isFinite(positionX)) return this.distancePx;
    if (Number.isFinite(this.lastPositionX)) {
      this.distancePx += Math.abs(positionX - this.lastPositionX);
    }
    this.lastPositionX = positionX;
    return this.distancePx;
  }
}
