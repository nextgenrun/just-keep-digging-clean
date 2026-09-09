import {
  PLAYER_TRAVERSAL_CONFIG,
  resolvePlayerJumpMomentumEnabled,
} from "../values/playerTraversal.js";

function moveToward(current, target, maxChange) {
  if (current < target) return Math.min(target, current + maxChange);
  if (current > target) return Math.max(target, current - maxChange);
  return target;
}

export function resolveFixedJumpVelocityPxPerSec({
  gravityPxPerSecondSquared,
  tileSizePx,
  heightTiles = PLAYER_TRAVERSAL_CONFIG.jump.heightTiles,
}) {
  const gravity = Math.max(0, Number(gravityPxPerSecondSquared) || 0);
  const heightPx = Math.max(0, Number(tileSizePx) || 0) * Math.max(0, Number(heightTiles) || 0);
  return Math.sqrt(2 * gravity * heightPx);
}

export function resolveAirborneJumpVelocityX({
  currentVelocityPxPerSec,
  inputDirection,
  maxGroundSpeedPxPerSec,
  inheritedSpeedPxPerSec = 0,
  tileSizePx,
  deltaSeconds,
  config = PLAYER_TRAVERSAL_CONFIG.jump,
}) {
  const current = Number(currentVelocityPxPerSec) || 0;
  const direction = Math.sign(Number(inputDirection) || 0);
  const tileSize = Math.max(0, Number(tileSizePx) || 0);
  const maxSpeed = Math.max(
    Math.max(0, Number(maxGroundSpeedPxPerSec) || 0)
      * Math.max(0, Number(config.maxSpeedMultiplier) || 0),
    Math.abs(Number(inheritedSpeedPxPerSec) || 0),
  );
  const dt = Math.min(
    Math.max(0, Number(deltaSeconds) || 0),
    Math.max(0, Number(config.maxDeltaSeconds) || 0),
  );

  if (direction === 0) {
    const drag = Math.max(0, Number(config.releaseDragTilesPerSecondSquared) || 0);
    const next = moveToward(current, 0, drag * tileSize * dt);
    const stopSpeed = Math.max(0, Number(config.stopSpeedPxPerSecond) || 0);
    return Math.abs(next) <= stopSpeed ? 0 : next;
  }

  const reversing = current !== 0 && Math.sign(current) !== direction;
  const accelerationTiles = reversing
    ? config.reverseAccelerationTilesPerSecondSquared
    : config.accelerationTilesPerSecondSquared;
  const acceleration = Math.max(0, Number(accelerationTiles) || 0) * tileSize;
  return moveToward(current, direction * maxSpeed, acceleration * dt);
}

export class PlayerJumpMotion {
  constructor(body, config, traversalConfig = PLAYER_TRAVERSAL_CONFIG.jump) {
    this.body = body;
    this.tileSizePx = Math.max(0, Number(config.tileSize) || 0);
    this.config = traversalConfig;
    this.reset();
    this.momentumEnabled = resolvePlayerJumpMomentumEnabled(undefined, traversalConfig);
    this.jumpVelocityPxPerSec = resolveFixedJumpVelocityPxPerSec({
      gravityPxPerSecondSquared: config.gravityY,
      tileSizePx: config.tileSize,
      heightTiles: traversalConfig.heightTiles,
    });
  }

  reset() {
    this.airborne = false;
    this.inheritedSpeedPxPerSec = 0;
    this.landingSpeedPxPerSec = 0;
  }

  _beginAirborne() {
    this.airborne = true;
    this.inheritedSpeedPxPerSec = Math.abs(Number(this.body?.vx) || 0);
    this.landingSpeedPxPerSec = 0;
  }

  tryStart(input, grounded, flightActive) {
    const requested = input?.consumeJumpInput?.() === true;
    if (!requested || !grounded || flightActive || !this.body) return false;
    this._beginAirborne();
    this.body.vy = -this.jumpVelocityPxPerSec;
    this.body.onGround = false;
    return true;
  }

  updateAirborneHorizontal(deltaSeconds, horizontalInput, grounded, flightActive, maxGroundSpeedPxPerSec) {
    if (!this.momentumEnabled || grounded || flightActive || !this.body) return false;
    // A running takeoff or a step off a ledge retains its existing speed limit.
    if (!this.airborne) this._beginAirborne();

    const direction = horizontalInput?.left === horizontalInput?.right
      ? 0
      : horizontalInput?.right === true ? 1 : -1;
    this.body.vx = resolveAirborneJumpVelocityX({
      currentVelocityPxPerSec: this.body.vx,
      inputDirection: direction,
      maxGroundSpeedPxPerSec,
      inheritedSpeedPxPerSec: this.inheritedSpeedPxPerSec,
      tileSizePx: this.tileSizePx,
      deltaSeconds,
      config: this.config,
    });
    return true;
  }

  /** Bleed off landing momentum before handing back to ordinary ground motion. */
  updateGroundedHorizontal(deltaSeconds, horizontalInput, grounded, flightActive, groundSpeedPxPerSec) {
    if (!this.momentumEnabled || !grounded || flightActive || !this.body) return false;
    if (this.airborne) {
      this.landingSpeedPxPerSec = Math.abs(Number(this.body.vx) || 0);
      this.inheritedSpeedPxPerSec = 0;
      this.airborne = false;
    }
    if (!this.landingSpeedPxPerSec) return false;
    const current = Number(this.body.vx) || 0;
    const direction = horizontalInput?.left === horizontalInput?.right
      ? 0 : horizontalInput?.right === true ? 1 : -1;
    const sameDirection = direction === Math.sign(current);
    const target = sameDirection ? direction * Math.max(0, Number(groundSpeedPxPerSec) || 0) : 0;
    // Continued travel below the target speed immediately uses normal acceleration.
    if (!current || (sameDirection && Math.abs(current) <= Math.abs(target))) {
      this.landingSpeedPxPerSec = 0;
      return false;
    }
    const durationMs = direction && !sameDirection
      ? this.config.landingReverseBrakeMs : this.config.landingReleaseToStopMs;
    const dt = Math.min(Math.max(0, Number(deltaSeconds) || 0), this.config.maxDeltaSeconds);
    const next = moveToward(current, target, this.landingSpeedPxPerSec * dt / (durationMs / 1000));
    this.body.vx = Math.abs(next) <= this.config.stopSpeedPxPerSecond ? 0 : next;
    if (this.body.vx === target || !this.body.vx) this.landingSpeedPxPerSec = 0;
    return true;
  }
}
