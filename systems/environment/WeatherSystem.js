import { WEATHER_CONFIG } from "../../values/weatherConfig.js";

const TEXTURE_KEYS = Object.freeze({
  rain: "_weather_rain_streak",
  drip: "_weather_cave_drip",
  mist: "_weather_mist_puff",
  splash: "_weather_splash_ring",
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const lerp = (a, b, t) => a + (b - a) * t;

export class WeatherSystem {
  constructor(scene, config = {}, weatherConfig = WEATHER_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.weatherConfig = weatherConfig;

    this.kind = weatherConfig.initialKind || "clear";
    this.intensity = 0;
    this.targetIntensity = 0;
    this.wind = 0;
    this.targetWind = 0;
    this._phaseEndsAt = 0;
    this._nextRetargetAt = 0;
    this._nextLightningAt = 0;
    this._lightningAlpha = 0;
    this._cavePulse = 0;
    this._lastEmitterTuningAt = 0;
    this._timers = [];

    this._rainNoise = null;
    this._destroyed = false;

    this._createTextures();
    this._createOverlays();
    this._createEmitters();
    this._enterWeather(this.kind, this.scene.time.now || 0, true);
  }

  update(time, delta) {
    if (!this.weatherConfig.enabled || this._destroyed) return;

    const dt = Math.min(Math.max(delta || 0, 0), 100);
    if (time >= this._phaseEndsAt) {
      this._enterWeather(this._chooseNextKind(), time, false);
    }

    if (time >= this._nextRetargetAt) {
      this._retargetWithinCurrentWeather(time);
    }

    const transitionT = 1 - Math.exp(-(this.weatherConfig.transitionRatePerSecond || 0.4) * dt / 1000);
    const windT = 1 - Math.exp(-(this.weatherConfig.windRatePerSecond || 0.3) * dt / 1000);
    this.intensity = lerp(this.intensity, this.targetIntensity, transitionT);
    this.wind = lerp(this.wind, this.targetWind, windT);

    const depth = this._getDepthFactors();
    this._updateOverlays(depth, dt);
    this._updateEmitters(depth, time);
    this._updateLightning(time, dt, depth);
    this._updateAudio(depth);
  }

  resize() {
    const { width, height } = this._getViewport();
    this._tintOverlay?.setPosition(width / 2, height / 2).setSize(width, height);
    this._lightningOverlay?.setPosition(width / 2, height / 2).setSize(width, height);
    this._cavePulseOverlay?.setPosition(width / 2, height / 2).setSize(width, height);
    this._setEmitterRanges();
  }

  /** Normalized 0..1 strength of the currently visible lightning flash. */
  getLightningFlashAmount() {
    const configuredRange = this.weatherConfig?.lightning?.flashAlpha;
    const maxFlash = Array.isArray(configuredRange)
      ? Math.max(0.001, ...configuredRange)
      : 1;
    return clamp01(this._lightningAlpha / maxFlash);
  }

  forceWeather(kind, intensity = 1, durationMs = 20000) {
    if (!this.weatherConfig.phases[kind]) {
      console.warn(`[WeatherSystem] Unknown weather kind: ${kind}`);
      return;
    }

    const now = this.scene.time.now || 0;
    this.kind = kind;
    this.targetIntensity = clamp01(intensity);
    this.targetWind = this._randomRange(this.weatherConfig.phases[kind].wind);
    this._phaseEndsAt = now + Math.max(1000, durationMs);
    this._scheduleRetarget(now);
    this._scheduleLightning(now, true);
  }

  getSnapshot() {
    const depth = this._getDepthFactors();
    return {
      kind: this.kind,
      intensity: this.intensity,
      targetIntensity: this.targetIntensity,
      wind: this.wind,
      surfaceAmount: depth.surfaceAmount,
      undergroundAmount: depth.undergroundAmount,
      undergroundSignal: depth.undergroundSignal,
      isStorming: this.kind === "storm" && this.intensity > 0.55,
    };
  }

  getLightingSnapshot() {
    const depth = this._getDepthFactors();
    const lightningFlashAmount = this.getLightningFlashAmount();
    const rainAmount = this.kind === "drizzle" || this.kind === "rain" || this.kind === "storm"
      ? clamp01(this.intensity)
      : 0;
    const stormAmount = this.kind === "storm" ? clamp01(this.intensity) : 0;

    return {
      kind: this.kind,
      intensity: clamp01(this.intensity),
      targetIntensity: clamp01(this.targetIntensity),
      wind: this.wind,
      rainAmount,
      stormAmount,
      surfaceAmount: depth.surfaceAmount,
      undergroundAmount: depth.undergroundAmount,
      undergroundSignal: depth.undergroundSignal,
      lightningFlashAmount,
      isStorming: stormAmount > 0.55,
    };
  }

  destroy() {
    this._destroyed = true;
    this._timers.forEach((timer) => timer?.remove?.());
    this._timers = [];

    [this._rainEmitter, this._splashEmitter, this._dripEmitter, this._mistEmitter].forEach((emitter) => {
      emitter?.stop?.(true);
      emitter?.destroy?.();
    });

    this._tintOverlay?.destroy();
    this._lightningOverlay?.destroy();
    this._cavePulseOverlay?.destroy();

    this._stopRainNoise();
  }

  _createTextures() {
    this._createRainTexture();
    this._createDripTexture();
    this._createSplashTexture();
    this._createMistTexture();
  }

  _createRainTexture() {
    if (this.scene.textures.exists(TEXTURE_KEYS.rain)) return;
    const gfx = this.scene.make.graphics({ add: false });
    gfx.lineStyle(2, 0xb9dfff, 0.95);
    gfx.beginPath();
    gfx.moveTo(4, 2);
    gfx.lineTo(4, 44);
    gfx.strokePath();
    gfx.lineStyle(1, 0xffffff, 0.42);
    gfx.beginPath();
    gfx.moveTo(6, 6);
    gfx.lineTo(6, 34);
    gfx.strokePath();
    gfx.generateTexture(TEXTURE_KEYS.rain, 10, 48);
    gfx.destroy();
  }

  _createDripTexture() {
    if (this.scene.textures.exists(TEXTURE_KEYS.drip)) return;
    const gfx = this.scene.make.graphics({ add: false });
    gfx.fillStyle(0x9fdcff, 0.88);
    gfx.fillCircle(4, 6, 3);
    gfx.fillStyle(0xffffff, 0.45);
    gfx.fillCircle(3, 5, 1);
    gfx.generateTexture(TEXTURE_KEYS.drip, 8, 12);
    gfx.destroy();
  }

  _createSplashTexture() {
    if (this.scene.textures.exists(TEXTURE_KEYS.splash)) return;
    const gfx = this.scene.make.graphics({ add: false });
    gfx.lineStyle(2, 0xbfe8ff, 0.80);
    gfx.strokeEllipse(12, 12, 18, 7);
    gfx.lineStyle(1, 0xffffff, 0.38);
    gfx.strokeEllipse(12, 12, 10, 4);
    gfx.generateTexture(TEXTURE_KEYS.splash, 24, 24);
    gfx.destroy();
  }

  _createMistTexture() {
    if (this.scene.textures.exists(TEXTURE_KEYS.mist)) return;

    const texture = this.scene.textures.createCanvas(TEXTURE_KEYS.mist, 64, 64);
    const ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
    gradient.addColorStop(0, "rgba(190, 225, 255, 0.22)");
    gradient.addColorStop(0.55, "rgba(150, 200, 235, 0.10)");
    gradient.addColorStop(1, "rgba(130, 180, 220, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    texture.refresh();
  }

  _createOverlays() {
    const { width, height } = this._getViewport();
    const depths = this.weatherConfig.renderDepths;
    this._tintOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(depths.tint)
      .setVisible(false);

    this._cavePulseOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x8bc8ff, 0)
      .setScrollFactor(0)
      .setDepth(depths.tint + 1)
      .setVisible(false);

    this._lightningOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0xeaf7ff, 0)
      .setScrollFactor(0)
      .setDepth(depths.lightning)
      .setVisible(false);
  }

  _createEmitters() {
    const depths = this.weatherConfig.renderDepths;

    this._rainEmitter = this.scene.add.particles(0, 0, TEXTURE_KEYS.rain, {
      x: { min: -160, max: this._getViewport().width + 160 },
      y: -64,
      lifespan: { min: 430, max: 780 },
      speedX: { min: -120, max: 90 },
      speedY: { min: this.weatherConfig.rain.minSpeedY, max: this.weatherConfig.rain.maxSpeedY },
      rotate: { min: -7, max: 11 },
      scale: { min: 0.80, max: 1.35 },
      alpha: { start: 0.55, end: 0.08 },
      frequency: 90,
      quantity: 1,
      maxParticles: 420,
      blendMode: Phaser.BlendModes.ADD,
    }).setScrollFactor(0).setDepth(depths.rain).setAlpha(0);

    this._splashEmitter = this.scene.add.particles(0, 0, TEXTURE_KEYS.splash, {
      x: { min: -40, max: this._getViewport().width + 40 },
      y: { min: this._getViewport().height * 0.72, max: this._getViewport().height + 10 },
      lifespan: { min: 240, max: 420 },
      speedX: { min: -8, max: 8 },
      speedY: { min: -12, max: 0 },
      scale: { start: 0.24, end: 1.08 },
      alpha: { start: 0.28, end: 0 },
      frequency: 240,
      quantity: 1,
      maxParticles: 80,
      blendMode: Phaser.BlendModes.ADD,
    }).setScrollFactor(0).setDepth(depths.rain - 1).setAlpha(0);

    this._dripEmitter = this.scene.add.particles(0, 0, TEXTURE_KEYS.drip, {
      x: { min: -20, max: this._getViewport().width + 20 },
      y: { min: -20, max: this._getViewport().height * 0.36 },
      lifespan: { min: 900, max: 1500 },
      speedX: { min: -12, max: 12 },
      speedY: { min: 150, max: 320 },
      scale: { min: 0.55, max: 1.08 },
      alpha: { start: 0.48, end: 0.06 },
      frequency: 520,
      quantity: 1,
      maxParticles: 120,
      blendMode: Phaser.BlendModes.ADD,
    }).setScrollFactor(0).setDepth(depths.mist).setAlpha(0);

    this._mistEmitter = this.scene.add.particles(0, 0, TEXTURE_KEYS.mist, {
      x: { min: -80, max: this._getViewport().width + 80 },
      y: { min: this._getViewport().height * 0.42, max: this._getViewport().height + 70 },
      lifespan: { min: 1800, max: 3600 },
      speedX: { min: -20, max: 26 },
      speedY: { min: -28, max: -4 },
      scale: { start: 0.35, end: 1.75 },
      alpha: { start: 0.00, end: 0.16 },
      frequency: 540,
      quantity: 1,
      maxParticles: 90,
      blendMode: Phaser.BlendModes.ADD,
    }).setScrollFactor(0).setDepth(depths.mist).setAlpha(0);

    [this._rainEmitter, this._splashEmitter, this._dripEmitter, this._mistEmitter].forEach((emitter) => {
      emitter.stop(true);
    });
  }

  _enterWeather(kind, time, immediate) {
    const phase = this.weatherConfig.phases[kind] || this.weatherConfig.phases.clear;
    this.kind = kind;
    this.targetIntensity = this._randomRange(phase.intensity);
    this.targetWind = this._randomRange(phase.wind);
    if (immediate) {
      this.intensity = this.targetIntensity;
      this.wind = this.targetWind;
    }
    this._phaseEndsAt = time + this._randomRange(phase.durationMs);
    this._scheduleRetarget(time);
    this._scheduleLightning(time, true);
  }

  _retargetWithinCurrentWeather(time) {
    const phase = this.weatherConfig.phases[this.kind] || this.weatherConfig.phases.clear;
    this.targetIntensity = this._randomRange(phase.intensity);
    this.targetWind = this._randomRange(phase.wind);
    this._scheduleRetarget(time);
  }

  _scheduleRetarget(time) {
    this._nextRetargetAt = time + this._randomRange(this.weatherConfig.intensityRetargetMs);
  }

  _chooseNextKind() {
    const phase = this.weatherConfig.phases[this.kind] || this.weatherConfig.phases.clear;
    const weights = phase.next || this.weatherConfig.phases.clear.next;
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;

    for (const [kind, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return kind;
    }

    return entries[entries.length - 1]?.[0] || "clear";
  }

  _getDepthFactors() {
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const cameraMidY = (view?.y ?? cam.scrollY ?? 0) + (view?.height ?? cam.height ?? this.config.viewportHeight) * 0.5;
    const surfaceY = (this.config.topAirRows || 65) * (this.config.tileSize || 94);
    const depthTiles = Math.max(0, (cameraMidY - surfaceY) / (this.config.tileSize || 94));
    const cfg = this.weatherConfig.depth;

    const surfaceAmount = clamp01(1 - depthTiles / cfg.surfaceFadeTiles);
    const undergroundAmount = clamp01(depthTiles / cfg.undergroundFullTiles);
    const deepFade = 1 - clamp01((depthTiles - cfg.deepFadeStartTiles) / Math.max(1, cfg.deepFadeEndTiles - cfg.deepFadeStartTiles));
    const stormFloor = this.kind === "storm" ? cfg.stormMinimumSignal : 0;
    const undergroundSignal = Math.max(stormFloor, this.intensity * undergroundAmount) * deepFade;

    return {
      depthTiles,
      surfaceAmount,
      undergroundAmount,
      deepFade,
      undergroundSignal: clamp01(undergroundSignal),
    };
  }

  _updateOverlays(depth, delta) {
    const nightAmount = this.scene.dayNightCycle?.getNightAmount?.() ?? (this.scene.dayNightCycle?.isNightTime?.() ? 1 : 0);
    const lighting = this.weatherConfig.lighting;
    const surfaceWeather = this.intensity * depth.surfaceAmount;
    const stormAmount = this.kind === "storm" ? this.intensity : 0;

    const tintAlpha = clamp01(
      nightAmount * depth.surfaceAmount * lighting.nightAlpha +
      surfaceWeather * lighting.rainAlpha +
      stormAmount * depth.surfaceAmount * lighting.stormAlpha +
      depth.undergroundSignal * lighting.undergroundAlpha
    );

    const tintColor = depth.undergroundAmount > 0.45
      ? lighting.caveTint
      : stormAmount > 0.6
        ? lighting.stormTint
        : nightAmount > 0.45
          ? lighting.nightTint
          : this.intensity > 0.2
            ? lighting.rainTint
            : lighting.clearTint;

    this._tintOverlay.setVisible(tintAlpha > 0.005);
    this._tintOverlay.setFillStyle(tintColor, tintAlpha);

    this._cavePulse = Math.max(0, this._cavePulse - delta / 480);
    const cavePulseAlpha = this._cavePulse * depth.undergroundAmount * 0.036;
    this._cavePulseOverlay.setVisible(cavePulseAlpha > 0.004);
    this._cavePulseOverlay.setAlpha(cavePulseAlpha);

    this._lightningAlpha = Math.max(0, this._lightningAlpha - delta / 170);
    this._lightningOverlay.setVisible(this._lightningAlpha > 0.004);
    this._lightningOverlay.setAlpha(this._lightningAlpha);
  }

  _updateEmitters(depth, time) {
    const surfaceRain = clamp01(this.intensity * depth.surfaceAmount);
    const caveRain = clamp01(depth.undergroundSignal);

    this._setEmitterRunning(this._rainEmitter, surfaceRain > 0.025);
    this._setEmitterRunning(this._splashEmitter, surfaceRain > 0.15);
    this._setEmitterRunning(this._dripEmitter, caveRain > 0.045);
    this._setEmitterRunning(this._mistEmitter, caveRain > 0.09);

    this._rainEmitter.setAlpha(surfaceRain * this.weatherConfig.rain.alpha);
    this._splashEmitter.setAlpha(surfaceRain * this.weatherConfig.splashes.alpha);
    this._dripEmitter.setAlpha(caveRain * this.weatherConfig.underground.dripAlpha);
    this._mistEmitter.setAlpha(caveRain * this.weatherConfig.underground.mistAlpha);

    if (time - this._lastEmitterTuningAt < 180) return;
    this._lastEmitterTuningAt = time;

    const rainCfg = this.weatherConfig.rain;
    this._rainEmitter.setFrequency(
      Math.round(lerp(rainCfg.minFrequencyMs, rainCfg.maxFrequencyMs, surfaceRain)),
      Math.max(1, Math.round(lerp(1, rainCfg.maxQuantity, surfaceRain)))
    );
    this._rainEmitter.ops.speedX.onChange({
      min: this.wind * rainCfg.windScale - 55,
      max: this.wind * rainCfg.windScale + 80,
    });

    this._splashEmitter.setFrequency(
      Math.round(lerp(this.weatherConfig.splashes.minFrequencyMs, this.weatherConfig.splashes.maxFrequencyMs, surfaceRain)),
      surfaceRain > 0.75 ? 2 : 1
    );
    this._dripEmitter.setFrequency(
      Math.round(lerp(this.weatherConfig.underground.dripMinFrequencyMs, this.weatherConfig.underground.dripMaxFrequencyMs, caveRain)),
      caveRain > 0.72 ? 2 : 1
    );
    this._mistEmitter.setFrequency(
      Math.round(lerp(this.weatherConfig.underground.mistMinFrequencyMs, this.weatherConfig.underground.mistMaxFrequencyMs, caveRain)),
      1
    );
  }

  _updateLightning(time, delta, depth) {
    if (this.kind !== "storm" || this.intensity < 0.55 || time < this._nextLightningAt) return;

    const lightningCfg = this.weatherConfig.lightning;
    const flashAlpha = this._randomRange(lightningCfg.flashAlpha) * this.intensity;
    this._lightningAlpha = Math.max(this._lightningAlpha, flashAlpha * (0.45 + depth.surfaceAmount * 0.55));
    this._cavePulse = Math.max(this._cavePulse, this.intensity * (0.45 + depth.undergroundAmount * 0.55));

    // Phaser's camera flash effect has no peak-alpha control; the scaled
    // lightning overlay handles the subtle weather flash instead.

    const thunderDelay = this._randomRange(lightningCfg.thunderDelayMs);
    const thunderShake = this._pickWeatherThunderShake(lightningCfg, flashAlpha);
    const timer = this.scene.time.delayedCall(thunderDelay, () => {
      if (this._destroyed) return;
      this.scene.shakeSystem?.shake(
        thunderShake.signature,
        thunderShake.intensityScale,
        { durationScale: thunderShake.durationScale }
      );
      this._playThunder(depth);
    });
    this._timers.push(timer);

    if (Math.random() < lightningCfg.clusterChance) {
      this._nextLightningAt = time + this._randomRange(lightningCfg.clusterGapMs);
    } else {
      this._scheduleLightning(time, false);
    }
  }

  _scheduleLightning(time, allowSoon) {
    const cfg = this.weatherConfig.lightning;
    const delay = this.kind === "storm"
      ? this._randomRange(cfg.intervalMs)
      : this._randomRange(cfg.intervalMs) + 5000;
    this._nextLightningAt = time + (allowSoon && this.kind === "storm" ? Math.min(delay, 1800) : delay);
  }

  _pickWeatherThunderShake(lightningCfg, flashAlpha) {
    const configuredFlash = Array.isArray(lightningCfg.flashAlpha)
      ? lightningCfg.flashAlpha
      : [0, Math.max(0.001, Number(lightningCfg.flashAlpha) || 1)];
    const flashSpan = Math.max(0.001, configuredFlash[1] - configuredFlash[0]);
    const flashStrength = clamp01((flashAlpha - configuredFlash[0]) / flashSpan);
    const closeness = clamp01(flashStrength * 0.65 + this.intensity * 0.35);
    const roll = Math.random();

    if (closeness > 0.74 && roll > 0.58) {
      return {
        signature: "weatherThunder.close",
        intensityScale: this._randomRange([1.10, 1.45]),
        durationScale: this._randomRange([1.00, 1.35]),
      };
    }

    if (closeness > 0.36 || roll > 0.28) {
      return {
        signature: "weatherThunder.mid",
        intensityScale: this._randomRange([0.90, 1.25]),
        durationScale: this._randomRange([0.85, 1.15]),
      };
    }

    return {
      signature: "weatherThunder.far",
      intensityScale: this._randomRange([0.75, 1.05]),
      durationScale: this._randomRange([0.75, 1.05]),
    };
  }

  _updateAudio(depth) {
    const amount = clamp01(this.intensity * (depth.surfaceAmount + depth.undergroundSignal * this.weatherConfig.audio.undergroundMuffle));
    const soundSystem = this.scene.soundSystem;
    const canPlay = soundSystem?.audioInitialized && soundSystem?.sfxEnabled && this.scene.sound?.context;

    if (!canPlay || amount < 0.035) {
      this._setRainNoiseVolume(0);
      return;
    }

    this._ensureRainNoise();
    this._setRainNoiseVolume(amount * this.weatherConfig.audio.rainVolume * (soundSystem?.sfxVolume ?? 1));
  }

  _ensureRainNoise() {
    if (this._rainNoise || !this.scene.sound?.context) return;

    const ctx = this.scene.sound.context;
    const bufferLength = Math.max(1, Math.floor(ctx.sampleRate * 1.6));
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferLength; i += 1) {
      last = last * 0.86 + (Math.random() * 2 - 1) * 0.14;
      data[i] = last;
    }

    const source = ctx.createBufferSource();
    const lowpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = buffer;
    source.loop = true;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1850;
    lowpass.Q.value = 0.8;
    gain.gain.value = 0;

    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.scene.sound.destination || ctx.destination);
    source.start(0);

    this._rainNoise = { source, lowpass, gain };
  }

  _setRainNoiseVolume(volume) {
    if (!this._rainNoise?.gain || !this.scene.sound?.context) return;
    const ctx = this.scene.sound.context;
    const target = clamp01(volume);
    this._rainNoise.gain.gain.cancelScheduledValues(ctx.currentTime);
    this._rainNoise.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.18);
  }

  _stopRainNoise() {
    if (!this._rainNoise) return;
    try {
      this._rainNoise.source.stop(0);
    } catch (_) {
      // Already stopped.
    }
    try {
      this._rainNoise.source.disconnect();
      this._rainNoise.lowpass.disconnect();
      this._rainNoise.gain.disconnect();
    } catch (_) {
      // Best effort cleanup for browser audio nodes.
    }
    this._rainNoise = null;
  }

  _playThunder(depth) {
    const soundSystem = this.scene.soundSystem;
    const ctx = this.scene.sound?.context;
    if (!ctx || !soundSystem?.audioInitialized || !soundSystem?.sfxEnabled) return;

    const duration = 1.15 + Math.random() * 1.35;
    const bufferLength = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let rumble = 0;
    for (let i = 0; i < bufferLength; i += 1) {
      const t = i / bufferLength;
      const envelope = Math.pow(1 - t, 2.2) * Math.min(1, t * 18);
      rumble = rumble * 0.94 + (Math.random() * 2 - 1) * 0.06;
      data[i] = rumble * envelope;
    }

    const source = ctx.createBufferSource();
    const lowpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const muffle = lerp(1, this.weatherConfig.audio.undergroundMuffle, depth.undergroundAmount);
    lowpass.type = "lowpass";
    lowpass.frequency.value = lerp(1050, 390, depth.undergroundAmount);
    lowpass.Q.value = 1.2;
    gain.gain.value = this.weatherConfig.audio.thunderVolume * (soundSystem.sfxVolume ?? 1) * muffle;

    source.buffer = buffer;
    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.scene.sound.destination || ctx.destination);
    source.start(0);
    source.onended = () => {
      try {
        source.disconnect();
        lowpass.disconnect();
        gain.disconnect();
      } catch (_) {
        // Audio node already disconnected.
      }
    };
  }

  _setEmitterRanges() {
    const { width, height } = this._getViewport();
    const setRange = (emitter, xMin, xMax, yValue) => {
      if (!emitter?.ops) return;
      emitter.ops.x.onChange({ min: xMin, max: xMax });
      if (yValue !== undefined) {
        emitter.ops.y.onChange(yValue);
      }
    };

    setRange(this._rainEmitter, -180, width + 180, -64);
    setRange(this._splashEmitter, -40, width + 40, { min: height * 0.72, max: height + 10 });
    setRange(this._dripEmitter, -20, width + 20, { min: -20, max: height * 0.36 });
    setRange(this._mistEmitter, -80, width + 80, { min: height * 0.42, max: height + 70 });
  }

  _setEmitterRunning(emitter, shouldRun) {
    if (!emitter) return;
    if (shouldRun && !emitter.emitting) {
      emitter.start();
    } else if (!shouldRun && emitter.emitting) {
      emitter.stop(false);
    }
  }

  _getViewport() {
    const cam = this.scene.cameras.main;
    return {
      width: cam.width || this.config.viewportWidth || 1280,
      height: cam.height || this.config.viewportHeight || 720,
    };
  }

  _randomRange(range) {
    if (!Array.isArray(range)) return Number(range) || 0;
    return range[0] + Math.random() * (range[1] - range[0]);
  }
}
