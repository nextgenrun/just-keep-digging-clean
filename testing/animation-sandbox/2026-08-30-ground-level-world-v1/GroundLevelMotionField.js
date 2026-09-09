function fract(value) {
  return value - Math.floor(value);
}

function seed(index, salt = 0) {
  return fract(Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453);
}

function lerp(minimum, maximum, amount) {
  return minimum + (maximum - minimum) * amount;
}

export class GroundLevelMotionField {
  constructor(scene, review) {
    this.scene = scene;
    this.review = review;
    this.motionPercent = review.motion.displayedDefaultPercent;
    this.weatherParticles = this.createWeatherParticles();
    this.weather = "clear";
    this.enabled = false;
  }

  createWeatherParticles() {
    const { width, height } = this.review.viewport;
    return Array.from({ length: 64 }, (_, index) => {
      const image = this.scene.add.image(
        seed(index, 11.2) * width,
        seed(index, 12.4) * height,
        this.review.composition.weatherAtlas.key,
        index % 4,
      ).setScrollFactor(0).setDepth(40).setVisible(false);
      return {
        image,
        rainFrame: index % 4,
        snowFrame: 4 + (index % 8),
        speed: lerp(110, 260, seed(index, 13.7)),
        drift: lerp(-18, 28, seed(index, 14.8)),
        scale: lerp(0.09, 0.18, seed(index, 15.9)),
      };
    });
  }

  setMotionPercent(percent) {
    this.motionPercent = Phaser.Math.Clamp(
      Number(percent),
      this.review.motion.minimumPercent,
      this.review.motion.maximumPercent,
    );
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.enabled) return;
    this.weatherParticles.forEach(particle => particle.image.setVisible(false));
  }

  update(deltaMs, _elapsedSeconds, chronology) {
    const displayStrength = this.motionPercent / 100;
    const effective = displayStrength * this.review.motion.observatoryBenchmarkMultiplier;
    const weatherSpeed = this.review.motion.weatherSpeed[chronology.weather] || 1;
    this.weather = chronology.weather;
    if (this.enabled) this.updateWeather(deltaMs, chronology, effective * weatherSpeed);
  }

  updateWeather(deltaMs, chronology, effective) {
    const { width, height } = this.review.viewport;
    const snow = chronology.weather === "snow";
    const wet = ["drizzle", "rain", "storm"].includes(chronology.weather);
    for (const particle of this.weatherParticles) {
      particle.image.setVisible(wet || snow);
      if (!wet && !snow) continue;
      particle.image.setFrame(snow ? particle.snowFrame : particle.rainFrame)
        .setScale(snow ? particle.scale * 0.38 : particle.scale)
        .setAlpha(snow ? 0.38 : chronology.weather === "drizzle" ? 0.20 : 0.34);
      const speed = particle.speed * (snow ? 0.22 : chronology.weather === "storm" ? 1.5 : 1);
      particle.image.y += speed * Math.max(0.3, effective) * deltaMs / 1000;
      particle.image.x += particle.drift * (snow ? 0.65 : 1) * deltaMs / 1000;
      if (particle.image.y > height + 140 || particle.image.x > width + 140 || particle.image.x < -140) {
        particle.image.y = -120;
        particle.image.x = seed(Math.floor(particle.speed), chronology.day) * width;
      }
    }
  }

  get snapshot() {
    return {
      displayedMotionPercent: this.motionPercent,
      effectiveObservatoryMultiplier: this.motionPercent / 100 * this.review.motion.observatoryBenchmarkMultiplier,
      runtimeEnabled: this.enabled,
      backgroundWeatherOnly: true,
      foregroundPropMotion: false,
      animatedPropDetails: 0,
      independentPracticalLights: 0,
      activePracticalLights: 0,
      legacyPropSources: 0,
      weather: this.weather,
    };
  }
}
