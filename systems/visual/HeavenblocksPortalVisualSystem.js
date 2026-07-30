import { HEAVENBLOCKS_WORLD_CONFIG } from "../../values/heavenblocksWorldConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../../values/heavenblocksVisualConfig.js";

export class HeavenblocksPortalVisualSystem {
  constructor(scene, progressionSystem) {
    this.scene = scene;
    this.progression = progressionSystem;
    this.portalSockets = new Map();
    this.groundPortals = new Map();
    this.routeUnlockedByLevel = new Map();
    this.missingTextureKeys = new Set();
    this.created = false;
  }

  create() {
    for (const level of HEAVENBLOCKS_WORLD_CONFIG.levels) {
      for (const slot of level.portalSlots) this._createPortalSocket(slot);
    }
    this.created = true;
  }

  _createPortalSocket(slot) {
    const tileSize = this.scene.config.tileSize;
    const visual = HEAVENBLOCKS_VISUAL_CONFIG;
    const biome = visual.biomes[slot.regionId];
    if (!biome?.keys?.portal || !this.scene.textures.exists(biome.keys.portal)) {
      if (biome?.keys?.portal) this.missingTextureKeys.add(biome.keys.portal);
      return;
    }
    const image = this.scene.add.image(
      (slot.leftTile + slot.widthTiles * 0.5) * tileSize,
      slot.bottomTile * tileSize,
      biome.keys.portal
    )
      .setOrigin(0.5, 1)
      .setDisplaySize(
        visual.artifacts.portalWidthTiles * tileSize,
        visual.artifacts.portalHeightTiles * tileSize
      )
      .setDepth(visual.render.portalDepth)
      .setAlpha(visual.artifacts.inactivePortalAlpha)
      .setTint(visual.artifacts.lockedTint);
    const baseScaleX = image.scaleX;
    const baseScaleY = image.scaleY;
    this.portalSockets.set(slot.id, {
      image,
      slot,
      tween: null,
      baseScaleX,
      baseScaleY,
      requestedActive: false,
      active: false,
    });
  }

  setSkyPortalSlotActive(slotId, active) {
    const record = this.portalSockets.get(String(slotId));
    if (!record) return false;
    record.requestedActive = active === true;
    this._syncPortalSocket(record);
    return true;
  }

  _syncPortalSocket(record) {
    const visual = HEAVENBLOCKS_VISUAL_CONFIG.artifacts;
    const regionUnlocked = this.progression?.isRegionUnlocked?.(
      record.slot.regionId,
    ) === true;
    record.active = record.requestedActive && regionUnlocked;
    record.tween?.remove();
    record.tween = null;
    if (!record.active) {
      record.image
        .setAlpha(visual.inactivePortalAlpha)
        .setTint(visual.lockedTint)
        .setScale(record.baseScaleX, record.baseScaleY);
      return;
    }
    record.image.clearTint().setAlpha(visual.activePortalAlpha);
    record.tween = this._addPulse(
      record.image,
      record.baseScaleX,
      record.baseScaleY,
    );
  }

  setGroundPortalUnlocked(levelId, routeUnlocked) {
    this.routeUnlockedByLevel.set(Number(levelId), routeUnlocked === true);
    this._syncGroundPortal(Number(levelId));
  }

  _syncGroundPortal(levelId) {
    const routeUnlocked = this.routeUnlockedByLevel.get(levelId) === true;
    const existing = this.groundPortals.get(levelId);
    if (!routeUnlocked) {
      existing?.tween?.remove();
      existing?.image?.destroy();
      this.groundPortals.delete(levelId);
      return;
    }
    const level = HEAVENBLOCKS_WORLD_CONFIG.levels.find(
      (entry) => entry.levelId === levelId
    );
    if (!level?.groundPortal) return;
    const regionId = level.regionIds[0];
    const accessAllowed = this.progression?.isRegionUnlocked?.(regionId) === true;
    let record = existing || this._createGroundPortal(level);
    if (!record) return;
    record.tween?.remove();
    record.tween = null;
    if (!accessAllowed) {
      record.image
        .setTint(HEAVENBLOCKS_VISUAL_CONFIG.artifacts.lockedTint)
        .setAlpha(HEAVENBLOCKS_VISUAL_CONFIG.artifacts.inactivePortalAlpha)
        .setScale(record.baseScaleX, record.baseScaleY);
      return;
    }
    record.image.clearTint().setAlpha(1);
    record.tween = this._addPulse(
      record.image,
      record.baseScaleX,
      record.baseScaleY,
    );
  }

  _createGroundPortal(level) {
    const tileSize = this.scene.config.tileSize;
    const portal = level.groundPortal;
    const biome = HEAVENBLOCKS_VISUAL_CONFIG.biomes[level.regionIds[0]];
    if (!biome?.keys?.portal || !this.scene.textures.exists(biome.keys.portal)) {
      if (biome?.keys?.portal) this.missingTextureKeys.add(biome.keys.portal);
      return null;
    }
    const image = this.scene.add.image(
      (portal.leftTile + portal.widthTiles * 0.5) * tileSize,
      portal.bottomTile * tileSize,
      biome.keys.portal
    )
      .setOrigin(0.5, 1)
      .setDisplaySize(portal.widthTiles * tileSize, portal.heightTiles * tileSize)
      .setDepth(HEAVENBLOCKS_VISUAL_CONFIG.render.portalDepth);
    const record = {
      image,
      tween: null,
      baseScaleX: image.scaleX,
      baseScaleY: image.scaleY,
    };
    this.groundPortals.set(level.levelId, record);
    return record;
  }

  _addPulse(image, baseScaleX, baseScaleY) {
    return this.scene.tweens.add({
      targets: image,
      alpha: HEAVENBLOCKS_VISUAL_CONFIG.artifacts.portalPulseAlpha,
      scaleX: baseScaleX * HEAVENBLOCKS_VISUAL_CONFIG.artifacts.portalPulseScale,
      scaleY: baseScaleY * HEAVENBLOCKS_VISUAL_CONFIG.artifacts.portalPulseScale,
      duration: HEAVENBLOCKS_VISUAL_CONFIG.artifacts.pulseDurationMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  refreshProgressionVisuals() {
    for (const record of this.portalSockets.values()) {
      this._syncPortalSocket(record);
    }
    for (const levelId of this.routeUnlockedByLevel.keys()) {
      this._syncGroundPortal(levelId);
    }
  }

  getHealthSnapshot() {
    return {
      portalSockets: this.portalSockets.size,
      activeSockets: [...this.portalSockets.values()].filter((record) => record.active).length,
      groundPortals: this.groundPortals.size,
      expectedPortalSockets: HEAVENBLOCKS_WORLD_CONFIG.levels.reduce(
        (total, level) => total + level.portalSlots.length,
        0,
      ),
      missingTextureKeys: [...this.missingTextureKeys],
      ready: this.created
        && this.portalSockets.size === HEAVENBLOCKS_WORLD_CONFIG.levels.reduce(
          (total, level) => total + level.portalSlots.length,
          0,
        )
        && this.missingTextureKeys.size === 0,
    };
  }

  destroy() {
    for (const record of this.portalSockets.values()) {
      record.tween?.remove();
      record.image?.destroy();
    }
    for (const record of this.groundPortals.values()) {
      record.tween?.remove();
      record.image?.destroy();
    }
    this.portalSockets.clear();
    this.groundPortals.clear();
    this.routeUnlockedByLevel.clear();
    this.missingTextureKeys.clear();
    this.created = false;
  }
}
