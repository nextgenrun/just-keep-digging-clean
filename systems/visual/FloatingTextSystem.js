import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { STAR_CONSTELLATION_CONFIG } from "../../values/starConstellations.js";
import { getResourceDisplayName } from "../../values/resourceTypes.js";
import { getConstellationRelicRequirement } from "../../values/ancientRelics.js";
import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { SkyStarReleaseView } from "./SkyStarReleaseView.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../../values/starRarityProgression.js";
import { ANIMATION_SMOOTHNESS_CONFIG } from "../../values/animationSmoothness.js";
import {
  getSignProgress,
  getStarRarityTier,
  validateStarRarityProgressionConfig,
} from "../../values/starRarityProgressionMath.js";
import {
  getStarIdentityPreloadAssets,
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../../values/starIdentityLibrary.js";
import {
  getStarIdentitiesForRarity,
  getStarIdentity,
  validateStarIdentityLibraryConfig,
} from "../../values/starIdentityLibraryMath.js";
import { installStarIdentityTextureFrames } from "./installStarIdentityTextureFrames.js";
import {
  RUNTIME_FEATURE_ASSET_CONSUMERS,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../../values/runtimeAssetLoading.js";
import { sanitizeStarCollectionData } from "../../values/savePayloadV15.js";

// ─── Constellation system ─────────────────────────────────────────────────────
const CONSTELLATION_THRESHOLDS = STAR_CONSTELLATION_CONFIG.thresholds;
const CONSTELLATION_SPACING = STAR_CONSTELLATION_CONFIG.spacingPx;
const CONSTELLATION_DEFS = STAR_CONSTELLATION_CONFIG.defs;
const CONSTELLATION_CENTERS = STAR_CONSTELLATION_CONFIG.centers;
const CONSTELLATION_LINE_COLORS = STAR_CONSTELLATION_CONFIG.lineColors;
const SKY_RARITY_FALLBACKS = STAR_CONSTELLATION_CONFIG.rarityFallbacks;
const COLLECTED_STAR_RELEASE_FX = STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx;
// ─────────────────────────────────────────────────────────────────────────────

export class FloatingTextSystem {
  constructor(scene, saveSlot = 1, initialData = null) {
    this.scene = scene;
    this.saveSlot = Number.isInteger(saveSlot) && saveSlot > 0 ? saveSlot : 1;
    this.activeFloatingTexts = [];
    this._floatingTextLastShownAt = new Map();
    this._townStars = [];
    this._constellationLines = [];
    this._constellationSignBackdrops = {};
    this._constellationCounts = {};
    this._constellationXp = {};
    this._starRarityCounts = new Array(SKY_RARITY_FALLBACKS.length).fill(0);
    this._unlockedConstellations = [];
    this._constellationsLoaded = false;
    this._activeSkyStarReleaseViews = new Set();
    this._runtimeFeatureRequestSequence = 0;
    this._destroyed = false;
    this._constellationStarsBeingAnimated = new Set(); // Track stars being animated
    this._onConstellationUnlocked = null; // callback(resourceType) wired by StarPillarSystem
    this._onCollectedSkyStar = null; // callback(detail) wired by Star Heart progression
    this.loadSaveData(initialData);
  }

  /** Wire a callback to be called when a constellation unlocks. */
  setConstellationUnlockedCallback(fn) {
    this._onConstellationUnlocked = fn;
  }

  setCollectedSkyStarCallback(fn) {
    this._onCollectedSkyStar = typeof fn === "function" ? fn : null;
  }

  /** Return array of resource types whose constellations are unlocked. */
  getUnlockedConstellations() {
    return [...this._unlockedConstellations];
  }

  /** Return physical Star Block encounter counts by material. */
  getConstellationCounts() {
    return { ...(this._constellationCounts || {}) };
  }

  /** Return the five-level Sign XP state used by the talent tree and unlocks. */
  getConstellationProgress() {
    return Object.fromEntries(
      Object.keys(STAR_RARITY_PROGRESSION_CONFIG.signProgression.xpTotals)
        .map(resourceType => [
          resourceType,
          getSignProgress(resourceType, this._constellationXp?.[resourceType] || 0),
        ]),
    );
  }

  getAncientRelicCount() {
    return this.scene?.ancientRelicSystem?.getCount?.() || 0;
  }

  tryUnlockEligibleConstellations() {
    const progressByResource = this.getConstellationProgress();
    const unlocked = new Set(this.getUnlockedConstellations());
    const relicCount = this.getAncientRelicCount();

    for (const resourceType of Object.keys(CONSTELLATION_THRESHOLDS)) {
      const progress = progressByResource[resourceType];
      const relicRequirement = getConstellationRelicRequirement(resourceType);
      if (unlocked.has(resourceType)) continue;
      if (!progress?.mastered || relicCount < relicRequirement) continue;
      this._unlockConstellation(resourceType);
      unlocked.add(resourceType);
    }
  }

  /** Return collected-star counts per sky tile rarity tier. */
  getStarRarityCounts() {
    return [...(this._starRarityCounts || [])];
  }

  getSaveData() {
    return sanitizeStarCollectionData({
      constellationCounts: this._constellationCounts,
      signXp: this._constellationXp,
      rarityCounts: this._starRarityCounts,
      unlockedConstellations: this._unlockedConstellations,
    });
  }

  loadSaveData(data) {
    if (!data || typeof data !== "object") return this.getSaveData();
    const normalized = sanitizeStarCollectionData(data);
    this._constellationCounts = { ...normalized.constellationCounts };
    this._constellationXp = { ...normalized.signXp };
    this._starRarityCounts = [...normalized.rarityCounts];
    while (this._starRarityCounts.length < SKY_RARITY_FALLBACKS.length) {
      this._starRarityCounts.push(0);
    }
    this._unlockedConstellations = [...normalized.unlockedConstellations];
    return this.getSaveData();
  }

  /** Ensure saved star progress is available to the constellation UI. */
  ensureConstellationsLoaded() {
    if (this._constellationsLoaded) return;
    this._constellationsLoaded = true;
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
      signProgression: STAR_RARITY_PROGRESSION_CONFIG.signProgression,
      spacing:    CONSTELLATION_SPACING,
    };
  }

  _getFloatingTextPolicy() {
    const config = RETENTION_CONFIG.floatingText;
    const requestedMode = USER_SETTINGS.getDisplay().floatingTextMode;
    const mode = Object.prototype.hasOwnProperty.call(config.modes, requestedMode)
      ? requestedMode
      : config.defaultMode;
    return { mode, ...config.modes[mode] };
  }

  _discardFloatingText(object) {
    if (!object) return;
    this.scene.tweens.killTweensOf(object);
    object.destroy?.();
    const index = this.activeFloatingTexts.indexOf(object);
    if (index !== -1) this.activeFloatingTexts.splice(index, 1);
  }

  _trimActiveFloatingTexts(maxAllowed) {
    this.activeFloatingTexts = this.activeFloatingTexts.filter(object => object?.active !== false);
    while (this.activeFloatingTexts.length > Math.max(0, maxAllowed)) {
      this._discardFloatingText(this.activeFloatingTexts[0]);
    }
  }

  _shouldShowFloatingText(category = "status", slotCount = 1) {
    if (RETENTION_CONFIG.floatingText.enabled === false) return false;
    const policy = this._getFloatingTextPolicy();
    if (
      policy.maxActive <= 0
      || policy.hiddenCategories.includes("*")
      || policy.hiddenCategories.includes(category)
    ) {
      return false;
    }

    const now = Number.isFinite(this.scene.time?.now) ? this.scene.time.now : Date.now();
    const lastShownAt = this._floatingTextLastShownAt.get(category) ?? -Infinity;
    if (now - lastShownAt < policy.minIntervalMs) return false;

    const reservedSlots = Math.max(1, Math.floor(slotCount));
    this._trimActiveFloatingTexts(Math.max(0, policy.maxActive - reservedSlots));
    this._floatingTextLastShownAt.set(category, now);
    return true;
  }

  applyDisplaySettings() {
    const policy = this._getFloatingTextPolicy();
    this._floatingTextLastShownAt.clear();
    this._trimActiveFloatingTexts(policy.maxActive);
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
  showFloatingText(worldX, worldY, text, color = "#ffffff", duration = HUD_LAYOUT.floatDefaultDurationMs, fontSize = HUD_LAYOUT.floatDefaultFontSize, category = "status") {
    if (!String(text ?? "").trim() || !this._shouldShowFloatingText(category)) return null;
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
    return floatingText;
  }

  /**
   * Show damage number for mining — dynamically scaled by damage amount
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @param {number} damage - Damage dealt (whole integers)
   */
  showDamage(worldX, worldY, damage) {
    if (!this._shouldShowFloatingText("damage")) return;
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
    this.showFloatingText(
      worldX,
      worldY,
      text,
      color,
      HUD_LAYOUT.floatResourceDurationMs,
      HUD_LAYOUT.floatResourceFontSize,
      "resource"
    );
  }

  /**
   * Show critical hit damage (extra large with flash effect)
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @param {number} damage - Damage dealt
   * @param {number} multiplier - Critical hit multiplier (e.g., 1.5)
   */
  showCriticalHit(worldX, worldY, damage, multiplier) {
    if (!this._shouldShowFloatingText("critical")) return;
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
    if (!this._shouldShowFloatingText("special")) return;
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
    if (!this._shouldShowFloatingText("bonus")) return;
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
    if (!this._shouldShowFloatingText("bonus")) return;
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

  // ─── Constellation system constants ──────────────────────────────────────
  // (defined inside the class scope so they're accessible to all methods below)
  // Threshold: how many stars of the same resource type unlock a constellation
  // CONSTELLATION_THRESHOLD / DEFS / CENTERS / LINE_COLORS are referenced via
  // the module-level consts declared just before this class.
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Record a collected sky star for UI progression, then let its world-space
   * visual drift upward slowly and fade away. No collected star remains in the world.
   * @param {number} rarity - 0=common through 5=astral
   * @param {number} startWorldX - Mined tile world X center
   * @param {number} startWorldY - Mined tile world Y center
   * @param {string} resourceType - Resource type string (e.g. 'copper', 'gold')
   * @param {?object} rewardDetail - Exact material reward granted by mining
   */
  releaseCollectedSkyStar(
    rarity,
    startWorldX,
    startWorldY,
    resourceType,
    rewardDetail = null,
  ) {
    this.ensureConstellationsLoaded();
    const progress = this._recordCollectedStar(
      resourceType,
      rarity,
      rewardDetail,
    );
    if (progress) {
      this.scene.retentionProgressSystem?.recordStar?.(1);
    }

    this.showCollectedSkyStarRelease(
      rarity,
      startWorldX,
      startWorldY,
      resourceType,
      progress,
    );
    return progress;
  }

  /**
   * Play only the authored collected-star presentation. This does not award,
   * persist, or notify progression and is safe for visual review harnesses.
  */
  showCollectedSkyStarRelease(rarity, startWorldX, startWorldY, resourceType = null, progress = null) {
    const manager = this.scene?.runtimeFeatureAssetManager;
    const groupId = RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx;
    if (manager?.enabled && !manager.isReady(groupId)) {
      const consumer = `${RUNTIME_FEATURE_ASSET_CONSUMERS.starReleasePrefix}${this._runtimeFeatureRequestSequence += 1}`;
      manager.ensureGroup(groupId, { consumer }).then(result => {
        if (result.ready && !this._destroyed && this.scene) {
          this.showCollectedSkyStarRelease(rarity, startWorldX, startWorldY, resourceType, progress);
        }
        manager.releaseGroup(groupId, consumer);
      });
      return null;
    }

    const entry = this._createSkyStarEntry(
      startWorldX,
      startWorldY,
      rarity,
      resourceType,
      progress?.identityIndex,
    );
    if (!entry) return null;

    const star = entry.graphic;
    const releaseView = new SkyStarReleaseView(this.scene);
    const discardReleasedStar = () => {
      const index = this.activeFloatingTexts.indexOf(star);
      if (index !== -1) this.activeFloatingTexts.splice(index, 1);
      this._activeSkyStarReleaseViews.delete(releaseView);
    };

    this.activeFloatingTexts.push(star);
    this._activeSkyStarReleaseViews.add(releaseView);
    const started = releaseView.play({
      entry,
      startWorldX,
      startWorldY,
      onComplete: discardReleasedStar,
    });
    if (!started) {
      releaseView.destroy();
      if (star.active) star.destroy();
      discardReleasedStar();
      return null;
    }
    return releaseView;
  }


  grantCollectedStar(rarity, worldX, worldY, resourceType, rewardDetail = null) {
    return this.releaseCollectedSkyStar(
      rarity,
      worldX,
      worldY,
      resourceType,
      { source: "bonus", ...(rewardDetail || {}) },
    );
  }

  getRelicPurposeSummary(relicCount = this.getAncientRelicCount()) {
    const currentRelics = Math.max(0, Math.floor(Number(relicCount) || 0));
    const progressByResource = this.getConstellationProgress();
    const unlocked = new Set(this.getUnlockedConstellations());
    const next = Object.keys(CONSTELLATION_DEFS)
      .filter(resourceType => !unlocked.has(resourceType))
      .map(resourceType => ({
        resourceType,
        name: CONSTELLATION_DEFS[resourceType]?.name || resourceType,
        xp: progressByResource[resourceType]?.xp || 0,
        totalXp: progressByResource[resourceType]?.totalXp || 1,
        relics: getConstellationRelicRequirement(resourceType),
      }))
      .filter(entry => entry.relics > currentRelics)
      .sort((a, b) => (a.relics - b.relics)
        || ((b.xp / b.totalXp) - (a.xp / a.totalXp)))[0];
    if (!next) return `All known constellation relic gates met (${currentRelics} relics)`;
    return `${next.name}: relics ${currentRelics}/${next.relics}, Sign XP ${next.xp}/${next.totalXp}`;
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

    const progress = getSignProgress(
      resourceType,
      this._constellationXp?.[resourceType] || 0,
    );
    const pointIndex = progress.mastered
      ? Math.floor(Math.random() * def.points.length)
      : Math.min(progress.level, def.points.length - 1);
    const [dx, dy] = def.points[pointIndex];

    return {
      x: center.x + dx * CONSTELLATION_SPACING
        + (progress.mastered ? Math.random() * 46 - 23 : 0),
      y: center.y + dy * CONSTELLATION_SPACING
        + (progress.mastered ? Math.random() * 34 - 17 : 0),
    };
  }

  _createSkyStarEntry(
    x,
    y,
    rarity = 0,
    resourceType = null,
    identityIndex = 0,
  ) {
    const assets = COLLECTED_STAR_RELEASE_FX.coreAssets;
    if (!Array.isArray(assets) || assets.length === 0) return null;
    const fallbackIndex = Math.max(
      0,
      Math.min(
        assets.length - 1,
        COLLECTED_STAR_RELEASE_FX.fallbackRarityIndex || 0
      )
    );
    const safeRarity = Number.isFinite(rarity)
      ? Math.max(0, Math.min(assets.length - 1, Math.floor(rarity)))
      : fallbackIndex;
    const requestedIdentity = getStarIdentity(identityIndex);
    const identity = requestedIdentity.rarityIndex === safeRarity
      ? requestedIdentity
      : getStarIdentitiesForRarity(safeRarity)[0];
    const identityAtlas = STAR_IDENTITY_LIBRARY_CONFIG.atlases[
      identity.rarityIndex
    ];
    const identityLightAtlas = STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases[
      identity.rarityIndex
    ];
    const identityReady = installStarIdentityTextureFrames(this.scene)
      && this.scene.textures?.exists?.(identityAtlas?.key)
      && this.scene.textures?.exists?.(identityLightAtlas?.key);
    const textureKey = identityReady
      ? identityAtlas.key
      : assets[safeRarity]?.key || assets[fallbackIndex]?.key;
    const textureFrame = identityReady ? identity.frameName : null;
    const lightTextureKey = identityReady ? identityLightAtlas.key : null;
    const lightTextureFrame = identityReady ? identity.lightFrameName : null;
    const displaySize = COLLECTED_STAR_RELEASE_FX.coreDisplaySizesPx[safeRarity]
      || COLLECTED_STAR_RELEASE_FX.coreDisplaySizesPx[fallbackIndex];
    if (
      !textureKey
      || (this.scene.textures?.exists && !this.scene.textures.exists(textureKey))
    ) {
      return null;
    }
    const star = this.scene.add.image(x, y, textureKey, textureFrame || undefined);
    star.setDepth(HUD_LAYOUT.hudDepth - 5);
    star.setDisplaySize(displaySize, displaySize);
    star.setAlpha(0);

    const entry = {
      graphic: star,
      tween: null,
      textureKey,
      textureFrame,
      lightTextureKey,
      lightTextureFrame,
      displaySize,
      resourceType: resourceType || null,
      rarity: safeRarity,
      identityIndex: identity.index,
      identityId: identity.id,
      baseScaleX: star.scaleX,
      baseScaleY: star.scaleY,
      isFlightAnimating: false,
      isConstellationAnimating: false,
    };
    star.setScale(
      entry.baseScaleX * COLLECTED_STAR_RELEASE_FX.startScale,
      entry.baseScaleY * COLLECTED_STAR_RELEASE_FX.startScale
    );
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
    const startAngle = Number.isFinite(star.angle) ? star.angle : 0;
    const totalRotationDegrees = (
      ANIMATION_SMOOTHNESS_CONFIG.skyStar.rotationDegreesPerReferenceFrame
      + rarity * ANIMATION_SMOOTHNESS_CONFIG.skyStar.rotationDegreesPerRarityPerReferenceFrame
    ) * (duration / ANIMATION_SMOOTHNESS_CONFIG.referenceFrameMs);
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
            star.angle = startAngle + totalRotationDegrees * t;

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

  _recordCollectedStar(resourceType, rarity = 0, rewardDetail = null) {
    const tier = getStarRarityTier(rarity);
    const rarityIdentities = getStarIdentitiesForRarity(tier.index);
    const requestedIdentity = getStarIdentity(rewardDetail?.identityIndex);
    const identity = requestedIdentity.rarityIndex === tier.index
      ? requestedIdentity
      : rarityIdentities[0];
    const rarityEncounterCount = this._recordStarRarity(tier.index);
    if (!resourceType || !CONSTELLATION_DEFS[resourceType]) return null;

    if (!this._constellationCounts) this._constellationCounts = {};
    if (!this._constellationXp) this._constellationXp = {};
    const progressionConfig = STAR_RARITY_PROGRESSION_CONFIG.signProgression;
    const currentCount = Math.max(
      0,
      Math.floor(Number(this._constellationCounts[resourceType]) || 0),
    );
    this._constellationCounts[resourceType] = Math.min(
      progressionConfig.maxEncounterCount,
      currentCount + 1,
    );

    const before = getSignProgress(
      resourceType,
      this._constellationXp[resourceType] || 0,
    );
    const nextXp = Math.min(before.totalXp, before.xp + tier.signXp);
    this._constellationXp[resourceType] = nextXp;
    const after = getSignProgress(resourceType, nextXp);
    const wasUnlocked = this.getUnlockedConstellations().includes(resourceType);
    if (!wasUnlocked && after.mastered) this.tryUnlockEligibleConstellations();
    const progress = {
      ...after,
      resourceType,
      constellationName: CONSTELLATION_DEFS[resourceType].name,
      count: this._constellationCounts[resourceType],
      threshold: after.totalXp,
      xpBefore: before.xp,
      xpGained: after.xp - before.xp,
      levelBefore: before.level,
      levelProgressBefore: before.levelProgress,
      levelsGained: Math.max(0, after.level - before.level),
      rarity: tier.index,
      rarityId: tier.id,
      rarityEncounterCount,
      identityIndex: identity.index,
      identityId: identity.id,
      identityName: identity.name,
      identityColourName: identity.colourName,
      identityPrimary: identity.primary,
      identitySecondary: identity.secondary,
      identityFlavour: identity.flavour,
      identityLightStyle: identity.light.style,
      rewardSource: rewardDetail?.source === "bonus" ? "bonus" : "mining",
      materialMultiplier: Math.max(
        1,
        Number(rewardDetail?.materialMultiplier) || tier.multiplier,
      ),
      materialAmount: Number.isFinite(rewardDetail?.materialAmount)
        ? Math.max(0, rewardDetail.materialAmount)
        : null,
      relicCurrent: this.getAncientRelicCount(),
      relicRequired: getConstellationRelicRequirement(resourceType),
      unlocked: this.getUnlockedConstellations().includes(resourceType),
    };
    this._queuePrimarySave("star-collected");
    this._onCollectedSkyStar?.(progress);
    return progress;
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
    return this._starRarityCounts[safeRarity];
  }

  /** Persist an unlock and notify the UI without creating world-space stars. */
  _unlockConstellation(resourceType) {
    const def = CONSTELLATION_DEFS[resourceType];
    if (!def) return;
    if (this.getUnlockedConstellations().includes(resourceType)) return;

    this._unlockedConstellations.push(resourceType);
    this._queuePrimarySave("constellation-unlocked");
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

  _queuePrimarySave(reason) {
    this.scene?.queueDugTilesSave?.(reason);
  }

  getStarProgressionHealthSnapshot() {
    const configHealth = validateStarRarityProgressionConfig();
    const identityHealth = validateStarIdentityLibraryConfig();
    const progressByResource = this.getConstellationProgress();
    const invalidProgress = Object.entries(progressByResource)
      .filter(([, progress]) => (
        !Number.isFinite(progress.xp)
        || progress.xp < 0
        || progress.xp > progress.totalXp
        || progress.level < 0
        || progress.level > progress.maxLevel
      ))
      .map(([resourceType]) => resourceType);
    const requiredAssets = getStarIdentityPreloadAssets();
    const missingTextures = requiredAssets.filter(
      asset => !this.scene?.textures?.exists?.(asset.key),
    ).map(asset => asset.key);
    return {
      ready: configHealth.ready
        && identityHealth.ready
        && invalidProgress.length === 0
        && missingTextures.length === 0,
      ...configHealth,
      identityHealth,
      invalidProgress,
      missingTextures,
      rarityCountSlots: this._starRarityCounts?.length || 0,
    };
  }

  /**
   * Format resource name for display
   * @private
   */
  _formatResourceName(resourceType) {
    return getResourceDisplayName(resourceType);
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
    this._destroyed = true;
    // callbacks firing on already-destroyed objects after scene shutdown
    this.activeFloatingTexts.forEach(text => {
      this.scene.tweens.killTweensOf(text);
      text.destroy();
    });
    this.activeFloatingTexts = [];
    this._floatingTextLastShownAt.clear();

    for (const releaseView of this._activeSkyStarReleaseViews) {
      releaseView.destroy();
    }
    this._activeSkyStarReleaseViews.clear();

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
