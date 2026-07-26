/** Presents a bounded, state-independent Ancient Relic discovery celebration. */
import { ANCIENT_RELIC_CONFIG } from "../../values/ancientRelics.js";
import { RELIC_DISCOVERY_FX_CONFIG } from "../../values/relicDiscoveryFxConfig.js";

const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const relicColor = () => Number.parseInt(ANCIENT_RELIC_CONFIG.color.replace(/^#/, ""), 16);

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

  playDiscovery({ anchor, iconAsset, hudTarget, relicCount, reducedMotion, lowFx } = {}) {
    const icon = this._resolveIcon(iconAsset);
    const start = this._resolveAnchor(anchor);
    const target = this._resolveHudTarget(hudTarget, relicCount);
    if (
      this._destroyed || this.config.enabled !== true || !icon || !start || !target
      || !Number.isFinite(relicCount)
    ) return false;

    this._trimRuns();
    const mode = this._resolveMode(reducedMotion, lowFx);
    const run = { objects: new Set(), tweens: new Set(), disposed: false, mode };
    this._runs.add(run);
    this._spawnFlash(run, mode);
    this._spawnRings(run, start, mode);
    this._spawnRays(run, start, mode.rayCount);
    this._spawnParticles(run, start, mode.particleCount);
    if (mode.tokenTravel) this._spawnTravelToken(run, start, target, icon, relicCount);
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
    if (anchor?.space === this.config.coordinateSpaces.screen) return { x: point.x, y: point.y };
    const camera = this.scene?.cameras?.main;
    if (!camera) return { x: point.x, y: point.y };
    const zoomX = finite(camera.zoomX, finite(camera.zoom, 1));
    const zoomY = finite(camera.zoomY, finite(camera.zoom, 1));
    return {
      x: (point.x - finite(camera.scrollX, 0)) * zoomX + finite(camera.x, 0),
      y: (point.y - finite(camera.scrollY, 0)) * zoomY + finite(camera.y, 0),
    };
  }

  _resolveHudTarget(hudTarget, relicCount) {
    const supplied = hudTarget || this.targetProvider?.(relicCount);
    if (Number.isFinite(supplied?.x) && Number.isFinite(supplied?.y)) {
      return { x: supplied.x, y: supplied.y };
    }
    const fallback = this.config.viewportFallback;
    const width = finite(this.scene?.scale?.width, fallback.widthPx);
    const height = finite(this.scene?.scale?.height, fallback.heightPx);
    return { x: width * fallback.hudTargetXRatio, y: height * fallback.hudTargetYRatio };
  }

  _spawnFlash(run, mode) {
    const fallback = this.config.viewportFallback;
    const width = finite(this.scene?.scale?.width, fallback.widthPx);
    const height = finite(this.scene?.scale?.height, fallback.heightPx);
    const flash = this._register(run, this.scene.add.rectangle(
      width / 2, height / 2, width, height, relicColor(), mode.flashAlpha,
    ));
    flash.setScrollFactor?.(0).setDepth?.(this.config.depths.flash);
    flash.setBlendMode?.(this.config.blendMode);
    this._tween(run, {
      targets: flash, alpha: 0, duration: this.config.flash.durationMs,
      ease: this.config.flash.ease, onComplete: () => this._release(run, flash),
    });
  }

  _spawnRings(run, point, mode) {
    const config = this.config.ring;
    for (let index = 0; index < mode.ringCount; index += 1) {
      const ring = this._register(
        run,
        this.scene.add.circle(point.x, point.y, config.radiusPx, relicColor(), 0),
      );
      ring.setScrollFactor?.(0).setDepth?.(this.config.depths.localFx);
      ring.setStrokeStyle?.(config.lineWidthPx, relicColor(), config.alpha);
      ring.setBlendMode?.(this.config.blendMode).setScale?.(config.startScale).setAlpha?.(config.alpha);
      const endScale = mode.ringScaleMotion ? config.endScale : config.startScale;
      this._tween(run, {
        targets: ring, scaleX: endScale, scaleY: endScale, alpha: 0,
        delay: index * config.staggerMs, duration: config.durationMs, ease: config.ease,
        onComplete: () => this._release(run, ring),
      });
    }
  }

  _spawnRays(run, point, count) {
    const config = this.config.rays;
    for (let index = 0; index < count; index += 1) {
      const angle = config.rotationOffsetRadians + config.fullTurnRadians * index / count;
      const ray = this._register(run, this.scene.add.rectangle(
        point.x, point.y, config.widthPx, config.lengthPx,
        this.config.colors.highlight, config.alpha,
      ));
      ray.setScrollFactor?.(0).setDepth?.(this.config.depths.localFx);
      ray.setOrigin?.(0.5, 1).setRotation?.(angle);
      ray.setBlendMode?.(this.config.blendMode).setScale?.(1, config.startScaleY);
      this._tween(run, {
        targets: ray, scaleY: config.endScaleY, alpha: 0,
        duration: config.durationMs, ease: config.ease,
        onComplete: () => this._release(run, ray),
      });
    }
  }

  _spawnParticles(run, point, count) {
    if (count <= 0) return;
    const config = this.config.particles;
    const denominator = Math.max(1, config.distanceSteps - 1);
    for (let index = 0; index < count; index += 1) {
      const fraction = (index % config.distanceSteps) / denominator;
      const angle = config.rotationOffsetRadians + config.fullTurnRadians * index / count;
      const radius = config.radiusPx.min + (config.radiusPx.max - config.radiusPx.min) * fraction;
      const distance = config.travelPx.min + (config.travelPx.max - config.travelPx.min) * fraction;
      const color = index % 2 === 0 ? relicColor() : this.config.colors.violet;
      const particle = this._register(
        run,
        this.scene.add.circle(point.x, point.y, radius, color, config.alpha),
      );
      particle.setScrollFactor?.(0).setDepth?.(this.config.depths.localFx);
      particle.setBlendMode?.(this.config.blendMode);
      this._tween(run, {
        targets: particle,
        x: point.x + Math.cos(angle) * distance, y: point.y + Math.sin(angle) * distance,
        alpha: 0, scaleX: config.endScale, scaleY: config.endScale,
        duration: config.durationMs, ease: config.ease,
        onComplete: () => this._release(run, particle),
      });
    }
  }

  _spawnTravelToken(run, start, target, icon, relicCount) {
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
      onComplete: () => this._flyToken(run, token, start, target, baseX, baseY, relicCount),
    });
  }

  _flyToken(run, token, start, target, baseX, baseY, relicCount) {
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
        token.x = inverse * inverse * start.x
          + 2 * inverse * progress * controlX + progress * progress * target.x;
        token.y = inverse * inverse * start.y
          + 2 * inverse * progress * controlY + progress * progress * target.y;
        token.rotation = config.spinRadians * progress;
        const scale = this.config.token.popScale
          + (this.config.token.settledScale - this.config.token.popScale) * progress;
        token.setScale?.(baseX * scale, baseY * scale);
      },
      onComplete: () => {
        this._release(run, token);
        this._spawnArrival(run, target, relicCount);
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
      this.scene.add.circle(target.x, target.y, config.ringRadiusPx, relicColor(), 0),
    );
    ring.setScrollFactor?.(0).setDepth?.(this.config.depths.token);
    ring.setStrokeStyle?.(config.ringLineWidthPx, relicColor(), config.ringAlpha);
    ring.setBlendMode?.(this.config.blendMode).setScale?.(config.ringStartScale);
    this._tween(run, {
      targets: ring, scaleX: config.ringEndScale, scaleY: config.ringEndScale, alpha: 0,
      duration: config.ringDurationMs, ease: this.config.ring.ease,
      onComplete: () => this._release(run, ring),
    });
    this._spawnParticles(run, target, run.mode.arrivalParticleCount);
    this._showCountReveal(run, target, relicCount);
  }

  _showCountReveal(run, target, relicCount) {
    const config = this.config.countReveal;
    const fallback = this.config.viewportFallback;
    const width = finite(this.scene?.scale?.width, fallback.widthPx);
    const height = finite(this.scene?.scale?.height, fallback.heightPx);
    const x = clamp(target.x, config.screenMarginPx, width - config.screenMarginPx);
    const y = clamp(
      target.y + config.offsetYPx, config.screenMarginPx, height - config.screenMarginPx,
    );
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
    label.setOrigin?.(0.5).setScrollFactor?.(0).setDepth?.(this.config.depths.countReveal);
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
    token.setScrollFactor?.(0).setDepth?.(this.config.depths.token);
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
