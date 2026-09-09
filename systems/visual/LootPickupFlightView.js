import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { LOOT_PICKUP_PRESENTATION } from "../../values/lootPickupPresentation.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export class LootPickupFlightView {
  constructor(scene, { removeFlight }) {
    this.scene = scene;
    this.removeFlight = removeFlight;
    this.config = LOOT_PICKUP_PRESENTATION;
    this.reducedMotion = globalThis.matchMedia?.(
      this.config.reducedMotion.mediaQuery,
    )?.matches === true;
  }

  create({ descriptor, x, y, displaySize, trailCount = 0 }) {
    const root = this._createRoot(descriptor, x, y, displaySize, 1);
    if (!root) return null;
    const trails = [];
    const count = this.reducedMotion ? this.config.reducedMotion.trailCount : trailCount;
    for (let index = 0; index < count; index += 1) {
      const trail = this._createRoot(
        descriptor,
        x,
        y,
        Math.max(this.config.flight.trailMinimumSizePx, displaySize),
        0,
      );
      if (trail) trails.push(trail);
    }
    return { root, trails, softEchoes: [], descriptor, displaySize, state: null };
  }

  animate({ flight, motionPlan, moment, targetProvider, onArrival }) {
    if (!flight?.root?.active || !motionPlan) return false;
    const root = flight.root;
    const cfg = this.config.flight;
    const holdMultiplier = this.reducedMotion
      ? this.config.reducedMotion.holdMultiplier
      : 1;
    const delay = moment.holdMs * holdMultiplier;
    const durationMultiplier = this.reducedMotion
      ? this.config.reducedMotion.durationMultiplier
      : 1;
    const state = { t: 0, softEchoIndex: 0 };
    flight.state = state;
    root._lootTravelState = state;
    this._playSourceMoment(flight, motionPlan, moment, delay);

    this.scene.tweens.add({
      targets: state,
      t: 1,
      delay,
      duration: motionPlan.durationMs * durationMultiplier,
      ease: motionPlan.ease,
      onUpdate: () => {
        if (!root.active) return;
        const liveTarget = targetProvider?.() || motionPlan.target;
        const pose = this._resolvePose(motionPlan, state.t, liveTarget, moment);
        const fade = Math.max(0, state.t - cfg.travelFadeStartRatio)
          / Math.max(0.001, 1 - cfg.travelFadeStartRatio);
        const breath = this.reducedMotion
          ? 0
          : Math.sin(state.t * Math.PI * 2 * cfg.breathCycles)
            * Math.sin(state.t * Math.PI)
            * cfg.breathScale;
        const scale = cfg.startScale + (cfg.endScale - cfg.startScale) * state.t + breath;
        const rotationScale = this.reducedMotion
          ? this.config.reducedMotion.rotationMultiplier
          : 1;
        root.setPosition(pose.x, pose.y)
          .setScale(scale)
          .setAlpha(1 - fade)
          .setRotation(pose.rotation * rotationScale);
        this._updateTrails(flight, motionPlan, state.t, liveTarget, moment);
        this._emitDueSoftEchoes(flight, motionPlan, state, liveTarget, moment);
      },
      onComplete: () => {
        if (!root.active) return;
        const liveTarget = targetProvider?.() || motionPlan.target;
        this._playArrival(flight, liveTarget, moment);
        onArrival?.(liveTarget);
      },
    });
    return true;
  }

  _resolvePose(plan, t, liveTarget, moment) {
    const cfg = this.config.flight;
    if (this.reducedMotion) {
      const heading = Math.atan2(liveTarget.y - plan.start.y, liveTarget.x - plan.start.x);
      return {
        x: plan.start.x + (liveTarget.x - plan.start.x) * t,
        y: plan.start.y + (liveTarget.y - plan.start.y) * t,
        rotation: heading * cfg.headingInfluence,
      };
    }
    const point = plan.sample(t);
    const previous = plan.sample(Math.max(0, t - cfg.sampleDelta));
    const next = plan.sample(Math.min(1, t + cfg.sampleDelta));
    const targetFollow = smoothstep(
      (t - cfg.targetFollowStartRatio) / (1 - cfg.targetFollowStartRatio),
    );
    const targetDx = (liveTarget.x - plan.target.x) * targetFollow;
    const targetDy = (liveTarget.y - plan.target.y) * targetFollow;
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const length = Math.max(0.001, Math.hypot(tangentX, tangentY));
    const envelope = Math.sin(Math.PI * t);
    const orbit = moment.orbitAmplitudePx
      * envelope
      * Math.sin(
        t * Math.PI * 2 * moment.orbitCycles + (plan.route?.phaseRadians || 0),
      );
    const heading = Math.atan2(tangentY, tangentX);
    const bank = Math.sin(t * Math.PI * 2 * cfg.bankCycles) * envelope * cfg.bankRadians;
    return {
      x: point.x + targetDx + (-tangentY / length) * orbit,
      y: point.y + targetDy + (tangentX / length) * orbit,
      rotation: heading * cfg.headingInfluence + bank + plan.rotationRadians * t,
    };
  }

  _updateTrails(flight, plan, t, liveTarget, moment) {
    flight.trails.forEach((trail, index) => {
      if (!trail?.active) return;
      const lagT = t - moment.trailLagRatio * (index + 1);
      if (lagT <= 0 || this.reducedMotion) {
        trail.setAlpha(0);
        return;
      }
      const pose = this._resolvePose(plan, lagT, liveTarget, moment);
      const life = Math.sin(Math.PI * clamp01(lagT));
      const scale = Math.max(0.36, 0.78 - index * this.config.flight.trailScaleStep);
      trail.setPosition(pose.x, pose.y)
        .setRotation(pose.rotation)
        .setScale(scale)
        .setAlpha(moment.trailAlpha * life * (1 - index * 0.1));
    });
  }

  _playSourceMoment(flight, plan, moment, duration) {
    if (duration <= 0 || this.reducedMotion) return;
    flight.trails.forEach((trail, index) => {
      const angle = (index / Math.max(1, flight.trails.length)) * Math.PI * 2
        + (plan.route?.phaseRadians || 0);
      const radius = Math.max(4, moment.orbitAmplitudePx * 0.7 + index * 1.5);
      trail.setPosition(
        flight.root.x + Math.cos(angle) * radius,
        flight.root.y + Math.sin(angle) * radius,
      ).setScale(0.52).setAlpha(moment.trailAlpha);
      this.scene.tweens.add({
        targets: trail,
        x: flight.root.x + Math.cos(angle + 0.9) * (radius + 4),
        y: flight.root.y + Math.sin(angle + 0.9) * (radius + 4),
        alpha: 0,
        scaleX: 0.82,
        scaleY: 0.82,
        duration,
        ease: "Sine.easeInOut",
      });
    });
  }

  _emitDueSoftEchoes(flight, plan, state, liveTarget, moment) {
    if (this.reducedMotion) return;
    while (
      state.softEchoIndex < moment.softEchoRatios.length
      && state.t >= moment.softEchoRatios[state.softEchoIndex]
    ) {
      state.softEchoIndex += 1;
      const pose = this._resolvePose(plan, state.t, liveTarget, moment);
      const echo = this._createRoot(
        flight.descriptor,
        pose.x,
        pose.y,
        flight.displaySize,
        moment.softEchoAlpha,
      );
      if (!echo) continue;
      echo.setRotation(pose.rotation).setScale(moment.softEchoScale);
      echo._lootSoftEcho = true;
      flight.softEchoes.push(echo);
      this.scene.tweens.add({
        targets: echo,
        y: pose.y + moment.softEchoDriftPx,
        alpha: 0,
        scaleX: moment.softEchoEndScale,
        scaleY: moment.softEchoEndScale,
        duration: moment.softEchoDurationMs,
        ease: this.config.flight.softEchoEase,
        onComplete: () => {
          const index = flight.softEchoes.indexOf(echo);
          if (index !== -1) flight.softEchoes.splice(index, 1);
          if (echo.active) echo.destroy();
        },
      });
    }
  }

  _playArrival(flight, target, moment) {
    const cfg = this.config.flight;
    const desired = this.reducedMotion ? 1 : moment.arrivalEchoCount;
    const arrivalScale = this.reducedMotion
      ? this.config.reducedMotion.arrivalScale
      : moment.arrivalScale;
    const roots = flight.trails.slice(0, desired);
    while (roots.length < desired) {
      const echo = this._createRoot(
        flight.descriptor,
        target.x,
        target.y,
        flight.displaySize,
        0,
      );
      if (!echo) break;
      roots.push(echo);
    }
    flight._arrivalRoots = roots;
    if (roots.length === 0) {
      this.removeFlight(flight);
      return;
    }
    roots.forEach((echo, index) => {
      this.scene.tweens.killTweensOf(echo);
      echo.setPosition(target.x, target.y)
        .setRotation(flight.root.rotation)
        .setScale(0.58 + index * 0.08)
        .setAlpha(cfg.arrivalAlpha / (1 + index * 0.22));
      this.scene.tweens.add({
        targets: echo,
        alpha: 0,
        scaleX: arrivalScale + index * 0.12,
        scaleY: arrivalScale + index * 0.12,
        angle: echo.angle + (index % 2 === 0 ? 12 : -12),
        delay: index * cfg.arrivalStaggerMs,
        duration: cfg.arrivalDurationMs,
        ease: cfg.arrivalEase,
        onComplete: () => {
          if (echo.active) echo.destroy();
          if (index === roots.length - 1) this.removeFlight(flight);
        },
      });
    });
  }

  _createRoot(descriptor, x, y, displaySize, alpha) {
    if (!this._textureReady(descriptor.textureKey, descriptor.textureFrame)) return null;
    const root = this.scene.add.container(x, y)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + 60)
      .setAlpha(alpha);
    if (descriptor.lightTextureKey
      && this._textureReady(descriptor.lightTextureKey, descriptor.lightTextureFrame)) {
      const light = this.scene.add.image(
        0, 0, descriptor.lightTextureKey, descriptor.lightTextureFrame ?? undefined,
      ).setDisplaySize(
        displaySize * this.config.flight.starLightScale,
        displaySize * this.config.flight.starLightScale,
      ).setAlpha(this.config.flight.starLightAlpha);
      light.setBlendMode?.(globalThis.Phaser?.BlendModes?.ADD ?? "ADD");
      root.add(light);
    }
    const core = this.scene.add.image(
      0, 0, descriptor.textureKey, descriptor.textureFrame ?? undefined,
    ).setDisplaySize(displaySize, displaySize);
    if (descriptor.blendMode) core.setBlendMode?.(descriptor.blendMode);
    root.add(core);
    root._lootPickupDescriptor = descriptor;
    return root;
  }

  _textureReady(key, frame = null) {
    if (!key || !this.scene.textures?.exists?.(key)) return false;
    if (frame === null || frame === undefined) return true;
    return this.scene.textures.get(key)?.has?.(frame) === true;
  }
}
