function fract(value) {
  return value - Math.floor(value);
}

function moduleSeed(index, offset) {
  return fract(Math.sin((index + 1) * 12.9898 + offset * 78.233) * 43758.5453);
}

function postPipeline(image, key) {
  const pipeline = image.getPostPipeline(key);
  return Array.isArray(pipeline) ? pipeline.at(-1) || null : pipeline;
}

export class ObservatoryCloudStreamField {
  constructor(scene, profile, modules, viewport, sourceSize, pipelineKey) {
    const scaleX = viewport.width / sourceSize.width;
    const scaleY = viewport.height / sourceSize.height;
    this.entries = modules.map((module, index) => {
      const width = module.width * scaleX;
      const height = module.height * scaleY;
      const seed = moduleSeed(index, profile.phaseOffset);
      const image = scene.add.image((module.x + module.width / 2) * scaleX, (module.y + module.height / 2) * scaleY, profile.atlasKey, module.frame)
        .setDisplaySize(width, height)
        .setPostPipeline(pipelineKey);
      const travelScale = 0.78 + seed * 0.44;
      const state = {
        travelUvX: profile.travelX * travelScale / width,
        travelUvY: profile.travelY * (0.82 + seed * 0.36) / height,
        cycles: profile.baseCycles + (index % profile.cycleVariants),
        phaseOffset: fract(profile.phaseOffset + seed),
        opacity: profile.opacity,
        resetFeather: profile.resetFeather,
      };
      return { image, pipeline: postPipeline(image, pipelineKey), state };
    });
  }

  update(phase, strength, weather) {
    this.entries.forEach(entry => entry.pipeline?.setSegmentState(phase, strength, entry.state, weather));
  }

  get images() {
    return this.entries.map(entry => entry.image);
  }

  get pipelines() {
    return this.entries.map(entry => entry.pipeline).filter(Boolean);
  }

  get segmentCount() {
    return this.entries.length;
  }
}
