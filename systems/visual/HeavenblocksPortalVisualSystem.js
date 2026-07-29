import { HEAVENBLOCKS_WORLD_CONFIG } from "../../values/heavenblocksWorldConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../../values/heavenblocksVisualConfig.js";

export class HeavenblocksPortalVisualSystem {
  constructor(scene, progressionSystem) {
    this.scene = scene;
    this.progression = progressionSystem;
    this.portalSockets = new Map();
    this.groundPortals = new Map();
    this.routeUnlockedByLevel = new Map();
  }

  create() {
    for (const level of HEAVENBLOCKS_WORLD_CONFIG.levels) {
      for (const slot of level.portalSlots) this._createPortalSocket(slot);
    }
  }

  _createPortalSocket(slot) {
    const tileSize = this.scene.config.tileSize;
    const visual = HEAVENBLOCKS_VISUAL_CONFIG;
    const biome = visual.biomes[slot.regionId];
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
    this.portalSockets.set(slot.id, { image, slot, tween: null, active: false });
  }

  setSkyPortalSlotActive(slotId, active) {
    const record = this.portalSockets.get(String(slotId));
    if (!record) return false;
    const visual = HEAVENBLOCKS_VISUAL_CONFIG.artifacts;
    record.active = active === true;
    record.tween?.remove();
    record.tween = null;
    if (!record.active) {
      record.image
        .setAlpha(visual.inactivePortalAlpha)
        .setTint(visual.lockedTint)
        .setScale(1);
      return true;
    }
    record.image.clearTint().setAlpha(visual.activePortalAlpha);
    record.tween = this._addPulse(record.image);
    return true;
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
    const access = this.progression?.getLevelAccessState?.(levelId) || { allowed: false };
    let record = existing || this._createGroundPortal(level);
    record.tween?.remove();
    record.tween = null;
    if (!access.allowed) {
      record.image
        .setTint(HEAVENBLOCKS_VISUAL_CONFIG.artifacts.lockedTint)
        .setAlpha(HEAVENBLOCKS_VISUAL_CONFIG.artifacts.inactivePortalAlpha)
        .setScale(1);
      return;
    }
    record.image.clearTint().setAlpha(1);
    record.tween = this._addPulse(record.image);
  }

  _createGroundPortal(level) {
    const tileSize = this.scene.config.tileSize;
    const portal = level.groundPortal;
    const biome = HEAVENBLOCKS_VISUAL_CONFIG.biomes[level.regionIds[0]];
    const image = this.scene.add.image(
      (portal.leftTile + portal.widthTiles * 0.5) * tileSize,
      portal.bottomTile * tileSize,
      biome.keys.portal
    )
      .setOrigin(0.5, 1)
      .setDisplaySize(portal.widthTiles * tileSize, portal.heightTiles * tileSize)
      .setDepth(HEAVENBLOCKS_VISUAL_CONFIG.render.portalDepth);
    const record = { image, tween: null };
    this.groundPortals.set(level.levelId, record);
    return record;
  }

  _addPulse(image) {
    return this.scene.tweens.add({
      targets: image,
      alpha: 0.74,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: HEAVENBLOCKS_VISUAL_CONFIG.artifacts.pulseDurationMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  refreshProgressionVisuals() {
    for (const levelId of this.routeUnlockedByLevel.keys()) {
      this._syncGroundPortal(levelId);
    }
  }

  getHealthSnapshot() {
    return {
      portalSockets: this.portalSockets.size,
      activeSockets: [...this.portalSockets.values()].filter((record) => record.active).length,
      groundPortals: this.groundPortals.size,
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
  }
}
