import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/**
 * Depth-aware lighting compositor.
 * Surface sunlight is allowed to affect only the surface transition band;
 * deep caves are owned by underground darkness and local torch fire.
 */
export class LightSystem {
  constructor(scene, playerController, dayNightCycle, weatherSystem = null, config = LIGHT_CONFIG) {
    this.scene = scene;
    this.playerController = playerController;
    this.dayNightCycle = dayNightCycle;
    this.weatherSystem = weatherSystem;
    this.config = config;

    this._torchActive = false;
    this._currentRadiusTiles = null;
    this._currentGlowStrength = 0;
    this._currentFacingOffsetWorld = 0;
    this._latestDepth = 0;
    this._currentTorchDrainGpPerSecond = this.config.torchDrainGpPerSecond;
    this._screenPoint = new Phaser.Math.Vector2();
    this._crystalScreenPoint = new Phaser.Math.Vector2();
    this._manualTorchOff = true; // starts off and stays off until the player toggles it on
    this._lightingState = "surfaceSunlight";
    this._shaderSnapshot = this._createDefaultShaderSnapshot();

    this._ensureGeneratedTextures();
    this._eraser = scene.make.image({ key: config.visibilityMaskTextureKey, add: false })
      .setOrigin(0.5);
    this._crystalEraser = scene.make.image({ key: config.visibilityMaskTextureKey, add: false })
      .setOrigin(0.5);

    this._torchHalo = this._createGlowImage(config.torchHaloColor);
    this._torchCoreGlow = this._createGlowImage(config.torchCoreColor);
    this._torchFlameGlow = this._createGlowImage(config.torchFlameColor);

    this._createDarknessTexture();
    this.scene.hudSystem?.setTorchState(false, config.torchDrainGpPerSecond);

    this._torchKeyHandler = () => {
      if (this._canUseTorchInput()) this._toggleTorch();
    };
    this._torchKey = null;
    this.refreshKeybinds();
  }

  update(time, delta, depth, gameplayActive) {
    if (!this._darknessTexture?.active) return;

    const deltaMs = Math.max(0, Number.isFinite(delta) ? delta : 0);
    const dt = deltaMs / 1000;
    const activeDepth = Number.isFinite(depth) ? depth : this._latestDepth;
    this._latestDepth = activeDepth;
    const torchDrainRate = this._getTorchDrainPerSecond(activeDepth);
    const lighting = this._resolveLightingState(activeDepth);

    if (gameplayActive && this._torchActive) {
      const requested = torchDrainRate * dt;
      const consumed = this.playerController?.consumeGemPower?.(requested) ?? 0;
      if (consumed + Number.EPSILON < requested) this.forceTorchOff();
    }

    // Auto-recover torch if it was drained by GP depletion (not manually toggled).
    if (gameplayActive && !this._torchActive && !this._manualTorchOff && this.playerController?.hasGemPower?.()) {
      this._torchActive = true;
      this.scene.hudSystem?.setTorchState(true, torchDrainRate);
    }
    this._currentTorchDrainGpPerSecond = torchDrainRate;
    this._latestDepth = activeDepth;
    const targetRadius = this._computeVisibilityRadius(lighting);
    const targetGlow = this._computeTargetGlow(lighting);
    const response = 1 - Math.exp(-this.config.transitionResponsePerSecond * dt);

    if (this._currentRadiusTiles === null) this._currentRadiusTiles = targetRadius;
    this._currentRadiusTiles = Phaser.Math.Linear(this._currentRadiusTiles, targetRadius, response);
    this._currentGlowStrength = Phaser.Math.Linear(this._currentGlowStrength, targetGlow, response);

    const facingSign = this.playerController?.isFacingRight?.() === false ? -1 : 1;
    const targetFacingOffset = facingSign * this.config.facingOffsetTiles * this.scene.config.tileSize;
    this._currentFacingOffsetWorld = Phaser.Math.Linear(
      this._currentFacingOffsetWorld,
      targetFacingOffset,
      response
    );

    this._redraw(time, this._currentRadiusTiles, lighting);
  }

  resize() {
    this._darknessTexture?.destroy();
    this._createDarknessTexture();
  }

  isTorchActive() {
    return this._torchActive;
  }

  getShaderSnapshot() {
    return {
      ...this._shaderSnapshot,
      torchScreenPosition: { ...this._shaderSnapshot.torchScreenPosition },
    };
  }

  refreshKeybinds() {
    const nextKey = this.scene.inputHandler?.getKeys?.().torch ?? null;
    if (this._torchKey && this._torchKey !== nextKey) {
      this._torchKey.off("down", this._torchKeyHandler);
    }
    if (nextKey) {
      nextKey.off("down", this._torchKeyHandler);
      nextKey.on("down", this._torchKeyHandler);
    }
    this._torchKey = nextKey;
    const torchDrainRate = this._getTorchDrainPerSecond(this._latestDepth);
    this._currentTorchDrainGpPerSecond = torchDrainRate;
    this.scene.hudSystem?.setTorchState(this._torchActive, torchDrainRate);
  }

  forceTorchOff() {
    if (!this._torchActive) return;
    this._torchActive = false;
    this.scene.hudSystem?.setTorchState(false, this._currentTorchDrainGpPerSecond);
    this.scene.hudSystem?.flashStatus("Torch extinguished - no GP", "#ff9a55", 1800);
  }

  destroy() {
    this._torchKey?.off("down", this._torchKeyHandler);
    this._darknessTexture?.destroy();
    this._torchHalo?.destroy();
    this._torchCoreGlow?.destroy();
    this._torchFlameGlow?.destroy();
    this._eraser?.destroy();
    this._crystalEraser?.destroy();
    this._darknessTexture = null;
    this._torchHalo = null;
    this._torchCoreGlow = null;
    this._torchFlameGlow = null;
    this._eraser = null;
    this._crystalEraser = null;
    this._torchKey = null;
    this._torchKeyHandler = null;
  }

  _toggleTorch() {
    if (this._torchActive) {
      this._torchActive = false;
      this._manualTorchOff = true;
      this.scene.hudSystem?.setTorchState(false, this._currentTorchDrainGpPerSecond);
      this.scene.hudSystem?.flashStatus(`Torch turned off (${USER_SETTINGS.getKeyLabel("torch")} to relight)`, "#ff9a55", 1800);
      return;
    }
    if (!this.playerController?.hasGemPower?.()) {
      this.scene.hudSystem?.flashStatus("No GP for torch", "#ff6666", 1200);
      return;
    }
    this._torchActive = true;
    this._manualTorchOff = false;
    this.scene.hudSystem?.setTorchState(true, this._getTorchDrainPerSecond(this._latestDepth));
    this.scene.hudSystem?.flashStatus("Torch relit", "#ffc06a", 900);
  }

  _canUseTorchInput() {
    return this.scene.gameState === "playing"
      && !this.scene.shopOverlay?.isVisible
      && !this.scene.levelUpPopup?.visible
      && !this.scene._pillarViewActive
      && !this.scene.campfireSystem?.isSelecting?.();
  }

  _resolveLightingState(depth) {
    const weather = this.weatherSystem?.getLightingSnapshot?.() ?? this._getFallbackWeatherSnapshot();
    const surfaceLightInfluence = this._getSurfaceLightInfluence(depth);
    const undergroundDarknessInfluence = 1 - surfaceLightInfluence;
    const depthRatio = this._getDepthRatio(depth);
    const nightAmount = clamp01(this.dayNightCycle?.getNightAmount?.() ?? 0);
    const sunStrength = this._getSunStrength();
    const stormCavePulse = weather.lightningFlashAmount
      * undergroundDarknessInfluence
      * (0.35 + weather.stormAmount * 0.65);

    this._lightingState = surfaceLightInfluence > 0.82
      ? "surfaceSunlight"
      : surfaceLightInfluence > 0.02
      ? "transition"
      : "undergroundDarkness";

    return {
      state: this._lightingState,
      depth,
      torchBonusRadius: this._getTorchBonusRadius(),
      torchDarknessMultiplier: this._getTorchDarknessMultiplier(depth),
      torchDrainPerSecond: this._getTorchDrainPerSecond(depth),
      depthRatio,
      nightAmount,
      sunStrength,
      surfaceLightInfluence,
      undergroundDarknessInfluence,
      stormCavePulse,
      weather,
    };
  }

  _getFallbackWeatherSnapshot() {
    return {
      kind: "clear",
      intensity: 0,
      targetIntensity: 0,
      wind: 0,
      rainAmount: 0,
      stormAmount: 0,
      surfaceAmount: 1,
      undergroundAmount: 0,
      undergroundSignal: 0,
      forecastKind: "clear",
      forecastProgress: 0,
      stormDistance: 1,
      playerShelterAmount: 0,
      visibilityPenalty: 0,
      movementWetnessPenalty: 0,
      campfireExposure: 0,
      windGustAmount: 0,
      worldWetnessAmount: 0,
      surfaceWetness: 0,
      lightningFlashAmount: 0,
      isStorming: false,
    };
  }

  _getSurfaceLightInfluence(depth) {
    const cfg = this.config.surfaceSunlight;
    const start = cfg.fullStrengthDepthTiles;
    const end = Math.max(start + 1, cfg.fadeOutEndDepthTiles);

    if (depth <= start) return 1;
    if (depth >= end) return 0;

    const t = smoothstep((depth - start) / (end - start));
    const rawInfluence = 1 - t;
    const transitionTail = cfg.maxUndergroundInfluence + (1 - cfg.maxUndergroundInfluence) * rawInfluence;
    return clamp01(rawInfluence * transitionTail);
  }

  _getSunStrength() {
    const sunAlpha = clamp01(this.dayNightCycle?.getSunAlpha?.() ?? 1);
    const cam = this.scene.cameras.main;
    const pos = this.dayNightCycle?.getSunScreenPosition?.(cam.width, cam.height);
    if (!pos) return sunAlpha;

    const horizonT = clamp01(1 - pos.y / Math.max(1, cam.height * 0.72));
    return clamp01(sunAlpha * (0.65 + horizonT * 0.35));
  }

  _getDepthRatio(depth) {
    const range = Math.max(1, this.config.depthMaxTiles - this.config.depthStartTiles);
    const linear = Phaser.Math.Clamp((depth - this.config.depthStartTiles) / range, 0, 1);
    return smoothstep(linear);
  }

  _getBaseVisibilityRadius(depth) {
    const stops = this.config.visibilityRadiusStops;
    if (Array.isArray(stops) && stops.length > 0) {
      let previous = stops[0];
      if (depth <= previous[0]) return previous[1];

      for (let i = 1; i < stops.length; i += 1) {
        const next = stops[i];
        if (!Array.isArray(next) || next.length < 2) continue;
        const [fromDepth, fromRadius] = previous;
        const [toDepth, toRadius] = next;
        if (!Number.isFinite(fromDepth) || !Number.isFinite(toDepth) || toDepth <= fromDepth) {
          previous = next;
          continue;
        }
        if (depth <= toDepth) {
          const t = smoothstep((depth - fromDepth) / (toDepth - fromDepth));
          return Phaser.Math.Linear(fromRadius, toRadius, t);
        }
        previous = next;
      }

      return previous[1];
    }

    return Phaser.Math.Linear(
      this.config.baseVisibilityRadiusTiles,
      this.config.minVisibilityRadiusTiles,
      this._getDepthRatio(depth)
    );
  }

  _computeVisibilityRadius(lighting) {
    const baseRadius = this._getBaseVisibilityRadius(lighting.depth);
    const torchBonus = this._torchActive
      ? this.config.torchBonusRadiusTiles + Number(lighting.torchBonusRadius || 0)
      : 0;
    const surface = lighting.surfaceLightInfluence;
    const underground = lighting.undergroundDarknessInfluence;
    const weather = lighting.weather;
    const minRadius = Number.isFinite(this.config.minVisibilityRadiusTiles)
      ? this.config.minVisibilityRadiusTiles
      : 0.5;

    const nightMultiplier = 1 - lighting.nightAmount * this.config.nightVisibilityPenalty * surface;
    const stormMultiplier = 1 - weather.stormAmount * this.config.stormVisibilityPenalty * surface;
    const caveWeatherMultiplier = 1 - weather.undergroundSignal * underground * 0.06;

    return Math.max(minRadius, (baseRadius + torchBonus) * nightMultiplier * stormMultiplier * caveWeatherMultiplier);
  }

  _computeTargetGlow(lighting) {
    if (!this._torchActive) return 0;

    const surfaceCfg = this.config.surfaceSunlight;
    const surfaceGlow = lighting.surfaceLightInfluence * clamp01(
      surfaceCfg.torchMinGlow
      + lighting.nightAmount * surfaceCfg.torchNightGlowBoost
      + lighting.weather.rainAmount * 0.08
      + lighting.weather.stormAmount * 0.18
    );
    const caveGlow = lighting.undergroundDarknessInfluence;

    return clamp01(surfaceGlow + caveGlow);
  }

  _redraw(time, radiusTiles, lighting) {
    const darkness = this._darknessTexture;
    const camera = this.scene.cameras.main;
    const player = this.scene.player;

    darkness.clear();
    darkness.fill(this.config.darknessColor, 1);
    const darknessAlpha = this._computeDarknessAlpha(lighting);
    darkness.setAlpha(darknessAlpha);

    if (!player) {
      this._setGlowState(this._torchHalo, 0, 0, 1, 0);
      this._setGlowState(this._torchCoreGlow, 0, 0, 1, 0);
      this._setGlowState(this._torchFlameGlow, 0, 0, 1, 0);
      this._setShaderSnapshot(lighting, {
        darknessAlpha,
        torchScreenPosition: {
          x: camera.width * 0.5,
          y: camera.height * 0.5,
        },
        torchRadiusPx: 0,
        torchGlowStrength: 0,
      });
      return;
    }

    const fire = this._getFireMotion(time, lighting);
    const radiusWorld = radiusTiles * this.scene.config.tileSize * fire.radiusScale;

    camera.matrix.transformPoint(player.x, player.y, this._screenPoint);
    const screenX = this._screenPoint.x - camera.scrollX * camera.zoomX + fire.screenOffsetX * camera.zoomX;
    const screenY = this._screenPoint.y - camera.scrollY * camera.zoomY + fire.screenOffsetY * camera.zoomY;

    this._eraser.setDisplaySize(radiusWorld * 2 * camera.zoomX, radiusWorld * 2 * camera.zoomY);
    darkness.erase(this._eraser, screenX, screenY);
    this._eraseCrystalLights(
      time,
      lighting,
      camera,
      darkness,
      this.playerController?.getPlayerTile?.(),
      radiusTiles
    );

    const glowX = player.x + this._currentFacingOffsetWorld + fire.worldOffsetX;
    const glowY = player.y + this.config.glowVerticalOffsetTiles * this.scene.config.tileSize + fire.worldOffsetY;
    const nightBoost = 1 + lighting.nightAmount * lighting.surfaceLightInfluence * 0.10;
    const caveBoost = 1 + lighting.undergroundDarknessInfluence * 0.06;
    const glowStrength = this._currentGlowStrength * nightBoost * caveBoost;

    this._setGlowState(
      this._torchHalo,
      glowX,
      glowY,
      radiusWorld * this.config.torchHaloDiameterScale * fire.haloScale,
      this.config.torchHaloGlowAlpha * glowStrength * fire.haloAlpha,
      fire.haloTint
    );
    this._setGlowState(
      this._torchCoreGlow,
      glowX + fire.worldOffsetX * 0.35,
      glowY + fire.worldOffsetY * 0.30,
      radiusWorld * this.config.torchCoreDiameterScale * fire.coreScale,
      this.config.torchCoreGlowAlpha * glowStrength * fire.coreAlpha,
      fire.coreTint
    );
    this._setGlowState(
      this._torchFlameGlow,
      glowX + fire.worldOffsetX * 0.8,
      glowY - this.scene.config.tileSize * 0.08 + fire.worldOffsetY,
      radiusWorld * this.config.torchFlameDiameterScale * fire.flameScale,
      this.config.torchFlameGlowAlpha * glowStrength * fire.flameAlpha,
      fire.flameTint
    );

    this._setShaderSnapshot(lighting, {
      darknessAlpha,
      torchScreenPosition: { x: screenX, y: screenY },
      torchRadiusPx: radiusWorld * (camera.zoomX || camera.zoom || 1),
      torchGlowStrength: glowStrength,
    });
  }

  _eraseCrystalLights(time, lighting, camera, darkness, playerTile = null, playerVisionRadiusTiles = 0) {
    const cfg = this.config.crystalLights;
    const worldModel = this.scene.worldModel;
    if (!cfg?.enabled || !this._crystalEraser || !worldModel?.getGlowCrystalZonesInRange) {
      return;
    }

    const tileSize = this.scene.config.tileSize;
    const zoomX = camera.zoomX || camera.zoom || 1;
    const zoomY = camera.zoomY || camera.zoom || 1;
    const worldView = camera.worldView || {
      x: camera.scrollX,
      y: camera.scrollY,
      width: camera.width / zoomX,
      height: camera.height / zoomY,
    };
    const paddingWorld = (cfg.cameraPaddingTiles || 0) * tileSize;
    const centerTile = {
      tx: Math.floor((worldView.x + worldView.width * 0.5) / tileSize),
      ty: Math.floor((worldView.y + worldView.height * 0.5) / tileSize),
    };
    const rangeTiles = Math.ceil(Math.max(worldView.width, worldView.height) * 0.5 / tileSize)
      + (cfg.cameraPaddingTiles || 0)
      + 8;

    const zones = worldModel.getGlowCrystalZonesInRange(centerTile, rangeTiles)
      .sort((a, b) => {
        const adx = a.cx - centerTile.tx;
        const ady = a.cy - centerTile.ty;
        const bdx = b.cx - centerTile.tx;
        const bdy = b.cy - centerTile.ty;
        return (adx * adx + ady * ady) - (bdx * bdx + bdy * bdy);
      });

    let sourcesDrawn = 0;
    const maxSources = cfg.maxSourcesPerFrame || 8;
    for (const zone of zones) {
      if (sourcesDrawn >= maxSources) break;

      const activeRatio = worldModel.getGlowCrystalActiveRatio?.(zone) ?? 1;
      if (activeRatio < (cfg.minActiveRatio || 0)) continue;

      if (playerTile && Number.isFinite(playerVisionRadiusTiles)) {
        const dx = zone.cx - playerTile.tx;
        const dy = zone.cy - playerTile.ty;
        const leashTiles = playerVisionRadiusTiles + (cfg.playerRevealLeashTiles || 0);
        if (Math.hypot(dx, dy) > leashTiles) continue;
      }

      const worldX = zone.cx * tileSize + tileSize * 0.5;
      const worldY = zone.cy * tileSize + tileSize * 0.5;
      const rawRadiusTiles = zone.lightRadiusTiles || Math.max(zone.rx || 1, zone.ry || 1) + 2.5;
      const radiusTiles = Math.min(rawRadiusTiles, cfg.maxRevealRadiusTiles || rawRadiusTiles);
      const radiusX = radiusTiles * tileSize;
      const radiusY = radiusX * (cfg.verticalScale || 1);

      if (worldX + radiusX + paddingWorld < worldView.x) continue;
      if (worldX - radiusX - paddingWorld > worldView.x + worldView.width) continue;
      if (worldY + radiusY + paddingWorld < worldView.y) continue;
      if (worldY - radiusY - paddingWorld > worldView.y + worldView.height) continue;

      const pulse = 1 + Math.sin(time * (cfg.flickerSpeed || 0.002) + (zone.phase || 0)) * (cfg.flickerAmount || 0);
      const zoneStrength = Phaser.Math.Clamp(zone.alpha || 0.6, 0.35, 0.85);
      const revealAlpha = clamp01(
        (cfg.revealAlpha + lighting.undergroundDarknessInfluence * cfg.undergroundRevealBoost)
        * activeRatio
        * zoneStrength
        * pulse
      );
      if (revealAlpha <= 0.01) continue;

      camera.matrix.transformPoint(worldX, worldY, this._crystalScreenPoint);
      const screenX = this._crystalScreenPoint.x - camera.scrollX * zoomX;
      const screenY = this._crystalScreenPoint.y - camera.scrollY * zoomY;

      this._crystalEraser
        .setDisplaySize(radiusX * 2 * zoomX, radiusY * 2 * zoomY)
        .setAlpha(revealAlpha);
      darkness.erase(this._crystalEraser, screenX, screenY);
      sourcesDrawn += 1;
    }
  }

  _computeDarknessAlpha(lighting) {
    const surfaceCfg = this.config.surfaceSunlight;
    const caveCfg = this.config.undergroundDarkness;
    const weather = lighting.weather;

    if (
      Number.isFinite(this.config.hardBlackDepthTiles)
      && lighting.depth >= this.config.hardBlackDepthTiles
      && lighting.undergroundDarknessInfluence > 0.98
    ) {
      return 1;
    }

    const surfaceDim = lighting.surfaceLightInfluence * (
      surfaceCfg.daylightDarknessAlpha
      + (1 - lighting.sunStrength) * 0.045
      + lighting.nightAmount * surfaceCfg.nightDarknessAlpha
      + weather.rainAmount * surfaceCfg.rainDarknessAlpha
      + weather.stormAmount * surfaceCfg.stormDarknessAlpha
    );

    const caveBase = Phaser.Math.Linear(
      caveCfg.entryDarknessAlpha,
      caveCfg.maxDarknessAlpha,
      lighting.depthRatio
    ) * lighting.undergroundDarknessInfluence;
    const torchDarknessMultiplier = Number(lighting.torchDarknessMultiplier) || 1;
    const caveWeather = weather.undergroundSignal * caveCfg.caveWeatherAlpha * lighting.undergroundDarknessInfluence;
    const caveWeatherBoost = caveWeather * torchDarknessMultiplier;
    const torchOffBoost = this._torchActive
      ? 0
      : caveCfg.torchOffDarknessBoost * lighting.undergroundDarknessInfluence * torchDarknessMultiplier;
    const scaledCaveBase = caveBase * torchDarknessMultiplier;
    const minimumCaveAlpha = caveCfg.minimumReadableAlpha * lighting.undergroundDarknessInfluence;

    const surfaceReveal = weather.lightningFlashAmount
      * lighting.surfaceLightInfluence
      * surfaceCfg.lightningRevealStrength;
    const caveReveal = lighting.stormCavePulse * caveCfg.lightningRevealStrength;

    return clamp01(Math.max(minimumCaveAlpha, surfaceDim + scaledCaveBase + caveWeatherBoost + torchOffBoost) - surfaceReveal - caveReveal);
  }

  _getFireMotion(time, lighting) {
    const cfg = this.config.torchFire;
    const t = time * this.config.torchFlickerSpeed;
    const windAmount = clamp01(Math.abs(lighting.weather.wind || 0) / 190) * lighting.surfaceLightInfluence;
    const stormAmount = lighting.weather.stormAmount * lighting.surfaceLightInfluence;
    const flickerBoost = 1
      + windAmount * cfg.windFlickerAmount
      + stormAmount * cfg.stormFlickerAmount
      + lighting.stormCavePulse * 0.25;

    const slow = Math.sin(t * 1.13 + 0.2);
    const lick = Math.sin(t * 2.91 + 1.4);
    const spark = Math.sin(t * 7.37 + 4.1);
    const sway = Math.sin(t * 0.67 + 2.7);
    const fireNoise = Phaser.Math.Clamp((slow * 0.50 + lick * 0.34 + spark * 0.16), -1, 1);
    const heat = clamp01(0.58 + fireNoise * 0.08 + this._currentGlowStrength * 0.10);
    const tileSize = this.scene.config.tileSize;
    const worldOffsetX = sway * cfg.positionFlutterTiles * tileSize * flickerBoost;
    const worldOffsetY = -Math.abs(lick) * cfg.verticalFlutterTiles * tileSize * flickerBoost;
    const haloTint = this._lerpColor(cfg.heatColorLow, cfg.heatColorHigh, heat * 0.72);
    const coreTint = this._lerpColor(this.config.torchCoreColor, 0xffffff, heat * 0.22);
    const flameTint = this._lerpColor(cfg.coolSmokeColor, this.config.torchFlameColor, heat);

    return {
      radiusScale: 1 + fireNoise * cfg.radiusFlickerAmount * flickerBoost,
      haloScale: 1 + slow * 0.014,
      coreScale: 1 + lick * 0.022,
      flameScale: 1 + spark * 0.034,
      haloAlpha: 1 + fireNoise * cfg.haloFlickerAmount * flickerBoost,
      coreAlpha: 1 + lick * cfg.coreFlickerAmount * flickerBoost,
      flameAlpha: 1 + spark * cfg.flameFlickerAmount * flickerBoost,
      worldOffsetX,
      worldOffsetY,
      screenOffsetX: worldOffsetX,
      screenOffsetY: worldOffsetY,
      haloTint,
      coreTint,
      flameTint,
    };
  }

  _setGlowState(image, x, y, diameter, alpha, tint = null) {
    image
      .setPosition(x, y)
      .setDisplaySize(diameter, diameter)
      .setAlpha(Phaser.Math.Clamp(alpha, 0, 1));
    if (tint !== null) image.setTint(tint);
  }

  _createGlowImage(tint) {
    return this.scene.add.image(0, 0, this.config.warmGlowTextureKey)
      .setOrigin(0.5)
      .setTint(tint)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.config.torchGlowRenderDepth);
  }

  _createDarknessTexture() {
    const camera = this.scene.cameras.main;
    // Clamp to safe limits to avoid "Framebuffer Unsupported"
    // on GPUs/drivers that can't handle large render textures.
    const maxSize = 2048;
    const w = Math.min(Math.max(1, Math.ceil(camera.width)), maxSize);
    const h = Math.min(Math.max(1, Math.ceil(camera.height)), maxSize);
    try {
      this._darknessTexture = this.scene.add.renderTexture(0, 0, w, h)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(this.config.darknessRenderDepth)
        .setAlpha(1)
        .setDisplaySize(camera.width, camera.height);
    } catch (error) {
      console.warn("[LightSystem] Darkness render texture unavailable; disabling dynamic darkness.", error);
      this._darknessTexture = null;
    }
  }

  _ensureGeneratedTextures() {
    this._ensureFireMaskTexture(this.config.visibilityMaskTextureKey);
    this._ensureRadialTexture(this.config.warmGlowTextureKey, this.config.glowGradientStops);
  }

  _ensureFireMaskTexture(key) {
    if (this.scene.textures.exists(key)) return;

    const size = this.config.gradientTextureSize;
    const radius = size / 2;
    const texture = this.scene.textures.createCanvas(key, size, size);
    const context = texture.getContext();
    const image = context.createImageData(size, size);
    const data = image.data;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = (x - radius) / (radius * 0.94);
        const ny = (y - radius) / (radius * 1.06);
        const angle = Math.atan2(ny, nx);
        const lift = Math.max(0, -ny) * 0.13;
        const wobble = Math.sin(angle * 3.0 + 0.4) * 0.050
          + Math.sin(angle * 5.0 - 1.2) * 0.034
          + Math.sin(angle * 9.0 + 2.1) * 0.018;
        const distance = Math.sqrt(nx * nx + ny * ny) / Math.max(0.72, 1 + wobble + lift);
        let alpha = 0;

        if (distance < 0.38) {
          alpha = 1;
        } else if (distance < 0.68) {
          alpha = 1 - smoothstep((distance - 0.38) / 0.30) * 0.22;
        } else if (distance < 0.98) {
          alpha = 0.78 * (1 - smoothstep((distance - 0.68) / 0.30));
        }

        const index = (y * size + x) * 4;
        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = Math.round(alpha * 255);
      }
    }

    context.clearRect(0, 0, size, size);
    context.putImageData(image, 0, 0);
    texture.refresh();
  }

  _ensureRadialTexture(key, stops) {
    if (this.scene.textures.exists(key)) return;
    const size = this.config.gradientTextureSize;
    const radius = size / 2;
    const texture = this.scene.textures.createCanvas(key, size, size);
    const context = texture.getContext();
    const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
    stops.forEach(([position, alpha]) => {
      gradient.addColorStop(position, `rgba(255,255,255,${alpha})`);
    });
    context.clearRect(0, 0, size, size);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    texture.refresh();
  }

  _createDefaultShaderSnapshot() {
    const cam = this.scene.cameras?.main;
    return {
      state: "surfaceSunlight",
      depth: 0,
      depthRatio: 0,
      darknessAlpha: 0,
      torchActive: this._torchActive,
      torchScreenPosition: {
        x: (cam?.width || this.scene.config?.viewportWidth || 1280) * 0.5,
        y: (cam?.height || this.scene.config?.viewportHeight || 720) * 0.5,
      },
      torchRadiusPx: 0,
      torchGlowStrength: 0,
      surfaceLightInfluence: 1,
      undergroundDarknessInfluence: 0,
      nightAmount: 0,
      sunStrength: 1,
      stormCavePulse: 0,
    };
  }

  _setShaderSnapshot(lighting, values = {}) {
    this._shaderSnapshot = {
      state: lighting.state,
      depth: lighting.depth,
      depthRatio: lighting.depthRatio,
      darknessAlpha: values.darknessAlpha ?? 0,
      torchActive: this._torchActive,
      torchScreenPosition: values.torchScreenPosition ?? this._shaderSnapshot.torchScreenPosition,
      torchRadiusPx: values.torchRadiusPx ?? 0,
      torchGlowStrength: values.torchGlowStrength ?? 0,
      surfaceLightInfluence: lighting.surfaceLightInfluence,
      undergroundDarknessInfluence: lighting.undergroundDarknessInfluence,
      nightAmount: lighting.nightAmount,
      sunStrength: lighting.sunStrength,
      stormCavePulse: lighting.stormCavePulse,
    };
  }

  _lerpColor(a, b, t) {
    const amount = clamp01(t);
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    const rr = Math.round(ar + (br - ar) * amount);
    const rg = Math.round(ag + (bg - ag) * amount);
    const rb = Math.round(ab + (bb - ab) * amount);
    return (rr << 16) | (rg << 8) | rb;
  }

  _getUpgradeEffects() {
    const effects = this.scene?.upgradeSystem?.getUpgradeEffects?.();
    return effects && typeof effects === "object" ? effects : {};
  }

  _getTorchBonusRadius() {
    const effects = this._getUpgradeEffects();
    return Number.isFinite(effects.torchBonusRadius) ? Math.max(0, effects.torchBonusRadius) : 0;
  }

  _getTorchDrainPerSecond(depth = 0) {
    const cfg = this.config;
    const base = cfg.torchDrainGpPerSecond;
    const effects = this._getUpgradeEffects();
    const reduction = Math.max(0, effects.torchDrainReduction || 0);

    const start = Number.isFinite(cfg.torchDrainDepthStartTiles)
      ? Math.max(0, cfg.torchDrainDepthStartTiles)
      : Number.POSITIVE_INFINITY;
    const rampEnd = Number.isFinite(cfg.torchDrainDepthRampEndTiles)
      ? Math.max(start, cfg.torchDrainDepthRampEndTiles)
      : start;
    const startMultiplier = Number.isFinite(cfg.torchDrainDepthStartMultiplier)
      ? Math.max(1, cfg.torchDrainDepthStartMultiplier)
      : 1;
    const maxMultiplier = Number.isFinite(cfg.torchDrainDepthMaxMultiplier)
      ? Math.max(startMultiplier, cfg.torchDrainDepthMaxMultiplier)
      : startMultiplier;

    if (depth < start || !Number.isFinite(start)) {
      return Math.max(0.1, base - reduction);
    }

    if (rampEnd <= start) {
      return Math.max(0.1, base * maxMultiplier - reduction);
    }

    const scale = clamp01((depth - start) / (rampEnd - start));
    return Math.max(0.1, base * Phaser.Math.Linear(startMultiplier, maxMultiplier, scale) - reduction);
  }

  _getTorchDarknessMultiplier(depth = 0) {
    const cfg = this.config;
    const start = Number.isFinite(cfg.torchDarknessDepthStartTiles)
      ? Math.max(0, cfg.torchDarknessDepthStartTiles)
      : Number.POSITIVE_INFINITY;

    if (depth < start || !Number.isFinite(start)) {
      return 1;
    }

    const rampEnd = Number.isFinite(cfg.torchDarknessDepthRampEndTiles)
      ? Math.max(start, cfg.torchDarknessDepthRampEndTiles)
      : start;
    if (rampEnd <= start) {
      return Math.max(1, cfg.torchDarknessDepthMaxMultiplier || 1);
    }

    return Math.max(1, Phaser.Math.Linear(1, cfg.torchDarknessDepthMaxMultiplier || 1, clamp01((depth - start) / (rampEnd - start))));
  }
}
