const TAU = Math.PI * 2;

function fract(value) {
  return value - Math.floor(value);
}

function seedFor(index, offset) {
  return fract(Math.sin((index + 1) * 19.193 + offset * 41.731) * 43758.5453);
}

function smoothStep(edge0, edge1, value) {
  const normalized = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function postPipeline(image, key) {
  const pipeline = image.getPostPipeline(key);
  return Array.isArray(pipeline) ? pipeline.at(-1) || null : pipeline;
}

export class ObservatoryArchitectureModuleField {
  constructor(scene, profile, modules, viewport, sourceSize, pipelineKey) {
    const scaleX = viewport.width / sourceSize.width;
    const scaleY = viewport.height / sourceSize.height;
    this.profile = profile;
    this.entries = modules.map((module, index) => {
      const width = module.width * scaleX;
      const height = module.height * scaleY;
      const baseX = (module.x + module.width / 2) * scaleX;
      const baseY = (module.y + module.height / 2) * scaleY;
      const structure = scene.add.image(baseX, baseY, profile.atlasKey, module.frame).setDisplaySize(width, height);
      const light = scene.add.image(baseX, baseY, profile.emissiveAtlasKey, module.frame)
        .setDisplaySize(width, height)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setPostPipeline(pipelineKey);
      const lifecyclePosition = profile.lifecycle.indices.indexOf(index);
      return {
        structure,
        light,
        pipeline: postPipeline(light, pipelineKey),
        baseX,
        baseY,
        baseScaleX: structure.scaleX,
        baseScaleY: structure.scaleY,
        seed: seedFor(index, profile.phaseOffset),
        secondarySeed: seedFor(index + modules.length, profile.phaseOffset * 1.83),
        frequency: 1 + (index % profile.cycleVariants),
        lifecycle: lifecyclePosition >= 0 ? Object.freeze({
          cycleDays: profile.lifecycle.cycleDays[lifecyclePosition],
          phaseDays: profile.lifecycle.phaseDays[lifecyclePosition],
          visibleDays: profile.lifecycle.visibleDays[lifecyclePosition],
          fadeDays: profile.lifecycle.fadeDays[lifecyclePosition],
        }) : null,
      };
    });
  }

  update(phase, islandStrength, lightStrength, chronology) {
    const groupTime = phase * TAU * this.profile.groupCycles;
    const groupAngle = this.profile.phaseOffset * TAU;
    const groupX = (Math.sin(groupTime + groupAngle) - Math.sin(groupAngle)) * this.profile.groupTravelX;
    const groupY = (Math.cos(groupTime + groupAngle) - Math.cos(groupAngle)) * this.profile.groupTravelY;
    this.entries.forEach(entry => {
      const angle = (entry.seed + this.profile.phaseOffset) * TAU;
      const time = phase * TAU * entry.frequency;
      const localScale = 0.7 + entry.secondarySeed * 0.6;
      const x = (Math.sin(time + angle) - Math.sin(angle)) * this.profile.localTravelX * localScale;
      const primaryY = Math.cos(time + angle * 1.41) - Math.cos(angle * 1.41);
      const harmonicY = (Math.sin(time * 2 + angle * 0.63) - Math.sin(angle * 0.63)) * this.profile.verticalHarmonic;
      const y = (primaryY + harmonicY) * this.profile.localTravelY * localScale;
      const rotation = (Math.sin(time + angle * 0.73) - Math.sin(angle * 0.73)) * this.profile.rotation;
      const depthWave = Math.sin(time + angle * 1.17) - Math.sin(angle * 1.17);
      const lifecycleProfile = this.profile.lifecycle;
      const weatherVisibility = lifecycleProfile.weatherVisibility[chronology.weather] ?? 1;
      const weatherAmount = Phaser.Math.Clamp(chronology.weatherIntensity, 0, 1);
      let lifecycleAlpha = 1 - (1 - weatherVisibility) * weatherAmount * lifecycleProfile.anchorWeatherResponse;
      if (entry.lifecycle !== null) {
        const lifecycleDay = positiveModulo(chronology.day + entry.lifecycle.phaseDays, entry.lifecycle.cycleDays);
        const fadeIn = smoothStep(0, entry.lifecycle.fadeDays, lifecycleDay);
        const fadeOut = 1 - smoothStep(entry.lifecycle.visibleDays, entry.lifecycle.visibleDays + entry.lifecycle.fadeDays, lifecycleDay);
        const calendarAlpha = lifecycleProfile.minAlpha + (1 - lifecycleProfile.minAlpha) * fadeIn * fadeOut;
        lifecycleAlpha = calendarAlpha * (1 - (1 - weatherVisibility) * weatherAmount);
      }
      const weatherLift = (lifecycleProfile.weatherLift[chronology.weather] ?? 0) * weatherAmount;
      const lifecycleLift = (1 - lifecycleAlpha) * lifecycleProfile.cloudLift + weatherLift;
      const depthScale = 1 + depthWave * this.profile.depthScaleRange * islandStrength
        - (1 - lifecycleAlpha) * lifecycleProfile.depthRetreat;
      const nextX = entry.baseX + (groupX + x) * islandStrength;
      const nextY = entry.baseY + (groupY + y) * islandStrength - lifecycleLift;
      entry.structure.setPosition(nextX, nextY).setRotation(rotation * islandStrength)
        .setScale(entry.baseScaleX * depthScale, entry.baseScaleY * depthScale).setAlpha(lifecycleAlpha);
      entry.light.setPosition(nextX, nextY).setRotation(rotation * islandStrength)
        .setScale(entry.baseScaleX * depthScale, entry.baseScaleY * depthScale).setAlpha(lifecycleAlpha);
      entry.pipeline?.setLightState(phase, lightStrength, chronology);
    });
  }

  get lifecycleCount() {
    return this.entries.filter(entry => entry.lifecycle !== null).length;
  }

  get motionSnapshot() {
    const alphas = this.entries.map(entry => entry.structure.alpha);
    const offsets = this.entries.map(entry => Math.hypot(entry.structure.x - entry.baseX, entry.structure.y - entry.baseY));
    return Object.freeze({
      visible: alphas.filter(alpha => alpha > 0.05).length,
      minimumAlpha: Math.min(...alphas),
      maximumOffset: Math.max(...offsets),
    });
  }

  get images() {
    return this.entries.flatMap(entry => [entry.structure, entry.light]);
  }

  get pipelines() {
    return this.entries.map(entry => entry.pipeline).filter(Boolean);
  }
}
