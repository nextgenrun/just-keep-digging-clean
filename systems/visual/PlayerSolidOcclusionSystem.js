import { PLAYER_TILE_CONTACT_CONFIG } from "../../values/playerTileContact.js";

function finiteBound(primary, fallback) {
  return Number.isFinite(primary) ? primary : fallback;
}

export class PlayerSolidOcclusionSystem {
  constructor(
    scene,
    player,
    worldModel,
    profile,
    config = PLAYER_TILE_CONTACT_CONFIG.solidOcclusion,
  ) {
    this.scene = scene;
    this.player = player;
    this.worldModel = worldModel;
    this.config = config;
    this.enabled = config.enabled === true && profile?.isUalNative === true;
    this.graphics = null;
    this.mask = null;
    this._onPostUpdate = null;
  }

  create() {
    const phaser = globalThis.Phaser;
    const rendererType = this.scene?.game?.renderer?.type;
    if (!this.enabled || !phaser || rendererType !== phaser.WEBGL || this.player?.mask) return false;

    this.graphics = this.scene.make.graphics({ add: false });
    this.mask = this.graphics.createGeometryMask().setInvertAlpha(true);
    this.player.setMask(this.mask);
    this._onPostUpdate = () => this.update();
    this.scene.events.on(phaser.Scenes.Events.POST_UPDATE, this._onPostUpdate);
    this.update();
    return true;
  }

  update() {
    if (!this.mask || !this.graphics || !this.player?.active || !this.worldModel) return 0;
    const tileSize = this.scene?.config?.tileSize;
    const bounds = this.player.getBounds?.();
    if (!Number.isFinite(tileSize) || tileSize <= 0 || !bounds) return 0;

    const left = finiteBound(bounds.left, bounds.x);
    const top = finiteBound(bounds.top, bounds.y);
    const right = finiteBound(bounds.right, bounds.x + bounds.width);
    const bottom = finiteBound(bounds.bottom, bounds.y + bounds.height);
    if (![left, top, right, bottom].every(Number.isFinite)) return 0;

    const padding = Math.max(0, Math.floor(this.config.scanPaddingTiles));
    const epsilon = PLAYER_TILE_CONTACT_CONFIG.targeting.edgeEpsilonPx;
    const minTileX = Math.floor(left / tileSize) - padding;
    const maxTileX = Math.floor((right - epsilon) / tileSize) + padding;
    const minTileY = Math.floor(top / tileSize) - padding;
    const maxTileY = Math.floor((bottom - epsilon) / tileSize) + padding;

    this.graphics.clear().fillStyle(this.config.maskFillColor, this.config.maskFillAlpha);
    let filledCells = 0;
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      for (let tx = minTileX; tx <= maxTileX; tx += 1) {
        if (this.worldModel.inBounds?.(tx, ty) === false || !this.worldModel.isSolid?.(tx, ty)) continue;
        this.graphics.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
        filledCells += 1;
      }
    }
    return filledCells;
  }

  destroy() {
    const postUpdate = globalThis.Phaser?.Scenes?.Events?.POST_UPDATE;
    if (this._onPostUpdate && postUpdate) {
      this.scene?.events?.off(postUpdate, this._onPostUpdate);
    }
    this._onPostUpdate = null;
    if (this.player?.mask === this.mask) this.player.clearMask(false);
    this.mask?.destroy();
    this.graphics?.destroy();
    this.mask = null;
    this.graphics = null;
    this.enabled = false;
  }
}
