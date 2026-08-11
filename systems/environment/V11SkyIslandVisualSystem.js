import { V11_SKY_ISLAND_LAYOUT } from "../../values/v11SkyIslandLayout.js";
import {
  HEAVENBLOCKS_VISUAL_CONFIG,
  resolveHeavenblocksVisualsEnabled,
} from "../../values/heavenblocksVisualConfig.js";
import { isGameplayLevelEnabled } from "../../values/gameplayDevFlags.js";

export class V11SkyIslandVisualSystem {
  constructor(
    scene,
    layout = V11_SKY_ISLAND_LAYOUT,
    heavenblocksConfig = HEAVENBLOCKS_VISUAL_CONFIG
  ) {
    this.scene = scene;
    this.layout = layout;
    this.heavenblocksConfig = heavenblocksConfig;
    this.sprites = [];
    this.groundPortalSprites = new Map();
    this.heavenblockSprites = new Map();
    this.heavenblocksRequested = false;
    this.heavenblocksCreated = false;
    this.heavenblocksLoadHandler = null;
    this.destroyed = false;
  }

  create() {
    if (this.layout.enabled) {
      const tileSize = this.scene.config.tileSize;

      for (const level of this.layout.levels) {
        if (!isGameplayLevelEnabled(level.levelId)) continue;
        this.addAuthoredImage({
          key: level.platformKey,
          left: level.leftTile * tileSize,
          bottom: level.bottomTile * tileSize,
          width: level.widthTiles * tileSize,
          height: level.heightTiles * tileSize,
          depth: this.layout.platformDepth,
        });

        for (const slot of level.portalSlots) {
          this.addAuthoredImage({
            key: level.portalKey,
            left: slot.leftTile * tileSize,
            bottom: slot.bottomTile * tileSize,
            width: slot.widthTiles * tileSize,
            height: slot.heightTiles * tileSize,
            depth: this.layout.portalDepth,
          });
        }
      }
    }

    this.createHeavenblocks();
  }

  addAuthoredImage({ key, left, bottom, width, height, depth }) {
    if (!this.scene.textures.exists(key)) {
      console.warn(`[V11SkyIslandVisualSystem] Missing texture: ${key}`);
      return null;
    }
    const image = this.scene.add.image(left, bottom, key)
      .setOrigin(0, 1)
      .setDepth(depth)
      .setDisplaySize(width, height);
    this.sprites.push(image);
    return image;
  }

  createHeavenblocks() {
    if (this.heavenblocksRequested) return;
    if (!resolveHeavenblocksVisualsEnabled(this.heavenblocksConfig)) return;

    this.heavenblocksRequested = true;
    const assets = this.heavenblocksConfig.regions.flatMap((region) => region.layers);
    const missingAssets = assets.filter((asset) => !this.scene.textures.exists(asset.key));

    if (missingAssets.length === 0) {
      this.addHeavenblockImages();
      return;
    }

    for (const asset of missingAssets) {
      this.scene.load.image(asset.key, asset.path);
    }

    this.heavenblocksLoadHandler = () => {
      this.heavenblocksLoadHandler = null;
      if (!this.destroyed) this.addHeavenblockImages();
    };
    this.scene.load.once(Phaser.Loader.Events.COMPLETE, this.heavenblocksLoadHandler);
    if (!this.scene.load.isLoading()) this.scene.load.start();
  }

  addHeavenblockImages() {
    if (this.heavenblocksCreated || this.destroyed) return;
    this.heavenblocksCreated = true;
    const tileSize = this.scene.config.tileSize;

    for (const region of this.heavenblocksConfig.regions) {
      const regionSprites = [];
      for (const layer of region.layers) {
        if (!this.scene.textures.exists(layer.key)) {
          console.warn(`[V11SkyIslandVisualSystem] Missing Heavenblock texture: ${layer.key}`);
          continue;
        }

        const displayWidth = region.displayWidthPx * layer.overscan;
        const displayHeight = region.displayHeightPx * layer.overscan;
        const offsetX = (region.displayWidthPx - displayWidth) / 2;
        const offsetY = (region.displayHeightPx - displayHeight) / 2;
        const image = this.scene.add.image(
          region.leftTile * tileSize + offsetX,
          region.topTile * tileSize + offsetY,
          layer.key
        )
          .setOrigin(0, 0)
          .setDepth(layer.depth)
          .setAlpha(layer.alpha)
          .setDisplaySize(displayWidth, displayHeight);
        image.name = `${region.id}:${layer.key}`;
        this.sprites.push(image);
        regionSprites.push(image);
      }
      this.heavenblockSprites.set(region.id, regionSprites);
    }
  }

  setGroundPortalUnlocked(levelId, unlocked) {
    const existing = this.groundPortalSprites.get(levelId);
    if (!isGameplayLevelEnabled(levelId)) {
      existing?.destroy();
      this.sprites = this.sprites.filter((sprite) => sprite !== existing);
      this.groundPortalSprites.delete(levelId);
      return null;
    }
    if (!unlocked) {
      if (!existing) return null;
      existing.destroy();
      this.sprites = this.sprites.filter((sprite) => sprite !== existing);
      this.groundPortalSprites.delete(levelId);
      return null;
    }
    if (existing) return existing;

    const level = this.layout.levels.find((entry) => entry.levelId === levelId);
    const portal = level?.groundPortal;
    if (!level || !portal) return null;
    const tileSize = this.scene.config.tileSize;
    const image = this.addAuthoredImage({
      key: level.portalKey,
      left: portal.leftTile * tileSize,
      bottom: portal.bottomTile * tileSize,
      width: portal.widthTiles * tileSize,
      height: portal.heightTiles * tileSize,
      depth: this.layout.portalDepth,
    });
    if (!image) return null;
    image.name = portal.id;
    this.groundPortalSprites.set(levelId, image);
    return image;
  }

  destroy() {
    this.destroyed = true;
    if (this.heavenblocksLoadHandler) {
      this.scene.load.off(Phaser.Loader.Events.COMPLETE, this.heavenblocksLoadHandler);
      this.heavenblocksLoadHandler = null;
    }
    this.sprites.forEach((sprite) => sprite.destroy());
    this.sprites = [];
    this.groundPortalSprites.clear();
    this.heavenblockSprites.clear();
  }
}
