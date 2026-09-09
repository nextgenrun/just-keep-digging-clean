import { ObservatoryAuthoredSkyPipeline } from "../2026-08-30-observatory-authored-layers-v3/ObservatoryAuthoredSkyPipeline.js";

const TAU = Math.PI * 2;

function resolvePostPipeline(image, key) {
  const pipeline = image.getPostPipeline(key);
  return Array.isArray(pipeline) ? pipeline.at(-1) || null : pipeline;
}

export class GroundLevelAuthoredAtmosphereField {
  constructor(scene, backgroundReview) {
    this.scene = scene;
    this.review = backgroundReview;
    this.active = false;
    this.resetEvents = 0;
    this.shaderActive = scene.game.renderer.type === Phaser.WEBGL;
    const config = backgroundReview.observatoryAtmosphere;
    const display = backgroundReview.runtimeDisplay;
    if (this.shaderActive) {
      scene.game.renderer.pipelines.addPostPipeline(config.star.pipelineKey, ObservatoryAuthoredSkyPipeline);
    }
    this.stars = scene.add.image(display.x, display.y, config.star.key)
      .setScrollFactor(0)
      .setDepth(display.depth + 0.12)
      .setDisplaySize(display.width, display.height)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    if (this.shaderActive) this.stars.setPostPipeline(config.star.pipelineKey);
    this.starPipeline = this.shaderActive
      ? resolvePostPipeline(this.stars, config.star.pipelineKey)
      : null;
    this.streams = config.sprites.map(spec => {
      const image = scene.add.image(spec.x, spec.y, spec.key)
        .setScrollFactor(0)
        .setDepth(spec.depth)
        .setScale(spec.scale)
        .setAlpha(spec.alpha)
        .setVisible(false);
      return {
        image,
        baseAlpha: spec.alpha,
        baseY: spec.y,
        speed: spec.speed,
        drift: spec.drift,
        phase: spec.phase * TAU,
      };
    });
  }

  setProfile(profile) {
    this.active = profile?.renderMode === "segmented-runtime";
    this.stars.setVisible(this.active);
    this.streams.forEach(stream => stream.image.setVisible(this.active));
  }

  update(deltaMs, elapsedSeconds, strength, weatherScalar) {
    if (!this.active) return;
    const config = this.review.observatoryAtmosphere;
    const phase = (elapsedSeconds % config.star.cycleSeconds) / config.star.cycleSeconds;
    this.starPipeline?.setSkyState(phase, config.star.strength * Math.min(1, strength));
    const travel = strength * weatherScalar * deltaMs / 1000;
    for (const stream of this.streams) {
      stream.image.x += stream.speed * travel;
      stream.image.y = stream.baseY + Math.sin(elapsedSeconds * 0.035 + stream.phase) * stream.drift;
      stream.image.setAlpha(stream.baseAlpha * Math.min(1.08, weatherScalar));
      const left = stream.image.x - stream.image.displayWidth / 2;
      if (left <= this.review.runtimeDisplay.width + config.resetPaddingPx) continue;
      stream.image.x = -config.resetPaddingPx - stream.image.displayWidth / 2;
      this.resetEvents += 1;
    }
  }

  get snapshot() {
    return {
      active: this.active,
      cloudSegments: this.active ? this.streams.length : 0,
      starIdsIndependentlyPhased: this.active && Boolean(this.starPipeline),
      starShaderActive: this.shaderActive && Boolean(this.starPipeline),
      resetPolicy: "fully-offscreen-only",
      directionPolicy: "single-forward-stream-no-left-right-wobble",
      resetEvents: this.resetEvents,
      sampleStreamX: this.active
        ? this.streams.slice(0, 3).map(stream => Number(stream.image.x.toFixed(2)))
        : [],
      mountainMotionPixels: 0,
    };
  }
}
