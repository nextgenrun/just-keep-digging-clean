import { PLAYER_TRAVERSAL_CONFIG } from "../values/playerTraversal.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function moveVelocityToward(current, target, maximumDelta) {
  const delta = target - current;
  if (Math.abs(delta) <= maximumDelta) return target;
  return current + Math.sign(delta) * maximumDelta;
}

function resolveAxisAcceleration(current, target, config, tileSize) {
  if (target === 0) return config.brakingTilesPerSecondSquared * tileSize;
  const reversing = Math.sign(current) !== 0 && Math.sign(current) !== Math.sign(target);
  return (reversing
    ? config.reverseAccelerationTilesPerSecondSquared
    : config.accelerationTilesPerSecondSquared) * tileSize;
}

export class PlayerFlightMotion {
  constructor(body, config, flightConfig = PLAYER_TRAVERSAL_CONFIG.flight) {
    this.body = body;
    this.tileSize = config.tileSize;
    this.config = flightConfig;
    this.reset();
  }

  reset() {
    this._poweredLastFrame = false;
    this._coasting = false;
    this._takeoffAssistSeconds = 0;
    this._accelerationX = 0;
    this._accelerationY = 0;
  }

  updatePowered(deltaSeconds, input, grounded, effectiveFlightSpeedPxPerSec) {
    if (!this.body) return;
    const dt = this._resolveDelta(deltaSeconds);
    const axes = input?.getFlightMovement?.() || { x: 0, y: 0 };
    const startingTakeoff = grounded && !this._poweredLastFrame;
    if (startingTakeoff) {
      this._takeoffAssistSeconds = this.config.takeoffAssistSeconds;
      const impulse = effectiveFlightSpeedPxPerSec * this.config.maxSpeedMultiplier
        * this.config.takeoffImpulseSpeedMultiplier;
      this.body.vy = Math.min(this.body.vy, -impulse);
    }

    let axisX = clamp(Number(axes.x) || 0, -1, 1);
    let axisY = clamp(Number(axes.y) || 0, -1, 1);
    if (axisY === 0 && this._takeoffAssistSeconds > 0) axisY = -1;
    this._takeoffAssistSeconds = Math.max(0, this._takeoffAssistSeconds - dt);

    const magnitude = Math.hypot(axisX, axisY);
    if (magnitude > 1) {
      axisX /= magnitude;
      axisY /= magnitude;
    }
    const maximumSpeed = Math.max(0, effectiveFlightSpeedPxPerSec)
      * this.config.maxSpeedMultiplier;
    const targetX = axisX * maximumSpeed;
    const targetY = axisY * maximumSpeed;
    const previousX = this.body.vx;
    const previousY = this.body.vy;
    this.body.vx = moveVelocityToward(
      previousX,
      targetX,
      resolveAxisAcceleration(previousX, targetX, this.config, this.tileSize) * dt,
    );
    this.body.vy = moveVelocityToward(
      previousY,
      targetY,
      resolveAxisAcceleration(previousY, targetY, this.config, this.tileSize) * dt,
    );
    this._accelerationX = dt > 0 ? (this.body.vx - previousX) / dt : 0;
    this._accelerationY = dt > 0 ? (this.body.vy - previousY) / dt : 0;
    this._poweredLastFrame = true;
    this._coasting = true;
  }

  updateUnpowered(deltaSeconds, input, grounded, airControlSpeedPxPerSec) {
    if (!this.body) return false;
    if (grounded) {
      this.reset();
      return false;
    }
    if (!this._coasting && !this._poweredLastFrame) return false;

    const dt = this._resolveDelta(deltaSeconds);
    const horizontal = input?.getHorizontalMovement?.() || { left: false, right: false };
    const axis = horizontal.left ? -1 : horizontal.right ? 1 : 0;
    const previousX = this.body.vx;
    if (axis !== 0) {
      this.body.vx = moveVelocityToward(
        previousX,
        axis * Math.max(Math.abs(previousX), airControlSpeedPxPerSec),
        this.config.coastSteeringTilesPerSecondSquared * this.tileSize * dt,
      );
    } else {
      this.body.vx = moveVelocityToward(
        previousX,
        0,
        this.config.coastDragTilesPerSecondSquared * this.tileSize * dt,
      );
    }
    this._accelerationX = dt > 0 ? (this.body.vx - previousX) / dt : 0;
    this._accelerationY = 0;
    this._poweredLastFrame = false;
    this._coasting = Math.abs(this.body.vx) > this.config.coastStopSpeedPxPerSec;
    return true;
  }

  getSnapshot() {
    return Object.freeze({
      powered: this._poweredLastFrame,
      coasting: this._coasting,
      accelerationX: this._accelerationX,
      accelerationY: this._accelerationY,
    });
  }

  _resolveDelta(deltaSeconds) {
    return clamp(Number(deltaSeconds) || 0, 0, this.config.maxDeltaSeconds);
  }
}
