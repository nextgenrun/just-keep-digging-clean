import {
  PLAYER_TILE_CONTACT_CONFIG,
  resolvePlayerSolidOcclusionEnabled,
} from "../../values/playerTileContact.js";

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
    search = globalThis.location?.search || "",
  ) {
    this.scene = scene;
    this.player = player;
    this.worldModel = worldModel;
    this.config = config;
    this.enabled = resolvePlayerSolidOcclusionEnabled(config, search)
      && profile?.isUalNative === true;
    this.graphics = null;
    this.mask = null;
    this._onPostUpdate = null;
  }

  create() {
    const phaser = globalThis.Phaser;
    const rendererType = this.scene?.game?.renderer?.type;
    const supportedRenderer = rendererType === phaser?.WEBGL
      || rendererType === phaser?.CANVAS;
    if (!this.enabled || !phaser || !supportedRenderer || this.player?.mask) return false;

    this.graphics = this.scene.make.graphics({ add: false });
    this.mask = this.graphics.createGeometryMask();
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

    // A positive air-cell mask avoids inverted-stencil conflicts and works in
    // both Phaser renderers. The sprite keeps animating normally; only pixels
    // whose world position enters an authoritative solid cell are withheld.
    this.graphics.clear().fillStyle(this.config.maskFillColor, this.config.maskFillAlpha);
    let occludedCells = 0;
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      for (let tx = minTileX; tx <= maxTileX; tx += 1) {
        const inBounds = this.worldModel.inBounds?.(tx, ty) !== false;
        const solid = inBounds && this.worldModel.isSolid?.(tx, ty) === true;
        if (!inBounds || solid) {
          if (solid) occludedCells += 1;
          continue;
        }
        this.graphics.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
      }
    }
    return occludedCells;
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
