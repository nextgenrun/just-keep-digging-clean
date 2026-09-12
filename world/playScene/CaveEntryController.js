/**
 * CaveEntryController — exposes safe world cave mouths and opens their fixed-size interiors.
 */
import {
  CAVE_SCENE_CONFIG,
  resolveIntegratedCaveEntrancesEnabled,
  resolveScenicCaveMouthsEnabled,
} from "../../values/caveSceneConfig.js";
import { resolveWorldVisualLandmarksEnabled } from "../../values/worldVisualLandmarks.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";

function getDistance(a, b) {
  return Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);
}

export class CaveEntryController {
  constructor(scene) {
    this.scene = scene;
    this.prompt = null;
    this.entranceSprites = [];
    this.entranceTweens = [];
    this.activeZone = null;
    this.isTransitioning = false;
    this.entranceTextureReady = false;
  }

  create() {
    if (!CAVE_SCENE_CONFIG.enabled) return;
    this.prompt = this.scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "14px",
      color: "#c9dcff",
      backgroundColor: "#070814cc",
      padding: { x: 8, y: 5 },
    }).setDepth(31).setOrigin(0.5, 1).setVisible(false);
    this.entranceTextureReady = this._createEntranceSprites();
    const health = this.getHealthSnapshot();
    console.info(
      `[CaveEntryController] ${health.interactiveEntrances}/${health.entranceZones} `
      + `${CAVE_SCENE_CONFIG.integratedEntrances.healthLabel} ready`,
    );
    if (this._isReviewLaunchRequested()) {
      this.scene.time.delayedCall(CAVE_SCENE_CONFIG.reviewLaunchDelayMs, () => this._launchReviewCave());
    }
  }

  update(playerTile, keys) {
    if (!CAVE_SCENE_CONFIG.enabled || this.isTransitioning || !playerTile) return false;

    const zone = this._findNearestZone(playerTile);
    this.activeZone = zone;
    this._updatePrompt(zone);
    if (!zone || !Phaser.Input.Keyboard.JustDown(keys?.interact)) return false;

    this.enter(zone, playerTile);
    return true;
  }

  getSaveData() {
    return {
      collectedNodes: [...(this.scene.caveSceneCollectedNodes || new Set())],
    };
  }

  applySaveData(data) {
    const entries = Array.isArray(data?.collectedNodes) ? data.collectedNodes : [];
    this.scene.caveSceneCollectedNodes = new Set(entries.filter(entry => typeof entry === "string"));
  }

  destroy() {
    this.prompt?.destroy();
    this.prompt = null;
    for (const tween of this.entranceTweens) tween?.stop?.();
    this.entranceTweens = [];
    for (const sprite of this.entranceSprites) sprite?.destroy?.();
    this.entranceSprites = [];
  }

  _createEntranceSprites() {
    const entrance = CAVE_SCENE_CONFIG.overworldEntrance;
    const scenicEnabled = resolveScenicCaveMouthsEnabled();
    const visual = scenicEnabled ? entrance.scenic : entrance.legacy;
    if (!this.scene.textures?.exists?.(visual.textureKey)) {
      console.warn(`[CaveEntryController] Entrance texture unavailable: ${visual.textureKey}`);
      return false;
    }
    const tileSize = this.scene.config.tileSize;
    const zones = this.scene.worldModel?.caveZones || [];
    const landmarkOwnedZoneId = scenicEnabled
      ? this._resolveLandmarkOwnedZoneId(zones)
      : null;
    for (const [index, zone] of zones.entries()) {
      // Integrated and compact caves share the same approved world-space mouth.
      if (!zone?.entry) continue;
      if (!this._hasUsableEntrance(zone)) continue;
      if (zone.id === landmarkOwnedZoneId) continue;
      const anchor = zone.mouthAnchor || zone.entry;
      const sprite = this.scene.add.image(
        (anchor.tx + 0.5) * tileSize,
        (anchor.ty + 1 + visual.floorOffsetTiles) * tileSize,
        visual.textureKey
      );
      sprite
        .setOrigin(visual.originX, visual.originY)
        .setDisplaySize(tileSize * visual.displayWidthTiles, tileSize * visual.displayHeightTiles)
        .setDepth(visual.depth)
        .setAlpha(visual.alpha)
        .setTint(visual.tint);
      this._addEntrancePulse(sprite, visual, index);
      this.entranceSprites.push(sprite);
    }
    return true;
  }

  _resolveLandmarkOwnedZoneId(zones) {
    const ownership = CAVE_SCENE_CONFIG.overworldEntrance.landmarkOwnership;
    if (!ownership.skipShallowestWhenActive) return null;
    if (this.scene.worldVisualRuntimeMode !== ownership.scenicRuntimeMode) return null;
    if (!resolveWorldVisualLandmarksEnabled()) return null;
    const worldModel = this.scene.worldModel;
    const candidates = zones
      .filter(zone => zone?.mouthAnchor && zone?.entry)
      .filter(zone => (
        typeof worldModel?.isSolid !== "function"
        || (!worldModel.isSolid(zone.entry.tx, zone.entry.ty)
          && worldModel.isSolid(zone.entry.tx, zone.entry.ty + 1))
      ))
      .sort((a, b) => a.mouthAnchor.ty - b.mouthAnchor.ty || a.mouthAnchor.tx - b.mouthAnchor.tx);
    return candidates[0]?.id || null;
  }

  _addEntrancePulse(sprite, visual, index) {
    const pulse = visual.pulse;
    if (!pulse.enabled || !this.scene.tweens?.add) return;
    const tween = this.scene.tweens.add({
      targets: sprite,
      alpha: Math.max(0, visual.alpha - pulse.alphaDelta),
      duration: pulse.durationMs,
      ease: pulse.ease,
      delay: (index * pulse.staggerMs) % pulse.durationMs,
      yoyo: true,
      repeat: -1,
    });
    this.entranceTweens.push(tween);
  }

  _isReviewLaunchRequested() {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has(CAVE_SCENE_CONFIG.reviewQueryParam);
  }

  _getReviewLaunchMode() {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get(CAVE_SCENE_CONFIG.reviewQueryParam) || "";
  }

  _launchReviewCave() {
    if (this.isTransitioning) return;
    if (this.scene.gameState === "title") {
      this.scene.startRun?.();
    }
    if (this.scene.gameState !== "playing") {
      this.scene.time.delayedCall(CAVE_SCENE_CONFIG.reviewLaunchDelayMs, () => this._launchReviewCave());
      return;
    }
    const zone = (this.scene.worldModel?.caveZones || []).find(candidate => candidate?.standaloneScene && candidate?.entry);
    if (!zone) {
      this.scene.time.delayedCall(CAVE_SCENE_CONFIG.reviewLaunchDelayMs, () => this._launchReviewCave());
      return;
    }
    if (this._getReviewLaunchMode() === CAVE_SCENE_CONFIG.reviewEntranceMode) {
      this.scene.playerController?.teleportToTile?.(zone.entry.tx, zone.entry.ty);
      return;
    }
    this.enter(zone, zone.entry);
  }

  _findNearestZone(playerTile) {
    const zones = this.scene.worldModel?.caveZones || [];
    let nearest = null;
    let nearestDistance = Infinity;
    for (const zone of zones) {
      if (!zone?.entry) continue;
      const distance = getDistance(playerTile, zone.entry);
      if (distance > CAVE_SCENE_CONFIG.interactionRangeTiles || distance >= nearestDistance) continue;
      if (!this._isInteractiveZone(zone)) continue;
      if (distance <= CAVE_SCENE_CONFIG.interactionRangeTiles && distance < nearestDistance) {
        nearest = zone;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  _hasUsableEntrance(zone) {
    if (!zone?.entry) return false;
    const worldModel = this.scene.worldModel;
    if (typeof worldModel?.isSolid !== "function") return true;
    return !worldModel.isSolid(zone.entry.tx, zone.entry.ty)
      && worldModel.isSolid(zone.entry.tx, zone.entry.ty + 1);
  }

  _isInteractiveZone(zone) {
    if (!this._hasUsableEntrance(zone)) return false;
    if (zone.standaloneScene === true) return true;
    if (!resolveIntegratedCaveEntrancesEnabled()) return false;
    return CAVE_SCENE_CONFIG.integratedEntrances.eligibleSources.includes(zone.source);
  }

  _resolveBackgroundPresetKey(zone) {
    if (CAVE_SCENE_CONFIG.presets[zone?.backgroundPresetKey]) {
      return zone.backgroundPresetKey;
    }
    return CAVE_SCENE_CONFIG.interiors[zone?.archetypeId]?.presetKey
      || CAVE_SCENE_CONFIG.selection.normalPresetKeys[0];
  }

  getHealthSnapshot() {
    const zones = this.scene.worldModel?.caveZones || [];
    const entranceZones = zones.filter(zone => zone?.entry);
    const usableEntrances = entranceZones.filter(zone => this._hasUsableEntrance(zone));
    const interactiveEntrances = usableEntrances.filter(zone => this._isInteractiveZone(zone));
    return {
      enabled: CAVE_SCENE_CONFIG.enabled,
      integratedEntrancesEnabled: resolveIntegratedCaveEntrancesEnabled(),
      entranceTextureReady: this.entranceTextureReady,
      entranceZones: entranceZones.length,
      usableEntrances: usableEntrances.length,
      interactiveEntrances: interactiveEntrances.length,
      invalidEntranceIds: entranceZones
        .filter(zone => !this._hasUsableEntrance(zone))
        .map(zone => zone.id),
    };
  }

  _updatePrompt(zone) {
    if (!this.prompt) return;
    if (!zone) {
      this.prompt.setVisible(false);
      return;
    }
    const tileSize = this.scene.config.tileSize;
    const preset = CAVE_SCENE_CONFIG.presets[this._resolveBackgroundPresetKey(zone)];
    const label = zone.displayName
      ? `Enter ${zone.displayName}`
      : (preset?.entryLabel || "Enter cave");
    this.prompt
      .setPosition((zone.entry.tx + 0.5) * tileSize, zone.entry.ty * tileSize)
      .setText(`[${USER_SETTINGS.getKeyLabel("interact")}] ${label}`)
      .setVisible(true);
  }

  enter(zone, playerTile) {
    this.isTransitioning = true;
    this.prompt?.setVisible(false);
    this.scene.playerController?.setControlsEnabled(false);

    const launch = () => {
      this.scene.scene.launch(CAVE_SCENE_CONFIG.sceneKey, {
        caveId: zone.id,
        backgroundPresetKey: this._resolveBackgroundPresetKey(zone),
        archetypeId: zone.archetypeId,
        displayName: zone.displayName,
        discoveryHint: zone.discoveryHint,
        depthTiles: Math.max(0, zone.cy - this.scene.config.topAirRows),
        originTile: { tx: playerTile.tx, ty: playerTile.ty },
      });
      this.scene.scene.pause(CAVE_SCENE_CONFIG.originSceneKey);
    };

    if (this.scene.cameras?.main) {
      this.scene.cameras.main.fadeOut(CAVE_SCENE_CONFIG.fadeMs, 0, 0, 0);
      this.scene.cameras.main.once("camerafadeoutcomplete", launch);
      return;
    }
    launch();
  }
}
