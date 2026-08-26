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
  tileSizePx,
  deltaSeconds,
  config = PLAYER_TRAVERSAL_CONFIG.jump,
}) {
  const current = Number(currentVelocityPxPerSec) || 0;
  const direction = Math.sign(Number(inputDirection) || 0);
  const tileSize = Math.max(0, Number(tileSizePx) || 0);
  const maxSpeed = Math.max(0, Number(maxGroundSpeedPxPerSec) || 0)
    * Math.max(0, Number(config.maxSpeedMultiplier) || 0);
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
    this.momentumEnabled = resolvePlayerJumpMomentumEnabled(undefined, traversalConfig);
    this.jumpVelocityPxPerSec = resolveFixedJumpVelocityPxPerSec({
      gravityPxPerSecondSquared: config.gravityY,
      tileSizePx: config.tileSize,
      heightTiles: traversalConfig.heightTiles,
    });
  }

  tryStart(input, grounded, flightActive) {
    const requested = input?.consumeJumpInput?.() === true;
    if (!requested || !grounded || flightActive || !this.body) return false;
    this.body.vy = -this.jumpVelocityPxPerSec;
    this.body.onGround = false;
    return true;
  }

  updateAirborneHorizontal(deltaSeconds, horizontalInput, grounded, flightActive, maxGroundSpeedPxPerSec) {
    if (!this.momentumEnabled || grounded || flightActive || !this.body) return false;

    const direction = horizontalInput?.left === horizontalInput?.right
      ? 0
      : horizontalInput?.right === true ? 1 : -1;
    this.body.vx = resolveAirborneJumpVelocityX({
      currentVelocityPxPerSec: this.body.vx,
      inputDirection: direction,
      maxGroundSpeedPxPerSec,
      tileSizePx: this.tileSizePx,
      deltaSeconds,
      config: this.config,
    });
    return true;
  }
}
