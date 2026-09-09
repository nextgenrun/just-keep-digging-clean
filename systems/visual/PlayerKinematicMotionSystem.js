import { PLAYER_KINEMATIC_MOTION_CONFIG } from "../../values/playerKinematicMotion.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function calculateStrideMatchedTimeScale({
  speedPxPerSec,
  frameCount,
  frameRate,
  stridePx,
  minTimeScale,
  maxTimeScale,
}) {
  if (!(speedPxPerSec > 0) || !(frameCount > 0) || !(frameRate > 0) || !(stridePx > 0)) return 1;
  const sourceDurationSeconds = frameCount / frameRate;
  return clamp(
    sourceDurationSeconds * speedPxPerSec / stridePx,
    minTimeScale,
    maxTimeScale,
  );
}

export class PlayerKinematicMotionSystem {
  constructor(scene, player, controller, profile, config = PLAYER_KINEMATIC_MOTION_CONFIG) {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.profile = profile;
    this.config = config;
    this.enabled = config.enabled === true && profile?.isUalNative === true;
    this.reset();
  }

  reset() {
    const body = this.controller?.physicsBody;
    this._lastX = Number.isFinite(body?.x) ? body.x : null;
    this._lastY = Number.isFinite(body?.y) ? body.y : null;
    this._speedX = 0;
    this._frameSpeedX = 0;
    this._speedY = 0;
    this._hasMotionSample = false;
    this._falling = false;
  }

  samplePhysics(deltaMs) {
    if (!this.enabled) return;
    const body = this.controller?.physicsBody;
    if (!body || !Number.isFinite(body.x) || !Number.isFinite(body.y)) return;
    if (this._lastX === null || this._lastY === null) {
      this.reset();
      return;
    }
    const sampling = this.config.sampling;
    const dt = clamp(Number(deltaMs) || 0, 1, sampling.maxDeltaMs) / 1000;
    const dx = body.x - this._lastX;
    const dy = body.y - this._lastY;
    this._lastX = body.x;
    this._lastY = body.y;
    const tileSize = this.scene?.config?.tileSize || 1;
    if (Math.hypot(dx, dy) > tileSize * sampling.maxDisplacementTiles) {
      this._speedX = 0;
      this._frameSpeedX = 0;
      this._speedY = 0;
      this._hasMotionSample = false;
      return;
    }
    this._frameSpeedX = dx / (Math.max(1, Number(deltaMs) || 0) / 1000);
    const alpha = 1 - Math.exp(-sampling.responsePerSecond * dt);
    this._speedX += (dx / dt - this._speedX) * alpha;
    this._speedY += (dy / dt - this._speedY) * alpha;
    if (Math.abs(this._speedX) < sampling.zeroSpeedEpsilonPxPerSec) this._speedX = 0;
    if (Math.abs(this._speedY) < sampling.zeroSpeedEpsilonPxPerSec) this._speedY = 0;
    this._hasMotionSample = true;
  }

  getHorizontalSpeedPxPerSec() {
    return Math.abs(this._speedX);
  }

  getResolvedVelocityX() {
    return this._speedX;
  }

  getVerticalSpeedPxPerSec() {
    return Math.abs(this._speedY);
  }

  getResolvedVelocityY() {
    return this._speedY;
  }

  getTravelSpeedPxPerSec() {
    if (this.enabled) return Math.hypot(this._speedX, this._speedY);
    const body = this.controller?.physicsBody;
    return Math.hypot(body?.vx || 0, body?.vy || 0);
  }

  isFalling(velocityY = this.controller?.physicsBody?.vy || 0) {
    if (velocityY >= this.config.airborne.fallingEnterVyPxPerSec) this._falling = true;
    else if (velocityY <= this.config.airborne.fallingExitVyPxPerSec) this._falling = false;
    return this._falling;
  }

  getGroundedVisualYOffset() {
    return this.enabled
      ? this.config.anchor.ualGroundedOffsetPx
      : this.config.anchor.legacyGroundedOffsetPx;
  }

  resolveLocomotionTimeScale(animationKey, animation, speedOverridePxPerSec = null) {
    if (!this.enabled || !animation) return null;
    const isRun = animationKey === this.profile.walkRunAnim;
    const cadence = isRun ? this.config.locomotion.run : this.config.locomotion.walk;
    const hasSpeedOverride = Number.isFinite(speedOverridePxPerSec);
    const speed = this.profile.characterGroundingPolish && this._hasMotionSample
      ? Math.abs(this._frameSpeedX)
      : hasSpeedOverride ? Math.abs(speedOverridePxPerSec) : Math.abs(this._speedX);
    if (speed < this.config.sampling.zeroSpeedEpsilonPxPerSec) return this.profile.characterGroundingPolish ? 0 : 1;
    const tileSize = this.scene?.config?.tileSize || 1;
    const profileStride = Number(
      this.profile?.strideTilesPerCycleByAnimation?.[animationKey],
    );
    const strideTilesPerCycle = Number.isFinite(profileStride) && profileStride > 0
      ? profileStride
      : cadence.strideTilesPerCycle;
    return calculateStrideMatchedTimeScale({
      speedPxPerSec: speed,
      frameCount: animation.frames?.length || 1,
      frameRate: animation.frameRate || 30,
      stridePx: this.profile.stridePxByAnimation?.[animationKey] || strideTilesPerCycle * tileSize,
      minTimeScale: this.profile.characterGroundingPolish?.minimumTimeScale ?? cadence.minTimeScale,
      maxTimeScale: this.profile.characterGroundingPolish?.maximumTimeScale ?? cadence.maxTimeScale,
    });
  }

  destroy() {
    this.enabled = false;
    this.player = null;
    this.controller = null;
  }
}
