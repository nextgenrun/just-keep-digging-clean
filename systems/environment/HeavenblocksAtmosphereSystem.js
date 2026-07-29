import { HEAVENBLOCKS_WORLD_CONFIG } from "../../values/heavenblocksWorldConfig.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../../values/heavenblocksVisualConfig.js";

export class HeavenblocksAtmosphereSystem {
  constructor(scene, config = HEAVENBLOCKS_VISUAL_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.records = new Map();
    this.created = false;
  }

  create() {
    const tileSize = this.scene.config.tileSize;
    for (const region of HEAVENBLOCKS_WORLD_CONFIG.regions) {
      const biome = this.config.biomes[region.id];
      if (!biome || !this.scene.textures.exists(biome.backgroundKey)) continue;
      const widthTiles = Math.max(
        this.config.atmosphere.displayWidthTiles,
        (region.bounds.right - region.bounds.left + 1)
          * this.config.atmosphere.regionWidthScale
      );
      const heightTiles = Math.max(
        this.config.atmosphere.displayHeightTiles,
        (region.bounds.bottom - region.bounds.top + 1)
          * this.config.atmosphere.regionHeightScale
      );
      const baseX = (region.centerTileX + 0.5) * tileSize;
      const baseY = ((region.bounds.top + region.bounds.bottom + 1) * 0.5) * tileSize;
      const image = this.scene.add.image(baseX, baseY, biome.backgroundKey)
        .setDisplaySize(widthTiles * tileSize, heightTiles * tileSize)
        .setDepth(this.config.render.backgroundDepth)
        .setAlpha(this.config.atmosphere.alpha);
      const tween = this.scene.tweens.add({
        targets: image,
        x: baseX + this.config.atmosphere.driftXTiles * tileSize,
        y: baseY + this.config.atmosphere.driftYTiles * tileSize,
        duration: this.config.atmosphere.driftDurationMs + region.order * 730,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      this.records.set(region.id, { image, tween, region, baseX, baseY });
    }
    this.created = true;
    return this.records.size;
  }

  update() {
    if (!this.created) return;
    const camera = this.scene.cameras.main;
    const tileSize = this.scene.config.tileSize;
    const cullY = (
      HEAVENBLOCKS_WORLD_CONFIG.topAirRows
      + this.config.atmosphere.surfaceCullRows
    ) * tileSize;
    const surfaceVisible = camera.worldView?.y < cullY;
    for (const record of this.records.values()) {
      record.image.setVisible(surfaceVisible);
    }
  }

  getHealthSnapshot() {
    return {
      created: this.created,
      backgroundCount: this.records.size,
      expectedBackgroundCount: HEAVENBLOCKS_WORLD_CONFIG.regions.length,
    };
  }

  destroy() {
    for (const record of this.records.values()) {
      record.tween?.remove();
      record.image?.destroy();
    }
    this.records.clear();
    this.created = false;
  }
}
