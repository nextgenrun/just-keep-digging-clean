import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { STAR_CONSTELLATION_CONFIG } from "../../values/starConstellations.js";

// ─── Constellation system ─────────────────────────────────────────────────────
const CONSTELLATION_THRESHOLDS = STAR_CONSTELLATION_CONFIG.thresholds;
const CONSTELLATION_SPACING = STAR_CONSTELLATION_CONFIG.spacingPx;
const CONSTELLATION_DEFS = STAR_CONSTELLATION_CONFIG.defs;
const CONSTELLATION_CENTERS = STAR_CONSTELLATION_CONFIG.centers;
const CONSTELLATION_LINE_COLORS = STAR_CONSTELLATION_CONFIG.lineColors;
const SKY_STAR_TEXTURE_PREFIX = STAR_CONSTELLATION_CONFIG.skyStarTexturePrefix;
const SKY_STAR_DISPLAY_SIZES = STAR_CONSTELLATION_CONFIG.skyStarDisplaySizesPx;
const SKY_RARITY_FALLBACKS = STAR_CONSTELLATION_CONFIG.rarityFallbacks;
// ─────────────────────────────────────────────────────────────────────────────

export class FloatingTextSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeFloatingTexts = [];
    this._townStars = [];
    this._constellationLines = [];
    this._constellationSignBackdrops = {};
    this._constellationCounts = {};
    this._starRarityCounts = new Array(SKY_RARITY_FALLBACKS.length).fill(0);
    this._constellationsLoaded = false;
    this._starTexturesReady = false;
    this._constellationStarsBeingAnimated = new Set(); // Track stars being animated
    this._onConstellationUnlocked = null; // callback(resourceType) wired by StarPillarSystem
    this._loadPersistedStarCounts();
    this._loadPersistedStarRarityCounts();
  }

  /** Wire a callback to be called when a constellation unlocks. */
  setConstellationUnlockedCallback(fn) {
    this._onConstellationUnlocked = fn;
  }

  /** Return array of resource types whose constellations are unlocked (from localStorage). */
  getUnlockedConstellations() {
    try {
      return JSON.parse(localStorage.getItem('dig-game-constellations') || '[]');
    } catch (e) { return []; }
  }

  /** Return how many stars of each resource type have been collected this session. */
  getConstellationCounts() {
    this._loadPersistedStarCounts();
    return this._constellationCounts || {};
  }

  /** Return collected-star counts per sky tile rarity tier. */
  getStarRarityCounts() {
    this._loadPersistedStarRarityCounts();
    return [...(this._starRarityCounts || [])];
  }

  /** Ensure saved constellations are restored into the upper-sky pillar region. */
  ensureConstellationsLoaded() {
    if (this._constellationsLoaded) return;
    this._constellationsLoaded = true;
    this._restorePersistedConstellations();
  }

  /** Public anchor helper used by StarPillarSystem so every view uses the same sky math. */
  getConstellationSkyAnchor() {
    return this._getConstellationAnchor();
  }

  /** Public world-space center helper for a resource constellation. */
  getConstellationWorldCenter(resourceType) {
    return this._getConstellationCenter(resourceType);
  }

  /** Return constellation definition data for external use (StarPillarSystem). */
  getConstellationData() {
    const worldCenters = {};
    for (const resourceType of Object.keys(CONSTELLATION_CENTERS)) {
      worldCenters[resourceType] = this._getConstellationCenter(resourceType);
    }
    return {
      defs:       CONSTELLATION_DEFS,
      centers:    CONSTELLATION_CENTERS,
      worldCenters,
      anchor:     this._getConstellationAnchor(),
      lineColors: CONSTELLATION_LINE_COLORS,
      thresholds: CONSTELLATION_THRESHOLDS,
      spacing:    CONSTELLATION_SPACING,
    };
  }

  /**
   * Show floating damage/resource text at a world position
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @param {string} text - Text to display (e.g., "0.50", "+1", "2.00")
   * @param {string} color - Text color (hex or color name)
   * @param {number} duration - Duration in ms (default: 800)
   * @param {number} fontSize - Font size (default: 18)
   */
  showFloatingText(worldX, worldY, text, color = "#ffffff", duration = HUD_LAYOUT.floatDefaultDurationMs, fontSize = HUD_LAYOUT.floatDefaultFontSize) {
    const floatingText = this.scene.add.text(worldX, worldY, text, {
      fontFamily: "Consolas, monospace",
      fontSize: `${fontSize}px`,
      color: color,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: HUD_LAYOUT.floatStrokeThickness,
      shadow: {
        offsetX: HUD_LAYOUT.floatShadowX,
        offsetY: HUD_LAYOUT.floatShadowY,
        color: "#000000",
        blur: 0,
        stroke: true,
        fill: true
      }
    });

    floatingText.setOrigin(0.5);
    floatingText.setDepth(HUD_LAYOUT.floatingTextDepth);
    floatingText.setAlpha(1);

    this.activeFloatingTexts.push(floatingText);

    this.scene.tweens.add({
      targets: floatingText,
      y: worldY - HUD_LAYOUT.floatUpPx,
      alpha: 0,
      duration: duration,
      ease: "Power2.out",
      onComplete: () => {
        floatingText.destroy();
        const idx = this.activeFloatingTexts.indexOf(floatingText);
        if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
      }
    });
  }

  /**
   * Show damage number for mining — dynamically scaled by damage amount
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @param {number} damage - Damage dealt (whole integers)
   */
  showDamage(worldX, worldY, damage) {
    // Guard against NaN — if damage is not a finite number, show 0
    if (!Number.isFinite(damage) || damage < 0) {
      damage = 0;
    }
    const formattedDamage = String(damage);
    
    // Scale size and color based on damage
    let color = HUD_LAYOUT.floatDamageColor;
    let fontSize = HUD_LAYOUT.floatDamageFontSize;
    let strokeThickness = 3;
    
    if (damage >= HUD_LAYOUT.floatDamageHugeThreshold) {
      color = HUD_LAYOUT.floatDamageHugeColor;
      fontSize = HUD_LAYOUT.floatDamageHugeFontSize;
      strokeThickness = 5;
    } else if (damage >= HUD_LAYOUT.floatDamageBigThreshold) {
      color = HUD_LAYOUT.floatDamageBigColor;
      fontSize = HUD_LAYOUT.floatDamageBigFontSize;
      strokeThickness = 4;
    }
    
    // Special effect for big numbers — star sparkle
    if (damage >= HUD_LAYOUT.floatDamageBigThreshold) {
      // Add a subtle sparkle particle at hit position
      const sparkColor = damage >= HUD_LAYOUT.floatDamageHugeThreshold ? 0xff4444 : 0xffaa44;
      for (let i = 0; i < 3; i++) {
        const spark = this.scene.add.circle(
          worldX + (Math.random() - 0.5) * 20,
          worldY + (Math.random() - 0.5) * 20,
          2 + Math.random() * 2,
          sparkColor,
          0.8
        );
        spark.setDepth(HUD_LAYOUT.floatingTextDepth - 1);
        this.scene.tweens.add({
          targets: spark,
          alpha: 0,
          scaleX: 0.1,
          scaleY: 0.1,
          y: spark.y - 10 - Math.random() * 10,
          duration: 400 + Math.random() * 200,
          onComplete: () => spark.destroy(),
        });
      }
    }
    
    const floatingText = this.scene.add.text(worldX, worldY, formattedDamage, {
      fontFamily: "Consolas, monospace",
      fontSize: `${fontSize}px`,
      color: color,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: strokeThickness,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#000000",
        blur: 8,
        stroke: true,
        fill: true
      }
    });

    floatingText.setOrigin(0.5);
    floatingText.setDepth(HUD_LAYOUT.floatingTextDepth);
    floatingText.setAlpha(0);
    
    // Pop up from hit with bounce
    const popY = worldY - HUD_LAYOUT.floatDamagePoPx;

    this.activeFloatingTexts.push(floatingText);

    // Quick pop-in
    this.scene.tweens.add({
      targets: floatingText,
      alpha: 1,
      y: popY,
      scale: { from: 0.6, to: 1.1 },
      duration: 120,
      ease: 'Back.out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: floatingText,
          scale: 1.0,
          duration: 80,
        });
      }
    });

    // Float up and fade
    this.scene.tweens.add({
      targets: floatingText,
      y: popY - HUD_LAYOUT.floatUpPx,
      alpha: 0,
      duration: HUD_LAYOUT.floatDamageDurationMs,
      delay: 80,
      ease: "Power2.out",
      onComplete: () => {
        floatingText.destroy();
        const idx = this.activeFloatingTexts.indexOf(floatingText);
        if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
      }
    });
  }

  /**
   * Show resource collected
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @param {string} label - Resource name (e.g., "Dirt", "Copper")
   * @param {string} color - Resource color
   * @param {number} amount - Amount collected
   */
  showResource(worldX, worldY, label, color, amount) {
    const text = `+${amount} ${label}`;
    this.showFloatingText(worldX, worldY, text, color, HUD_LAYOUT.floatResourceDurationMs, HUD_LAYOUT.floatResourceFontSize);
  }

  /**
   * Show critical hit damage (extra large with flash effect)
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @param {number} damage - Damage dealt
   * @param {number} multiplier - Critical hit multiplier (e.g., 1.5)
   */
  showCriticalHit(worldX, worldY, damage, multiplier) {
    // Guard against NaN
    if (!Number.isFinite(damage) || damage < 0) damage = 0;
    const formattedDamage = Math.floor(damage);
    const text = ` ${formattedDamage}`;
    
    const floatingText = this.scene.add.text(worldX, worldY, text, {
      fontFamily: "Consolas, monospace",
      fontSize: `${HUD_LAYOUT.floatCriticalFontSize}px`,
      color: HUD_LAYOUT.floatCriticalColor,
      fontStyle: "bold",
      stroke: "#ffffff",
      strokeThickness: HUD_LAYOUT.floatCriticalStrokeThickness,
      shadow: {
        offsetX: HUD_LAYOUT.floatCriticalShadowX,
        offsetY: HUD_LAYOUT.floatCriticalShadowY,
        color: "#ff0000",
        blur: 8,
        stroke: true,
        fill: true
      }
    });

    floatingText.setOrigin(0.5);
    floatingText.setDepth(HUD_LAYOUT.floatingTextDepth);
    floatingText.setAlpha(1);

    // Add flash effect
    this.scene.tweens.add({
      targets: floatingText,
      alpha: 1,
      scale: 1.2,
      duration: 150,
      ease: "Power2.out",
      yoyo: true
    });

    this.activeFloatingTexts.push(floatingText);

    this.scene.tweens.add({
      targets: floatingText,
      y: worldY - HUD_LAYOUT.floatCriticalUpPx,
      alpha: 0,
      duration: HUD_LAYOUT.floatCriticalDurationMs,
      ease: "Power2.out",
      onComplete: () => {
        floatingText.destroy();
        const idx = this.activeFloatingTexts.indexOf(floatingText);
        if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
      }
    });
  }

  /**
   * Show heavy punch damage number (orange, distinct style)
   * @param {number} worldX
   * @param {number} worldY
   * @param {number} damage
   */
  showHeavyPunchDamage(worldX, worldY, damage) {
    // Guard against NaN
    if (!Number.isFinite(damage) || damage < 0) damage = 0;
    const formattedDamage = Math.floor(damage);
    const text = ` ${formattedDamage}`;

    const floatingText = this.scene.add.text(worldX, worldY, text, {
      fontFamily: "Consolas, monospace",
      fontSize: `${HUD_LAYOUT.floatHeavyPunchFontSize}px`,
      color: "#ff8800",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: HUD_LAYOUT.floatHeavyPunchStrokeThickness,
      shadow: {
        offsetX: HUD_LAYOUT.floatHeavyPunchShadowX,
        offsetY: HUD_LAYOUT.floatHeavyPunchShadowY,
        color: "#ff8800",
        blur: 6,
        stroke: true,
        fill: true
      }
    });

    floatingText.setOrigin(0.5);
    floatingText.setDepth(HUD_LAYOUT.floatingTextDepth);
    floatingText.setAlpha(1);

    this.scene.tweens.add({
      targets: floatingText,
      alpha: 1,
      scale: 1.15,
      duration: 120,
      ease: "Power2.out",
      yoyo: true
    });

    this.activeFloatingTexts.push(floatingText);

    this.scene.tweens.add({
      targets: floatingText,
      y: worldY - HUD_LAYOUT.floatHeavyPunchUpPx,
      alpha: 0,
      duration: HUD_LAYOUT.floatHeavyPunchDurationMs,
      ease: "Power2.out",
      onComplete: () => {
        floatingText.destroy();
        const idx = this.activeFloatingTexts.indexOf(floatingText);
        if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
      }
    });
  }

  /**
   * Show resource luck bonus (extra large with flash effect)
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @param {string} label - Resource name (e.g., "Dirt", "Copper")
   * @param {string} color - Resource color
   * @param {number} amount - Bonus amount collected
   */
  showResourceLuckBonus(worldX, worldY, label, color, amount) {
    const text = `+${amount} ${label} `;
    
    const floatingText = this.scene.add.text(worldX, worldY, text, {
      fontFamily: "Consolas, monospace",
      fontSize: `${HUD_LAYOUT.floatLuckFontSize}px`,
      color: color,
      fontStyle: "bold",
      stroke: "#ffffff",
      strokeThickness: HUD_LAYOUT.floatLuckStrokeThickness,
      shadow: {
        offsetX: HUD_LAYOUT.floatLuckShadowX,
        offsetY: HUD_LAYOUT.floatLuckShadowY,
        color: "#00ff00",
        blur: 6,
        stroke: true,
        fill: true
      }
    });

    floatingText.setOrigin(0.5);
    floatingText.setDepth(HUD_LAYOUT.floatingTextDepth);
    floatingText.setAlpha(1);

    // Add flash effect
    this.scene.tweens.add({
      targets: floatingText,
      alpha: 1,
      scale: 1.15,
      duration: 150,
      ease: "Power2.out",
      yoyo: true
    });

    this.activeFloatingTexts.push(floatingText);

    this.scene.tweens.add({
      targets: floatingText,
      y: worldY - HUD_LAYOUT.floatLuckUpPx,
      alpha: 0,
      duration: HUD_LAYOUT.floatLuckDurationMs,
      ease: "Power2.out",
      onComplete: () => {
        floatingText.destroy();
        const idx = this.activeFloatingTexts.indexOf(floatingText);
        if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
      }
    });
  }

  /**
   * Show a lucky sale bonus popup (gold coins style, large and bouncy)
   * @param {number} worldX - World X position (player position)
   * @param {number} worldY - World Y position (player position)
   * @param {number} amount - Bonus gold amount earned
   */
  showLuckySaleBonus(worldX, worldY, amount) {
    const text = `+${amount}g LUCKY!`;

    const floatingText = this.scene.add.text(worldX, worldY - 20, text, {
      fontFamily: "Consolas, monospace",
      fontSize: "32px",
      color: "#ffd700",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 5,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#ff8800",
        blur: 8,
        stroke: true,
        fill: true
      }
    });

    floatingText.setOrigin(0.5);
    floatingText.setDepth(HUD_LAYOUT.floatingTextDepth + 10);
    floatingText.setAlpha(1);

    // Scale-bounce entrance
    this.scene.tweens.add({
      targets: floatingText,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 180,
      ease: "Back.out",
      yoyo: true
    });

    this.activeFloatingTexts.push(floatingText);

    // Float upward and fade out
    this.scene.tweens.add({
      targets: floatingText,
      y: worldY - 80,
      alpha: 0,
      duration: 1800,
      ease: "Power2.out",
      onComplete: () => {
        floatingText.destroy();
        const idx = this.activeFloatingTexts.indexOf(floatingText);
        if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
      }
    });
  }

  _getConstellationAnchor(tileSizeOverride = null) {
    const cfg = this.scene?.config || {};
    const tileSize = tileSizeOverride || cfg.tileSize || 94;
    const anchorTileX = Number.isFinite(cfg.constellationAnchorTileX)
      ? cfg.constellationAnchorTileX
      : (Number.isFinite(cfg.starPillarTileX)
        ? cfg.starPillarTileX
        : (Number.isFinite(cfg.skyIslandTileX) ? cfg.skyIslandTileX : (cfg.spawnTileX || 0)));
    const anchorTileY = Number.isFinite(cfg.constellationAnchorTileY)
      ? cfg.constellationAnchorTileY
      : (Number.isFinite(cfg.starPillarTileY)
        ? cfg.starPillarTileY
        : (Number.isFinite(cfg.skyIslandTileY) ? cfg.skyIslandTileY : Math.max(0, (cfg.topAirRows || 0) - 31)));

    return {
      x: anchorTileX * tileSize + tileSize / 2,
      y: (anchorTileY + 1) * tileSize,
      tileSize,
    };
  }

  _getConstellationCenter(resourceType) {
    const offset = CONSTELLATION_CENTERS[resourceType];
    if (!offset) return null;
    const anchor = this._getConstellationAnchor();
    return {
      x: anchor.x + offset[0],
      y: anchor.y + offset[1],
    };
  }

  _getConstellationSignKey(resourceType) {
    return ASSET_KEYS.constellations?.signs?.[resourceType] || null;
  }

  _addConstellationSignBackdrop(resourceType, centerX, centerY, lineColor = 0xFFFFFF, fadeIn = true) {
    const key = this._getConstellationSignKey(resourceType);
    if (!key || !this.scene.textures.exists(key)) return null;

    const existing = this._constellationSignBackdrops?.[resourceType];
    if (existing?.active) {
      existing.setPosition(centerX, centerY);
      return existing;
    }

    const image = this.scene.add.image(centerX, centerY, key);
    const maxSourceDim = Math.max(image.width || 1, image.height || 1);
    const targetSize = this.scene.config?.constellationSignWorldSizePx || 360;
    const scale = targetSize / maxSourceDim;
    image
      .setOrigin(0.5)
      .setScale(scale)
      .setDepth(HUD_LAYOUT.hudDepth - 8)
      .setAlpha(fadeIn ? 0 : 0.26);

    if (typeof Phaser !== 'undefined' && Phaser.BlendModes?.SCREEN !== undefined) {
      image.setBlendMode(Phaser.BlendModes.SCREEN);
    }

    if (!this._constellationSignBackdrops) this._constellationSignBackdrops = {};
    this._constellationSignBackdrops[resourceType] = image;

    if (fadeIn) {
      this.scene.tweens.add({
        targets: image,
        alpha: { from: 0, to: 0.30 },
        duration: 700,
        ease: 'Sine.out',
        onComplete: () => {
          if (!image.active) return;
          this.scene.tweens.add({
            targets: image,
            alpha: { from: 0.22, to: 0.34 },
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut',
          });
        },
      });
    }

    return image;
  }

  _getSkyRarityConfig(rarity = 0) {
    const safeRarity = Math.max(0, Math.floor(rarity || 0));
    const cfg = this.scene?.config?.skyTileRarities?.[safeRarity];
    return cfg || SKY_RARITY_FALLBACKS[safeRarity] || SKY_RARITY_FALLBACKS[0];
  }

  /**
   * Show sky tile destruction reward text and sparkle burst.
   * The persistent star is spawned by spawnSkyTownStar(), so collected stars have
   * exactly one visual lifecycle: tile -> sky -> constellation.
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @param {string} resourceType - Resource name (e.g., "dirt", "copper", "stone")
   * @param {number} [rarity=0] - 0=common, 1=rare, 2=legendary, ...
   * @param {number|null} [multiplier=null] - Actual reward multiplier displayed to the player
   * @param {boolean} [hasPassiveBonus=false] - Whether the +1x constellation passive applied
   */
  showSkyTileDestruction(worldX, worldY, resourceType, rarity = 0, multiplier = null, hasPassiveBonus = false) {
    // Resource type to CSS color string for text
    const resourceColors = {
      dirt: '#8B4513', stone: '#808080', copper: '#B87333',
      darkDirtNormal: '#654321', darkDirtStrong: '#3E2723',
      steel: '#4682B4', iron: '#71797E', bronze: '#CD7F32',
      silver: '#C0C0C0', gold: '#FFD700',
    };

    const rarityCfg = this._getSkyRarityConfig(rarity);
    const resourceColor = resourceColors[resourceType] || '#87CEEB';
    const rarityColor = rarityCfg.glowColor || 0x87CEEB;
    const rarityCSSColor = `#${rarityColor.toString(16).padStart(6, '0')}`;
    const displayName = this._formatResourceName(resourceType);
    const shownMultiplier = Number.isFinite(multiplier) ? multiplier : (rarityCfg.multiplier || 2);
    const bonusLabel = `+${shownMultiplier}x${hasPassiveBonus ? ' ✦' : ''}`;
    const particleCount = 8 + Math.min(5, rarity) * 4;
    const particleRadius = rarity >= 3 ? 5 : rarity >= 1 ? 4 : 3;

    // Create sparkle particles
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.circle(worldX, worldY, particleRadius, rarityColor);
      particle.setDepth(HUD_LAYOUT.floatingTextDepth + 9);
      particle.setAlpha(0);
      particles.push(particle);
      this.activeFloatingTexts.push(particle);
    }

    // Create bonus text — resource color with rarity label
    const fontSize = rarity >= 3 ? '32px' : rarity === 2 ? '30px' : rarity === 1 ? '26px' : '24px';
    const strokeThickness = rarity >= 2 ? 6 : 4;
    const text = this.scene.add.text(worldX, worldY - 20, `${bonusLabel} ${displayName}`, {
      fontFamily: "Consolas, monospace",
      fontSize,
      color: resourceColor,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness,
      shadow: {
        offsetX: 2, offsetY: 2,
        color: rarityCSSColor,
        blur: rarity >= 1 ? 10 : 4,
        stroke: true, fill: true
      }
    });
    text.setOrigin(0.5);
    text.setDepth(HUD_LAYOUT.floatingTextDepth + 11);
    text.setAlpha(0);
    this.activeFloatingTexts.push(text);

    // Particles explode outward
    particles.forEach((particle, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 40 + Math.min(5, rarity) * 10;
      const targetX = worldX + Math.cos(angle) * distance;
      const targetY = worldY + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: particle,
        x: targetX, y: targetY, alpha: 0.9,
        duration: 400, ease: "Power2.out",
        onComplete: () => {
          this.scene.tweens.add({
            targets: particle, alpha: 0, duration: 300,
            onComplete: () => {
              particle.destroy();
              const idx = this.activeFloatingTexts.indexOf(particle);
              if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
            }
          });
        }
      });
    });

    // Text fade in then float up
    this.scene.tweens.add({
      targets: text, alpha: 1, duration: 200, ease: "Power2.out", delay: 200,
      onComplete: () => {
        this.scene.tweens.add({
          targets: text, y: worldY - 120, alpha: 0, duration: 1400, ease: "Power2.out",
          onComplete: () => {
            text.destroy();
            const idx = this.activeFloatingTexts.indexOf(text);
            if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
          }
        });
      }
    });
  }

  /**
   * Animate the visual effect star toward its constellation position (or screen top as fallback).
   * Arcs gracefully in both X and Y with a sparkle trail. Trail density scales with rarity.
   * @private
   */
  _animateStarToSky(star, startX, startY, rarityColor, rarity = 0, resourceType = null) {
    const target = resourceType ? this._getConstellationCenter(resourceType) : null;

    let targetX, targetY;
    if (target) {
      targetX = target.x;
      targetY = target.y;
    } else {
      // Fallback: fly straight up off the top of the camera view
      targetX = startX;
      targetY = this.scene.cameras.main.worldView.top - 20;
    }

    const durations   = [1800, 2400, 3200];
    const duration    = durations[rarity] || 1800;
    const trailGaps   = [90, 60, 40]; // ms between trail dots, denser for higher rarity
    const trailGap    = trailGaps[rarity] || 90;
    const dotRadius   = rarity >= 2 ? 5 : rarity >= 1 ? 3 : 2;
    const trailAlpha  = rarity >= 2 ? 0.9 : 0.7;

    let lastTrailTime = 0;

    this.scene.tweens.add({
      targets: star,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Power3.out',
      onUpdate: () => {
        const t = Date.now();
        // Twinkle alpha during flight
        star.setAlpha(Math.sin(t / 140) * 0.15 + 0.85);

        // Sparkle trail
        if (t - lastTrailTime > trailGap) {
          lastTrailTime = t;
          const trailColor = target ? (CONSTELLATION_LINE_COLORS[resourceType] || rarityColor) : rarityColor;
          const dot = this.scene.add.circle(star.x, star.y, dotRadius, trailColor, trailAlpha);
          dot.setDepth(HUD_LAYOUT.floatingTextDepth + 8);
          this.scene.tweens.add({
            targets: dot, alpha: 0, scale: 0,
            duration: rarity >= 2 ? 600 : 400,
            onComplete: () => dot.destroy(),
          });
        }
      },
      onComplete: () => {
        // Small burst flash at destination
        if (target) {
          const flash = this.scene.add.circle(targetX, targetY, 30, rarityColor, 0.5);
          flash.setDepth(HUD_LAYOUT.floatingTextDepth + 9);
          this.scene.tweens.add({
            targets: flash, alpha: 0, scale: 2.5, duration: 350, ease: 'Power2.out',
            onComplete: () => flash.destroy(),
          });
        }
        this.scene.tweens.add({
          targets: star, alpha: 0, duration: 200,
          onComplete: () => {
            star.destroy();
            const idx = this.activeFloatingTexts.indexOf(star);
            if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
          },
        });
      },
    });
  }

  // ─── Constellation system constants ──────────────────────────────────────
  // (defined inside the class scope so they're accessible to all methods below)
  // Threshold: how many stars of the same resource type unlock a constellation
  // CONSTELLATION_THRESHOLD / DEFS / CENTERS / LINE_COLORS are referenced via
  // the module-level consts declared just before this class.
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Spawn a persistent collected star at the mined sky tile and fly it into the
   * upper-sky constellation formation. Stars are only created by sky tile breaks.
   * @param {number} rarity - 0=common, 1=rare, 2=legendary, ...
   * @param {number} startWorldX - Mined tile world X center
   * @param {number} startWorldY - Mined tile world Y center
   * @param {string} resourceType - Resource type string (e.g. 'copper', 'gold')
   */
  spawnSkyTownStar(rarity, startWorldX, startWorldY, resourceType) {
    this.ensureConstellationsLoaded();
    this._capTownStarPool();

    const target = this._getCollectedStarTarget(resourceType);
    const entry = this._createSkyStarEntry(startWorldX, startWorldY, rarity, resourceType);
    this._townStars.push(entry);
    this._animateCollectedStarToFormation(entry, target.x, target.y);
  }

  _capTownStarPool(maxStars = 220) {
    if (!this._townStars) this._townStars = [];
    if (this._townStars.length < maxStars) return;

    const indexToRemove = this._townStars.findIndex(entry =>
      entry &&
      !entry.isConstellationAnimating &&
      !entry.isFlightAnimating &&
      entry.graphic &&
      entry.graphic.active
    );

    if (indexToRemove !== -1) {
      const oldest = this._townStars.splice(indexToRemove, 1)[0];
      if (oldest.tween) oldest.tween.stop();
      this.scene.tweens.killTweensOf(oldest.graphic);
      oldest.graphic.destroy();
    }
  }

  _getCollectedStarTarget(resourceType) {
    const def = CONSTELLATION_DEFS[resourceType];
    const center = this._getConstellationCenter(resourceType);
    if (!def || !center) {
      const anchor = this._getConstellationAnchor();
      return {
        x: anchor.x + (Math.random() * 240 - 120),
        y: anchor.y - 420 - Math.random() * 220,
      };
    }

    const currentCount = Math.max(0, this._constellationCounts?.[resourceType] || 0);
    const threshold = CONSTELLATION_THRESHOLDS[resourceType] ?? def.points.length;
    const pointIndex = currentCount < threshold
      ? Math.min(currentCount, def.points.length - 1)
      : Math.floor(Math.random() * def.points.length);
    const [dx, dy] = def.points[pointIndex];

    return {
      x: center.x + dx * CONSTELLATION_SPACING + (currentCount >= threshold ? Math.random() * 46 - 23 : 0),
      y: center.y + dy * CONSTELLATION_SPACING + (currentCount >= threshold ? Math.random() * 34 - 17 : 0),
    };
  }

  _createSkyStarEntry(x, y, rarity = 0, resourceType = null) {
    this._ensureSkyStarTextures();
    const safeRarity = Math.max(0, Math.floor(rarity || 0));
    const textureKey = `${SKY_STAR_TEXTURE_PREFIX}${safeRarity}`;
    const displaySize = SKY_STAR_DISPLAY_SIZES[safeRarity] || SKY_STAR_DISPLAY_SIZES[0];
    const star = this.scene.add.image(x, y, textureKey);
    star.setDepth(HUD_LAYOUT.hudDepth - 5);
    star.setDisplaySize(displaySize, displaySize);
    star.setAlpha(0);

    const entry = {
      graphic: star,
      tween: null,
      resourceType: resourceType || null,
      rarity: safeRarity,
      baseScaleX: star.scaleX,
      baseScaleY: star.scaleY,
      isFlightAnimating: false,
      isConstellationAnimating: false,
    };
    star.setScale(entry.baseScaleX * 0.12, entry.baseScaleY * 0.12);
    return entry;
  }

  _animateCollectedStarToFormation(entry, targetX, targetY) {
    const star = entry.graphic;
    if (!star || !star.active) return;

    entry.isFlightAnimating = true;
    const rarity = entry.rarity || 0;
    const startX = star.x;
    const startY = star.y;
    const distance = Math.hypot(targetX - startX, targetY - startY);
    const duration = Phaser.Math.Clamp(distance * 0.035, 2400, 6600) + Math.min(5, rarity) * 260;
    const rarityColor = this._getSkyRarityConfig(rarity).glowColor || 0x87CEEB;
    const lineColor = CONSTELLATION_LINE_COLORS[entry.resourceType] || rarityColor;
    const controlX = (startX + targetX) / 2 + Phaser.Math.Clamp((targetX - startX) * 0.12, -180, 180) + (Math.random() * 160 - 80);
    const controlY = Math.min(startY, targetY) - 220 - Math.min(5, rarity) * 45;
    const driver = { t: 0 };
    let lastTrailTime = 0;
    const trailGap = Math.max(34, 90 - rarity * 9);

    this.scene.tweens.add({
      targets: star,
      alpha: 1,
      scaleX: entry.baseScaleX * 1.28,
      scaleY: entry.baseScaleY * 1.28,
      duration: 180,
      ease: 'Back.out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: star,
          scaleX: entry.baseScaleX,
          scaleY: entry.baseScaleY,
          duration: 120,
          ease: 'Sine.out',
        });

        this.scene.tweens.add({
          targets: driver,
          t: 1,
          duration,
          ease: 'Sine.inOut',
          onUpdate: () => {
            const t = driver.t;
            const inv = 1 - t;
            star.x = inv * inv * startX + 2 * inv * t * controlX + t * t * targetX;
            star.y = inv * inv * startY + 2 * inv * t * controlY + t * t * targetY;
            star.angle += 0.35 + rarity * 0.12;

            const now = this.scene.time?.now || Date.now();
            if (now - lastTrailTime > trailGap) {
              lastTrailTime = now;
              const dot = this.scene.add.circle(
                star.x,
                star.y,
                rarity >= 3 ? 4 : rarity >= 1 ? 3 : 2,
                lineColor,
                rarity >= 2 ? 0.78 : 0.58
              );
              dot.setDepth(HUD_LAYOUT.hudDepth - 6);
              this.scene.tweens.add({
                targets: dot,
                alpha: 0,
                scale: 0,
                duration: 520 + rarity * 55,
                ease: 'Power2.out',
                onComplete: () => dot.destroy(),
              });
            }
          },
          onComplete: () => {
            star.setPosition(targetX, targetY);
            entry.isFlightAnimating = false;
            entry.tween = this._startSkyStarTwinkle(entry);
            this._recordCollectedStar(entry.resourceType, entry.rarity);

            const burst = this.scene.add.circle(targetX, targetY, 8, lineColor, 0.55);
            burst.setDepth(HUD_LAYOUT.hudDepth - 4);
            this.scene.tweens.add({
              targets: burst,
              alpha: 0,
              scale: 6,
              duration: 520,
              ease: 'Power2.out',
              onComplete: () => burst.destroy(),
            });
          },
        });
      },
    });
  }

  _startSkyStarTwinkle(entry) {
    const star = entry.graphic;
    if (!star || !star.active) return null;
    const rarity = entry.rarity || 0;
    const alphaFrom = Math.max(0.26, 0.55 - rarity * 0.045);
    const scaleBoost = 1.05 + Math.min(5, rarity) * 0.04;
    const tween = this.scene.tweens.add({
      targets: star,
      alpha: { from: alphaFrom, to: 1.0 },
      scaleX: { from: entry.baseScaleX * 0.90, to: entry.baseScaleX * scaleBoost },
      scaleY: { from: entry.baseScaleY * 0.90, to: entry.baseScaleY * scaleBoost },
      duration: 760 + rarity * 130 + Math.random() * 440,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    if (rarity >= 2) {
      this.scene.tweens.add({
        targets: star,
        angle: star.angle + 360,
        duration: 7200 - Math.min(5, rarity) * 500,
        repeat: -1,
        ease: 'Linear',
      });
    }

    return tween;
  }

  _recordCollectedStar(resourceType, rarity = 0) {
    this._recordStarRarity(rarity);
    if (!resourceType || !CONSTELLATION_DEFS[resourceType]) return;

    if (!this._constellationCounts) this._constellationCounts = {};
    const threshold = CONSTELLATION_THRESHOLDS[resourceType] ?? 5;
    const wasUnlocked = this.getUnlockedConstellations().includes(resourceType);
    const current = this._constellationCounts[resourceType] || 0;
    this._constellationCounts[resourceType] = Math.max(0, Math.min(threshold, current + 1));
    this._saveStarCounts();

    if (!wasUnlocked && this._constellationCounts[resourceType] >= threshold) {
      this._unlockConstellation(resourceType);
    }
  }

  _ensureSkyStarTextures() {
    if (this._starTexturesReady) return;

    const rarityCount = Math.max(
      SKY_RARITY_FALLBACKS.length,
      this.scene?.config?.skyTileRarities?.length || 0
    );

    for (let rarity = 0; rarity < rarityCount; rarity++) {
      const textureKey = `${SKY_STAR_TEXTURE_PREFIX}${rarity}`;
      if (this.scene.textures.exists(textureKey)) continue;

      const cfg = this._getSkyRarityConfig(rarity);
      const color = cfg.glowColor || 0x87CEEB;
      const size = 128;
      const cx = size / 2;
      const cy = size / 2;
      const gfx = this.scene.add.graphics();

      // Soft outer aura baked into the texture so all stars are real image sprites.
      const glowSteps = [
        { r: 56, a: 0.055 },
        { r: 45, a: 0.090 },
        { r: 34, a: 0.135 },
        { r: 25, a: 0.180 },
      ];
      for (const step of glowSteps) {
        gfx.fillStyle(color, step.a + Math.min(5, rarity) * 0.012);
        gfx.fillCircle(cx, cy, step.r);
      }

      if (rarity >= 1) {
        gfx.lineStyle(2 + Math.min(4, rarity), color, 0.55);
        gfx.strokeCircle(cx, cy, 35 + Math.min(5, rarity) * 2);
      }
      if (rarity >= 2) {
        gfx.lineStyle(2, 0xFFFFFF, 0.45);
        gfx.strokeCircle(cx, cy, 24 + Math.min(5, rarity) * 2);
      }
      if (rarity >= 4) {
        gfx.lineStyle(3, 0x00FFEE, 0.48);
        gfx.beginPath();
        gfx.arc(cx, cy, 45, -0.4, 0.95);
        gfx.strokePath();
        gfx.beginPath();
        gfx.arc(cx, cy, 45, Math.PI - 0.4, Math.PI + 0.95);
        gfx.strokePath();
      }
      if (rarity >= 5) {
        gfx.lineStyle(4, 0x9900FF, 0.65);
        gfx.strokeCircle(cx, cy, 52);
      }

      this._drawStar(gfx, cx, cy, 18 + Math.min(5, rarity) * 2.5, color);
      gfx.lineStyle(2, 0xFFFFFF, 0.85);
      this._strokeStar(gfx, cx, cy, 18 + Math.min(5, rarity) * 2.5);
      gfx.fillStyle(0xFFFFFF, 0.82);
      gfx.fillCircle(cx, cy, 4 + Math.min(5, rarity) * 0.4);

      gfx.generateTexture(textureKey, size, size);
      gfx.destroy();
    }

    this._starTexturesReady = true;
  }

  _recordStarRarity(rarity = 0) {
    const safeRarity = Math.max(0, Math.floor(rarity || 0));
    const len = Math.max(SKY_RARITY_FALLBACKS.length, safeRarity + 1);
    if (!this._starRarityCounts || this._starRarityCounts.length < len) {
      const next = new Array(len).fill(0);
      (this._starRarityCounts || []).forEach((count, i) => { next[i] = count || 0; });
      this._starRarityCounts = next;
    }
    this._starRarityCounts[safeRarity] = (this._starRarityCounts[safeRarity] || 0) + 1;
    this._saveStarRarityCounts();
  }

  /**
   * Animate 5 stars of the given resource type into their constellation positions
   * and draw connecting glow lines. Saves the unlock to localStorage.
   * @private
   */
  _unlockConstellation(resourceType) {
    const def = CONSTELLATION_DEFS[resourceType];
    const center = this._getConstellationCenter(resourceType);
    if (!def || !center) return;
    if (this.getUnlockedConstellations().includes(resourceType)) return;

    const centerX = center.x;
    const centerY = center.y;
    const sp = CONSTELLATION_SPACING;
    this._addConstellationSignBackdrop(resourceType, centerX, centerY, CONSTELLATION_LINE_COLORS[resourceType] || 0xFFFFFF, true);

    // Grab the most recent active stars of this resource type, then conjure
    // harmless echo-stars if the constellation has a low collection threshold.
    let typeStars = this._townStars
      .filter(s => s.resourceType === resourceType && s.graphic && s.graphic.active)
      .slice(-def.points.length);

    while (typeStars.length < def.points.length) {
      const entry = this._createSkyStarEntry(
        centerX + (Math.random() * 80 - 40),
        centerY + (Math.random() * 80 - 40),
        0,
        resourceType
      );
      entry.graphic.setAlpha(0.72);
      entry.graphic.setScale(entry.baseScaleX * 0.72, entry.baseScaleY * 0.72);
      this._townStars.push(entry);
      typeStars.push(entry);
    }

    const lineColor = CONSTELLATION_LINE_COLORS[resourceType] || 0xFFFFFF;
    const STAR_FLIGHT_DUR  = 1000; // ms each star takes to fly
    const STAR_STAGGER_GAP = 180;  // ms between each star launch

    // Animate each star to its fixed position with staggered launch
    typeStars.forEach((entry, i) => {
      const [dx, dy] = def.points[i];
      const targetX = centerX + dx * sp;
      const targetY = centerY + dy * sp;

      const starId = entry.graphic?.uuid || entry.graphic?.id;
      if (starId) this._constellationStarsBeingAnimated.add(starId);
      entry.isConstellationAnimating = true;
      if (entry.tween) { entry.tween.stop(); entry.tween = null; }
      this.scene.tweens.killTweensOf(entry.graphic);

      this.scene.time.delayedCall(i * STAR_STAGGER_GAP, () => {
        if (!entry.graphic || !entry.graphic.active) return;

        // Flash the star white before it flies
        this.scene.tweens.add({
          targets: entry.graphic,
          alpha: { from: 1, to: 0.3 },
          duration: 120, yoyo: true,
        });

        this.scene.tweens.add({
          targets: entry.graphic,
          x: targetX, y: targetY,
          duration: STAR_FLIGHT_DUR,
          ease: 'Cubic.out',
          onComplete: () => {
            if (starId) this._constellationStarsBeingAnimated.delete(starId);
            entry.isConstellationAnimating = false;
            const baseScaleX = entry.baseScaleX || entry.graphic.scaleX || 1;
            const baseScaleY = entry.baseScaleY || entry.graphic.scaleY || 1;

            // Pop-scale on landing
            this.scene.tweens.add({
              targets: entry.graphic,
              scaleX: { from: baseScaleX * 1.6, to: baseScaleX },
              scaleY: { from: baseScaleY * 1.6, to: baseScaleY },
              duration: 300, ease: 'Back.out',
            });

            // Small burst at landing point
            const burst = this.scene.add.circle(targetX, targetY, 8, lineColor, 0.8);
            burst.setDepth(HUD_LAYOUT.hudDepth - 4);
            this.scene.tweens.add({
              targets: burst, radius: 40, alpha: 0, duration: 500, ease: 'Power2.out',
              onComplete: () => burst.destroy(),
            });

            // Resume twinkle
            entry.tween = this._startSkyStarTwinkle(entry);
          },
        });
      });
    });

    // Lines draw segment by segment after all stars land
    const allLandedDelay = typeStars.length * STAR_STAGGER_GAP + STAR_FLIGHT_DUR + 100;
    this.scene.time.delayedCall(allLandedDelay, () => {
      this._drawConstellationLinesAnimated(def, centerX, centerY, sp, resourceType);
    });

    this._saveConstellationUnlock(resourceType);
    if (this._onConstellationUnlocked) this._onConstellationUnlocked(resourceType);
  }

  /**
   * Instantly draw all glow lines for a constellation (used when restoring from save).
   * @private
   */
  _drawConstellationLines(def, centerX, centerY, sp, resourceType) {
    const lineColor = CONSTELLATION_LINE_COLORS[resourceType] || 0xFFFFFF;
    const gfx = this.scene.add.graphics();
    gfx.setDepth(HUD_LAYOUT.hudDepth - 6);
    gfx.lineStyle(2, lineColor, 0.6);
    def.lines.forEach(([i, j]) => {
      const [dx1, dy1] = def.points[i];
      const [dx2, dy2] = def.points[j];
      gfx.lineBetween(
        centerX + dx1 * sp, centerY + dy1 * sp,
        centerX + dx2 * sp, centerY + dy2 * sp
      );
    });
    if (!this._constellationLines) this._constellationLines = [];
    this._constellationLines.push(gfx);
  }

  /**
   * Draw constellation lines one segment at a time (unlock ceremony).
   * After all segments draw, fires the expanding ring burst.
   * @private
   */
  _drawConstellationLinesAnimated(def, centerX, centerY, sp, resourceType) {
    const lineColor = CONSTELLATION_LINE_COLORS[resourceType] || 0xFFFFFF;
    const SEG_DELAY = 220; // ms between each segment appearing

    if (!this._constellationLines) this._constellationLines = [];

    def.lines.forEach(([i, j], segIdx) => {
      this.scene.time.delayedCall(segIdx * SEG_DELAY, () => {
        const [dx1, dy1] = def.points[i];
        const [dx2, dy2] = def.points[j];
        const x1 = centerX + dx1 * sp, y1 = centerY + dy1 * sp;
        const x2 = centerX + dx2 * sp, y2 = centerY + dy2 * sp;

        const gfx = this.scene.add.graphics();
        gfx.setDepth(HUD_LAYOUT.hudDepth - 6);
        gfx.setAlpha(0);

        // Bright sweep line
        gfx.lineStyle(4, 0xFFFFFF, 0.9);
        gfx.lineBetween(x1, y1, x2, y2);

        // Fade to normal color
        this.scene.tweens.add({
          targets: gfx, alpha: 1, duration: 150,
          onComplete: () => {
            gfx.clear();
            gfx.lineStyle(2, lineColor, 0.65);
            gfx.lineBetween(x1, y1, x2, y2);
          },
        });

        this._constellationLines.push(gfx);
      });
    });

    // After all segments: expanding ring burst + glow at center
    const burstDelay = def.lines.length * SEG_DELAY + 100;
    this.scene.time.delayedCall(burstDelay, () => {
      // Inner flash
      const innerFlash = this.scene.add.circle(centerX, centerY, 20, 0xFFFFFF, 0.85);
      innerFlash.setDepth(HUD_LAYOUT.hudDepth - 4);
      this.scene.tweens.add({
        targets: innerFlash, alpha: 0, scale: 0.5, duration: 300,
        onComplete: () => innerFlash.destroy(),
      });

      // Expanding ring
      const ring = this.scene.add.graphics();
      ring.setDepth(HUD_LAYOUT.hudDepth - 4);
      ring.lineStyle(3, lineColor, 0.85);
      ring.strokeCircle(centerX, centerY, 10);
      this.scene.tweens.add({
        targets: ring, scaleX: 30, scaleY: 30, alpha: 0,
        duration: 900, ease: 'Power2.out',
        onComplete: () => ring.destroy(),
      });

      // Second wider softer ring
      const ring2 = this.scene.add.graphics();
      ring2.setDepth(HUD_LAYOUT.hudDepth - 4);
      ring2.lineStyle(8, lineColor, 0.35);
      ring2.strokeCircle(centerX, centerY, 10);
      this.scene.tweens.add({
        targets: ring2, scaleX: 45, scaleY: 45, alpha: 0,
        duration: 1400, ease: 'Power3.out',
        onComplete: () => ring2.destroy(),
      });
    });
  }

  /**
   * Persist current star counts to localStorage so partial progress survives reloads.
   * @private
   */
  _saveStarCounts() {
    try {
      if (this._constellationCounts) {
        localStorage.setItem('dig-game-star-counts', JSON.stringify(this._constellationCounts));
      }
    } catch (e) { /* storage unavailable */ }
  }

  /**
   * Load persisted star counts on session start, merging with any already-counted stars.
   * @private
   */
  _loadPersistedStarCounts() {
    try {
      const saved = JSON.parse(localStorage.getItem('dig-game-star-counts') || '{}');
      if (!this._constellationCounts) this._constellationCounts = {};
      for (const [k, v] of Object.entries(saved)) {
        if (!this._constellationCounts[k]) this._constellationCounts[k] = v;
      }
    } catch (e) { /* storage unavailable */ }
  }

  _saveStarRarityCounts() {
    try {
      if (this._starRarityCounts) {
        localStorage.setItem('dig-game-star-rarity-counts', JSON.stringify(this._starRarityCounts));
      }
    } catch (e) { /* storage unavailable */ }
  }

  _loadPersistedStarRarityCounts() {
    try {
      const saved = JSON.parse(localStorage.getItem('dig-game-star-rarity-counts') || '[]');
      const targetLen = Math.max(SKY_RARITY_FALLBACKS.length, Array.isArray(saved) ? saved.length : 0);
      if (!this._starRarityCounts || this._starRarityCounts.length < targetLen) {
        this._starRarityCounts = new Array(targetLen).fill(0);
      }
      if (Array.isArray(saved)) {
        saved.forEach((count, i) => {
          this._starRarityCounts[i] = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
        });
      }
    } catch (e) { /* storage unavailable */ }
  }

  /**
   * Persist a constellation unlock to localStorage.
   * @private
   */
  _saveConstellationUnlock(resourceType) {
    try {
      const arr = JSON.parse(localStorage.getItem('dig-game-constellations') || '[]');
      if (!arr.includes(resourceType)) {
        arr.push(resourceType);
        localStorage.setItem('dig-game-constellations', JSON.stringify(arr));
      }
    } catch (e) { /* storage unavailable */ }
  }

  /**
   * Restore previously-unlocked constellations from localStorage on scene start.
   * Spawns stars directly at their fixed positions and draws lines immediately.
   * @private
   */
  _restorePersistedConstellations() {
    // Always load persisted counts first (even if no constellations are unlocked yet,
    // so the progress panel shows correct partial counts from previous sessions)
    if (!this._constellationCounts) this._constellationCounts = {};
    this._loadPersistedStarCounts();
    this._loadPersistedStarRarityCounts();

    let unlocked;
    try {
      unlocked = JSON.parse(localStorage.getItem('dig-game-constellations') || '[]');
    } catch (e) { return; }
    if (!unlocked.length) return;

    unlocked.forEach(resourceType => {
      const def = CONSTELLATION_DEFS[resourceType];
      const center = this._getConstellationCenter(resourceType);
      if (!def || !center) return;

      const centerX = center.x;
      const centerY = center.y;
      const sp = CONSTELLATION_SPACING;
      this._addConstellationSignBackdrop(resourceType, centerX, centerY, CONSTELLATION_LINE_COLORS[resourceType] || 0xFFFFFF, false);

      // Mark as already unlocked so threshold won't fire again
      this._constellationCounts[resourceType] = CONSTELLATION_THRESHOLDS[resourceType] ?? 5;

      // Spawn 5 stars directly at their positions
      def.points.forEach(([dx, dy]) => {
        const x = centerX + dx * sp;
        const y = centerY + dy * sp;
        const entry = this._createSkyStarEntry(x, y, 0, resourceType);
        entry.graphic.setAlpha(1);
        entry.graphic.setScale(entry.baseScaleX, entry.baseScaleY);
        entry.tween = this._startSkyStarTwinkle(entry);
        this._townStars.push(entry);
      });

      // Draw lines immediately
      this._drawConstellationLines(def, centerX, centerY, sp, resourceType);
    });
  }

  /**
   * Draw a 5-pointed star on a graphics object
   * @param {Phaser.GameObjects.Graphics} graphics
   * @param {number} x
   * @param {number} y
   * @param {number} size
   * @param {number} [color=0xFFFFFF] - Phaser hex color
   * @private
   */
  _drawStar(graphics, x, y, size, color = 0xFFFFFF) {
    const innerRadius = size * 0.4;
    const outerRadius = size;
    const points = 5;
    const angle = Math.PI / 2 * 3; // Start pointing up

    graphics.fillStyle(color, 1);
    graphics.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const a = angle + (i * Math.PI / points);
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) graphics.moveTo(px, py);
      else graphics.lineTo(px, py);
    }

    graphics.closePath();
    graphics.fillPath();

    // Inner glow circle
    graphics.fillStyle(0xFFFFFF, 0.35);
    graphics.fillCircle(x, y, size * 0.3);
  }

  _strokeStar(graphics, x, y, size) {
    const innerRadius = size * 0.4;
    const outerRadius = size;
    const points = 5;
    const angle = Math.PI / 2 * 3;

    graphics.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const a = angle + (i * Math.PI / points);
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) graphics.moveTo(px, py);
      else graphics.lineTo(px, py);
    }
    graphics.closePath();
    graphics.strokePath();
  }

  /**
   * Format resource name for display
   * @private
   */
  _formatResourceName(resourceType) {
    const names = {
      dirt: 'Dirt',
      stone: 'Stone',
      copper: 'Copper',
      darkDirtNormal: 'Dark Dirt',
      darkDirtStrong: 'Hard Dirt',
      steel: 'Steel',
      iron: 'Iron',
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
    };
    return names[resourceType] || resourceType;
  }

  /**
   * Show thunder strike lightning bolt effect
   * Creates a lightning bolt that travels down through affected tiles with blue energy burst
   * @param {number} playerX - Player world X position
   * @param {number} playerY - Player world Y position
   * @param {number} startX - Starting X position (same as player)
   * @param {number} startY - Starting Y position (player position)
   * @param {number} endY - Ending Y position (bottom-most tile)
   * @param {number} tileSize - Tile size in pixels
   */
  showThunderStrikeLightning(playerX, playerY, startX, startY, endY, tileSize) {
    const boltColor = 0x00AAFF; // Electric blue
    const glowColor = 0x4488FF;
    const energyBurstColor = 0x00DDFF;
    
    // Create blue energy burst around character (super powerful feel)
    const energyBurst = this.scene.add.graphics();
    energyBurst.setDepth(HUD_LAYOUT.fxDepth + 5);
    energyBurst.lineStyle(8, energyBurstColor, 0.8);
    
    // Draw expanding energy rings
    const burstRadius = 60;
    for (let i = 0; i < 3; i++) {
      const ringRadius = burstRadius - (i * 20);
      energyBurst.strokeCircle(playerX, playerY, ringRadius);
    }
    
    // Animate energy burst
    this.scene.tweens.add({
      targets: [energyBurst],
      alpha: 0,
      scale: 2,
      duration: 400,
      ease: 'Power2.out',
      onComplete: () => {
        energyBurst.destroy();
      }
    });
    
    // Create lightning bolt graphic
    const lightning = this.scene.add.graphics();
    lightning.setDepth(HUD_LAYOUT.fxDepth + 10);
    lightning.lineStyle(6, boltColor, 1);
    lightning.lineStyle(3, 0xFFFFFF, 0.8); // White core
    
    // Generate jagged lightning path from start to end
    const segments = 12;
    const segmentHeight = (endY - startY) / segments;
    const points = [];
    
    points.push({ x: startX, y: startY });
    
    for (let i = 1; i < segments; i++) {
      const x = startX + (Math.random() - 0.5) * 30; // Random zigzag
      const y = startY + i * segmentHeight;
      points.push({ x, y });
    }
    
    points.push({ x: startX, y: endY });
    
    // Draw the lightning bolt
    lightning.beginPath();
    lightning.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      lightning.lineTo(points[i].x, points[i].y);
    }
    
    lightning.strokePath();
    
    // Add glow effect
    const lightningGlow = this.scene.add.graphics();
    lightningGlow.setDepth(HUD_LAYOUT.fxDepth + 9);
    lightningGlow.lineStyle(12, glowColor, 0.4);
    lightningGlow.beginPath();
    lightningGlow.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      lightningGlow.lineTo(points[i].x, points[i].y);
    }
    
    lightningGlow.strokePath();
    
    // Flash effect on all affected tiles - REMOVED: Blue hitbox debug visualization
    // const tilesAffected = Math.floor((endY - startY) / tileSize);
    // for (let i = 0; i <= tilesAffected; i++) {
    //   const tileY = startY + i * tileSize;
    //   const tileFlash = this.scene.add.graphics();
    //   tileFlash.setDepth(HUD_LAYOUT.fxDepth + 8);
    //   tileFlash.fillStyle(0x00AAFF, 0.3);
    //   tileFlash.fillRect(startX - tileSize / 2, tileY - tileSize / 2, tileSize, tileSize);
    //   
    //   // Flash and fade
    //   this.scene.tweens.add({
    //     targets: [tileFlash],
    //     alpha: 0,
    //     duration: 300 + i * 50, // Staggered flash effect
    //     delay: 50,
    //     onComplete: () => {
    //       tileFlash.destroy();
    //     }
    //   });
    // }
    
    // Animate lightning bolt
    this.scene.tweens.add({
      targets: [lightning, lightningGlow],
      alpha: 0,
      duration: 300,
      ease: 'Power2.out',
      onComplete: () => {
        lightning.destroy();
        lightningGlow.destroy();
      }
    });
    
    this.scene.shakeSystem?.shake("thunderStrike.ability");
  }

  /**
   * Clean up all floating texts
   */
  destroy() {
    // Kill in-flight tweens before destroying objects to prevent onComplete
    // callbacks firing on already-destroyed objects after scene shutdown
    this.activeFloatingTexts.forEach(text => {
      this.scene.tweens.killTweensOf(text);
      text.destroy();
    });
    this.activeFloatingTexts = [];

    (this._townStars || []).forEach(entry => {
      if (entry?.tween) entry.tween.stop();
      if (entry?.graphic) {
        this.scene.tweens.killTweensOf(entry.graphic);
        entry.graphic.destroy();
      }
    });
    this._townStars = [];

    (this._constellationLines || []).forEach(line => line?.destroy());
    this._constellationLines = [];

    Object.values(this._constellationSignBackdrops || {}).forEach(sign => {
      if (!sign) return;
      this.scene.tweens.killTweensOf(sign);
      sign.destroy();
    });
    this._constellationSignBackdrops = {};
  }
}
