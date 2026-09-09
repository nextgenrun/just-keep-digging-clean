const TAU = Math.PI * 2;

function fract(value) {
  return value - Math.floor(value);
}

export class ObservatoryInteriorLifeField {
  constructor(scene, profile, manifest, architectureField, viewport, sourceSize) {
    const scaleX = viewport.width / sourceSize.width;
    const scaleY = viewport.height / sourceSize.height;
    this.entries = profile.figures.map((figure, index) => {
      const frames = manifest.animations[figure.action];
      const module = architectureField.entries[figure.moduleIndex];
      const image = scene.add.image(figure.sourceX * scaleX, figure.sourceY * scaleY, profile.atlasKey, frames[0])
        .setOrigin(0.5, 1)
        .setScale(figure.height * scaleY / profile.frameSize)
        .setTint(profile.tint)
        .setFlipX(figure.flipX)
        .setAlpha(figure.opacity);
      return {
        image,
        module,
        frames,
        baseX: figure.sourceX * scaleX,
        baseY: figure.sourceY * scaleY,
        cycles: figure.cycles,
        phaseOffset: figure.phaseOffset,
        travelX: figure.travelX * scaleX,
        travelY: figure.travelY * scaleY,
        opacity: figure.opacity,
        rotation: profile.rotation,
        alphaBase: profile.alphaBase,
        alphaRange: profile.alphaRange,
        index,
        frameIndex: -1,
      };
    });
  }

  update(phase) {
    this.entries.forEach(entry => {
      const localPhase = fract(phase * entry.cycles + entry.phaseOffset);
      const nextFrame = Math.min(entry.frames.length - 1, Math.floor(localPhase * entry.frames.length));
      if (nextFrame !== entry.frameIndex) {
        entry.image.setFrame(entry.frames[nextFrame]);
        entry.frameIndex = nextFrame;
      }
      const wave = Math.sin(localPhase * TAU);
      const lift = Math.cos(localPhase * TAU * 2 + entry.index) * entry.travelY;
      const architectureX = entry.module.structure.x - entry.module.baseX;
      const architectureY = entry.module.structure.y - entry.module.baseY;
      entry.image.setPosition(entry.baseX + architectureX + wave * entry.travelX, entry.baseY + architectureY + lift);
      entry.image.setRotation(entry.module.structure.rotation + wave * entry.rotation);
      entry.image.setAlpha(entry.opacity * entry.module.structure.alpha * (entry.alphaBase + entry.alphaRange * Math.cos(localPhase * TAU)));
    });
  }

  get images() {
    return this.entries.map(entry => entry.image);
  }
}
