/**
 * Converts the bound DOWN action into a deliberate one-way surface drop.
 */
export class PlayerSurfaceDropController {
  constructor(input, collisionSystem, physicsBody, surfaceRow) {
    this.input = input;
    this.collisionSystem = collisionSystem;
    this.physicsBody = physicsBody;
    this.surfaceRow = surfaceRow;
  }

  update() {
    if (!this.input?.consumeSurfaceDropInput?.()) return false;
    return this.collisionSystem?.tryBeginSurfaceDropThrough?.(
      this.physicsBody,
      this.surfaceRow,
    ) === true;
  }

  reset() {
    this.collisionSystem?.cancelSurfaceDropThrough?.(this.physicsBody);
  }
}
