import { ASSET_KEYS } from "../../values/assetKeys.js";
import { SURFACE_TUNNEL_DOOR_CONFIG } from "../../values/surfaceTunnelDoorConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

const WORLD_TWO_UPGRADE_ID = "worldTwoTunnelAccess";

export class SurfaceTunnelDoorSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.enabled = isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO);
    this.tx = options.tx ?? SURFACE_TUNNEL_DOOR_CONFIG.tileX;
    this.topTy = options.topTy ?? SURFACE_TUNNEL_DOOR_CONFIG.topTileY;
    this.heightTiles = options.heightTiles ?? SURFACE_TUNNEL_DOOR_CONFIG.heightTiles;
    this.sprite = null;
  }

  create() {
    if (!this.enabled) {
      this.syncFromUpgrade(true);
      return false;
    }
    const scene = this.scene;
    const tileSize = scene.config.tileSize;
    this.sprite = scene.add
      .image((this.tx + 0.5) * tileSize, (this.topTy + this.heightTiles) * tileSize, ASSET_KEYS.tiles.townExit)
      .setOrigin(0.5, 1)
      .setDepth(8)
      .setDisplaySize(tileSize * 1.08, tileSize * this.heightTiles);
    this.syncFromUpgrade();
    return true;
  }

  isUnlocked() {
    return this.enabled && (
      this.scene.upgradeSystem?.godModeActive === true
      || this.scene.upgradeSystem?.getUpgradeLevel?.(WORLD_TWO_UPGRADE_ID) > 0
    );
  }

  open(options = {}) {
    if (!this.enabled) {
      this.syncFromUpgrade(true);
      return false;
    }
    this.syncFromUpgrade(true);
    if (options.flash !== false) {
      this.scene.hudSystem?.flashStatus?.("World Two tunnel opened!", "#44ff88", 2200);
    }
    return true;
  }

  syncFromUpgrade(forceRefresh = false) {
    const unlocked = this.enabled && this.isUnlocked();
    const tileType = unlocked ? TILE_TYPES.AIR : TILE_TYPES.BEDROCK;
    for (let offset = 0; offset < this.heightTiles; offset += 1) {
      const ty = this.topTy + offset;
      if (this.scene.worldModel?.getTileType?.(this.tx, ty) !== tileType) {
        this.scene.worldModel?.setTile?.(this.tx, ty, tileType, 0);
        this.scene.worldRenderer?.applyTileUpdate?.(this.tx, ty);
      } else if (forceRefresh) {
        this.scene.worldRenderer?.applyTileUpdate?.(this.tx, ty);
      }
    }
    this.sprite?.setVisible(!unlocked);
  }

  destroy() {
    this.sprite?.destroy();
    this.sprite = null;
  }
}
