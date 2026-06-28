/**
 * ScreenFlashSystem — brief full-screen color tint on impactful events.
 *
 * Uses a single reusable screen-space rectangle. Depth 1002 places it
 * above HUD (1001) but it clears in ~120ms so it never obscures the UI.
 */
export class ScreenFlashSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this._activeTween = null;

    const { width, height } = scene.scale;
    this._rect = scene.add.rectangle(0, 0, width, height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1002)
      .setAlpha(0)
      .setFillStyle(0xffffff);
  }

  flashCrit() {
    this._flash(this.config.critColor, this.config.critAlpha, this.config.critDuration);
  }

  flashLucky() {
    this._flash(this.config.luckyColor, this.config.luckyAlpha, this.config.luckyDuration);
  }

  _flash(color, alpha, duration) {
    if (this._activeTween) {
      this._activeTween.stop();
      this._activeTween = null;
    }
    this._rect.setFillStyle(color);
    this._rect.setAlpha(alpha);
    this._activeTween = this.scene.tweens.add({
      targets: this._rect,
      alpha: 0,
      duration,
      ease: 'Power2.out',
      onComplete: () => { this._activeTween = null; },
    });
  }

  destroy() {
    if (this._activeTween) {
      this._activeTween.stop();
      this._activeTween = null;
    }
    this._rect?.destroy();
  }
}
