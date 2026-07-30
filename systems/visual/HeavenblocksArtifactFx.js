import { HEAVENBLOCKS_ACCESS_CONFIG } from "../../values/heavenblocksAccessConfig.js";
import {
  HEAVENBLOCK_REGION_IDS,
} from "../../values/heavenblocksProgressionConfig.js";
import {
  HEAVENBLOCKS_WORLD_CONFIG,
  getHeavenblocksRegionAt,
  getHeavenblocksRegionById,
} from "../../values/heavenblocksWorldConfig.js";
import {
  HEAVENBLOCKS_VISUAL_CONFIG,
  resolveHeavenblocksVisualsEnabled,
} from "../../values/heavenblocksVisualConfig.js";

function colorComponents(color) {
  return {
    red: (color >> 16) & 255,
    green: (color >> 8) & 255,
    blue: color & 255,
  };
}

export class HeavenblocksArtifactFx {
  constructor(scene, config = HEAVENBLOCKS_VISUAL_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = resolveHeavenblocksVisualsEnabled(config);
    this.ephemeral = new Set();
  }

  playRelicDiscovery(discovery) {
    const region = getHeavenblocksRegionAt(discovery?.tx, discovery?.ty);
    if (!this.enabled || !region) return false;
    const biome = this.config.biomes[region.id];
    const point = this.scene.worldModel.tileToWorld(discovery.tx, discovery.ty);
    this._flashCamera(biome.tint);
    this._burst(point.x, point.y, biome.keys.relicVault, biome.tint);
    this._showTitle(
      `ANCIENT RELIC ${discovery.total}  •  SKY SEAL RESONATING`,
      biome.tint,
      this.config.discoveryFx.labelDurationMs,
    );
    return true;
  }

  playRegionUnlock(regionId) {
    const region = getHeavenblocksRegionById(regionId);
    if (!this.enabled || !region) return;
    const biome = this.config.biomes[region.id];
    const anchor = region.barrier
      ? {
          x: (region.barrier.tx + 0.5) * this.scene.config.tileSize,
          y: (region.barrier.topTy + region.barrier.height * 0.5)
            * this.scene.config.tileSize,
        }
      : this.scene.worldModel.tileToWorld(
          region.arrivalTile.tx,
          region.arrivalTile.ty,
        );
    this._flashCamera(biome.tint);
    this._burst(anchor.x, anchor.y, biome.keys.portal, biome.tint);
    this._showTitle(
      `ACCESS UNLOCKED  •  ${region.displayName.toUpperCase()}`,
      biome.tint,
      this.config.artifacts.unlockTitleDurationMs,
    );
  }

  playRegionArrival(regionId) {
    const region = getHeavenblocksRegionById(regionId);
    if (!this.enabled || !region) return;
    const biome = this.config.biomes[region.id];
    const point = this.scene.worldModel.tileToWorld(
      region.arrivalTile.tx,
      region.arrivalTile.ty,
    );
    this._flashCamera(biome.tint);
    this._burst(point.x, point.y, biome.keys.capstone, biome.tint);
    this._showTitle(
      `${region.displayName.toUpperCase()}  •  REALM DISCOVERED`,
      biome.tint,
      this.config.artifacts.arrivalTitleDurationMs,
    );
  }

  playComponentClaim(region) {
    const worldRegion = getHeavenblocksRegionById(region?.id);
    if (!this.enabled || !worldRegion) return;
    const biome = this.config.biomes[worldRegion.id];
    const point = this.scene.worldModel.tileToWorld(
      worldRegion.shrine.tx,
      worldRegion.shrine.floorTy - 1,
    );
    this._burst(point.x, point.y, biome.keys.component, biome.tint);
    this._showTitle(
      `${region.partLabel.toUpperCase()} ATTUNED`,
      biome.tint,
      this.config.artifacts.unlockTitleDurationMs,
    );
  }

  playVault(region, keystoneGranted) {
    const worldRegion = getHeavenblocksRegionById(region?.id);
    if (!this.enabled || !worldRegion) return;
    const biome = this.config.biomes[worldRegion.id];
    const point = this.scene.worldModel.tileToWorld(
      worldRegion.shrine.tx,
      worldRegion.shrine.floorTy - 1,
    );
    const tint = keystoneGranted ? 0xffffff : biome.tint;
    this._flashCamera(tint);
    this._burst(point.x, point.y, biome.keys.relicVault, tint);
    this._showTitle(
      keystoneGranted ? "ZENITH KEYSTONE FORGED" : "ARC VAULT OPENED",
      tint,
      this.config.artifacts.unlockTitleDurationMs,
    );
  }

  playLockedPortalFeedback(regionId, access = {}) {
    const region = getHeavenblocksRegionById(regionId);
    if (!this.enabled || !region) return;
    const label = access.reason === "relics"
      ? `SKY SEAL  •  ${access.have}/${access.required} ANCIENT RELICS`
      : `${region.displayName.toUpperCase()}  •  ROUTE SEALED`;
    this.scene.hudSystem?.flashStatus?.(
      label,
      "#ff8ea6",
      HEAVENBLOCKS_ACCESS_CONFIG.regionGuard.statusDurationMs,
    );
    this.scene.cameras.main.shake(
      this.config.discoveryFx.cameraShakeDurationMs,
      this.config.discoveryFx.cameraShakeIntensity,
    );
  }

  playCraftSuccess(result) {
    if (!this.enabled) return;
    const region = getHeavenblocksRegionById(HEAVENBLOCK_REGION_IDS.ANGEL)
      || HEAVENBLOCKS_WORLD_CONFIG.regions[0];
    const biome = this.config.biomes[region.id];
    const point = this.scene.worldModel.tileToWorld(
      region.shrine.tx,
      region.shrine.floorTy - 1,
    );
    this._burst(point.x, point.y, biome.keys.component, biome.tint);
    this._showTitle(
      `${String(result?.recipe?.name || "ARC CORE").toUpperCase()} FORGED`,
      biome.tint,
      this.config.artifacts.unlockTitleDurationMs,
    );
  }

  _flashCamera(tint) {
    const { red, green, blue } = colorComponents(tint);
    this.scene.cameras.main.flash(
      this.config.discoveryFx.cameraFlashDurationMs,
      red,
      green,
      blue,
      false,
    );
  }

  _burst(x, y, textureKey, tint) {
    if (!this.scene.textures?.exists?.(textureKey)) return;
    const config = this.config.discoveryFx;
    const tileSize = this.scene.config.tileSize;
    for (let ringIndex = 0; ringIndex < config.ringCount; ringIndex += 1) {
      const ring = this.scene.add.circle(
        x,
        y,
        tileSize * config.ringStartRadiusTiles,
        tint,
        0,
      )
        .setStrokeStyle(
          Math.max(config.ringMinimumStrokePx, tileSize * config.ringStrokeTiles),
          tint,
          0.9,
        )
        .setDepth(this.config.render.portalDepth + config.ringDepthOffset);
      this.ephemeral.add(ring);
      this.scene.tweens.add({
        targets: ring,
        scale: config.ringRadiusTiles + ringIndex * config.ringRadiusStepTiles,
        alpha: 0,
        duration: config.durationMs + ringIndex * config.ringDelayStepMs,
        ease: "Power2.out",
        onComplete: () => this._destroyEphemeral(ring),
      });
    }
    for (let index = 0; index < config.particleCount; index += 1) {
      const angle = (index / config.particleCount) * Math.PI * 2;
      const distance = tileSize * (
        config.particleStartDistanceTiles
        + (index % config.particleDistanceVariants) * config.particleDistanceStepTiles
      );
      const shard = this.scene.add.image(x, y, textureKey)
        .setDisplaySize(
          tileSize * config.particleSizeTiles,
          tileSize * config.particleSizeTiles,
        )
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(this.config.render.portalDepth + config.particleDepthOffset);
      this.ephemeral.add(shard);
      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        angle: config.particleRotationBaseDegrees
          + index * config.particleRotationStepDegrees,
        duration: config.durationMs,
        ease: "Cubic.out",
        onComplete: () => this._destroyEphemeral(shard),
      });
    }
  }

  _showTitle(label, tint, holdMs) {
    const config = this.config.artifacts;
    const text = this.scene.add.text(
      this.scene.scale.width * 0.5,
      config.titleY,
      label,
      {
        fontFamily: config.titleFontFamily,
        fontSize: `${config.titleFontSizePx}px`,
        fontStyle: config.titleFontStyle,
        color: `#${tint.toString(16).padStart(6, "0")}`,
        stroke: config.titleStrokeColor,
        strokeThickness: config.titleStrokeThickness,
        letterSpacing: config.titleLetterSpacing,
      },
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(config.titleDepth)
      .setAlpha(0)
      .setScale(config.titleStartScale);
    this.ephemeral.add(text);
    this.scene.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1,
      duration: config.titleFadeMs,
      yoyo: true,
      hold: holdMs,
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
