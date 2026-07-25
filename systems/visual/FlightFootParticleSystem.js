/** Emits a restrained two-foot trail behind the approved horizontal Survivor flight pose. */
import { PLAYER_FLIGHT_FOOT_FX_CONFIG } from "../../values/playerFlightFootFx.js";

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const randomBetween = (range) => range.min + Math.random() * (range.max - range.min);

function rotatePoint(x, y, rotation) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return {
    x: x * cosine - y * sine,
    y: x * sine + y * cosine,
  };
}

export class FlightFootParticleSystem {
  constructor(scene, player, profile, config = PLAYER_FLIGHT_FOOT_FX_CONFIG) {
    this.scene = scene;
    this.player = player;
    this.profile = profile;
    this.config = config;
    this._elapsedMs = 0;
    this._wasActive = false;
    this._live = new Set();
  }

  update(deltaMs, poweredFlight) {
    const active = this._isEligible(poweredFlight);
    if (!active) {
      this._elapsedMs = 0;
      this._wasActive = false;
      return;
    }

    if (!this._wasActive) {
      this._spawnBurst();
      this._wasActive = true;
    }

    this._elapsedMs += Math.min(
      Math.max(0, finite(deltaMs)),
      this.config.maxDeltaMs,
    );
    let bursts = 0;
    while (
      this._elapsedMs >= this.config.spawnIntervalMs
      && bursts < this.config.maxBurstsPerUpdate
    ) {
      this._elapsedMs -= this.config.spawnIntervalMs;
      this._spawnBurst();
      bursts += 1;
    }
  }

  _isEligible(poweredFlight) {
    const player = this.player;
    return this.config.enabled === true
      && poweredFlight === true
      && player?.active !== false
      && player?.visible !== false
      && player?.texture?.key === this.profile?.flySheet
      && this.profile?.visualSkin === this.config.requiredVisualSkin;
  }

  _spawnBurst() {
    this.config.footOffsets.forEach((offset) => this._spawnParticle(offset));
  }

  _spawnParticle(offset) {
    const player = this.player;
    const rotation = finite(player.rotation, finite(player.angle) * Math.PI / 180);
    const flipDirection = player.flipX ? -1 : 1;
    const localFoot = rotatePoint(
      offset.x * finite(player.displayWidth) * flipDirection,
      offset.y * finite(player.displayHeight),
      rotation,
    );
    const distance = randomBetween(this.config.trailDistancePx);
    const localTravel = rotatePoint(
      -distance * flipDirection,
      (Math.random() * 2 - 1) * this.config.trailDriftPx,
      rotation,
    );
    const jitterX = (Math.random() * 2 - 1) * this.config.lateralJitterPx;
    const jitterY = (Math.random() * 2 - 1) * this.config.lateralJitterPx;
    const startX = finite(player.x) + localFoot.x + jitterX;
    const startY = finite(player.y) + localFoot.y + jitterY;
    const colors = this.config.colors;
    const color = colors[Math.floor(Math.random() * colors.length)] ?? colors[0];
    const particle = this.scene.add.circle(
      startX,
      startY,
      randomBetween(this.config.radiusPx),
      color,
      this.config.startAlpha,
    );

    particle.setDepth?.(finite(player.depth) + this.config.depthOffset);
    particle.setBlendMode?.(globalThis.Phaser?.BlendModes?.ADD ?? "ADD");
    this._live.add(particle);

    this.scene.tweens.add({
      targets: particle,
      x: startX + localTravel.x,
      y: startY + localTravel.y,
      alpha: 0,
      scale: this.config.endScale,
      duration: randomBetween(this.config.lifetimeMs),
      ease: "Cubic.Out",
      onComplete: () => {
        this._live.delete(particle);
        particle.destroy?.();
      },
    });
  }

  destroy() {
    this._live.forEach((particle) => {
      this.scene.tweens?.killTweensOf?.(particle);
      particle.destroy?.();
    });
    this._live.clear();
    this._elapsedMs = 0;
    this._wasActive = false;
  }
}
