import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { resolveOldSchoolLampLightReviewEnabled } from
  "../../values/oldSchoolLampLightConfig.js";
import { FireLightSystem } from "./FireLightSystem.js?rev=20260815-shallow-material-v1";
import { OldSchoolLampLightSystem } from "./OldSchoolLampLightSystem.js";
import { resolveFireLightAnchor } from "./resolveFireLightAnchor.js";
import { SkyBeaconPulseRenderer } from "./SkyBeaconPulseRenderer.js";
import { SkySteadyLightRenderer } from "./SkySteadyLightRenderer.js";
import {
  resolvePlayerLightAnchor,
  resolvePlayerLightEnvironment,
  resolvePlayerLightProfile,
} from "./playerLightProfile.js";
import { resolveLightCoordinateSpaces } from "./lightCoordinateSpace.js";

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const smootherstep = (value) => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const hashTileCycle = (tx, ty, cycle) => {
  let hash = Math.imul((tx | 0) + 1, 0x9e3779b1);
  hash ^= Math.imul((ty | 0) + 1, 0x85ebca77);
  hash ^= Math.imul((cycle | 0) + 1, 0xc2b2ae3d);
  hash = Math.imul(hash ^ (hash >>> 16), 0x27d4eb2d);
  return ((hash ^ (hash >>> 15)) >>> 0) / 0x100000000;
};
const SKY_LIGHT_TILE_TYPES = Object.freeze(new Set([TILE_TYPES.SKY_TILE]));

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
    this._playerLightProfileId = resolvePlayerLightProfile(config);
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
    this._darknessRenderActive = false;
    this._darknessRenderAlpha = null;
    this._darknessHasSolidFill = false;
    this._caveInteriorDarknessBoost = 0;
    this._activeCaveArchetypeId = null;
    this._preparedFrame = null;
    this._randomEventPresentation = null;

    this._ensureGeneratedTextures();
    this._eraser = scene.make.image({ key: config.visibilityMaskTextureKey, add: false })
      .setOrigin(0.5);
    this._crystalEraser = scene.make.image({ key: config.visibilityMaskTextureKey, add: false })
      .setOrigin(0.5);
    this._skyBeaconPulseRenderer = new SkyBeaconPulseRenderer(
      scene,
      config.skyTileLights?.beaconPulse?.visuals
    );
    this._skySteadyLightRenderer = new SkySteadyLightRenderer(
      scene,
      config.skyTileLights?.steadyAura
    );
    this._fireLightSystem = resolveOldSchoolLampLightReviewEnabled()
      ? new OldSchoolLampLightSystem(scene)
      : new FireLightSystem(scene);

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
    if (!this.prepareFrame(time, delta, depth, gameplayActive)) return;
    this.renderPreparedFrame(time);
  }

  prepareFrame(time, delta, depth, gameplayActive) {
    if (!this._darknessTexture?.active) return false;

    const deltaMs = Math.max(0, Number.isFinite(delta) ? delta : 0);
    const dt = deltaMs / 1000;
    const activeDepth = Number.isFinite(depth) ? depth : this._latestDepth;
    this._latestDepth = activeDepth;
    const torchDrainRate = this._getTorchDrainPerSecond(activeDepth);
    const lighting = this._resolveLightingState(activeDepth);

    if (gameplayActive && this._torchActive) {
      const requested = torchDrainRate * dt;
      this._drainTorchGemPower(requested);
    }

    // Auto-recover torch if it was drained by GP depletion (not manually toggled).
    if (
      gameplayActive
      && !this._torchActive
      && !this._manualTorchOff
      && this._hasTorchFuel()
    ) {
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
    this._updateCaveInteriorDarkness(dt);

    const facingSign = this.playerController?.isFacingRight?.() === false ? -1 : 1;
    const facingInfluence = this._playerLightProfileId === "legacy"
      ? 1
      : this.config.playerLightV2.anchor.facingInfluenceRatio;
    const targetFacingOffset = facingSign
      * this.config.facingOffsetTiles
      * this.scene.config.tileSize
      * facingInfluence;
    this._currentFacingOffsetWorld = Phaser.Math.Linear(
      this._currentFacingOffsetWorld,
      targetFacingOffset,
      response
    );

    this._preparedFrame = {
      time: Number.isFinite(time) ? time : 0,
      deltaMs,
      radiusTiles: this._currentRadiusTiles,
      lighting,
    };
    return true;
  }

  renderPreparedFrame(time = this._preparedFrame?.time) {
    const frame = this._preparedFrame;
    if (!frame || !this._darknessTexture?.active) return false;
    this._redraw(
      Number.isFinite(time) ? time : frame.time,
      frame.radiusTiles,
      frame.lighting,
      frame.deltaMs
    );
    return true;
  }

  resize() {
    this._darknessTexture?.destroy();
    this._createDarknessTexture();
    this._fireLightSystem?.resize();
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

  getFireLightSnapshot() {
    return this._fireLightSystem?.getSnapshot?.() || null;
  }

  getSunlightSnapshot(weatherSnapshot = null) {
    const camera = this.scene.cameras?.main;
    const width = camera?.width || this.scene.config?.viewportWidth || 1280;
    const height = camera?.height || this.scene.config?.viewportHeight || 720;
    const cycleSun = this.dayNightCycle?.getSunState?.(width, height)
      || this.dayNightCycle?.getSunlightSnapshot?.(width, height)
      || null;
    const sunAlpha = clamp01(cycleSun?.sunAlpha ?? cycleSun?.alpha ?? this.dayNightCycle?.getSunAlpha?.() ?? 1);
    const screenPosition = cycleSun?.sunScreenPosition
      || cycleSun?.screenPosition
      || this.dayNightCycle?.getSunScreenPosition?.(width, height)
      || { x: width * 0.5, y: height * 0.2 };
    const worldPosition = cycleSun?.worldPosition
      || this.dayNightCycle?.getSunWorldPosition?.()
      || null;
    const nightAmount = clamp01(cycleSun?.nightAmount ?? this.dayNightCycle?.getNightAmount?.() ?? 0);
    const horizonT = clamp01(1 - screenPosition.y / Math.max(1, height * 0.72));
    const baseStrength = clamp01(sunAlpha * (0.65 + horizonT * 0.35));
    const weather = weatherSnapshot
      || this.weatherSystem?.getLightingSnapshot?.()
      || this._getFallbackWeatherSnapshot();
    const sunTransmittance = clamp01(weather.sunTransmittance ?? 1);
    const exposure = clamp01(weather.sunExposure ?? weather.exposure ?? 1);

    return {
      strength: clamp01(baseStrength * sunTransmittance * exposure),
      baseStrength,
      sunAlpha,
      worldPosition: worldPosition
        ? { x: worldPosition.x, y: worldPosition.y }
        : null,
      screenPosition: { x: screenPosition.x, y: screenPosition.y },
      nightAmount,
      cloudCoverAmount: clamp01(weather.cloudCoverAmount ?? 0),
      sunTransmittance,
      fogAmount: clamp01(weather.fogAmount ?? 0),
      tint: Number.isFinite(weather.sunTint)
        ? weather.sunTint
        : Number.isFinite(weather.tint) ? weather.tint : 0xffffff,
      exposure,
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

  forceTorchOff(options = {}) {
    if (options.manual === true) this._manualTorchOff = true;
    if (!this._torchActive) {
      this.scene.hudSystem?.setTorchState(false, this._currentTorchDrainGpPerSecond);
      return;
    }
    this._torchActive = false;
    this.scene.hudSystem?.setTorchState(false, this._currentTorchDrainGpPerSecond);
  }

  _hasTorchFuel() {
    if (this.playerController?.hasSpendableGemPower) {
      return this.playerController.hasSpendableGemPower({ source: "torch" });
    }
    return this.playerController?.hasGemPower?.() === true;
  }

  _drainTorchGemPower(requested) {
    const consumed = this.playerController?.consumeGemPower?.(
      requested,
      { source: "torch" },
    ) ?? 0;
    if (consumed + Number.EPSILON < requested) {
      this.forceTorchOff({
        manual: this.playerController?.hasGemPower?.() === true,
      });
    }
    return consumed;
  }

  setRandomEventPresentation(profile = null) {
    if (!profile) {
      this._randomEventPresentation = null;
      return;
    }
    const ambientVisibilityScale = Number(profile.ambientVisibilityScale);
    this._randomEventPresentation = {
      ambientVisibilityScale: Number.isFinite(ambientVisibilityScale)
        ? Math.max(0.05, Math.min(1, ambientVisibilityScale)) : 1,
    };
  }

  destroy() {
    this._torchKey?.off("down", this._torchKeyHandler);
    this._darknessTexture?.destroy();
    this._torchHalo?.destroy();
    this._torchCoreGlow?.destroy();
    this._torchFlameGlow?.destroy();
    this._eraser?.destroy();
    this._crystalEraser?.destroy();
    this._skyBeaconPulseRenderer?.destroy();
    this._skySteadyLightRenderer?.destroy();
    this._fireLightSystem?.destroy();
    this._darknessTexture = null;
    this._darknessRenderActive = false;
    this._darknessRenderAlpha = null;
    this._darknessHasSolidFill = false;
    this._caveInteriorDarknessBoost = 0;
    this._activeCaveArchetypeId = null;
    this._preparedFrame = null;
    this._randomEventPresentation = null;
    this._torchHalo = null;
    this._torchCoreGlow = null;
    this._torchFlameGlow = null;
    this._eraser = null;
    this._crystalEraser = null;
    this._skyBeaconPulseRenderer = null;
    this._skySteadyLightRenderer = null;
    this._fireLightSystem = null;
    this._torchKey = null;
    this._torchKeyHandler = null;
  }

  _toggleTorch() {
    if (this._torchActive) {
      this._torchActive = false;
      this._manualTorchOff = true;
      this.scene.hudSystem?.setTorchState(false, this._currentTorchDrainGpPerSecond);
      return;
    }
    if (!this._hasTorchFuel()) {
      return;
    }
    this._torchActive = true;
    this._manualTorchOff = false;
    this.scene.hudSystem?.setTorchState(true, this._getTorchDrainPerSecond(this._latestDepth));
  }

  _canUseTorchInput() {
    return this.scene.gameState === "playing"
      && !this.scene.shopOverlay?.isVisible
      && !this.scene._pillarViewActive
      && !this.scene.campfireSystem?.isSelecting?.();
  }

  _resolveLightingState(depth) {
    const weather = this.weatherSystem?.getLightingSnapshot?.() ?? this._getFallbackWeatherSnapshot();
    const sunlight = this.getSunlightSnapshot(weather);
    const surfaceLightInfluence = this._getSurfaceLightInfluence(depth);
    const undergroundDarknessInfluence = 1 - surfaceLightInfluence;
    const depthRatio = this._getDepthRatio(depth);
    const noTorchMinVisibilityRadius = this._getUpgradeEffects().noTorchMinVisibilityRadius || 0;
    const nightAmount = sunlight.nightAmount;
    const sunStrength = this._getSunStrength(sunlight);
    const stormCavePulse = weather.lightningFlashAmount
      * undergroundDarknessInfluence
      * (0.35 + weather.stormAmount * 0.65);

    this._lightingState = surfaceLightInfluence > 0.82
      ? "surfaceSunlight"
      : surfaceLightInfluence > 0.02
      ? "transition"
      : "undergroundDarkness";

    const lighting = {
      state: this._lightingState,
      depth,
      torchBonusRadius: this._getTorchBonusRadius(),
      noTorchMinVisibilityRadius: this._torchActive ? 0 : Math.max(0, Number(noTorchMinVisibilityRadius) || 0),
      torchDarknessMultiplier: this._getTorchDarknessMultiplier(depth),
      torchDrainPerSecond: this._getTorchDrainPerSecond(depth),
      depthRatio,
      nightAmount,
      sunStrength,
      surfaceLightInfluence,
      undergroundDarknessInfluence,
      stormCavePulse,
      weather,
      sunlight,
    };
    lighting.playerLight = resolvePlayerLightEnvironment(
      lighting,
      this.config.playerLightV2,
      this._playerLightProfileId
    );
    return lighting;
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
      cloudCoverAmount: 0,
      sunTransmittance: 1,
      fogAmount: 0,
      sunTint: 0xffffff,
      sunExposure: 1,
      tint: 0xffffff,
      exposure: 1,
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

  _getSunStrength(sunlightSnapshot = null) {
    return clamp01((sunlightSnapshot || this.getSunlightSnapshot()).strength);
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
    const ambientScale = this._randomEventPresentation?.ambientVisibilityScale ?? 1;
    const presentedBaseRadius = Math.max(
      0.05,
      baseRadius * ambientScale,
    );
    const torchBonus = this._torchActive
      ? this.config.torchBonusRadiusTiles + Number(lighting.torchBonusRadius || 0)
      : 0;
    const surface = lighting.surfaceLightInfluence;
    const underground = lighting.undergroundDarknessInfluence;
    const weather = lighting.weather;
    const noTorchMinVisibilityBonus = this._torchActive
      ? 0
      : Math.max(0, Number(lighting.noTorchMinVisibilityRadius || 0));
    const minRadius = Number.isFinite(this.config.minVisibilityRadiusTiles)
      ? this.config.minVisibilityRadiusTiles
      : 0.5;

    const nightMultiplier = 1 - lighting.nightAmount * this.config.nightVisibilityPenalty * surface;
    const stormMultiplier = 1 - weather.stormAmount * this.config.stormVisibilityPenalty * surface;
    const caveWeatherMultiplier = 1 - weather.undergroundSignal * underground * 0.06;

    return Math.max(minRadius + noTorchMinVisibilityBonus, (presentedBaseRadius + torchBonus) * nightMultiplier * stormMultiplier * caveWeatherMultiplier);
  }

  _computeTargetGlow(lighting) {
    if (!this._torchActive) return 0;
    if (this._playerLightProfileId !== "legacy") {
      return clamp01(lighting.playerLight?.intensity);
    }

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

  _redraw(time, radiusTiles, lighting, deltaMs = 0) {
    const darkness = this._darknessTexture;
    const camera = this.scene.cameras.main;
    const player = this.scene.player;
    const playerTile = this.playerController?.getPlayerTile?.() || null;
    this._skyBeaconPulseRenderer?.beginFrame();
    this._skySteadyLightRenderer?.beginFrame();

    const darknessAlpha = this._computeDarknessAlpha(lighting);
    const inactiveThreshold = Math.max(
      0,
      Number(this.config.renderOptimization?.inactiveDarknessAlphaThreshold) || 0
    );
    const darknessActive = darknessAlpha > inactiveThreshold;
    if (this._darknessRenderActive !== darknessActive) {
      darkness.setVisible(darknessActive);
      this._darknessRenderActive = darknessActive;
    }

    const renderAlpha = darknessActive ? darknessAlpha : 0;
    if (this._darknessRenderAlpha !== renderAlpha) {
      darkness.setAlpha(renderAlpha);
      this._darknessRenderAlpha = renderAlpha;
    }

    if (darknessActive && (player || !this._darknessHasSolidFill)) {
      darkness.clear();
      darkness.fill(this.config.darknessColor, 1);
      this._darknessHasSolidFill = true;
    }

    if (!player) {
      this._setGlowState(this._torchHalo, 0, 0, 1, 0);
      this._setGlowState(this._torchCoreGlow, 0, 0, 1, 0);
      this._setGlowState(this._torchFlameGlow, 0, 0, 1, 0);
      this._fireLightSystem?.hideWorldPresentation({
        deltaMs,
        lighting,
      });
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

    const playerLight = lighting.playerLight || resolvePlayerLightEnvironment(
      lighting,
      this.config.playerLightV2,
      this._playerLightProfileId
    );
    const anchor = resolvePlayerLightAnchor(
      player,
      this.playerController,
      this.config.playerLightV2,
      this.scene.config.tileSize,
      this._playerLightProfileId,
      this.scene.playerAssetProfile
    );
    const fire = this._getFireMotion(time, lighting, playerLight);
    const radiusWorld = radiusTiles
      * this.scene.config.tileSize
      * fire.radiusScale
      * playerLight.radiusScale;

    const lightPoint = resolveLightCoordinateSpaces(
      camera,
      anchor.x + fire.worldOffsetX,
      anchor.y + fire.worldOffsetY,
      this._screenPoint
    );
    const screenX = lightPoint.x;
    const screenY = lightPoint.y;

    if (darknessActive) {
      this._eraser.setDisplaySize(
        radiusWorld * 2,
        radiusWorld * 2 * playerLight.verticalScale
      );
      darkness.erase(this._eraser, lightPoint.textureX, lightPoint.textureY);
      this._darknessHasSolidFill = false;
      this._eraseCrystalLights(
        time,
        lighting,
        camera,
        darkness,
        playerTile,
        radiusTiles
      );
      this._eraseCaveLights(
        time,
        lighting,
        camera,
        darkness,
        playerTile,
        radiusTiles
      );
      this._eraseSkyTileLights(
        time,
        lighting,
        camera,
        darkness,
        playerTile,
        radiusTiles
      );
    }

    const glowX = anchor.x + this._currentFacingOffsetWorld + fire.worldOffsetX;
    const glowY = anchor.y + (
      this._playerLightProfileId === "legacy"
        ? this.config.glowVerticalOffsetTiles * this.scene.config.tileSize
        : 0
    ) + fire.worldOffsetY;
    const nightBoost = this._playerLightProfileId === "legacy"
      ? 1 + lighting.nightAmount * lighting.surfaceLightInfluence * 0.10
      : 1;
    const caveBoost = this._playerLightProfileId === "legacy"
      ? 1 + lighting.undergroundDarknessInfluence * 0.06
      : 1;
    const glowStrength = this._currentGlowStrength * nightBoost * caveBoost;
    let authoredFireOwnsPresentation = false;
    if (this._fireLightSystem) {
      const fireSource = resolveFireLightAnchor({
        player,
        playerController: this.playerController,
        playerAssetProfile: this.scene.playerAssetProfile,
        tileSize: this.scene.config.tileSize,
        config: this._fireLightSystem.config,
      });
      const maximumFuel = Math.max(
        0,
        Number(this.playerController?.getGemPowerMax?.()) || 0
      );
      const currentFuel = Math.max(
        0,
        Number(this.playerController?.getGemPowerExact?.()) || 0
      );
      const fuelRatio = maximumFuel > 0
        ? clamp01(currentFuel / maximumFuel)
        : this._torchActive ? 1 : 0;
      this._fireLightSystem.renderFrame({
        time,
        deltaMs,
        torchActive: this._torchActive,
        source: fireSource,
        tileSize: this.scene.config.tileSize,
        radiusWorld,
        glowStrength,
        fuelRatio,
        lighting,
        worldModel: this.scene.worldModel,
      });
      authoredFireOwnsPresentation = this._fireLightSystem
        .ownsTorchPresentation();
    }

    const proceduralFireGlow = this._fireLightSystem
      ?.usesProceduralWorldGlow?.() === true;
    const proceduralGlowStrength = glowStrength * (
      this._fireLightSystem?.getProceduralWorldGlowScale?.() ?? 1
    );
    if (authoredFireOwnsPresentation && !proceduralFireGlow) {
      this._setGlowState(this._torchHalo, 0, 0, 1, 0);
      this._setGlowState(this._torchCoreGlow, 0, 0, 1, 0);
      this._setGlowState(this._torchFlameGlow, 0, 0, 1, 0);
    } else if (this._playerLightProfileId === "legacy") {
      this._drawLegacyPlayerGlow(
        glowX, glowY, radiusWorld, proceduralGlowStrength, fire
      );
    } else {
      this._drawV2PlayerGlow(
        glowX,
        glowY,
        radiusWorld,
        proceduralGlowStrength,
        fire,
        playerLight
      );
    }

    this._setShaderSnapshot(lighting, {
      darknessAlpha,
      torchScreenPosition: { x: screenX, y: screenY },
      torchRadiusPx: radiusWorld * (camera.zoomX || camera.zoom || 1),
      torchGlowStrength: glowStrength,
      torchAnchorSource: anchor.source,
    });
  }

  _drawLegacyPlayerGlow(glowX, glowY, radiusWorld, glowStrength, fire) {
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
  }

  _drawV2PlayerGlow(
    glowX,
    glowY,
    radiusWorld,
    glowStrength,
    fire,
    playerLight
  ) {
    const glow = this.config.playerLightV2.glow;
    const coolMix = playerLight.coolEdge * glow.coolEdgeTintInfluence;
    const haloTint = this._lerpColor(fire.haloTint, glow.coolEdgeColor, coolMix);
    const coreTint = this._lerpColor(
      glow.neutralCoreColor,
      fire.coreTint,
      playerLight.warmth
    );
    const innerTint = this._lerpColor(
      glow.neutralCoreColor,
      this.config.torchCoreColor,
      playerLight.warmth
    );
    const haloDiameter = radiusWorld * glow.haloDiameterScale * fire.haloScale;
    const coreDiameter = radiusWorld * glow.coreDiameterScale * fire.coreScale;
    const innerDiameter = radiusWorld * glow.innerDiameterScale * fire.flameScale;

    this._setGlowState(
      this._torchHalo,
      glowX,
      glowY,
      haloDiameter,
      glow.haloAlpha * glowStrength * fire.haloAlpha,
      haloTint,
      haloDiameter * glow.haloVerticalScale
    );
    this._setGlowState(
      this._torchCoreGlow,
      glowX + fire.worldOffsetX * 0.24,
      glowY + fire.worldOffsetY * 0.18,
      coreDiameter,
      glow.coreAlpha * glowStrength * fire.coreAlpha,
      coreTint,
      coreDiameter * glow.coreVerticalScale
    );
    this._setGlowState(
      this._torchFlameGlow,
      glowX,
      glowY,
      innerDiameter,
      glow.innerAlpha * glowStrength * fire.flameAlpha,
      innerTint,
      innerDiameter * glow.innerVerticalScale
    );
  }

  _eraseCrystalLights(
    time,
    lighting,
    camera,
    darkness,
    playerTile = null,
    playerVisionRadiusTiles = 0
  ) {
    this._eraseZoneLights(
      time,
      lighting,
      camera,
      darkness,
      playerTile,
      playerVisionRadiusTiles,
      {
        config: this.config.crystalLights,
        getZones: (worldModel, center, range) => (
          worldModel.getGlowCrystalZonesInRange?.(center, range) || []
        ),
        getActiveRatio: (worldModel, zone) => (
          worldModel.getGlowCrystalActiveRatio?.(zone) ?? 1
        ),
      }
    );
  }

  _eraseZoneLights(
    time,
    lighting,
    camera,
    darkness,
    playerTile = null,
    playerVisionRadiusTiles = 0,
    options = null
  ) {
    const cfg = options?.config;
    const worldModel = this.scene.worldModel;
    const getZones = options?.getZones;
    if (!cfg?.enabled || !this._crystalEraser || !worldModel || !getZones) {
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

    const zones = (getZones(worldModel, centerTile, rangeTiles) || [])
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

      const activeRatio = options?.getActiveRatio?.(worldModel, zone) ?? 1;
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

      const lightPoint = resolveLightCoordinateSpaces(
        camera,
        worldX,
        worldY,
        this._crystalScreenPoint
      );

      this._crystalEraser
        .setDisplaySize(radiusX * 2, radiusY * 2)
        .setAlpha(revealAlpha);
      darkness.erase(
        this._crystalEraser,
        lightPoint.textureX,
        lightPoint.textureY
      );
      sourcesDrawn += 1;
    }
  }

  _eraseCaveLights(
    time,
    lighting,
    camera,
    darkness,
    playerTile = null,
    playerVisionRadiusTiles = 0
  ) {
    this._eraseZoneLights(
      time,
      lighting,
      camera,
      darkness,
      playerTile,
      playerVisionRadiusTiles,
      {
        config: this.config.caveLights,
        getZones: (worldModel, center, range) => (
          worldModel.getCaveLightZonesInRange?.(center, range) || []
        ),
        getActiveRatio: (worldModel, zone) => this._resolveCaveLightRatio(time, zone),
      }
    );
  }

  _resolveCaveLightRatio(time, zone) {
    const config = this.config.caveLights;
    if (zone.isHazardLight) {
      const hazard = config.hazardLight;
      if (zone.static) return hazard.staticRatio;
      const period = Math.max(1, zone.periodMs || 1);
      const cycle = ((time + (zone.phaseMs || 0)) % period + period) % period;
      if (cycle < (zone.activeMs || 0)) return hazard.activeRatio;
      if (cycle >= period - (zone.telegraphMs || 0)) return hazard.telegraphRatio;
      return hazard.idleRatio;
    }
    const profile = config.archetypeProfiles?.[zone.archetypeId]
      || config.defaultProfile;
    const wave = (Math.sin(
      time * profile.pulseRadiansPerMs
      + (zone.phase || 0)
    ) + 1) * 0.5;
    const shaped = Math.pow(wave, profile.pulsePower);
    const caveRatio = Phaser.Math.Linear(
      profile.minimumRatio,
      profile.maximumRatio,
      shaped
    );
    return caveRatio * (1 - (profile.darknessBoost || 0));
  }

  _updateCaveInteriorDarkness(dt) {
    const config = this.config.caveLights;
    const playerTile = this.playerController?.getPlayerTile?.();
    const cave = this.scene.worldModel?.getCaveZoneAtTile?.(playerTile);
    const profile = cave
      ? config.archetypeProfiles?.[cave.archetypeId] || config.defaultProfile
      : null;
    const target = profile?.darknessBoost || 0;
    const response = 1 - Math.exp(
      -config.interiorTransitionResponsePerSecond * Math.max(0, dt)
    );
    this._caveInteriorDarknessBoost = Phaser.Math.Linear(
      this._caveInteriorDarknessBoost,
      target,
      response
    );
    this._activeCaveArchetypeId = cave?.archetypeId || null;
  }

  _eraseSkyTileLights(time, lighting, camera, darkness, playerTile = null, playerVisionRadiusTiles = 0) {
    this._eraseTileTypeLightSources({
      time,
      lighting,
      camera,
      darkness,
      playerTile,
      playerVisionRadiusTiles,
      cfg: this.config.skyTileLights,
      tileTypes: SKY_LIGHT_TILE_TYPES,
    });
  }

  _resolveTileBeaconPulse(time, tx, ty, pulseCfg) {
    if (!pulseCfg?.enabled || !Number.isFinite(time)) return null;

    const durationMs = Math.max(1, pulseCfg.durationMs || 1);
    const edgePaddingMs = Math.max(0, pulseCfg.edgePaddingMs || 0);
    const windowMs = Math.max(
      durationMs + edgePaddingMs * 2 + 1,
      pulseCfg.windowMs || durationMs + edgePaddingMs * 2 + 1
    );
    const elapsed = Math.max(0, time);
    const cycle = Math.floor(elapsed / windowMs);
    const activationChance = clamp01(pulseCfg.chancePerWindow ?? 1);
    if (hashTileCycle(tx, ty, cycle) >= activationChance) return null;

    const cycleStart = cycle * windowMs;
    const availableJitterMs = Math.max(0, windowMs - durationMs - edgePaddingMs * 2);
    const pulseStart = cycleStart
      + edgePaddingMs
      + hashTileCycle(ty, tx, cycle) * availableJitterMs;
    const progress = (elapsed - pulseStart) / durationMs;

    if (progress < 0 || progress >= 1) return null;

    const fadeInProgress = Math.max(
      0.01,
      Math.min(0.5, pulseCfg.fadeInProgress || 0.1)
    );
    const fadeIn = smootherstep(progress / fadeInProgress);
    const travelFadePower = Math.max(0.01, pulseCfg.travelFadePower || 1);
    const travelFade = Math.pow(1 - clamp01(progress), travelFadePower);
    const waveStrength = fadeIn * travelFade;

    if (waveStrength <= 0.001) return null;
    return {
      cycle,
      progress: clamp01(progress),
      waveStrength: clamp01(waveStrength),
    };
  }

  _drawSkyBeaconPulse(
    worldX,
    worldY,
    tileSize,
    verticalScale,
    pulseRadiusTiles,
    pulse,
    pulseCfg,
    source
  ) {
    if (!pulseCfg?.visuals?.enabled || !pulse || !source) return;

    this._skyBeaconPulseRenderer?.draw({
      worldX,
      worldY,
      tileSize,
      verticalScale,
      pulseRadiusTiles,
      pulse,
      rarity: this.scene.worldModel?.getSkyTileRarity?.(
        source.tx,
        source.ty
      ) || 0,
    });
  }

  _eraseTileTypeLightSources({
    time,
    lighting,
    camera,
    darkness,
    playerTile = null,
    playerVisionRadiusTiles = 0,
    cfg,
    tileTypes,
  }) {
    if (!cfg?.enabled || !this._crystalEraser || !this.scene.worldModel || !tileTypes || tileTypes.size === 0) {
      return;
    }

    const worldModel = this.scene.worldModel;
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

    const viewStartTileX = Math.floor((worldView.x - paddingWorld) / tileSize);
    const viewEndTileX = Math.floor((worldView.x + worldView.width + paddingWorld) / tileSize);
    const viewStartTileY = Math.floor((worldView.y - paddingWorld) / tileSize);
    const viewEndTileY = Math.floor((worldView.y + worldView.height + paddingWorld) / tileSize);
    const startTileX = Math.max(0, viewStartTileX);
    const endTileX = Math.min(worldModel.width - 1, viewEndTileX);
    const startTileY = Math.max(0, viewStartTileY);
    const endTileY = Math.min(worldModel.depth - 1, viewEndTileY);

    if (endTileX < startTileX || endTileY < startTileY) return;

    const sources = [];
    const revealLeash = cfg.persistThroughDarkness === true
      ? Number.POSITIVE_INFINITY
      : Number.isFinite(playerVisionRadiusTiles)
      ? playerVisionRadiusTiles + (cfg.playerRevealLeashTiles || 0)
      : Number.POSITIVE_INFINITY;

    for (let ty = startTileY; ty <= endTileY; ty += 1) {
      for (let tx = startTileX; tx <= endTileX; tx += 1) {
        const tileType = worldModel.getTileType(tx, ty);
        if (!tileTypes.has(tileType)) continue;

        if (playerTile && Number.isFinite(revealLeash)) {
          const dx = tx - playerTile.tx;
          const dy = ty - playerTile.ty;
          if (Math.hypot(dx, dy) > revealLeash) continue;
        }

        const distanceSq = playerTile
          ? (tx - playerTile.tx) * (tx - playerTile.tx) + (ty - playerTile.ty) * (ty - playerTile.ty)
          : 0;
        sources.push({ tx, ty, distanceSq });
      }
    }

    if (sources.length === 0) return;

    sources.sort((a, b) => a.distanceSq - b.distanceSq);
    const maxSources = Math.max(1, cfg.maxSourcesPerFrame || 20);

    const revealBase = cfg.revealAlpha || 0.1;
    const radiusTiles = cfg.radiusTiles || 1.15;
    const flickerSpeed = cfg.flickerSpeed || 0;
    const flickerAmount = cfg.flickerAmount || 0;
    const maxRadiusTiles = cfg.maxRadiusTiles || radiusTiles;
    const baseReveal = revealBase * (1 + lighting.undergroundDarknessInfluence * (cfg.undergroundRevealBoost || 0));
    const pulseCfg = cfg.beaconPulse;
    const maxConcurrentPulses = Math.max(
      0,
      Math.floor(pulseCfg?.maxConcurrentPulses ?? 1)
    );
    let pulseSourcesDrawn = 0;

    for (let i = 0; i < sources.length && i < maxSources; i += 1) {
      const source = sources[i];
      const phase = (source.tx + source.ty * 97) * 0.17;
      const flicker = 1 + Math.sin(time * flickerSpeed + phase) * flickerAmount;
      const revealAlpha = clamp01(baseReveal * flicker);
      if (revealAlpha <= 0.01) continue;

      const worldX = source.tx * tileSize + tileSize * 0.5;
      const worldY = source.ty * tileSize + tileSize * 0.5;
      const scaledRadiusTiles = Math.max(0.65, Math.min(maxRadiusTiles, radiusTiles + (flicker - 1) * 0.3));
      const verticalScale = Number.isFinite(cfg.verticalScale) ? cfg.verticalScale : 1;

      const lightPoint = resolveLightCoordinateSpaces(
        camera,
        worldX,
        worldY,
        this._crystalScreenPoint
      );
      this._crystalEraser
        .setDisplaySize(
          scaledRadiusTiles * tileSize * 2,
          scaledRadiusTiles * tileSize * 2 * verticalScale
        )
        .setAlpha(revealAlpha);
      darkness.erase(
        this._crystalEraser,
        lightPoint.textureX,
        lightPoint.textureY
      );
      if (cfg.steadyAura?.enabled) {
        this._skySteadyLightRenderer?.draw({
          worldX,
          worldY,
          tileSize,
          verticalScale,
          radiusTiles: scaledRadiusTiles,
          rarity: worldModel.getSkyTileRarity?.(source.tx, source.ty) ?? 0,
          identity: worldModel.getSkyTileIdentity?.(source.tx, source.ty) ?? 0,
          intensity: flicker,
          time,
          tx: source.tx,
          ty: source.ty,
        });
      }

      if (pulseSourcesDrawn >= maxConcurrentPulses) continue;
      const pulse = this._resolveTileBeaconPulse(time, source.tx, source.ty, pulseCfg);
      if (!pulse) continue;

      const fullRadiusProgress = Math.max(
        0.05,
        Math.min(1, pulseCfg.fullRadiusProgress || 0.55)
      );
      const radiusProgress = smootherstep(pulse.progress / fullRadiusProgress);
      const pulseRadiusTiles = scaledRadiusTiles
        + Math.max(0, pulseCfg.radiusBoostTiles || 0) * radiusProgress;
      const pulseAlpha = clamp01((pulseCfg.revealAlpha || 0) * pulse.waveStrength);
      if (pulseAlpha <= 0.01) continue;

      this._crystalEraser
        .setDisplaySize(
          pulseRadiusTiles * tileSize * 2,
          pulseRadiusTiles * tileSize * 2 * verticalScale
        )
        .setAlpha(pulseAlpha);
      darkness.erase(
        this._crystalEraser,
        lightPoint.textureX,
        lightPoint.textureY
      );
      this._drawSkyBeaconPulse(
        worldX,
        worldY,
        tileSize,
        verticalScale,
        pulseRadiusTiles,
        pulse,
        pulseCfg,
        source
      );
      pulseSourcesDrawn += 1;
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

    return clamp01(
      Math.max(
        minimumCaveAlpha,
        surfaceDim + scaledCaveBase + caveWeatherBoost + torchOffBoost
      )
      + this._caveInteriorDarknessBoost
      - surfaceReveal
      - caveReveal
    );
  }

  _getFireMotion(time, lighting, playerLight = null) {
    const cfg = this.config.torchFire;
    const t = time * this.config.torchFlickerSpeed;
    const windAmount = clamp01(Math.abs(lighting.weather.wind || 0) / 190) * lighting.surfaceLightInfluence;
    const stormAmount = lighting.weather.stormAmount * lighting.surfaceLightInfluence;
    const environmentFlicker = Number.isFinite(playerLight?.flickerScale)
      ? playerLight.flickerScale
      : 1;
    const flickerBoost = (
      1
      + windAmount * cfg.windFlickerAmount
      + stormAmount * cfg.stormFlickerAmount
      + lighting.stormCavePulse * 0.25
    ) * environmentFlicker;

    const slow = Math.sin(t * 1.13 + 0.2);
    const lick = Math.sin(t * 2.91 + 1.4);
    const spark = Math.sin(t * 7.37 + 4.1);
    const sway = Math.sin(t * 0.67 + 2.7);
    const fireNoise = Phaser.Math.Clamp((slow * 0.50 + lick * 0.34 + spark * 0.16), -1, 1);
    const heat = clamp01(0.58 + fireNoise * 0.08 + this._currentGlowStrength * 0.10);
    const tileSize = this.scene.config.tileSize;
    const positionFlutterScale = Number.isFinite(playerLight?.positionFlutterScale)
      ? Math.max(0, playerLight.positionFlutterScale)
      : 1;
    const worldOffsetX = sway
      * cfg.positionFlutterTiles
      * tileSize
      * flickerBoost
      * positionFlutterScale;
    const worldOffsetY = -Math.abs(lick)
      * cfg.verticalFlutterTiles
      * tileSize
      * flickerBoost
      * positionFlutterScale;
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

  _setGlowState(image, x, y, diameter, alpha, tint = null, height = diameter) {
    const clampedAlpha = Phaser.Math.Clamp(alpha, 0, 1);
    const visible = clampedAlpha > 0;
    if (image.visible !== visible) image.setVisible(visible);
    if (!visible) {
      if (image.alpha !== 0) image.setAlpha(0);
      return;
    }

    image
      .setPosition(x, y)
      .setDisplaySize(diameter, height)
      .setAlpha(clampedAlpha);
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
        .setVisible(false)
        .setDisplaySize(camera.width, camera.height);
      this._darknessRenderActive = false;
      this._darknessRenderAlpha = 1;
      this._darknessHasSolidFill = false;
    } catch (error) {
      console.warn("[LightSystem] Darkness render texture unavailable; disabling dynamic darkness.", error);
      this._darknessTexture = null;
      this._darknessRenderActive = false;
      this._darknessRenderAlpha = null;
      this._darknessHasSolidFill = false;
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
    const playerLight = resolvePlayerLightEnvironment(
      {
        surfaceLightInfluence: 1,
        undergroundDarknessInfluence: 0,
        nightAmount: 0,
        sunStrength: 1,
        weather: this._getFallbackWeatherSnapshot(),
      },
      this.config.playerLightV2,
      this._playerLightProfileId
    );
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
      fireLightV3Active: false,
      carriedLightPresentationId: null,
      fireLightProceduralMix: 1,
      playerLightProfileId: this._playerLightProfileId,
      torchAnchorSource: "unavailable",
      torchWarmth: playerLight.warmth,
      torchCoolEdge: playerLight.coolEdge,
      torchVerticalScale: playerLight.verticalScale,
      torchFlickerScale: playerLight.flickerScale,
      surfaceLightInfluence: 1,
      undergroundDarknessInfluence: 0,
      nightAmount: 0,
      sunStrength: 1,
      sunTint: 0xffffff,
      sunExposure: 1,
      cloudCoverAmount: 0,
      fogAmount: 0,
      stormCavePulse: 0,
    };
  }

  _setShaderSnapshot(lighting, values = {}) {
    const playerLight = lighting.playerLight || resolvePlayerLightEnvironment(
      lighting,
      this.config.playerLightV2,
      this._playerLightProfileId
    );
    this._shaderSnapshot = {
      state: lighting.state,
      depth: lighting.depth,
      depthRatio: lighting.depthRatio,
      darknessAlpha: values.darknessAlpha ?? 0,
      torchActive: this._torchActive,
      torchScreenPosition: values.torchScreenPosition ?? this._shaderSnapshot.torchScreenPosition,
      torchRadiusPx: values.torchRadiusPx ?? 0,
      torchGlowStrength: values.torchGlowStrength ?? 0,
      fireLightV3Active: this._fireLightSystem?.ownsTorchPresentation?.() === true,
      carriedLightPresentationId: this._fireLightSystem?.getSnapshot?.()?.id || null,
      fireLightProceduralMix: values.fireLightProceduralMix
        ?? this._fireLightSystem?.getProceduralShaderMix?.()
        ?? 1,
      playerLightProfileId: this._playerLightProfileId,
      torchAnchorSource: values.torchAnchorSource ?? this._shaderSnapshot.torchAnchorSource,
      torchWarmth: playerLight.warmth,
      torchCoolEdge: playerLight.coolEdge,
      torchVerticalScale: playerLight.verticalScale,
      torchFlickerScale: playerLight.flickerScale,
      surfaceLightInfluence: lighting.surfaceLightInfluence,
      undergroundDarknessInfluence: lighting.undergroundDarknessInfluence,
      nightAmount: lighting.nightAmount,
      sunStrength: lighting.sunStrength,
      sunTint: lighting.sunlight.tint,
      sunExposure: lighting.sunlight.exposure,
      cloudCoverAmount: lighting.sunlight.cloudCoverAmount,
      fogAmount: lighting.sunlight.fogAmount,
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
    if (this.scene.upgradeSystem?.godModeActive === true) return 0;
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
