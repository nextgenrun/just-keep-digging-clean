/**
 * PhysicsBody — Custom physics body for player movement.
 * Replaces Phaser Arcade Physics for tile-based collision.
 */
import { GAME_CONFIG } from "../values/gameConfig.js";
import { PLAYER_STATS_CONFIG } from "../values/playerStats.js";

export class PhysicsBody {
  constructor(config = GAME_CONFIG) {
    this.config = config;
    this.x = 0;
    this.y = 0;
    this.w = config.playerBodyWidthPx || 70;
    this.h = config.playerBodyHeightPx || 75;
    this.vx = 0;
    this.vy = 0;
    this.gravityY = config.gravityY || 1400;
    this.maxFallSpeed = config.maxFallSpeedPxPerSec || 99500;
    this.onGround = false;
    this.isClimbing = false;
    this.justJumped = false;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  resetVelocity() {
    this.vx = 0;
    this.vy = 0;
  }

  setClimbing(climbing) {
    this.isClimbing = climbing;
  }

  isJustJumped() { return this.justJumped; }
  resetJustJumped() { this.justJumped = false; }

  getBounds() {
    return { left: this.x, right: this.x + this.w, top: this.y, bottom: this.y + this.h };
  }

  getCenterX() { return this.x + this.w / 2; }
  getCenterY() { return this.y + this.h / 2; }

  applyGravity(dt) {
    if (this.isClimbing) return;
    this.vy += this.gravityY * dt;
    if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
  }

  applyHorizontalMovement(speed, left, right) {
    if (left) this.vx = -speed;
    else if (right) this.vx = speed;
    else this.vx = 0;
  }

  getEffectiveJumpVelocity() {
    return -Math.sqrt(2 * this.gravityY * 160); // Jump height ~160px
  }

  update(dt) {
    this.applyGravity(dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}