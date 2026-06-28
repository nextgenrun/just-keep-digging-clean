/**
 * Day/Night Cycle System — Enhanced
 * Manages time progression with 7 distinct phases, sun/moon arc animation,
 * sky color grading, shadow direction, and star + sun/moon rendering.
 */
import { TIME_CONFIG } from "../../values/timeConfig.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";

export class DayNightCycle {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = config;
    this.timeConfig = TIME_CONFIG;

    // Time tracking (0-1, where 0 = midnight, 0.5 = noon)
    this.currentTime = 0.4; // Start at morning for demo purposes

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

  update(delta) {
    // Advance time
    this.currentTime += delta / this.dayDuration;
    if (this.currentTime >= 1) {
      this.currentTime = 0;
      this.day++;
      this._determineSeason();
    }

    // Update current phase
    this.currentPhase = this._getCurrentPhase();

    // Determine smooth night strength
    this._nightAmount = this.getNightAmount();
    this.isNight = this._nightAmount > 0.1;

    // Update visual elements
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
    const nightStart = 0.75; // 6 PM
    const nightEnd = 0.25;   // 6 AM
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

  /**
   * Get sun position in viewport-relative coordinates
   * @param {number} viewportW
   * @param {number} viewportH
   * @returns {{x: number, y: number}}
   */
  getSunScreenPosition(viewportW, viewportH) {
    return this._getCelestialPosition(this.timeConfig.sunArc, viewportW, viewportH);
  }

  /**
   * Get moon position in viewport-relative coordinates
   * @param {number} viewportW
   * @param {number} viewportH
   * @returns {{x: number, y: number}}
   */
  getMoonScreenPosition(viewportW, viewportH) {
    return this._getCelestialPosition(this.timeConfig.moonArc, viewportW, viewportH);
  }

  /**
   * Calculate celestial body position based on arc definition
   * @private
   */
  _getCelestialPosition(arc, vw, vh) {
    const t = this.currentTime;
    // Normalize to 0-1 across the day for position
    const pos = (t + 0.5) % 1; // Sun/moon opposite

    // Interpolate along arc
    const risePhase = 0.25;  // 6 AM
    const noonPhase = 0.5;   // 12 PM
    const setPhase = 0.75;   // 6 PM

    let nx, ny;
    if (pos < risePhase) {
      // Below horizon
      nx = -1.2;
      ny = 1.2;
    } else if (pos < noonPhase) {
      // Rising
      const p = (pos - risePhase) / (noonPhase - risePhase);
      nx = arc.riseX + (arc.noonX - arc.riseX) * p;
      ny = arc.riseY + (arc.noonY - arc.riseY) * p;
    } else if (pos < setPhase) {
      // Setting
      const p = (pos - noonPhase) / (setPhase - noonPhase);
      nx = arc.noonX + (arc.setX - arc.noonX) * p;
      ny = arc.noonY + (arc.setY - arc.noonY) * p;
    } else {
      // Below horizon
      nx = 1.2;
      ny = 1.2;
    }

    return {
      x: vw * 0.5 + nx * vw * 0.5,
      y: vh * 0.15 + ny * vh * 0.35,
    };
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
    return this.currentPhase?.sunAlpha ?? 1;
  }

  /**
   * Get moon alpha (visibility)
   * @returns {number} 0-1
   */
  getMoonAlpha() {
    return this.currentPhase?.moonAlpha ?? 0;
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
    // Sun — warm gradient circle (smaller, softer)
    const sunGfx = this.scene.add.graphics();
    sunGfx.fillStyle(0xffee88, 0.7);
    sunGfx.fillCircle(0, 0, 18);
    sunGfx.fillStyle(0xffffff, 0.2);
    sunGfx.fillCircle(0, 0, 26);
    sunGfx.fillStyle(0xffdd44, 0.10);
    sunGfx.fillCircle(0, 0, 36);
    sunGfx.setDepth(48);
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
    moonGfx.setDepth(48);
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
    const cam = this.scene.cameras.main;
    const vw = cam.width;
    const vh = cam.height;

    const sunPos = this.getSunScreenPosition(vw, vh);
    const moonPos = this.getMoonScreenPosition(vw, vh);

    this.sunSprite.setPosition(sunPos.x, sunPos.y);
    this.sunSprite.setAlpha(this.getSunAlpha());

    this.moonSprite.setPosition(moonPos.x, moonPos.y);
    this.moonSprite.setAlpha(this.getMoonAlpha());
  }

  /**
   * Update sky tint overlay
   * @private
   */
  _updateSkyTint() {
    const nightAmount = this._nightAmount;
    const phase = this.currentPhase;
    if (!phase || !this.skyTintOverlay) return;

    // Interpolate tint alpha based on night amount + weather — subtle
    const baseAlpha = nightAmount * 0.18 + (phase.name === "dusk" || phase.name === "sunset" ? 0.08 : 0);
    this.skyTintOverlay.setAlpha(Math.min(0.28, baseAlpha) * this._getSurfaceLightInfluence());
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
    if (typeof data.currentTime === 'number') {
      this.currentTime = data.currentTime;
    }
    if (typeof data.day === 'number') {
      this.day = data.day;
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
    this.sunSprite?.destroy();
    this.moonSprite?.destroy();
    this.skyTintOverlay?.destroy();
  }
}
