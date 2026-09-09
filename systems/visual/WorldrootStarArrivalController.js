function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function sineInOut(progress) {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

/** Owns deterministic Star flights so global hit-stop cannot strand their objects. */
export class WorldrootStarArrivalController {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.arrivals = new Set();
  }

  queue({ start, target, color }) {
    if (!this.scene || this.arrivals.size >= this.config.markers.maximumArrivalQueue) {
      return false;
    }
    const halo = this.scene.add.circle(start.x, start.y, 11, color, 0.18)
      .setDepth(this.config.placement.overlayDepth + 0.02);
    const core = this.scene.add.circle(start.x, start.y, 4.5, color, 0.95)
      .setDepth(this.config.placement.overlayDepth + 0.03);
    this.arrivals.add({
      halo,
      core,
      start,
      target,
      delay: this.arrivals.size * this.config.markers.arrivalStaggerMs,
      startedAt: null,
    });
    return true;
  }

  update(time = 0) {
    for (const arrival of [...this.arrivals]) {
      if (!Number.isFinite(arrival.startedAt)) arrival.startedAt = time;
      const elapsed = time - arrival.startedAt - arrival.delay;
      const progress = clamp01(elapsed / this.config.markers.arrivalDurationMs);
      const eased = sineInOut(progress);
      const x = arrival.start.x + (arrival.target.x - arrival.start.x) * eased;
      const y = arrival.start.y + (arrival.target.y - arrival.start.y) * eased;
      arrival.core.setPosition(x, y).setScale(1 + progress * 0.35);
      arrival.halo
        .setPosition(x, y)
        .setScale(1 + (1 - ((1 - progress) ** 2)) * 1.2)
        .setAlpha(0.18 * ((1 - progress) ** 2));
      if (progress >= 1) this._finish(arrival);
    }
  }

  _finish(arrival) {
    this.arrivals.delete(arrival);
    arrival.core?.destroy();
    arrival.halo?.destroy();
  }

  destroy() {
    for (const arrival of [...this.arrivals]) this._finish(arrival);
    this.scene = null;
  }
}
