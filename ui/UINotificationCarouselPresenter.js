import { UI_NOTIFICATION_CAROUSEL_CONFIG } from "../values/uiNotificationCarousel.js";

/**
 * Owns carousel timing and transitions while queue state stays in the system.
 */
export class UINotificationCarouselPresenter {
  constructor(scene, view, callbacks) {
    this.scene = scene;
    this.view = view;
    this.callbacks = callbacks;
    this.timer = null;
    this.suspended = false;
    this.transitioning = false;
    this.transitionKind = null;
    this._transitionVersion = 0;
  }

  render() {
    const snapshot = this.callbacks.getSnapshot();
    this.view.render(snapshot.entry, snapshot.position, snapshot.total);
    this._placeAtBase();
  }

  refresh() {
    const snapshot = this.callbacks.getSnapshot();
    this.view.render(snapshot.entry, snapshot.position, snapshot.total);
    if (!this.transitioning) this._placeAtBase();
  }

  present({ animate = true } = {}) {
    this.interrupt();
    const snapshot = this.callbacks.getSnapshot();
    if (!snapshot.entry) {
      this.view.render(null, 0, 0);
      return false;
    }

    this.render();
    if (this.suspended) return true;
    const cfg = UI_NOTIFICATION_CAROUSEL_CONFIG.transitions;
    if (!animate || !this.scene?.tweens) {
      this.view.root.setAlpha(1);
      this._placeAtBase();
      this.schedule();
      return true;
    }

    const version = this._beginTransition("enter");
    const position = this._position();
    this.view.root
      .setAlpha(0)
      .setPosition(position.x, position.y - cfg.enterOffsetYPx);
    this.scene.tweens.add({
      targets: this.view.root,
      alpha: 1,
      y: position.y,
      duration: cfg.enterMs,
      ease: "Power2.out",
      onComplete: () => {
        if (!this._finishTransition(version)) return;
        this.view.root.setAlpha(1);
        this._placeAtBase();
        this.schedule();
      },
    });
    return true;
  }

  switch() {
    this.interrupt();
    const snapshot = this.callbacks.getSnapshot();
    if (!snapshot.entry) {
      this.view.render(null, 0, 0);
      return false;
    }

    this.render();
    if (this.suspended) return true;
    const cfg = UI_NOTIFICATION_CAROUSEL_CONFIG.transitions;
    if (!this.scene?.tweens) {
      this.view.root.setAlpha(1);
      this.schedule();
      return true;
    }

    const version = this._beginTransition("switch");
    this.view.root.setAlpha(cfg.switchAlpha);
    this.scene.tweens.add({
      targets: this.view.root,
      alpha: 1,
      duration: cfg.switchMs,
      ease: "Power1.inOut",
      onComplete: () => {
        if (!this._finishTransition(version)) return;
        this.view.root.setAlpha(1);
        this._placeAtBase();
        this.schedule();
      },
    });
    return true;
  }

  expire(entryId) {
    const snapshot = this.callbacks.getSnapshot();
    if (!snapshot.entry || snapshot.entry.id !== entryId || this.suspended) {
      return false;
    }
    this.interrupt();
    const cfg = UI_NOTIFICATION_CAROUSEL_CONFIG.transitions;
    if (!this.scene?.tweens) {
      this.callbacks.onExpire(entryId);
      this.present({ animate: false });
      return true;
    }

    const version = this._beginTransition("expire");
    const position = this._position();
    this.scene.tweens.add({
      targets: this.view.root,
      alpha: 0,
      y: position.y - cfg.exitOffsetYPx,
      duration: cfg.exitMs,
      ease: "Power1.in",
      onComplete: () => {
        if (!this._finishTransition(version)) return;
        this.callbacks.onExpire(entryId);
        this.present();
      },
    });
    return true;
  }

  schedule() {
    this.cancelTimer();
    const entry = this.callbacks.getSnapshot().entry;
    if (this.suspended || this.transitioning || !entry) {
      return;
    }
    const entryId = entry.id;
    this.timer = this.scene.time.delayedCall(
      UI_NOTIFICATION_CAROUSEL_CONFIG.visibleDurationMs,
      () => {
        this.timer = null;
        this.expire(entryId);
      },
    );
  }

  setPaused(paused) {
    const resolved = Boolean(paused);
    if (resolved === this.suspended) return;
    this.suspended = resolved;
    if (this.timer) this.timer.paused = resolved;
    this.view.setSuspended(resolved);
    if (
      !resolved
      && !this.timer
      && !this.transitioning
      && this.callbacks.getSnapshot().entry
    ) {
      this.view.root.setAlpha(1);
      this.refresh();
      this.schedule();
    }
  }

  updatePosition() {
    this._placeAtBase();
  }

  clear() {
    this.interrupt();
    this.view.render(null, 0, 0);
  }

  interrupt() {
    this.cancelTimer();
    this._transitionVersion += 1;
    this.scene?.tweens?.killTweensOf?.(this.view?.root);
    this.transitioning = false;
    this.transitionKind = null;
    if (this.view?.root) {
      this.view.root.setAlpha(1);
      this._placeAtBase();
    }
  }

  cancelTimer() {
    this.timer?.remove?.();
    this.timer = null;
  }

  destroy() {
    this.clear();
    this.view?.destroy();
    this.scene = null;
    this.view = null;
    this.callbacks = null;
  }

  _placeAtBase() {
    const position = this._position();
    this.view.root.setPosition(position.x, position.y);
  }

  _position() {
    const centerX = this._centerX();
    const baseY = this._baseY();
    return this.callbacks.resolvePosition?.(centerX, baseY)
      || { x: centerX, y: baseY };
  }

  _baseY() {
    return this.callbacks.getBaseY();
  }

  _centerX() {
    return this.callbacks.getCenterX();
  }

  _beginTransition(kind) {
    this.transitioning = true;
    this.transitionKind = kind;
    this._transitionVersion += 1;
    return this._transitionVersion;
  }

  _finishTransition(version) {
    if (version !== this._transitionVersion) return false;
    this.transitioning = false;
    this.transitionKind = null;
    return true;
  }
}
