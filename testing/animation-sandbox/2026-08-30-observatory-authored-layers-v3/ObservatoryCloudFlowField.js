function postPipeline(image, key) {
  const pipeline = image.getPostPipeline(key);
  return Array.isArray(pipeline) ? pipeline.at(-1) || null : pipeline;
}

export class ObservatoryCloudFlowField {
  constructor(scene, profile, viewport, pipelineKey) {
    this.profile = profile;
    this.image = scene.add.image(viewport.width / 2, viewport.height / 2, profile.textureKey)
      .setDisplaySize(viewport.width, viewport.height)
      .setPostPipeline(pipelineKey);
    this.pipeline = postPipeline(this.image, pipelineKey);
  }

  update(phase, strength) {
    this.pipeline?.setLayerState(phase, strength, this.profile);
  }

  get images() {
    return [this.image];
  }

  get regionCount() {
    return this.profile.regionCols * this.profile.regionRows;
  }
}
