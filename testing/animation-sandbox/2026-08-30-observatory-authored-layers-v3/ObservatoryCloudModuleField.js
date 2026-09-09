const TAU = Math.PI * 2;

function fract(value) {
  return value - Math.floor(value);
}

function moduleSeed(index, offset) {
  return fract(Math.sin((index + 1) * 12.9898 + offset * 78.233) * 43758.5453);
}

export class ObservatoryCloudModuleField {
  constructor(scene, profile, modules, viewport, sourceSize) {
    this.profile = profile;
    this.entries = modules.map((module, index) => {
      const scaleX = viewport.width / sourceSize.width;
      const scaleY = viewport.height / sourceSize.height;
      const width = module.width * scaleX;
      const height = module.height * scaleY;
      const baseX = (module.x + module.width / 2) * scaleX;
      const baseY = (module.y + module.height / 2) * scaleY;
      const image = scene.add.image(baseX, baseY, profile.atlasKey, module.frame)
        .setDisplaySize(width, height)
        .setAlpha(profile.opacity);
      return {
        image,
        baseX,
        baseY,
        baseScaleX: image.scaleX,
        baseScaleY: image.scaleY,
        seed: moduleSeed(index, profile.phaseOffset),
        secondarySeed: moduleSeed(index + modules.length, profile.phaseOffset * 1.73),
        frequency: 1 + (index % profile.cycleVariants),
        rotationFrequency: 1 + ((index + 1) % 2),
      };
    });
  }

  update(phase, strength) {
    const groupTime = phase * TAU * this.profile.groupCycles;
    const groupAngle = this.profile.phaseOffset * TAU;
    const groupX = (Math.sin(groupTime + groupAngle) - Math.sin(groupAngle)) * this.profile.groupTravelX;
    const groupYAngle = groupAngle * 1.37;
    const groupY = (Math.cos(groupTime + groupYAngle) - Math.cos(groupYAngle)) * this.profile.groupTravelY;
    this.entries.forEach(entry => {
      const angle = (entry.seed + this.profile.phaseOffset) * TAU;
      const time = phase * TAU * entry.frequency;
      const travelScale = 0.72 + entry.secondarySeed * 0.56;
      const x = (Math.cos(time + angle) - Math.cos(angle)) * this.profile.localTravelX * travelScale;
      const yAngle = angle * 1.61;
      const y = (Math.sin(time + yAngle) - Math.sin(yAngle)) * this.profile.localTravelY * travelScale;
      const rotationTime = phase * TAU * entry.rotationFrequency;
      const rotation = (Math.sin(rotationTime + angle) - Math.sin(angle)) * this.profile.rotation;
      const expansion = (Math.cos(time + angle) - Math.cos(angle)) * (this.profile.deformation || 0) * strength;
      entry.image.setPosition(entry.baseX + (groupX + x) * strength, entry.baseY + (groupY + y) * strength);
      entry.image.setRotation(rotation * strength);
      entry.image.setScale(entry.baseScaleX * (1 + expansion), entry.baseScaleY * (1 - expansion * 0.45));
    });
  }

  get images() {
    return this.entries.map(entry => entry.image);
  }
}
