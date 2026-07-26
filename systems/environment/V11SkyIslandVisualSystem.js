import { V11_SKY_ISLAND_LAYOUT } from "../../values/v11SkyIslandLayout.js";

export class V11SkyIslandVisualSystem {
  constructor(scene, layout = V11_SKY_ISLAND_LAYOUT) {
    this.scene = scene;
    this.layout = layout;
    this.sprites = [];
    this.groundPortalSprites = new Map();
  }

  create() {
    if (this.layout.enabled) {
      const tileSize = this.scene.config.tileSize;

      for (const level of this.layout.levels) {
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

  setGroundPortalUnlocked(levelId, unlocked) {
    const existing = this.groundPortalSprites.get(levelId);
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
    this.sprites.forEach((sprite) => sprite.destroy());
    this.sprites = [];
    this.groundPortalSprites.clear();
  }
}
