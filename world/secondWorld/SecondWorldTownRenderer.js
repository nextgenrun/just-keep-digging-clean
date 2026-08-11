import { ASSET_KEYS } from "../../values/assetKeys.js";
import { SECOND_WORLD_TOWN_CONFIG } from "../../values/secondWorldTown.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

export class SecondWorldTownRenderer {
  constructor(scene, config = SECOND_WORLD_TOWN_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.backdrop = null;
    this.entryPulse = null;
  }

  create() {
    if (!isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO)) return false;
    if (!this.config.enabled) return;

    const key = ASSET_KEYS.background.secondWorldTown;
    const source = this.scene.textures.get(key)?.getSourceImage();
    const tileSize = this.scene.config.tileSize;
    const interior = this.config.interiorBounds;
    const expectedWidth = interior.width * tileSize;
    const expectedHeight = interior.height * tileSize;

    if (!source) {
      console.warn(`[SecondWorldTownRenderer] Missing backsheet texture: ${key}`);
      return;
    }

    if (source.width !== expectedWidth || source.height !== expectedHeight) {
      console.error(
        `[SecondWorldTownRenderer] Backsheet size mismatch: expected ${expectedWidth}x${expectedHeight}, `
        + `received ${source.width}x${source.height}`
      );
      return;
    }

    this.backdrop = this.scene.add.image(
      interior.x * tileSize,
      interior.y * tileSize,
      key
    ).setOrigin(0, 0).setDepth(this.config.renderDepth);

    this.createEntryPulse(tileSize);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    return true;
  }

  createEntryPulse(tileSize) {
    const { entrance, entryPulse, renderDepth } = this.config;
    const width = Math.max(1, tileSize * entryPulse.widthTileFraction);
    const height = entrance.height * tileSize;
    this.entryPulse = this.scene.add.rectangle(
      entrance.x * tileSize + width * 0.5,
      entrance.topY * tileSize + height * 0.5,
      width,
      height,
      entryPulse.color,
      entryPulse.alpha
    ).setDepth(renderDepth + 1).setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: this.entryPulse,
      alpha: entryPulse.minimumAlpha,
      duration: entryPulse.durationMs,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  destroy() {
    this.backdrop?.destroy();
    this.entryPulse?.destroy();
    this.backdrop = null;
    this.entryPulse = null;
  }
}
