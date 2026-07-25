import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  START_ZONE_SCENIC_BACKGROUND,
  resolveStartZoneScenicBackgroundEnabled,
} from "../../values/startZoneScenicBackground.js";

/** Keeps the approved NPC-town scenic plate behind live gameplay. */
export class StartZoneScenicBackgroundSystem {
  constructor(scene, config = START_ZONE_SCENIC_BACKGROUND) {
    this.scene = scene;
    this.config = config;
    this.image = null;
    this.enabled = false;
  }

  create() {
    this.enabled = resolveStartZoneScenicBackgroundEnabled(this.config);
    const textureKey = ASSET_KEYS.background.startZoneScenic;
    if (!this.enabled || !this.scene.textures.exists(textureKey)) {
      if (this.enabled) {
        console.warn(`[StartZoneScenicBackgroundSystem] Missing texture: ${textureKey}`);
      }
      return false;
    }

    const texture = this.scene.textures.get(textureKey);
    const source = texture?.getSourceImage?.();
    if (!source?.width || !source?.height) return false;
    const frameName = this.config.cropFrameName;
    const sourceGroundY = Math.round(source.height * this.config.sourceGroundFraction);
    if (!texture.has(frameName)) {
      texture.add(frameName, 0, 0, 0, source.width, sourceGroundY);
    }

    const tileSize = this.scene.config.tileSize;
    const anchor = this.config.worldAnchor;
    const displayWidth = anchor.widthTiles * tileSize;
    const displayHeight = displayWidth * sourceGroundY / source.width;
    const centerX = (anchor.leftTileX + anchor.widthTiles / 2) * tileSize;
    const surfaceY = this.scene.config.topAirRows * tileSize;
    this.image = this.scene.add.image(centerX, surfaceY, textureKey, frameName)
      .setOrigin(0.5, 1)
      .setDepth(this.config.renderDepth)
      .setDisplaySize(displayWidth, displayHeight);
    this.image.name = "npc-town-scenic-world-background";
    this.update();
    console.info("[StartZoneScenicBackgroundSystem] World-anchored; use ?townScenic=0 to roll back");
    return true;
  }

  update() {
    if (!this.image || !this.enabled) return;
    const tileSize = this.scene.config.tileSize;
    const playerTileY = (this.scene.player?.y ?? this.scene.config.spawnTileY * tileSize) / tileSize;
    const maxSurfaceTileY = this.scene.config.topAirRows + this.config.surfaceMaxDepthTiles;
    this.image.setVisible(playerTileY <= maxSurfaceTileY);
  }

  destroy() {
    this.enabled = false;
    this.image?.destroy();
    this.image = null;
  }
}
