import {
  getHeavenblockAccessRegion,
} from "../../values/heavenblocksAccessConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { HEAVENBLOCKS_WORLD_CONFIG } from "../../values/heavenblocksWorldConfig.js";
import {
  HEAVENBLOCKS_VISUAL_CONFIG,
  resolveHeavenblocksVisualsEnabled,
} from "../../values/heavenblocksVisualConfig.js";

export class HeavenblocksArtifactSystem {
  constructor(scene, {
    progressionSystem = null,
    fxSystem = null,
    portalVisualSystem = null,
    config = HEAVENBLOCKS_VISUAL_CONFIG,
  } = {}) {
    this.scene = scene;
    this.progression = progressionSystem;
    this.fx = fxSystem;
    this.portalVisual = portalVisualSystem;
    this.config = config;
    this.enabled = resolveHeavenblocksVisualsEnabled(config);
    this.props = [];
    this.shrines = new Map();
    this.missingTextureKeys = new Set();
    this.created = false;
  }

  create() {
    if (!this.enabled) {
      this.created = true;
      return;
    }
    for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions) {
      this._createRegionProps(region);
      this._createShrine(region);
    }
    this.portalVisual?.create?.();
    this.created = true;
    this.refreshProgressionVisuals();
  }

  _createRegionProps(region) {
    const tileSize = this.scene.config.tileSize;
    const biome = this.config.biomes[region.id];
    for (const anchor of region.propAnchors) {
      const key = anchor.kind === "crystal"
        ? biome.keys.crystalCluster
        : anchor.kind === "capstone"
          ? biome.keys.capstone
          : biome.keys.flora;
      if (!this._textureReady(key)) continue;
      const heightTiles = anchor.kind === "crystal"
        ? this.config.artifacts.crystalHeightTiles
        : anchor.kind === "capstone"
          ? this.config.artifacts.capstoneHeightTiles
          : this.config.artifacts.propHeightTiles;
      const floorTy = this._resolvePropFloorTy(anchor);
      const image = this.scene.add.image(
        (anchor.tx + 0.5) * tileSize,
        floorTy * tileSize,
        key,
      )
        .setOrigin(0.5, 1)
        .setDisplaySize(
          heightTiles * tileSize * anchor.scale,
          heightTiles * tileSize * anchor.scale,
        )
        .setDepth(this.config.render.propDepth);
      this.props.push(image);
    }
  }

  _resolvePropFloorTy(anchor) {
    const config = this.config.artifacts;
    const start = anchor.ty - config.propFloorSearchUpTiles;
    const end = anchor.ty + config.propFloorSearchDownTiles;
    for (let ty = start; ty <= end; ty += 1) {
      if (
        this.scene.worldModel.getTileType(anchor.tx, ty) !== TILE_TYPES.AIR
        && this.scene.worldModel.getTileType(anchor.tx, ty - 1) === TILE_TYPES.AIR
      ) {
        return ty;
      }
    }
    return anchor.ty + 1;
  }

  _createShrine(region) {
    const tileSize = this.scene.config.tileSize;
    const biome = this.config.biomes[region.id];
    if (!this._textureReady(biome.keys.shrine)) return;
    if (!this._textureReady(biome.keys.component)) return;
    const x = (region.shrine.tx + 0.5) * tileSize;
    const y = region.shrine.floorTy * tileSize;
    const shrine = this.scene.add.image(x, y, biome.keys.shrine)
      .setOrigin(0.5, 1)
      .setDisplaySize(
        this.config.artifacts.shrineWidthTiles * tileSize,
        this.config.artifacts.shrineHeightTiles * tileSize,
      )
      .setDepth(this.config.render.shrineDepth);
    const component = this.scene.add.image(
      x,
      y - tileSize * this.config.artifacts.componentOffsetTiles,
      biome.keys.component,
    )
      .setDisplaySize(
        this.config.artifacts.componentSizeTiles * tileSize,
        this.config.artifacts.componentSizeTiles * tileSize,
      )
      .setDepth(this.config.render.shrineDepth + this.config.discoveryFx.ringDepthOffset)
      .setBlendMode(Phaser.BlendModes.ADD);
    const tween = this.scene.tweens.add({
      targets: component,
      angle: 360,
      y: component.y - tileSize * this.config.artifacts.componentFloatTiles,
      duration: this.config.artifacts.pulseDurationMs
        * this.config.artifacts.componentSpinDurationMultiplier,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.shrines.set(region.id, { shrine, component, tween, region });
  }

  refreshProgressionVisuals() {
    for (const [regionId, record] of this.shrines) {
      const accessRegion = getHeavenblockAccessRegion(regionId);
      const unlocked = this.progression?.isRegionUnlocked?.(regionId) === true;
      const installed = accessRegion
        && this.progression?.isPartInstalled?.(accessRegion.partId) === true;
      record.shrine.setAlpha(unlocked ? 1 : this.config.artifacts.componentLockedAlpha);
      record.component.setAlpha(
        installed
          ? this.config.artifacts.componentInstalledAlpha
          : unlocked
            ? this.config.artifacts.componentReadyAlpha
            : this.config.artifacts.componentLockedAlpha,
      );
      if (unlocked) {
        record.shrine.clearTint();
        record.component.clearTint();
      } else {
        record.shrine.setTint(this.config.artifacts.lockedTint);
        record.component.setTint(this.config.artifacts.lockedTint);
      }
    }
    this.portalVisual?.refreshProgressionVisuals?.();
  }

  setSkyPortalSlotActive(slotId, active) {
    return this.portalVisual?.setSkyPortalSlotActive?.(slotId, active) === true;
  }

  setGroundPortalUnlocked(levelId, routeUnlocked) {
    this.portalVisual?.setGroundPortalUnlocked?.(levelId, routeUnlocked);
  }

  playRelicDiscovery(discovery) {
    return this.fx?.playRelicDiscovery?.(discovery) === true;
  }

  playRegionUnlock(regionId) {
    this.refreshProgressionVisuals();
    this.fx?.playRegionUnlock?.(regionId);
  }

  playRegionArrival(regionId) {
    this.fx?.playRegionArrival?.(regionId);
  }

  playComponentClaim(region) {
    this.refreshProgressionVisuals();
    this.fx?.playComponentClaim?.(region);
  }

  playVault(region, keystoneGranted) {
    this.fx?.playVault?.(region, keystoneGranted);
  }

  playLockedPortalFeedback(regionId, access) {
    this.fx?.playLockedPortalFeedback?.(regionId, access);
  }

  playCraftSuccess(result) {
    this.fx?.playCraftSuccess?.(result);
  }

  _textureReady(key) {
    const ready = Boolean(key) && (
      typeof this.scene.textures?.exists !== "function"
      || this.scene.textures.exists(key)
    );
    if (!ready && key) this.missingTextureKeys.add(key);
    return ready;
  }

  getHealthSnapshot() {
    const portalHealth = this.portalVisual?.getHealthSnapshot?.() || null;
    const expectedProps = HEAVENBLOCKS_WORLD_CONFIG.regions.reduce(
      (total, region) => total + region.propAnchors.length,
      0,
    );
    return {
      created: this.created,
      enabled: this.enabled,
      props: this.props.length,
      expectedProps,
      shrines: this.shrines.size,
      expectedShrines: HEAVENBLOCKS_WORLD_CONFIG.regions.length,
      missingTextureKeys: [...this.missingTextureKeys],
      portals: portalHealth,
      ready: this.created && (
        !this.enabled
        || (
          this.props.length === expectedProps
          && this.shrines.size === HEAVENBLOCKS_WORLD_CONFIG.regions.length
          && this.missingTextureKeys.size === 0
          && portalHealth?.ready === true
        )
      ),
    };
  }

  destroy() {
    this.props.forEach((image) => image.destroy());
    for (const record of this.shrines.values()) {
      record.tween?.remove();
      record.component?.destroy();
      record.shrine?.destroy();
    }
    this.portalVisual?.destroy?.();
    this.props = [];
    this.shrines.clear();
    this.missingTextureKeys.clear();
    this.created = false;
  }
}
