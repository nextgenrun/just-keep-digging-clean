export class OpeningFlightGoldenFiveFxView {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
  }

  burst(world, palette, count, distance) {
    const fx = this.config.fx;
    const view = this.config.presentation;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const radius = fx.sparkRadiusBasePx + (index % fx.sparkRadiusVariants);
      const travel = distance * (
        fx.travelBaseRatio
        + (index % fx.travelVariantCount) / fx.travelVariantDivisor
      );
      const spark = this.scene.add.circle(
        world.x,
        world.y,
        radius,
        palette[index % palette.length],
        1,
      ).setDepth(view.worldDepth + view.fxDepthOffset);
      this.scene.tweens.add({
        targets: spark,
        x: world.x + Math.cos(angle) * travel,
        y: world.y + Math.sin(angle) * travel,
        alpha: 0,
        scaleX: fx.endScale,
        scaleY: fx.endScale,
        duration: fx.durationBaseMs
          + (index % fx.durationVariants) * fx.durationStepMs,
        ease: view.exitEase,
        onComplete: () => spark.destroy(),
      });
    }
  }

  destroy() {
    this.scene = null;
  }
}
