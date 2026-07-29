import {
  HEAVENBLOCKS_WORLD_CONFIG,
  getHeavenblocksRegionAt,
} from "../../values/heavenblocksWorldConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../../values/heavenblocksVisualConfig.js";
import { HEAVENBLOCKS_PROGRESSION_CONFIG } from "../../values/heavenblocksProgressionConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";

function distanceSquared(a, b) {
  const dx = a.tx - b.tx;
  const dy = a.ty - b.ty;
  return dx * dx + dy * dy;
}

export class HeavenblocksArtifactSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.progression = options.progressionSystem || null;
    this.crafting = options.craftingSystem || null;
    this.fx = options.fxSystem || null;
    this.portalVisual = options.portalVisualSystem || null;
    this.onOpenForge = options.onOpenForge || null;
    this.props = [];
    this.shrines = new Map();
    this.created = false;
  }

  create() {
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
    const biome = HEAVENBLOCKS_VISUAL_CONFIG.biomes[region.id];
    for (const anchor of region.propAnchors) {
      const key = anchor.kind === "crystal"
        ? biome.keys.crystalCluster
        : anchor.kind === "capstone"
          ? biome.keys.capstone
          : biome.keys.flora;
      const heightTiles = anchor.kind === "crystal"
        ? HEAVENBLOCKS_VISUAL_CONFIG.artifacts.crystalHeightTiles
        : anchor.kind === "capstone"
          ? HEAVENBLOCKS_VISUAL_CONFIG.artifacts.capstoneHeightTiles
          : HEAVENBLOCKS_VISUAL_CONFIG.artifacts.propHeightTiles;
      const image = this.scene.add.image(
        (anchor.tx + 0.5) * tileSize,
        (anchor.ty + 1) * tileSize,
        key
      )
        .setOrigin(0.5, 1)
        .setDisplaySize(heightTiles * tileSize, heightTiles * tileSize)
        .setScale(anchor.scale)
        .setDepth(HEAVENBLOCKS_VISUAL_CONFIG.render.propDepth);
      this.props.push(image);
    }
  }

  _createShrine(region) {
    const tileSize = this.scene.config.tileSize;
    const biome = HEAVENBLOCKS_VISUAL_CONFIG.biomes[region.id];
    const x = (region.shrine.tx + 0.5) * tileSize;
    const y = region.shrine.floorTy * tileSize;
    const shrine = this.scene.add.image(x, y, biome.keys.shrine)
      .setOrigin(0.5, 1)
      .setDisplaySize(
        HEAVENBLOCKS_VISUAL_CONFIG.artifacts.shrineWidthTiles * tileSize,
        HEAVENBLOCKS_VISUAL_CONFIG.artifacts.shrineHeightTiles * tileSize
      )
      .setDepth(HEAVENBLOCKS_VISUAL_CONFIG.render.shrineDepth);
    const component = this.scene.add.image(
      x,
      y - tileSize * 1.38,
      biome.keys.component
    )
      .setDisplaySize(
        HEAVENBLOCKS_VISUAL_CONFIG.artifacts.componentSizeTiles * tileSize,
        HEAVENBLOCKS_VISUAL_CONFIG.artifacts.componentSizeTiles * tileSize
      )
      .setDepth(HEAVENBLOCKS_VISUAL_CONFIG.render.shrineDepth + 0.04)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    const tween = this.scene.tweens.add({
      targets: component,
      angle: 360,
      y: component.y - tileSize * 0.12,
      duration: HEAVENBLOCKS_VISUAL_CONFIG.artifacts.pulseDurationMs * 4,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.shrines.set(region.id, { shrine, component, tween, region });
  }

  setSkyPortalSlotActive(slotId, active) {
    return this.portalVisual?.setSkyPortalSlotActive?.(slotId, active) === true;
  }

  setGroundPortalUnlocked(levelId, routeUnlocked) {
    this.portalVisual?.setGroundPortalUnlocked?.(levelId, routeUnlocked);
  }

  refreshProgressionVisuals() {
    for (const [regionId, record] of this.shrines) {
      record.component.setVisible(this.progression?.isHeartAttuned?.(regionId) === true);
    }
    this.portalVisual?.refreshProgressionVisuals?.();
  }

  getInteraction(playerTile) {
    if (!playerTile) return null;
    for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions) {
      if (!this.progression?.isRegionUnlocked?.(region.id)) continue;
      const shrineTile = { tx: region.shrine.tx, ty: region.shrine.floorTy - 1 };
      if (
        distanceSquared(playerTile, shrineTile)
        > region.shrine.interactionRadiusTiles ** 2
      ) continue;
      const key = USER_SETTINGS.getKeyLabel("interact");
      if (!this.progression.isHeartAttuned(region.id)) {
        return {
          tx: region.shrine.tx,
          ty: region.shrine.floorTy - 1,
          type: "heavenblocksShrine",
          regionId: region.id,
          text: `Press ${key} to attune ${region.displayName} Heart`,
        };
      }
      if (region.id === HEAVENBLOCKS_PROGRESSION_CONFIG.interaction.forgeRegionId) {
        return {
          tx: region.shrine.tx,
          ty: region.shrine.floorTy - 1,
          type: "heavenblocksForge",
          regionId: region.id,
          text: `Press ${key} to open the Arc Forge`,
        };
      }
      return {
        tx: region.shrine.tx,
        ty: region.shrine.floorTy - 1,
        type: "heavenblocksHeart",
        regionId: region.id,
        text: `${region.displayName} Heart attuned`,
        used: true,
      };
    }
    return null;
  }

  handleInteraction(interaction) {
    if (!interaction?.regionId) return { success: false, reason: "missing-interaction" };
    if (interaction.type === "heavenblocksForge") {
      this.onOpenForge?.();
      return { success: true, type: "heavenblocksForge" };
    }
    if (interaction.type === "heavenblocksShrine") {
      const result = this.progression?.attuneHeart?.(interaction.regionId);
      if (result?.success) {
        this.refreshProgressionVisuals();
        this.playHeartAttunement(interaction.regionId);
      }
      return { ...result, type: "heavenblocksShrine" };
    }
    return { success: false, reason: "already-attuned" };
  }

  update(playerTile) {
    if (!playerTile || !this.created) return;
    const region = getHeavenblocksRegionAt(playerTile.tx, playerTile.ty);
    if (!region || !this.progression?.isRegionUnlocked?.(region.id)) return;
    this.progression.markDiscovered(region.id, {
      onDiscovered: () => this.playRegionArrival(region.id),
    });
  }

  playRelicDiscovery(discovery) {
    this.fx?.playRelicDiscovery?.(discovery);
  }

  playRegionUnlock(regionId) {
    this.refreshProgressionVisuals();
    this.fx?.playRegionUnlock?.(regionId);
  }

  playRegionArrival(regionId) {
    this.fx?.playRegionArrival?.(regionId);
  }

  playHeartAttunement(regionId) {
    const record = this.shrines.get(regionId);
    if (!record) return;
    record.component.setVisible(true);
    this.fx?.playHeartAttunement?.(
      regionId,
      { x: record.component.x, y: record.component.y }
    );
  }

  playLockedPortalFeedback(regionId, access) {
    this.fx?.playLockedPortalFeedback?.(regionId, access);
  }

  playCraftSuccess(result) {
    const record = this.shrines.get(HEAVENBLOCKS_PROGRESSION_CONFIG.interaction.forgeRegionId);
    if (!record) return;
    this.fx?.playCraftSuccess?.(
      result,
      { x: record.component.x, y: record.component.y },
      record.region.id
    );
  }

  getHealthSnapshot() {
    return {
      created: this.created,
      props: this.props.length,
      shrines: this.shrines.size,
      portals: this.portalVisual?.getHealthSnapshot?.() || null,
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
    this.created = false;
  }
}
