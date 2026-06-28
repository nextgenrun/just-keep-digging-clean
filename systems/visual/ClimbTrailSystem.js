/**
 * ClimbTrailSystem — ghost-sprite trail during climb/fly animations.
 *
 * Listens to ANIMATION_UPDATE on the player sprite. While a climb animation
 * is active, spawns fading ghost copies of the current player frame to
 * create a soft motion-blur trail effect during flying/climbing.
 */
export class ClimbTrailSystem {
  constructor(scene, player, config) {
    this.scene = scene;
    this.player = player;
    this.config = config;
    this._active = false;

    this._onAnimUpdate = () => {
      if (this._active) this._spawnGhost();
    };

    this.player.on(Phaser.Animations.Events.ANIMATION_UPDATE, this._onAnimUpdate);
  }

  /** Call when player enters climb/fly state */
  start() {
    if (this._active) return; // Already active
    this._active = true;
    // Spawn an immediate ghost so the very first frame gets a trail
    this._spawnGhost();
  }

  /** Call when player exits climb/fly state */
  stop() {
    this._active = false;
  }

  _spawnGhost() {
    const p = this.player;
    const ghost = this.scene.add.image(p.x, p.y, p.texture.key, p.frame.name);
    ghost.setOrigin(p.originX, p.originY);
    ghost.setDisplaySize(p.displayWidth, p.displayHeight);
    ghost.setFlipX(p.flipX);
    ghost.setDepth(this.config.depth);
    ghost.setAlpha(this.config.alpha);
    ghost.setTint(this.config.tint);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: this.config.fadeMs,
      ease: 'Power2.in',
      onComplete: () => ghost.destroy(),
    });
  }

  destroy() {
    this.player.off(Phaser.Animations.Events.ANIMATION_UPDATE, this._onAnimUpdate);
  }
}