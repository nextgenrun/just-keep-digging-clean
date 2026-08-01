/**
 * Converts the bound DOWN action into a deliberate one-way surface drop.
 */
export class PlayerSurfaceDropController {
  constructor(input, collisionSystem, physicsBody, surfaceRow) {
    this.input = input;
    this.collisionSystem = collisionSystem;
    this.physicsBody = physicsBody;
    this.surfaceRow = surfaceRow;
    this.canDrop = null;
    this.onBlocked = null;
  }

  setAccessPolicy(canDrop, onBlocked) {
    this.canDrop = typeof canDrop === "function" ? canDrop : null;
    this.onBlocked = typeof onBlocked === "function" ? onBlocked : null;
  }

  update() {
    if (!this.input?.consumeSurfaceDropInput?.()) return false;
    if (this.canDrop && this.canDrop() !== true) {
      this.onBlocked?.();
      return false;
    }
    return this.collisionSystem?.tryBeginSurfaceDropThrough?.(
      this.physicsBody,
      this.surfaceRow,
    ) === true;
  }

  reset() {
    this.collisionSystem?.cancelSurfaceDropThrough?.(this.physicsBody);
  }
}
