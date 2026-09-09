import { resolveLayeredSkyReviewEnabled } from "../../values/worldVisualLayeredSkyReview.js";
/**
 * Day/Night Cycle System — Enhanced
 * Manages time progression with 7 distinct phases, sun/moon arc animation,
 * sky color grading, shadow direction, and star + sun/moon rendering.
 */
import { LayeredCelestialView } from "./LayeredCelestialView.js";
import { WORLD_DEPTH_CONFIG } from "../../values/worldDepthConfig.js";
import { TIME_CONFIG } from "../../values/timeConfig.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import { clamp01 } from "../../values/mathUtils.js";

const smoothstep01 = value => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export class DayNightCycle {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = config;
    this.timeConfig = TIME_CONFIG;

    // Time tracking (0-1, where 0 = midnight, 0.5 = noon)
    this.currentTime = this.timeConfig.initialTime;

    // Day counter
    this.day = this.timeConfig.initialDay;

    // Determine initial season based on day
    this._determineSeason();

    // Configuration overrides
    this.dayDuration = config.dayDurationMs || this.timeConfig.dayDurationMs;
    this.starCount = config.starCount || 80;
    this.starTwinkleSpeed = config.starTwinkleSpeed || 1200;

    // State
    this._nightAmount = 0;
    this.isNight = false;
    this.currentPhase = this._getCurrentPhase();
    this.stars = [];
    this.starContainer = null;
    this.sunSprite = null;
    this.moonSprite = null;
    this.skyTintOverlay = null;

    // Create visual elements
    this._createSkyTint();
    this._createStars();
    this._createSunMoon();
  }

  advanceTime(delta) {
    const elapsed = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    this.currentTime += elapsed / this.dayDuration;
    if (this.currentTime >= 1) {
      const days = Math.floor(this.currentTime);
      this.currentTime -= days;
      this.day += days;
      this._determineSeason();
      this.scene.events?.emit?.('world-days-passed', { days, day: this.day });
    }

    // Update current phase
    this.currentPhase = this._getCurrentPhase();

    // Determine smooth night strength
    this._nightAmount = this.getNightAmount();
    this.isNight = this._nightAmount > 0.1;

  }

  update(delta) {
    this.advanceTime(delta);
    // Render only once per frame, even when sleep advances many simulation steps.
    this._updateStarVisibility();
    this._updateSunMoonPositions();
    this._updateSkyTint();
  }

  /**
   * Get the current time phase object
   * @returns {Object} Current phase config
   */
  _getCurrentPhase() {
    const t = this.currentTime;
    const phases = this.timeConfig.phases;
    for (let i = 0; i < phases.length; i++) {
      if (t >= phases[i].start && t < phases[i].end) {
        return phases[i];
      }
    }
    return phases[phases.length - 1];
  }

  /**
   * Get the name of the current time period
   * @returns {string} e.g. "Morning", "Afternoon", "Night"
   */
  getCurrentPhaseName() {
    return this.currentPhase?.name || "day";
  }

  /**
   * Get the readable label for the current phase
   * @returns {string}
   */
  getCurrentPhaseLabel() {
    return this.currentPhase?.label || "";
  }

  /**
   * Get smooth interpolated night strength (0-1) with dusk/dawn transitions
   * @returns {number}
   */
  getNightAmount() {
    const t = this.currentTime;
    const nightStart = this.timeConfig.celestial.setTime;
    const nightEnd = this.timeConfig.celestial.riseTime;
    const transitionPct = Math.max(0.02, Math.min(0.15, 5000 / this.dayDuration));

    if (t >= nightStart) {
      // Night approaching — ramp up
      return Math.min(1, (t - nightStart) / transitionPct);
    }
    if (t <= nightEnd) {
      // Dawn — ramp down
      return Math.max(0, Math.min(1, (nightEnd - t) / transitionPct));
    }
    return 0;
  }

  /**
   * Get a 24h time string
   * @returns {string}
   */
  getTimeString24() {
    const hours24 = Math.floor(this.currentTime * 24) % 24;
    const minutes = Math.floor((this.currentTime * 24 * 60) % 60);
    return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Get a 12h time string
   * @returns {string}
   */
  getTimeString12() {
    const hours24 = Math.floor(this.currentTime * 24) % 24;
    const minutes = Math.floor((this.currentTime * 24 * 60) % 60);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const displayHours = hours24 % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Get the day number
   * @returns {number}
   */
  getDay() {
    return this.day;
  }

  /**
   * Get the current season name
   * @returns {string}
   */
  getSeason() {
    return this._season;
  }

  /**
   * Get the current temperature range
   * @returns {number[]} [min, max] in Celsius
   */
  getTemperatureRange() {
    const season = this.timeConfig.seasons[this._season];
    return season?.temperature || [15, 25];
  }

  /**
   * Get the current temperature (interpolated based on time of day)
   * @returns {number} Temperature in Celsius
   */
  getCurrentTemperature() {
    const [min, max] = this.getTemperatureRange();
    // Warmest at afternoon (t ~ 0.5), coolest at night (t ~ 0 or 1)
    const dayFraction = Math.sin(this.currentTime * Math.PI * 2);
    const temp = min + (max - min) * Math.max(0, dayFraction * 0.5 + 0.5);
    return Math.round(temp * 10) / 10;
  }

  /**
   * Get shadow direction in degrees
   * @returns {number}
   */
  getShadowAngle() {
    const phase = this.currentPhase?.name || "afternoon";
    const angles = this.timeConfig.shadowAngles;
    return angles[phase] || angles.afternoon;
  }

  getSunWorldPosition() {
    return this._getCelestialWorldPosition(
      this.timeConfig.sunArc,
      this.timeConfig.celestial.sun.phaseOffset,
    );
  }

  getMoonWorldPosition() {
    return this._getCelestialWorldPosition(
      this.timeConfig.moonArc,
      this.timeConfig.celestial.moon.phaseOffset,
    );
  }

  /**
   * Project the stable world-space sun into the active camera for screen effects.
   */
  getSunScreenPosition(viewportW, viewportH) {
    return this._projectWorldPositionToScreen(this.getSunWorldPosition(), viewportW, viewportH);
  }

  /**
   * Project the stable world-space moon into the active camera for screen effects.
   */
  getMoonScreenPosition(viewportW, viewportH) {
    return this._projectWorldPositionToScreen(this.getMoonWorldPosition(), viewportW, viewportH);
  }

  /**
   * Calculate celestial body position based on arc definition
   * @private
   */
  _getCelestialOrbitPosition(arc, phaseOffset = 0) {
    const orbit = this.timeConfig.celestial;
    const pos = this._getCelestialOrbitTime(phaseOffset);
    const risePhase = orbit.riseTime;
    const noonPhase = orbit.noonTime;
    const setPhase = orbit.setTime;
    const belowTravel = Math.max(0.001, orbit.belowHorizonTravelFraction);
    const noonX = arc.noonX ?? arc.zenithX;
    const noonY = arc.noonY ?? arc.zenithY;

    let nx, ny;
    if (pos < risePhase) {
      const p = smoothstep01((pos - (risePhase - belowTravel)) / belowTravel);
      nx = -orbit.belowHorizonX + (arc.riseX + orbit.belowHorizonX) * p;
      ny = orbit.belowHorizonY + (arc.riseY - orbit.belowHorizonY) * p;
    } else if (pos < noonPhase) {
      // Rising
      const p = (pos - risePhase) / (noonPhase - risePhase);
      nx = arc.riseX + (noonX - arc.riseX) * p;
      ny = arc.riseY + (noonY - arc.riseY) * p;
    } else if (pos <= setPhase) {
      // Setting
      const p = (pos - noonPhase) / (setPhase - noonPhase);
      nx = noonX + (arc.setX - noonX) * p;
      ny = noonY + (arc.setY - noonY) * p;
    } else {
      const p = smoothstep01((pos - setPhase) / belowTravel);
      nx = arc.setX + (orbit.belowHorizonX - arc.setX) * p;
      ny = arc.setY + (orbit.belowHorizonY - arc.setY) * p;
    }

    return { x: nx, y: ny };
  }

  _getCelestialWorldPosition(arc, phaseOffset = 0) {
    const orbit = this.timeConfig.celestial;
    const normalized = this._getCelestialOrbitPosition(arc, phaseOffset);
    const tileSize = this.config.tileSize || 94;
    const levelOneReview = resolveLayeredSkyReviewEnabled() && this.scene.gameplayCapabilities?.isLevelEnabled?.(2) === false;
    const worldWidth = levelOneReview ? (WORLD_DEPTH_CONFIG.levelTwoLeftTile + 1) * tileSize : this.config.worldWidthPx
      || (this.config.worldWidthTiles || 280) * tileSize;
    const surfaceWorldY = (this.config.topAirRows || 65) * tileSize;

    return {
      x: worldWidth * orbit.worldCenterXRatio
        + normalized.x * worldWidth * orbit.worldHorizontalRadiusRatio,
      y: surfaceWorldY
        + orbit.worldOriginOffsetTiles * tileSize
        + normalized.y * orbit.worldVerticalRadiusTiles * tileSize,
    };
  }

  _projectWorldPositionToScreen(position, viewportW, viewportH) {
    const cam = this.scene?.cameras?.main;
    const width = Number.isFinite(viewportW) ? viewportW : (cam?.width ?? this.config.viewportWidth ?? 0);
    const height = Number.isFinite(viewportH) ? viewportH : (cam?.height ?? this.config.viewportHeight ?? 0);
    const zoomX = Number.isFinite(cam?.zoomX) ? cam.zoomX : (Number.isFinite(cam?.zoom) ? cam.zoom : 1);
    const zoomY = Number.isFinite(cam?.zoomY) ? cam.zoomY : (Number.isFinite(cam?.zoom) ? cam.zoom : 1);
    const viewX = cam?.worldView?.x ?? cam?.scrollX ?? 0;
    const viewY = cam?.worldView?.y ?? cam?.scrollY ?? 0;

    return {
      x: (cam?.x ?? 0) + (position.x - viewX) * zoomX,
      y: (cam?.y ?? 0) + (position.y - viewY) * zoomY,
      viewportWidth: width,
      viewportHeight: height,
    };
  }

  _getCelestialOrbitTime(phaseOffset = 0) {
    return ((this.currentTime + phaseOffset) % 1 + 1) % 1;
  }

  _isCelestialAboveHorizon(phaseOffset = 0) {
    const orbitTime = this._getCelestialOrbitTime(phaseOffset);
    const orbit = this.timeConfig.celestial;
    return orbitTime >= orbit.riseTime && orbitTime <= orbit.setTime;
  }

  _getHorizonVisibility(phaseOffset = 0) {
    const orbitTime = this._getCelestialOrbitTime(phaseOffset);
    const orbit = this.timeConfig.celestial;
    if (orbitTime < orbit.riseTime || orbitTime > orbit.setTime) return 0;
    const fade = Math.max(0.001, orbit.horizonFadeFraction);
    const riseVisibility = smoothstep01((orbitTime - orbit.riseTime) / fade);
    const setVisibility = smoothstep01((orbit.setTime - orbitTime) / fade);
    return Math.min(riseVisibility, setVisibility);
  }

  _getCelestialElevation(phaseOffset = 0) {
    const orbitTime = this._getCelestialOrbitTime(phaseOffset);
    const noonTime = this.timeConfig.celestial.noonTime;
    return Math.cos((orbitTime - noonTime) * Math.PI * 2);
  }

  /**
   * Get the current sky tint color (interpolated between phases)
   * @returns {number} Hex color
   */
  getSkyColor() {
    return this.currentPhase?.skyColor || 0x5aa8e8;
  }

  /**
   * Get the current horizon glow color
   * @returns {number} Hex color
   */
  getHorizonGlowColor() {
    return this.currentPhase?.horizonGlow || 0xc8d8e8;
  }

  /**
   * Get sun alpha (visibility)
   * @returns {number} 0-1
   */
  getSunAlpha() {
    const offset = this.timeConfig.celestial.sun.phaseOffset;
    return this._getCelestialPhaseAlpha("sun") * this._getHorizonVisibility(offset);
  }

  /**
   * Get moon alpha (visibility)
   * @returns {number} 0-1
   */
  getMoonAlpha() {
    const offset = this.timeConfig.celestial.moon.phaseOffset;
    return this._getCelestialPhaseAlpha("moon") * this._getHorizonVisibility(offset);
  }

  // Match the continuous sky phase blend without changing the authoritative orbit.
  _getCelestialPhaseAlpha(body) {
    const property = body + "Alpha";
    if (!resolveLayeredSkyReviewEnabled()) return this.currentPhase?.[property] ?? (body === "sun" ? 1 : 0);
    const phases = this.timeConfig.phases, time = this.currentTime;
    const centers = phases.map(phase => (phase.start + phase.end) / 2);
    let next = centers.findIndex(center => center > time);
    if (next < 0) next = 0;
    const previous = (next + phases.length - 1) % phases.length;
    const start = centers[previous], end = centers[next] + (next === 0 ? 1 : 0);
    const t = smoothstep01(((time < start ? time + 1 : time) - start) / (end - start));
    return phases[previous][property] + (phases[next][property] - phases[previous][property]) * t;
  }

  /** Get immutable sun world coordinates and their active-camera projection. */
  getSunState(viewportW, viewportH) {
    return this._getCelestialBodyState("sun", viewportW, viewportH);
  }

  /**
   * Get an immutable world-space state plus its active-camera projection.
   * @returns {Readonly<Object>}
   */
  getMoonState(viewportW, viewportH) {
    return this._getCelestialBodyState("moon", viewportW, viewportH);
  }

  /**
   * Stable read-only clock snapshot for lighting, weather, and skyline systems.
   * @returns {Readonly<Object>}
   */
  getCelestialSnapshot(viewportW, viewportH) {
    const phase = this._getCurrentPhase();
    return Object.freeze({
      normalizedTime: this._getCelestialOrbitTime(),
      day: this.day,
      phase: phase?.name || "day",
      phaseLabel: phase?.label || "",
      sun: this.getSunState(viewportW, viewportH),
      moon: this.getMoonState(viewportW, viewportH),
    });
  }

  _getCelestialBodyState(body, viewportW, viewportH) {
    const bodyConfig = this.timeConfig.celestial[body];
    const phase = this._getCurrentPhase();
    const worldPosition = body === "sun"
      ? this.getSunWorldPosition()
      : this.getMoonWorldPosition();
    const position = this._projectWorldPositionToScreen(worldPosition, viewportW, viewportH);
    const phaseAlpha = this._getCelestialPhaseAlpha(body);
    const aboveHorizon = this._isCelestialAboveHorizon(bodyConfig.phaseOffset);
    const horizonVisibility = this._getHorizonVisibility(bodyConfig.phaseOffset);

    return Object.freeze({
      normalizedTime: this._getCelestialOrbitTime(),
      orbitTime: this._getCelestialOrbitTime(bodyConfig.phaseOffset),
      phase: phase?.name || "day",
      worldPosition: Object.freeze({ x: worldPosition.x, y: worldPosition.y }),
      screenPosition: Object.freeze({ x: position.x, y: position.y }),
      elevation: this._getCelestialElevation(bodyConfig.phaseOffset),
      aboveHorizon,
      alpha: (phaseAlpha ?? 0) * horizonVisibility,
      color: bodyConfig.color,
    });
  }

  /**
   * Get star alpha (visibility)
   * @returns {number} 0-1
   */
  getStarAlpha() {
    return this.currentPhase?.starAlpha ?? 0;
  }

  /**
   * Determine the current season based on day number
   * @private
   */
  _determineSeason() {
    const seasonNames = ["spring", "summer", "autumn", "winter"];
    const daysPerSeason = 7; // Change every 7 days
    const idx = Math.floor((this.day - 1) / daysPerSeason) % 4;
    this._season = seasonNames[idx];
  }

  /**
   * Create the sky tint overlay (full-screen colored rectangle)
   * @private
   */
  _createSkyTint() {
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    this.skyTintOverlay = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(55) // Behind weather overlay (56)
      .setVisible(true);
  }

  /**
   * Create star sprites
   * @private
   */
  _createStars() {
    if (resolveLayeredSkyReviewEnabled()) return;
    this.starContainer = this.scene.add.container().setDepth(49);

    const tileSize = this.config.tileSize || 94;
    const surfaceWorldY = (this.config.topAirRows || 65) * tileSize;
    const skyHeight = 480;
    const starAreaTop = surfaceWorldY - skyHeight;
    const viewportW = this.config.viewportWidth || 1280;
    const spawnCentreX = (this.config.spawnTileX || 28) * tileSize + viewportW * 0.5;
    const zoneHalfW = viewportW * 2;

    for (let i = 0; i < this.starCount; i++) {
      const x = spawnCentreX - zoneHalfW + Math.random() * zoneHalfW * 2;
      const y = starAreaTop + Math.random() * skyHeight;
      const star = this.scene.add.graphics();
      const size = 3 + Math.random() * 4;
      const colorType = Math.random();
      let color = 0xFFFFFF;
      if (colorType > 0.8) color = 0xADD8E6;
      else if (colorType > 0.6) color = 0xFFFFE0;

      star.fillStyle(color);
      star.fillCircle(0, 0, size / 2);
      star.fillStyle(0xFFFFFF, 0.5);
      star.fillCircle(0, 0, size / 5);
      star.setPosition(x, y);

      this.stars.push({
        sprite: star,
        x, y,
        baseAlpha: 0.6 + Math.random() * 0.4,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: this.starTwinkleSpeed * (0.7 + Math.random() * 0.6),
      });
      this.starContainer.add(star);
    }
  }

  /**
   * Create sun and moon sprites
   * @private
   */
  _createSunMoon() {
    if (resolveLayeredSkyReviewEnabled()) {
      this.layeredCelestial = new LayeredCelestialView(this.scene, this);
      this.sunSprite = this.layeredCelestial.sun;
      this.moonSprite = this.layeredCelestial.moon;
      return;
    }
    // Sun — warm gradient circle (smaller, softer)
    const sunGfx = this.scene.add.graphics();
    sunGfx.fillStyle(0xffee88, 0.7);
    sunGfx.fillCircle(0, 0, 18);
    sunGfx.fillStyle(0xffffff, 0.2);
    sunGfx.fillCircle(0, 0, 26);
    sunGfx.fillStyle(0xffdd44, 0.10);
    sunGfx.fillCircle(0, 0, 36);
    sunGfx.setScrollFactor(1).setDepth(this.timeConfig.celestial.renderDepth);
    this.sunSprite = sunGfx;
    this.sunSprite.setPosition(-200, -200);

    // Moon — cool crescent with glow (smaller, softer)
    const moonGfx = this.scene.add.graphics();
    moonGfx.fillStyle(0xc8c8d8, 0.8);
    moonGfx.fillCircle(0, 0, 14);
    moonGfx.fillStyle(0xffffff, 0.15);
    moonGfx.fillCircle(0, 0, 20);
    moonGfx.fillStyle(0x0a0e1a, 1);
    moonGfx.fillCircle(-5, -3, 12);
    moonGfx.setScrollFactor(1).setDepth(this.timeConfig.celestial.renderDepth);
    this.moonSprite = moonGfx;
    this.moonSprite.setPosition(-200, -200);
  }

  /**
   * Update star visibility
   * @private
   */
  _updateStarVisibility() {
    const cam = this.scene.cameras.main;
    const now = Date.now();
    const surfaceWorldY = (this.config.topAirRows || 65) * (this.config.tileSize || 94);
    const cameraBottomY = cam.worldView.bottom;
    const depthBelowSurface = Math.max(0, cameraBottomY - surfaceWorldY);
    const maxVisibleDepth = 200 * (this.config.tileSize || 94);
    const depthAlpha = Math.max(0, 1 - (depthBelowSurface / maxVisibleDepth));
    const starAlpha = this.getStarAlpha();

    this.stars.forEach(s => {
      const twinkle = Math.sin((now / s.twinkleSpeed) + s.twinklePhase);
      const twinkleAlpha = 0.6 + twinkle * 0.4;
      s.sprite.setAlpha(s.baseAlpha * twinkleAlpha * depthAlpha * starAlpha);
    });
  }

  /**
   * Update sun/moon position
   * @private
   */
  _updateSunMoonPositions() {
    const sunPos = this.getSunWorldPosition();
    const moonPos = this.getMoonWorldPosition();
    const weather = this.scene.weatherSystem?.getLightingSnapshot?.() || {};
    const sunTransmission = clamp01(weather.sunTransmittance ?? 1)
      * clamp01(weather.sunExposure ?? weather.exposure ?? 1);
    const moonTransmission = 1 - clamp01(weather.fogAmount ?? 0) * 0.65;
    const surfaceVisibility = this._getSurfaceLightInfluence();

    this.sunSprite.setPosition(sunPos.x, sunPos.y);
    this.sunSprite.setAlpha(this.getSunAlpha() * sunTransmission * surfaceVisibility);

    this.moonSprite.setPosition(moonPos.x, moonPos.y);
    this.moonSprite.setAlpha(this.getMoonAlpha() * moonTransmission * surfaceVisibility);
    this.layeredCelestial?.update(weather);
  }

  /**
   * Update sky tint overlay
   * @private
   */
  _updateSkyTint() {
    const nightAmount = this._nightAmount;
    const phase = this.currentPhase;
    if (!phase || !this.skyTintOverlay) return;

    const isScenic = String(this.scene.worldVisualRuntimeMode || "").startsWith("scenic");
    const tintConfig = isScenic
      ? this.timeConfig.skyTintOverlay.scenic
      : this.timeConfig.skyTintOverlay.legacy;
    const isDusk = phase.name === "dusk" || phase.name === "sunset";
    const baseAlpha = nightAmount * tintConfig.nightAlpha + (isDusk ? tintConfig.duskAlpha : 0);
    this.skyTintOverlay.setAlpha(
      Math.min(tintConfig.maxAlpha, baseAlpha) * this._getSurfaceLightInfluence()
    );
    this.skyTintOverlay.setFillStyle(this.getSkyColor(), 1);
  }

  _getSurfaceLightInfluence() {
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const tileSize = this.config.tileSize || 94;
    const surfaceY = (this.config.topAirRows || 65) * tileSize;
    const cameraMidY = (view?.y ?? cam.scrollY ?? 0) + (view?.height ?? cam.height ?? this.config.viewportHeight) * 0.5;
    const depthTiles = Math.max(0, (cameraMidY - surfaceY) / tileSize);
    const cfg = LIGHT_CONFIG.surfaceSunlight;
    const start = cfg.fullStrengthDepthTiles;
    const end = Math.max(start + 1, cfg.fadeOutEndDepthTiles);

    if (depthTiles <= start) return 1;
    if (depthTiles >= end) return 0;

    const t = (depthTiles - start) / (end - start);
    const smooth = t * t * (3 - 2 * t);
    return 1 - smooth;
  }

  /**
   * Handle viewport resize
   */
  resize() {
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    if (this.skyTintOverlay) {
      this.skyTintOverlay.setPosition(w / 2, h / 2).setSize(w, h);
    }
  }

  /**
   * Serialize day/night state for save system
   * @returns {Object} Save data
   */
  toJSON() {
    return {
      currentTime: this.currentTime,
      day: this.day,
    };
  }

  /**
   * Restore day/night state from saved data
   * @param {Object} data - Saved day/night data
   */
  fromJSON(data) {
    if (!data) return;
    if (Number.isFinite(data.currentTime)) {
      this.currentTime = ((data.currentTime % 1) + 1) % 1;
    }
    if (Number.isFinite(data.day)) {
      this.day = Math.max(1, Math.floor(data.day));
    }
    // Re-evaluate season and phase after restore
    this._determineSeason();
    this.currentPhase = this._getCurrentPhase();
  }

  /**
   * Clean up
   */
  destroy() {
    this.stars.forEach(s => {
      if (s.sprite) {
        this.scene.tweens.killTweensOf(s.sprite);
        s.sprite.destroy();
      }
    });
    this.stars = [];
    this.starContainer?.destroy();
    if (this.layeredCelestial) this.layeredCelestial.destroy();
    else { this.sunSprite?.destroy(); this.moonSprite?.destroy(); }
    this.skyTintOverlay?.destroy();
  }
}
