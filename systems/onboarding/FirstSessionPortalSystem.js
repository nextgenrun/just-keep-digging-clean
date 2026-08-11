import { FIRST_SESSION_ROUTE_CONFIG } from "../../values/firstSessionRoute.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export class FirstSessionPortalSystem {
  constructor(scene, config = FIRST_SESSION_ROUTE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.elapsedMs = config.starterPortal.protectIntervalMs;
    this.lastResult = null;
  }

  create() {
    this.lastResult = this.ensure();
    return this.lastResult;
  }

  update(deltaMs = 0) {
    this.elapsedMs += Math.max(0, Number(deltaMs) || 0);
    if (this.elapsedMs < this.config.starterPortal.protectIntervalMs) {
      return this.lastResult;
    }
    this.elapsedMs = 0;
    this.lastResult = this.ensure();
    return this.lastResult;
  }

  getTile() {
    return {
      tx: this.config.starterPortal.tileX,
      ty: this.scene.worldModel.config.topAirRows
        + this.config.starterPortal.depthMeters,
    };
  }

  ensure() {
    const world = this.scene?.worldModel;
    if (!world) return { ready: false, changed: false, reason: "no-world" };
    const tile = this.getTile();
    if (!world.inBounds(tile.tx, tile.ty)) {
      return { ready: false, changed: false, reason: "out-of-bounds", tile };
    }

    const portalType = TILE_TYPES[this.config.starterPortal.tileTypeName];
    const changed = world.getTileType(tile.tx, tile.ty) !== portalType;
    if (changed) {
      world.setTile(
        tile.tx,
        tile.ty,
        portalType,
        world.getTileMaxHp(tile.tx, tile.ty, portalType),
      );
      world.dugTileSource?.delete?.(`${tile.tx},${tile.ty}`);
      this.scene.worldRenderer?.applyTileUpdate?.(tile.tx, tile.ty);
    }

    const activated = this.scene.specialTileSystem?.getActivatedPortals?.()
      ?.some((portal) => portal.tx === tile.tx && portal.ty === tile.ty) === true;
    return { ready: true, changed, activated, tile };
  }

  getHealth() {
    const tile = this.getTile();
    return {
      ready: this.lastResult?.ready === true,
      tile,
      activated: this.lastResult?.activated === true,
    };
  }

  destroy() {
    this.scene = null;
    this.lastResult = null;
  }
}
