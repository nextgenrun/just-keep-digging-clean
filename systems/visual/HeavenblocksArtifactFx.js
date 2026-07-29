import {
  HEAVENBLOCKS_WORLD_CONFIG,
  getHeavenblocksRegionAt,
  getHeavenblocksRegionById,
} from "../../values/heavenblocksWorldConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../../values/heavenblocksVisualConfig.js";
import { HEAVENBLOCKS_PROGRESSION_CONFIG } from "../../values/heavenblocksProgressionConfig.js";

export class HeavenblocksArtifactFx {
  constructor(scene) {
    this.scene = scene;
    this.ephemeral = new Set();
  }

  playRelicDiscovery(discovery) {
    const region = getHeavenblocksRegionAt(discovery.tx, discovery.ty)
      || HEAVENBLOCKS_WORLD_CONFIG.regions[
        discovery.tx < 63 ? 0 : discovery.tx < 120 ? 1 : 2
      ];
    const biome = HEAVENBLOCKS_VISUAL_CONFIG.biomes[region.id];
    const world = this.scene.worldModel.tileToWorld(discovery.tx, discovery.ty);
    this.scene.cameras.main.flash(180, 190, 238, 255, false);
    this._burst(world.x, world.y, biome.keys.crystalCluster, biome.tint);
    this.scene.hudSystem?.flashStatus?.(
      `ANCIENT RELIC ${discovery.total}/${HEAVENBLOCKS_PROGRESSION_CONFIG.relicUnlockCount}  •  SKY SEAL RESONATING`,
      "#9defff",
      HEAVENBLOCKS_VISUAL_CONFIG.discoveryFx.labelDurationMs
    );
  }

  playRegionUnlock(regionId) {
    const region = getHeavenblocksRegionById(regionId);
    if (!region) return;
    const biome = HEAVENBLOCKS_VISUAL_CONFIG.biomes[region.id];
    const anchor = region.barrier
      ? {
          x: (region.barrier.tx + 0.5) * this.scene.config.tileSize,
          y: (region.barrier.topTy + region.barrier.height * 0.5)
            * this.scene.config.tileSize,
        }
      : this._groundPortalWorldPoint(region.levelId);
    this.scene.cameras.main.flash(320, 220, 246, 255, false);
    this._burst(anchor.x, anchor.y, biome.keys.portal, biome.tint);
    this._showTitle(`ACCESS UNLOCKED  •  ${region.displayName.toUpperCase()}`, biome.tint);
    this.scene.uiNotifications?.success?.(`${region.displayName} unlocked  •  The sky seal has opened.`, {
      durationMs: HEAVENBLOCKS_VISUAL_CONFIG.artifacts.unlockTitleDurationMs,
    });
  }

  playRegionArrival(regionId) {
    const region = getHeavenblocksRegionById(regionId);
    if (!region) return;
    const biome = HEAVENBLOCKS_VISUAL_CONFIG.biomes[region.id];
    this.scene.cameras.main.flash(260, 225, 244, 255, false);
    this._showTitle(`${region.displayName.toUpperCase()}  •  REALM DISCOVERED`, biome.tint);
    const point = this.scene.worldModel.tileToWorld(
      region.arrivalTile.tx,
      region.arrivalTile.ty
    );
    this._burst(point.x, point.y, biome.keys.capstone, biome.tint);
  }

  playHeartAttunement(regionId, point) {
    const region = getHeavenblocksRegionById(regionId);
    const biome = HEAVENBLOCKS_VISUAL_CONFIG.biomes[regionId];
    if (!region || !biome || !point) return;
    this._burst(point.x, point.y, biome.keys.component, biome.tint);
    this._showTitle(`${region.displayName.toUpperCase()} HEART ATTUNED`, biome.tint);
  }

  playLockedPortalFeedback(regionId, access) {
    if (!getHeavenblocksRegionById(regionId)) return;
    const message = access?.reason === "relics"
      ? `SKY SEAL  •  ${access.have}/${access.required} ANCIENT RELICS`
      : `SKY SEAL  •  ATTUNE ${String(access?.requiredRegionId || "PRIOR").toUpperCase()} HEART`;
    this.scene.hudSystem?.flashStatus?.(
      message,
      "#ff8ea6",
      HEAVENBLOCKS_PROGRESSION_CONFIG.interaction.blockedStatusMs
    );
    this.scene.cameras.main.shake(180, 0.004);
  }

  playCraftSuccess(result, point, regionId) {
    const biome = HEAVENBLOCKS_VISUAL_CONFIG.biomes[regionId];
    if (!point || !biome) return;
    this._burst(point.x, point.y, biome.keys.component, biome.tint);
    this._showTitle(`${result.recipe.displayName.toUpperCase()} FORGED`, biome.tint);
  }

  _groundPortalWorldPoint(levelId) {
    const portal = HEAVENBLOCKS_WORLD_CONFIG.levels.find(
      (level) => level.levelId === levelId
    )?.groundPortal;
    const tileSize = this.scene.config.tileSize;
    return {
      x: (portal.leftTile + portal.widthTiles * 0.5) * tileSize,
      y: (portal.bottomTile - portal.heightTiles * 0.5) * tileSize,
    };
  }

  _burst(x, y, textureKey, tint) {
    const config = HEAVENBLOCKS_VISUAL_CONFIG.discoveryFx;
    const tileSize = this.scene.config.tileSize;
    for (let ringIndex = 0; ringIndex < config.ringCount; ringIndex += 1) {
      const ring = this.scene.add.circle(x, y, tileSize * 0.28, tint, 0)
        .setStrokeStyle(Math.max(2, tileSize * 0.035), tint, 0.9)
        .setDepth(HEAVENBLOCKS_VISUAL_CONFIG.render.portalDepth + 0.2);
      this.ephemeral.add(ring);
      this.scene.tweens.add({
        targets: ring,
        scale: config.ringRadiusTiles + ringIndex * 0.7,
        alpha: 0,
        duration: config.durationMs + ringIndex * 150,
        ease: "Power2.out",
        onComplete: () => this._destroyEphemeral(ring),
      });
    }
    for (let index = 0; index < config.particleCount; index += 1) {
      const angle = (index / config.particleCount) * Math.PI * 2;
      const distance = tileSize * (1.1 + (index % 5) * 0.28);
      const shard = this.scene.add.image(x, y, textureKey)
        .setDisplaySize(tileSize * 0.22, tileSize * 0.22)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(HEAVENBLOCKS_VISUAL_CONFIG.render.portalDepth + 0.24);
      this.ephemeral.add(shard);
      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        angle: 180 + index * 17,
        duration: config.durationMs,
        ease: "Cubic.out",
        onComplete: () => this._destroyEphemeral(shard),
      });
    }
  }

  _showTitle(label, tint) {
    const text = this.scene.add.text(
      this.scene.scale.width * 0.5,
      HEAVENBLOCKS_VISUAL_CONFIG.artifacts.titleY,
      label,
      {
        fontFamily: "Bahnschrift SemiCondensed, Trebuchet MS, sans-serif",
        fontSize: "28px",
        fontStyle: "bold",
        color: `#${tint.toString(16).padStart(6, "0")}`,
        stroke: "#06101a",
        strokeThickness: 7,
        letterSpacing: 1.4,
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3600)
      .setAlpha(0)
      .setScale(0.86);
    this.ephemeral.add(text);
    this.scene.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1,
      duration: 260,
      yoyo: true,
      hold: HEAVENBLOCKS_VISUAL_CONFIG.artifacts.unlockTitleDurationMs,
      ease: "Power2.out",
      onComplete: () => this._destroyEphemeral(text),
    });
  }

  _destroyEphemeral(object) {
    this.ephemeral.delete(object);
    object?.destroy?.();
  }

  destroy() {
    for (const object of this.ephemeral) object?.destroy?.();
    this.ephemeral.clear();
  }
}
