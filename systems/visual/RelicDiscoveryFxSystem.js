/** Presents a bounded, state-independent Ancient Relic discovery celebration. */
import { ANCIENT_RELIC_CONFIG } from "../../values/ancientRelics.js";
import { RELIC_DISCOVERY_FX_CONFIG } from "../../values/relicDiscoveryFxConfig.js";
import {
  getRelicColor,
  spawnRelicParticles,
  spawnRelicSourceFx,
} from "./relicDiscoveryFxBurst.js";

const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export class RelicDiscoveryFxSystem {
  constructor(scene, {
    config = RELIC_DISCOVERY_FX_CONFIG,
    targetProvider = null,
    reducedMotion,
    lowFx = false,
  } = {}) {
    this.scene = scene;
    this.config = config;
    this.targetProvider = targetProvider;
    this.reducedMotion = reducedMotion
      ?? globalThis.matchMedia?.(config.reducedMotionMediaQuery)?.matches === true;
    this.lowFx = lowFx === true;
    this._runs = new Set();
    this._destroyed = false;
  }

  playDiscovery({
    anchor,
    iconAsset,
    collectorTarget,
    relicCount,
    reducedMotion,
    lowFx,
  } = {}) {
    const icon = this._resolveIcon(iconAsset);
    const start = this._resolveAnchor(anchor);
    const target = this._resolveCollectorTarget(collectorTarget, relicCount);
    if (
      this._destroyed || this.config.enabled !== true || !icon || !start || !target
      || !Number.isFinite(relicCount) || !this._isVisible(start)
    ) return false;

    this._trimRuns();
    const mode = this._resolveMode(reducedMotion, lowFx);
    const run = { objects: new Set(), tweens: new Set(), disposed: false, mode };
    this._runs.add(run);
    spawnRelicSourceFx(this, run, start, mode);
    if (mode.tokenTravel) {
      this._spawnTravelToken(
        run,
        start,
        target,
        collectorTarget,
        icon,
        relicCount
      );
    }
    else this._spawnReducedArrival(run, target, icon, relicCount);
    return true;
  }

  getActiveSequenceCount() {
    return this._runs.size;
  }

  _resolveMode(reducedMotion, lowFx) {
    if (reducedMotion ?? this.reducedMotion) return this.config.modes.reducedMotion;
    if (lowFx ?? this.lowFx) return this.config.modes.lowFx;
    return this.config.modes.full;
  }

  _resolveIcon(iconAsset) {
    if (typeof iconAsset === "string" && iconAsset) return { key: iconAsset };
    if (typeof iconAsset?.key !== "string" || !iconAsset.key) return null;
    return { key: iconAsset.key, frame: iconAsset.frame };
  }

  _resolveAnchor(anchor) {
    const point = anchor?.getCenter?.({ x: 0, y: 0 }, true) || anchor;
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
    if (anchor?.space !== this.config.coordinateSpaces.screen) {
      return { x: point.x, y: point.y };
    }
    const camera = this.scene?.cameras?.main;
    if (!camera) return { x: point.x, y: point.y };
    if (typeof camera.getWorldPoint === "function") {
      const worldPoint = camera.getWorldPoint(point.x, point.y);
      if (Number.isFinite(worldPoint?.x) && Number.isFinite(worldPoint?.y)) {
        return { x: worldPoint.x, y: worldPoint.y };
      }
    }
    const zoomX = finite(camera.zoomX, finite(camera.zoom, 1));
    const zoomY = finite(camera.zoomY, finite(camera.zoom, 1));
    return {
      x: (point.x - finite(camera.x, 0)) / zoomX + finite(camera.scrollX, 0),
      y: (point.y - finite(camera.y, 0)) / zoomY + finite(camera.scrollY, 0),
    };
  }

  _resolveCollectorTarget(collectorTarget, relicCount) {
    const supplied = collectorTarget || this.targetProvider?.(relicCount);
    return this._resolveAnchor(supplied);
  }

  _isVisible(point) {
    const view = this.scene?.cameras?.main?.worldView;
    if (
      !Number.isFinite(view?.x)
      || !Number.isFinite(view?.y)
      || !Number.isFinite(view?.width)
      || !Number.isFinite(view?.height)
    ) return true;
    const padding = this.config.visibility.paddingPx;
    return point.x >= view.x - padding
      && point.x <= view.x + view.width + padding
      && point.y >= view.y - padding
      && point.y <= view.y + view.height + padding;
  }

  _spawnTravelToken(run, start, target, collectorTarget, icon, relicCount) {
    const token = this._createToken(run, start, icon, this.config.token.displaySizePx);
    const baseX = finite(token.scaleX, 1);
    const baseY = finite(token.scaleY, 1);
    token.setScale?.(baseX * this.config.token.startScale, baseY * this.config.token.startScale);
    this._tween(run, {
      targets: token,
      scaleX: baseX * this.config.token.popScale,
      scaleY: baseY * this.config.token.popScale,
      duration: this.config.token.popDurationMs,
      ease: this.config.token.popEase,
      onComplete: () => this._flyToken(
        run,
        token,
        start,
        target,
        collectorTarget,
        baseX,
        baseY,
        relicCount
      ),
    });
  }

  _flyToken(
    run,
    token,
    start,
    target,
    collectorTarget,
    baseX,
    baseY,
    relicCount
  ) {
    if (!this._isLive(run)) return;
    const config = this.config.flight;
    const state = { progress: 0 };
    const direction = target.x >= start.x ? 1 : -1;
    const controlX = (start.x + target.x) / 2 - direction * config.controlSidePx;
    const controlY = Math.min(start.y, target.y) - config.controlLiftPx;
    this._tween(run, {
      targets: state, progress: 1, delay: this.config.token.holdBeforeFlightMs,
      duration: run.mode === this.config.modes.lowFx
        ? config.lowFxDurationMs
        : config.durationMs,
      ease: config.ease,
      onUpdate: () => {
        if (!token.active || !this._isLive(run)) return;
        const progress = state.progress;
        const inverse = 1 - progress;
        const liveTarget = this._resolveCollectorTarget(collectorTarget, relicCount) || target;
        const orbitEnvelope = Math.sin(Math.PI * progress);
        const orbitAngle = Math.PI * 2 * config.orbitTurns * progress;
        token.x = inverse * inverse * start.x
          + 2 * inverse * progress * controlX + progress * progress * liveTarget.x
          + Math.cos(orbitAngle) * config.orbitRadiusPx * orbitEnvelope;
        token.y = inverse * inverse * start.y
          + 2 * inverse * progress * controlY + progress * progress * liveTarget.y
          + Math.sin(orbitAngle) * config.orbitRadiusPx * config.orbitYScale * orbitEnvelope;
        token.rotation = config.spinRadians * progress;
        const scale = this.config.token.popScale
          + (this.config.token.settledScale - this.config.token.popScale) * progress;
        token.setScale?.(baseX * scale, baseY * scale);
      },
      onComplete: () => {
        this._release(run, token);
        const liveTarget = this._resolveCollectorTarget(collectorTarget, relicCount) || target;
        this._spawnArrival(run, liveTarget, relicCount);
      },
    });
  }

  _spawnReducedArrival(run, target, icon, relicCount) {
    this._createToken(run, target, icon, this.config.token.reducedDisplaySizePx);
    this._spawnArrival(run, target, relicCount);
  }

  _spawnArrival(run, target, relicCount) {
    const config = this.config.arrival;
    const ring = this._register(
      run,
      this.scene.add.circle(target.x, target.y, config.ringRadiusPx, getRelicColor(), 0),
    );
    ring.setScrollFactor?.(1).setDepth?.(this.config.depths.token);
    ring.setStrokeStyle?.(
      config.ringLineWidthPx,
      getRelicColor(),
      config.ringAlpha
    );
    ring.setBlendMode?.(this.config.blendMode).setScale?.(config.ringStartScale);
    this._tween(run, {
      targets: ring, scaleX: config.ringEndScale, scaleY: config.ringEndScale, alpha: 0,
      duration: config.ringDurationMs, ease: this.config.ring.ease,
      onComplete: () => this._release(run, ring),
    });
    spawnRelicParticles(this, run, target, run.mode.arrivalParticleCount);
    this._showCountReveal(run, target, relicCount);
  }

  _showCountReveal(run, target, relicCount) {
    const config = this.config.countReveal;
    const x = target.x;
    const y = target.y + config.offsetYPx;
    const count = clamp(Math.floor(relicCount), 0, ANCIENT_RELIC_CONFIG.persistence.maxRelics);
    const text = config.template
      .replace("{title}", ANCIENT_RELIC_CONFIG.displayName.toUpperCase())
      .replace("{shortName}", ANCIENT_RELIC_CONFIG.shortName)
      .replace("{count}", String(count));
    const label = this._register(run, this.scene.add.text(x, y, text, {
      fontFamily: config.fontFamily, fontSize: config.fontSize, fontStyle: config.fontStyle,
      color: ANCIENT_RELIC_CONFIG.color, align: config.align,
      stroke: this.config.colors.ink, strokeThickness: config.strokeThicknessPx,
    }));
    label.setOrigin?.(0.5).setScrollFactor?.(1).setDepth?.(this.config.depths.countReveal);
    const fade = () => this._tween(run, {
      targets: label, alpha: 0, delay: config.holdMs, duration: config.fadeDurationMs,
      ease: this.config.flash.ease, onComplete: () => this._disposeRun(run),
    });
    if (run.mode === this.config.modes.reducedMotion) {
      label.setAlpha?.(1);
      fade();
      return;
    }
    label.setAlpha?.(0).setScale?.(config.startScale);
    this._tween(run, {
      targets: label, alpha: 1, scaleX: 1, scaleY: 1, y: y - config.risePx,
      duration: config.inDurationMs, ease: config.ease, onComplete: fade,
    });
  }

  _createToken(run, point, icon, size) {
    const token = this._register(run, this.scene.add.image(point.x, point.y, icon.key, icon.frame));
    token.setScrollFactor?.(1).setDepth?.(this.config.depths.token);
    token.setDisplaySize?.(size, size);
    return token;
  }

  _register(run, object) {
    if (object) run.objects.add(object);
    return object;
  }

  _release(run, object) {
    run.objects.delete(object);
    object?.destroy?.();
  }

  _tween(run, tweenConfig) {
    if (!this._isLive(run)) return null;
    const complete = tweenConfig.onComplete;
    let tween = null;
    tween = this.scene.tweens.add({
      ...tweenConfig,
      onComplete: (...args) => {
        run.tweens.delete(tween);
        if (this._isLive(run)) complete?.(...args);
      },
    });
    if (tween) run.tweens.add(tween);
    return tween;
  }

  _trimRuns() {
    while (this._runs.size >= this.config.maxConcurrentSequences) {
      this._disposeRun(this._runs.values().next().value);
    }
  }

  _isLive(run) {
    return !this._destroyed && run && !run.disposed;
  }

  _disposeRun(run) {
    if (!run || run.disposed) return;
    run.disposed = true;
    run.tweens.forEach((tween) => {
      tween?.stop?.();
      tween?.remove?.();
    });
    run.objects.forEach((object) => object?.destroy?.());
    run.tweens.clear();
    run.objects.clear();
    this._runs.delete(run);
  }

  destroy() {
    if (this._destroyed) return;
    [...this._runs].forEach((run) => this._disposeRun(run));
    this._destroyed = true;
    this.targetProvider = null;
    this.scene = null;
  }
}
