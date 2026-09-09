import { USER_SETTINGS } from "../UserSettings.js";
import {
  WORLDROOT_CONFIG,
  isWorldrootEnabled,
} from "../../values/worldroot.js?rev=20260830-worldroot-v13";
import { formatWorldrootMissingCurrents } from "./WorldrootStateResolver.js?rev=20260830-worldroot-v13";
import { WorldrootMemoryLayer } from "./WorldrootMemoryLayer.js?rev=20260830-worldroot-v13";
import { WorldrootWhiteboxView } from "./WorldrootWhiteboxView.js?rev=20260830-gate-a-v1";
import { WorldrootNativeModuleView } from "./WorldrootNativeModuleView.js?rev=20260830-alignment-v1";
import { WorldrootModularV4View } from "./WorldrootModularV4View.js?rev=20260901-worldroot-v4-clean-matte-v2";
import { WorldrootSanctuaryView } from "./WorldrootSanctuaryView.js?rev=20260902-sanctuary-v1";
import { WORLDROOT_SANCTUARY_CONFIG } from "../../values/worldrootSanctuary.js";
import {
  WORLDROOT_GATE_B_CONFIG,
  WORLDROOT_GATE_C_CONFIG,
} from "../../values/worldrootModuleArt.js?rev=20260830-alignment-v1";

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function cssHex(color) {
  return `#${Math.max(0, Number(color) || 0).toString(16).padStart(6, "0").slice(-6)}`;
}

/** The physical, state-driven town Worldroot. It owns no progression state. */
export class WorldrootWorldVisual {
  constructor(scene, config = WORLDROOT_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = isWorldrootEnabled(globalThis.location?.search || "", config);
    this.transform = null;
    this.canopyVeil = null;
    this.livingBody = null;
    this.livingCrown = null;
    this.consumedRegions = [];
    this.memoryLayer = null;
    this.whiteboxView = null;
    this.gateBView = null;
    this.gateCView = null;
    this.modularView = null;
    this.sanctuaryView = null;
    this.snapshot = null;
    this.signature = "";
    this.growthStage = -1;
    this.revealRight = config.reveal.rightByStage[0];
    this.revealTween = null;
    this.hotspots = [];
    this.activeHotspot = null;
    this._hotspotCacheTileX = Number.NaN;
    this._hotspotCacheTileY = Number.NaN;
    this._hotspotCacheValue = null;
  }

  create(snapshot) {
    if (!this.enabled) return this;
    this.whiteboxView = new WorldrootWhiteboxView(this.scene).create(snapshot);
    if (this.whiteboxView.enabled) {
      this.gateBView = new WorldrootNativeModuleView(
        this.scene,
        WORLDROOT_GATE_B_CONFIG,
      ).create(snapshot);
      this.gateCView = new WorldrootNativeModuleView(
        this.scene,
        WORLDROOT_GATE_C_CONFIG,
      ).create(snapshot);
      this.transform = this.whiteboxView.getTransform();
      this.sync(snapshot, false);
      return this;
    }
    this.sanctuaryView = new WorldrootSanctuaryView(this.scene, undefined, hotspot => {
      const result = this._handleHotspot(hotspot);
      if (result === "talents") return this.scene.starPillarSystem?.openConstellationView?.() === true;
      return result;
    }).create(snapshot);
    if (this.sanctuaryView.enabled) {
      this.transform = this.sanctuaryView.getTransform();
      this.sync(snapshot, false);
      return this;
    }
    this.sanctuaryView.destroy();
    this.sanctuaryView = null;
    this.modularView = new WorldrootModularV4View(this.scene).create(snapshot);
    if (this.modularView.enabled) {
      this.transform = this.modularView.getTransform();
      this.memoryLayer = new WorldrootMemoryLayer(this.scene, this.transform, this.config).create();
      this.sync(snapshot, false);
      return this;
    }
    this.modularView?.destroy();
    this.modularView = null;
    this.transform = this._resolveTransform();
    this.canopyVeil = this._createCanopyVeil();
    this.livingBody = this._createImage(this.config.assets.living.key, this.config.placement.depth);
    this.livingCrown = this._createImage(
      this.config.assets.living.key,
      this.config.placement.depth + 0.02,
    );
    this._applyCrop(this.livingCrown, this.config.reveal.crown);
    this.consumedRegions = this.config.regions.map(
      region => this._createConsumedRegion(region),
    );
    this.memoryLayer = new WorldrootMemoryLayer(this.scene, this.transform, this.config).create();
    this.sync(snapshot, false);
    return this;
  }

  _resolveTransform() {
    const tileSize = this.scene.config?.tileSize || 94;
    const requestedWidth = this.config.placement.displayWidthTiles * tileSize;
    const maximumWidth = this.config.source.width
      * Math.max(0.01, Number(this.config.placement.maximumSourceScale) || 1);
    const width = Math.min(requestedWidth, maximumWidth);
    const height = width * (this.config.source.height / this.config.source.width);
    const hearthX = this.config.placement.hearthTileX * tileSize;
    const surfaceY = (this.scene.config?.topAirRows || 65) * tileSize;
    return {
      left: hearthX - this.config.placement.hearthSourceX * width,
      top: surfaceY - this.config.placement.surfaceSourceY * height,
      width,
      height,
      scaleX: width / this.config.source.width,
      scaleY: height / this.config.source.height,
      tileSize,
      surfaceY,
    };
  }

  _createImage(textureKey, depth) {
    return this.scene.add.image(this.transform.left, this.transform.top, textureKey)
      .setOrigin(0, 0)
      .setScale(this.transform.scaleX, this.transform.scaleY)
      .setDepth(depth);
  }

  _createConsumedRegion(region) {
    const image = this._createImage(
      this.config.assets.consumed.key,
      this.config.placement.depth + 0.01,
    ).setAlpha(0);
    const maskGraphics = this.scene.make.graphics({ add: false });
    const points = region.path.map(point => ({
      x: this.transform.left + point.x * this.transform.width,
      y: this.transform.top + point.y * this.transform.height,
    }));
    const span = Math.min(
      region.mask.width * this.transform.width,
      region.mask.height * this.transform.height,
    );
    maskGraphics.lineStyle(
      span * this.config.consumedMask.strokeWidthRatio,
      0xffffff,
      1,
    );
    maskGraphics.beginPath();
    points.forEach((point, index) => {
      if (index === 0) maskGraphics.moveTo(point.x, point.y);
      else maskGraphics.lineTo(point.x, point.y);
    });
    maskGraphics.strokePath();
    maskGraphics.fillStyle(0xffffff, 1);
    const nodeRadius = span * this.config.consumedMask.nodeRadiusRatio;
    points.forEach(point => maskGraphics.fillCircle(point.x, point.y, nodeRadius));
    const mask = maskGraphics.createGeometryMask();
    image.setMask(mask);
    return { region, image, mask, maskGraphics };
  }

  _createCanopyVeil() {
    const textureKey = "worldroot-canopy-veil-v2";
    if (!this.scene.textures.exists(textureKey)) {
      const texture = this.scene.textures.createCanvas(textureKey, 512, 384);
      const context = texture.getContext();
      context.clearRect(0, 0, 512, 384);
      const shadow = context.createRadialGradient(256, 188, 12, 256, 188, 176);
      shadow.addColorStop(0, "rgba(2, 9, 18, 0.94)");
      shadow.addColorStop(0.48, "rgba(3, 13, 25, 0.82)");
      shadow.addColorStop(0.76, "rgba(5, 20, 36, 0.38)");
      shadow.addColorStop(1, "rgba(5, 20, 36, 0)");
      context.fillStyle = shadow;
      context.fillRect(0, 0, 512, 384);
      const crownAura = context.createRadialGradient(330, 96, 4, 330, 96, 88);
      crownAura.addColorStop(0, "rgba(38, 139, 199, 0.24)");
      crownAura.addColorStop(0.5, "rgba(20, 83, 129, 0.12)");
      crownAura.addColorStop(1, "rgba(20, 83, 129, 0)");
      context.fillStyle = crownAura;
      context.fillRect(0, 0, 512, 384);
      texture.refresh();
    }
    return this.scene.add.image(
      this.transform.left + this.transform.width * 0.6,
      this.transform.top + this.transform.height * 0.5,
      textureKey,
    )
      .setDisplaySize(this.transform.width * 1.25, this.transform.height * 1.55)
      .setDepth(this.config.placement.depth - 0.08);
  }

  _applyCrop(image, normalized) {
    if (!image || !normalized) return;
    image.setCrop(
      Math.round(normalized.x * this.config.source.width),
      Math.round(normalized.y * this.config.source.height),
      Math.max(1, Math.round(normalized.width * this.config.source.width)),
      Math.max(1, Math.round(normalized.height * this.config.source.height)),
    );
  }

  _setRevealRight(right) {
    this.revealRight = clamp(right, this.config.reveal.bodyLeft, 1);
    if (this.config.reveal.hardCropEnabled === true) {
      this._applyCrop(this.livingBody, {
        x: this.config.reveal.bodyLeft,
        y: this.config.reveal.bodyTop,
        width: this.revealRight - this.config.reveal.bodyLeft,
        height: this.config.reveal.bodyBottom - this.config.reveal.bodyTop,
      });
    }
    this._syncConsumedCrops();
  }

  _syncConsumedCrops() {
    for (const entry of this.consumedRegions) {
      const regionState = this.snapshot?.regionMemories?.find(
        memory => memory.id === entry.region.id,
      );
      const width = this.revealRight - this.config.reveal.bodyLeft;
      if (!(width > 0) || !(regionState?.consumedRatio > 0)) {
        entry.image.setAlpha(0);
        continue;
      }
      if (this.config.reveal.hardCropEnabled === true) {
        this._applyCrop(entry.image, {
          x: this.config.reveal.bodyLeft,
          y: this.config.reveal.bodyTop,
          width,
          height: this.config.reveal.bodyBottom - this.config.reveal.bodyTop,
        });
      }
      entry.image.setAlpha(clamp(0.28 + Math.sqrt(regionState.consumedRatio) * 0.72, 0, 1));
    }
  }

  sync(snapshot, animate = true) {
    if (!this.enabled || !snapshot) return false;
    const previousStage = this.growthStage;
    const changed = snapshot.signature !== this.signature;
    this.snapshot = snapshot;
    this.signature = snapshot.signature;
    this.growthStage = clamp(
      Number(snapshot.growthStage) || 0,
      0,
      this.config.reveal.rightByStage.length - 1,
    );
    const targetRight = this.config.reveal.rightByStage[this.growthStage];
    const stageChanged = this.growthStage !== previousStage;
    const shouldGrow = this.config.reveal.hardCropEnabled === true
      && animate
      && previousStage >= 0
      && this.growthStage > previousStage;
    if (shouldGrow) {
      this.revealTween?.stop?.();
      this.revealTween = null;
      const reveal = { right: this.revealRight };
      this.revealTween = this.scene.tweens.add({
        targets: reveal,
        right: targetRight,
        duration: this.config.motion.revealDurationMs,
        ease: "Sine.inOut",
        onUpdate: () => this._setRevealRight(reveal.right),
        onComplete: () => {
          this.revealTween = null;
          this._setRevealRight(targetRight);
        },
      });
    } else if (!animate || stageChanged || !this.revealTween) {
      this.revealTween?.stop?.();
      this.revealTween = null;
      this._setRevealRight(targetRight);
    }
    this._syncConsumedCrops();
    this.whiteboxView?.sync?.(this.growthStage);
    this.gateBView?.sync?.(this.growthStage);
    this.gateCView?.sync?.(this.growthStage);
    this.modularView?.sync?.(snapshot, changed || stageChanged);
    this.sanctuaryView?.sync(snapshot, animate && (changed || stageChanged));
    if (changed || stageChanged) this.memoryLayer?.sync(snapshot);
    else if (this.memoryLayer) this.memoryLayer.snapshot = snapshot;
    this._rebuildHotspots();
    return changed || previousStage !== this.growthStage;
  }

  update(time = 0, _delta = 0, playerTile = null) {
    if (!this.enabled) return;
    this.memoryLayer?.update(time);
    this.sanctuaryView?.update(time);
    if (this.livingCrown) {
      const pulse = (
        Math.sin(time / this.config.motion.crownPulsePeriodMs * Math.PI * 2) + 1
      ) / 2;
      this.livingCrown.setAlpha((this.snapshot?.endgameReady ? 0.92 : 0.78) + pulse * 0.08);
    }
    this.activeHotspot = playerTile ? this._findHotspot(playerTile) : null;
  }

  _rebuildHotspots() {
    this._hotspotCacheTileX = Number.NaN;
    this._hotspotCacheTileY = Number.NaN;
    this._hotspotCacheValue = null;
    if (this.sanctuaryView?.enabled) {
      this.hotspots = this.sanctuaryView.getGroundHotspots();
      return;
    }
    if (!this.transform) {
      this.hotspots = [];
      return;
    }
    const point = (kind, source, options = {}) => ({
      kind,
      source,
      world: this._pointToWorld(options.point || source.point || source.anchor, kind),
      rangeX: options.rangeX || this.config.interaction.proximityTiles,
      rangeY: options.rangeY || this.config.interaction.verticalTiles,
      priority: options.priority ?? 5,
    });
    const hotspots = [
      point("root", {}, {
        point: this.config.interaction.rootTalent,
        rangeX: this.config.interaction.rootProximityTiles,
        rangeY: this.config.interaction.rootVerticalTiles,
        priority: 1,
      }),
      point("crown", {}, {
        point: this.config.interaction.crownStar,
        rangeX: this.config.interaction.crownProximityTiles,
        rangeY: this.config.interaction.crownProximityTiles,
        priority: 0,
      }),
    ];
    for (const memory of this.snapshot?.profileMemories || []) {
      if (memory.knownCount <= 0 || !this._isPointRevealed(memory.anchor)) continue;
      hotspots.push(point("biome", memory, { priority: 4, rangeX: 1.5, rangeY: 1.3 }));
    }
    for (const star of this.snapshot?.starMemories || []) {
      if (!this._isPointRevealed(star.point)) continue;
      hotspots.push(point("star", star, { priority: 2, rangeX: 1.2, rangeY: 1.1 }));
    }
    for (const titan of this.snapshot?.titanMemories || []) {
      if ((!titan.discovered && !titan.tracked) || !this._isPointRevealed(titan.point)) continue;
      hotspots.push(point("titan", titan, { priority: 3, rangeX: 1.55, rangeY: 1.35 }));
    }
    this.hotspots = hotspots;
  }

  _pointToWorld(sourcePoint, kind = "") {
    if (this.whiteboxView?.enabled) return this.whiteboxView.pointToWorld(sourcePoint, kind);
    if (this.modularView?.enabled) return this.modularView.pointToWorld(sourcePoint, kind);
    return this.memoryLayer?.pointToWorld(sourcePoint) || { x: 0, y: 0 };
  }

  _isPointRevealed(point) {
    return Number.isFinite(point?.x) && point.x <= this.revealRight;
  }

  _findHotspot(playerTile) {
    const tileX = Number(playerTile?.tx);
    const tileY = Number(playerTile?.ty);
    if (!Number.isFinite(tileX) || !Number.isFinite(tileY)
      || !Number.isFinite(this.transform?.tileSize) || this.transform.tileSize <= 0) {
      return null;
    }
    if (tileX === this._hotspotCacheTileX && tileY === this._hotspotCacheTileY) {
      return this._hotspotCacheValue;
    }
    let best = null;
    for (const hotspot of this.hotspots) {
      const hotspotTileX = hotspot.world.x / this.transform.tileSize;
      const hotspotTileY = hotspot.world.y / this.transform.tileSize;
      const dx = Math.abs(tileX - hotspotTileX);
      const dy = Math.abs(tileY - hotspotTileY);
      if (dx > hotspot.rangeX || dy > hotspot.rangeY) continue;
      const score = dx + dy + hotspot.priority * 0.001;
      if (!best || score < best.score) best = { ...hotspot, score };
    }
    this._hotspotCacheTileX = tileX;
    this._hotspotCacheTileY = tileY;
    this._hotspotCacheValue = best;
    return best;
  }

  getInteractionDistance(playerTile) {
    if (!this.enabled || !playerTile) return Number.POSITIVE_INFINITY;
    return this._findHotspot(playerTile)?.score ?? Number.POSITIVE_INFINITY;
  }

  getPromptState(playerTile = null) {
    const hotspot = playerTile ? this._findHotspot(playerTile) : this.activeHotspot;
    if (!hotspot) return null;
    const key = USER_SETTINGS.getKeyLabel("interact");
    let label = this.config.copy.rootPrompt;
    if (this.sanctuaryView?.enabled) label = WORLDROOT_SANCTUARY_CONFIG.interaction.rootPrompt;
    if (hotspot.kind === "star") {
      label = `${hotspot.source.state === "consumed" ? "Revisit scar" : "Inspect refuge"} • ${hotspot.source.label}`;
    } else if (hotspot.kind === "biome") {
      label = `${hotspot.source.label} • ${hotspot.source.knownCount} Star memories`;
    } else if (hotspot.kind === "titan") {
      label = `${hotspot.source.tracked ? "Follow" : "Recall"} ${hotspot.source.name}`;
    } else if (hotspot.kind === "crown") {
      const copy = this.sanctuaryView?.enabled ? WORLDROOT_SANCTUARY_CONFIG.interaction : this.config.copy;
      label = this.snapshot?.endgameReady ? copy.crownReadyPrompt : copy.crownDormantPrompt;
    }
    return {
      text: `[${key}] ${label}`,
      x: hotspot.world.x,
      y: hotspot.world.y - (this.sanctuaryView?.enabled
        ? WORLDROOT_SANCTUARY_CONFIG.interaction.promptOffsetPx : 28),
      hotspot,
    };
  }

  handleInteract(playerTile) {
    const hotspot = this._findHotspot(playerTile);
    return this._handleHotspot(hotspot);
  }

  _handleHotspot(hotspot) {
    if (!hotspot) return false;
    const scene = this.scene;
    if (!scene) return false;
    if (hotspot.kind === "root") return "talents";
    if (hotspot.kind === "star" || hotspot.kind === "biome") {
      const focusTile = hotspot.kind === "star"
        ? hotspot.source.tile
        : hotspot.source.focusTile;
      if (!Number.isFinite(focusTile?.tx) || !Number.isFinite(focusTile?.ty)
        || typeof scene.showWorldMap !== "function"
        || scene.showWorldMap({ focusTile }) !== true) {
        return false;
      }
      scene.hudSystem?.flashStatus?.(
        hotspot.kind === "star"
          ? `${hotspot.source.label.toUpperCase()} • ${hotspot.source.state.toUpperCase()}`
          : `${hotspot.source.label.toUpperCase()} • ${hotspot.source.knownCount} STAR MEMORIES`,
        cssHex(
          hotspot.kind === "star" && hotspot.source.state === "consumed"
            ? this.config.colors.scar
            : this.config.colors.intact,
        ),
        this.config.feedback.starMemoryDurationMs,
      );
      return true;
    }
    if (hotspot.kind === "titan") {
      if (typeof scene.showPauseMenu !== "function"
        || scene.showPauseMenu({ initialTabKey: "titans" }) !== true) {
        return false;
      }
      const epithet = hotspot.source.lore?.epithet || "Titan Memory";
      scene.hudSystem?.flashStatus?.(
        `${hotspot.source.name.toUpperCase()} • ${epithet.toUpperCase()}`,
        `#${(hotspot.source.color || 0xc878ff).toString(16).padStart(6, "0")}`,
        this.config.feedback.titanMemoryDurationMs,
      );
      return true;
    }
    if (hotspot.kind === "crown") {
      if (!this.snapshot?.endgameReady) {
        const missing = formatWorldrootMissingCurrents(this.snapshot);
        scene.hudSystem?.flashStatus?.(
          `CROWN STAR • ${missing.join(" • ")}`,
          cssHex(this.config.colors.crownDormant),
          this.config.feedback.crownDormantDurationMs,
        );
        return true;
      }
      if (scene._worldrootEndgameStarted !== true) {
        scene._worldrootEndgameStarted = true;
        scene.events?.emit?.("worldroot-endgame-ready", { snapshot: this.snapshot });
      }
      scene.hudSystem?.flashStatus?.(
        this.config.copy.crownReadyTitle,
        cssHex(this.config.colors.crownReady),
        this.config.feedback.crownReadyDurationMs,
      );
      return true;
    }
    return false;
  }

  queueStarArrival(detail) {
    if (this.sanctuaryView?.enabled) return this.sanctuaryView.queueStarArrival(detail);
    return this.memoryLayer?.queueStarArrival(detail) === true;
  }

  getOneWayPlatforms() {
    if (this.sanctuaryView?.enabled) return [];
    if (!this.enabled || !this.transform || this.config.traversal.enabled !== true) return [];
    if (this.whiteboxView?.enabled) return this.whiteboxView.getOneWayPlatforms();
    if (this.modularView?.enabled) return this.modularView.getOneWayPlatforms();
    return this.config.terraces
      .filter(terrace => (
        this.config.traversal.availableAcrossGrowth === true
        || (terrace.stage > 0 && terrace.stage <= this.growthStage)
      ))
      .map(terrace => ({
        id: `worldroot-${terrace.id}`,
        leftX: this.transform.left + terrace.left * this.transform.width,
        rightX: this.transform.left + terrace.right * this.transform.width,
        y: this.transform.top + terrace.y * this.transform.height,
        ...(terrace.dropGroup ? { dropGroup: terrace.dropGroup } : {}),
        source: "worldroot",
      }));
  }

  getTopY() {
    return this.transform?.top || 0;
  }

  getDebugSnapshot() {
    const sanctuary = this.sanctuaryView?.enabled ? this.sanctuaryView.getDebugSnapshot() : null;
    const whitebox = this.whiteboxView?.enabled
      ? this.whiteboxView.getDebugSnapshot()
      : null;
    const gateB = this.gateBView?.enabled
      ? this.gateBView.getDebugSnapshot()
      : null;
    const gateC = this.gateCView?.enabled
      ? this.gateCView.getDebugSnapshot()
      : null;
    const modular = this.modularView?.enabled
      ? this.modularView.getDebugSnapshot()
      : null;
    return {
      enabled: this.enabled,
      reviewMode: sanctuary ? "root-sanctuary" : gateC
        ? "gate-c-art-sample"
        : gateB
          ? "gate-b-art-sample"
          : whitebox
            ? "collision-whitebox"
            : modular
              ? "worldroot-modular-v4"
              : "worldroot-v3",
      growthStage: this.growthStage,
      endgameReady: this.snapshot?.endgameReady === true,
      endgameStarted: this.scene?._worldrootEndgameStarted === true,
      knownStars: this.snapshot?.knownStarCount || 0,
      consumedStars: this.snapshot?.consumedStarCount || 0,
      awakeRegions: this.snapshot?.awakeRegionCount || 0,
      titanCount: this.snapshot?.titanCount || 0,
      completedTalentBranches: this.snapshot?.completedTalentBranchCount || 0,
      campfireLevel: this.snapshot?.campfireLevel || 0,
      gpRatio: this.snapshot?.gpRatio || 0,
      activeTitanClueId: this.snapshot?.activeTitanClueId || null,
      activeHotspotKind: this.activeHotspot?.kind || null,
      missingCurrents: formatWorldrootMissingCurrents(this.snapshot),
      platformCount: this.getOneWayPlatforms().length,
      sourceScale: whitebox || modular ? 1 : this.transform?.scaleX || 0,
      hardCropEnabled: this.config.reveal.hardCropEnabled === true,
      bounds: this.transform ? { ...this.transform } : null,
      whitebox,
      gateB,
      gateC,
      modular,
      sanctuary,
    };
  }

  destroy() {
    this.sanctuaryView?.destroy();
    this.sanctuaryView = null;
    this.revealTween?.stop?.();
    this.revealTween = null;
    this.memoryLayer?.destroy();
    this.memoryLayer = null;
    this.whiteboxView?.destroy();
    this.whiteboxView = null;
    this.gateBView?.destroy();
    this.gateBView = null;
    this.gateCView?.destroy();
    this.gateCView = null;
    this.modularView?.destroy();
    this.modularView = null;
    this.canopyVeil?.destroy();
    this.canopyVeil = null;
    this.livingBody?.destroy();
    this.livingCrown?.destroy();
    this.livingBody = null;
    this.livingCrown = null;
    for (const entry of this.consumedRegions) {
      entry.image?.clearMask?.(false);
      entry.mask?.destroy?.();
      entry.maskGraphics?.destroy?.();
      entry.image?.destroy();
    }
    this.consumedRegions = [];
    this.hotspots = [];
    this.activeHotspot = null;
    this._hotspotCacheTileX = Number.NaN;
    this._hotspotCacheTileY = Number.NaN;
    this._hotspotCacheValue = null;
    this.snapshot = null;
    this.signature = "";
    this.transform = null;
    this.scene = null;
  }
}
