import { ANCIENT_RELIC_CONFIG } from "../../values/ancientRelics.js";

const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

export function getRelicColor() {
  return Number.parseInt(ANCIENT_RELIC_CONFIG.color.replace(/^#/, ""), 16);
}

function spawnFlash(system, run, mode) {
  const fallback = system.config.viewportFallback;
  const width = finite(system.scene?.scale?.width, fallback.widthPx);
  const height = finite(system.scene?.scale?.height, fallback.heightPx);
  const flash = system._register(run, system.scene.add.rectangle(
    width / 2,
    height / 2,
    width,
    height,
    getRelicColor(),
    mode.flashAlpha,
  ));
  flash.setScrollFactor?.(0).setDepth?.(system.config.depths.flash);
  flash.setBlendMode?.(system.config.blendMode);
  system._tween(run, {
    targets: flash,
    alpha: 0,
    duration: system.config.flash.durationMs,
    ease: system.config.flash.ease,
    onComplete: () => system._release(run, flash),
  });
}

function spawnFloorMark(system, run, point) {
  const config = system.config.floorMark;
  const mark = system._register(run, system.scene.add.ellipse(
    point.x,
    point.y,
    config.widthPx,
    config.heightPx,
    getRelicColor(),
    config.alpha,
  ));
  mark.setScrollFactor?.(1).setDepth?.(system.config.depths.residual);
  mark.setStrokeStyle?.(
    config.lineWidthPx,
    system.config.colors.violet,
    config.alpha
  );
  mark.setBlendMode?.(system.config.blendMode).setScale?.(config.startScale);
  system._tween(run, {
    targets: mark,
    scaleX: config.endScale,
    scaleY: config.endScale,
    alpha: 0,
    delay: config.holdMs,
    duration: config.fadeDurationMs,
    ease: system.config.ring.ease,
    onComplete: () => system._release(run, mark),
  });
}

function spawnRings(system, run, point, mode) {
  const config = system.config.ring;
  for (let index = 0; index < mode.ringCount; index += 1) {
    const ring = system._register(
      run,
      system.scene.add.circle(
        point.x,
        point.y,
        config.radiusPx,
        getRelicColor(),
        0
      ),
    );
    ring.setScrollFactor?.(1).setDepth?.(system.config.depths.localFx);
    ring.setStrokeStyle?.(
      config.lineWidthPx,
      getRelicColor(),
      config.alpha
    );
    ring
      .setBlendMode?.(system.config.blendMode)
      .setScale?.(config.startScale)
      .setAlpha?.(config.alpha);
    system._tween(run, {
      targets: ring,
      scaleX: mode.ringScaleMotion ? config.endScale : config.startScale,
      scaleY: mode.ringScaleMotion ? config.endScale : config.startScale,
      alpha: 0,
      delay: index * config.staggerMs,
      duration: config.durationMs,
      ease: config.ease,
      onComplete: () => system._release(run, ring),
    });
  }
}

function spawnRays(system, run, point, count) {
  const config = system.config.rays;
  for (let index = 0; index < count; index += 1) {
    const angle = config.rotationOffsetRadians
      + config.fullTurnRadians * index / count;
    const ray = system._register(run, system.scene.add.rectangle(
      point.x,
      point.y,
      config.widthPx,
      config.lengthPx,
      system.config.colors.highlight,
      config.alpha,
    ));
    ray.setScrollFactor?.(1).setDepth?.(system.config.depths.localFx);
    ray.setOrigin?.(0.5, 1).setRotation?.(angle);
    ray
      .setBlendMode?.(system.config.blendMode)
      .setScale?.(1, config.startScaleY);
    system._tween(run, {
      targets: ray,
      scaleY: config.endScaleY,
      alpha: 0,
      duration: config.durationMs,
      ease: config.ease,
      onComplete: () => system._release(run, ray),
    });
  }
}

export function spawnRelicParticles(system, run, point, count) {
  if (count <= 0) return;
  const config = system.config.particles;
  const denominator = Math.max(1, config.distanceSteps - 1);
  for (let index = 0; index < count; index += 1) {
    const fraction = (index % config.distanceSteps) / denominator;
    const angle = config.rotationOffsetRadians
      + config.fullTurnRadians * index / count;
    const radius = config.radiusPx.min
      + (config.radiusPx.max - config.radiusPx.min) * fraction;
    const distance = config.travelPx.min
      + (config.travelPx.max - config.travelPx.min) * fraction;
    const color = index % 2 === 0
      ? getRelicColor()
      : system.config.colors.violet;
    const particle = system._register(
      run,
      system.scene.add.circle(point.x, point.y, radius, color, config.alpha),
    );
    particle.setScrollFactor?.(1).setDepth?.(system.config.depths.localFx);
    particle.setBlendMode?.(system.config.blendMode);
    system._tween(run, {
      targets: particle,
      x: point.x + Math.cos(angle) * distance,
      y: point.y + Math.sin(angle) * distance,
      alpha: 0,
      scaleX: config.endScale,
      scaleY: config.endScale,
      duration: config.durationMs,
      ease: config.ease,
      onComplete: () => system._release(run, particle),
    });
  }
}

export function spawnRelicSourceFx(system, run, point, mode) {
  spawnFlash(system, run, mode);
  spawnFloorMark(system, run, point);
  spawnRings(system, run, point, mode);
  spawnRays(system, run, point, mode.rayCount);
  spawnRelicParticles(system, run, point, mode.particleCount);
}
