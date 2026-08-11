import { FIRST_SESSION_ROUTE_CONFIG } from "../../values/firstSessionRoute.js";
import { OPENING_FLIGHT_TUTORIAL_CHOICES } from "../../values/openingFlightArtifact.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export class OpeningFlightTownExitBarrierSystem {
  constructor(scene, openingFlightSystem, config = FIRST_SESSION_ROUTE_CONFIG) {
    this.scene = scene;
    this.openingFlightSystem = openingFlightSystem;
    this.config = config;
    this.originalTiles = new Map();
    this.installed = false;
  }

  create() {
    this._captureOriginalTiles();
    this.update();
  }

  update() {
    if (this._shouldBlockTownExit()) {
      this._ensureBarrier();
      return;
    }
    this._restoreBarrier();
  }

  _shouldBlockTownExit() {
    const state = this.openingFlightSystem?.state;
    return state?.tutorialChoice === OPENING_FLIGHT_TUTORIAL_CHOICES.guided
      && state?.[this.config.townExitBarrier.releaseFlag] !== true
      && state?.onboardingComplete !== true;
  }

  _getCells() {
    const barrier = this.config.townExitBarrier;
    const bottomTy = this.scene.worldModel.config.topAirRows - 1;
    return Array.from({ length: barrier.heightTiles }, (_, index) => ({
      tx: barrier.tileX,
      ty: bottomTy + barrier.topSurfaceRowOffset + index + 1,
    }));
  }

  _captureOriginalTiles() {
    for (const cell of this._getCells()) {
      const key = `${cell.tx},${cell.ty}`;
      if (this.originalTiles.has(key)) continue;
      this.originalTiles.set(key, {
        ...cell,
        type: this.scene.worldModel.getTileType(cell.tx, cell.ty),
        hp: this.scene.worldModel.getTileHp(cell.tx, cell.ty),
        dugSource: this.scene.worldModel.dugTileSource?.get?.(key) || null,
      });
    }
  }

  _ensureBarrier() {
    const type = TILE_TYPES[this.config.townExitBarrier.tileTypeName];
    for (const cell of this._getCells()) {
      if (this.scene.worldModel.getTileType(cell.tx, cell.ty) === type) continue;
      this.scene.worldModel.setTile(cell.tx, cell.ty, type, 0);
      this.scene.worldModel.dugTileSource?.delete?.(`${cell.tx},${cell.ty}`);
      this.scene.worldRenderer?.applyTileUpdate?.(cell.tx, cell.ty);
    }
    this.installed = true;
  }

  _restoreBarrier() {
    if (!this.installed) return;
    for (const original of this.originalTiles.values()) {
      const key = `${original.tx},${original.ty}`;
      this.scene.worldModel.setTile(
        original.tx,
        original.ty,
        original.type,
        original.hp,
      );
      if (original.dugSource) {
        this.scene.worldModel.dugTileSource?.set?.(key, original.dugSource);
      } else {
        this.scene.worldModel.dugTileSource?.delete?.(key);
      }
      this.scene.worldRenderer?.applyTileUpdate?.(original.tx, original.ty);
    }
    this.installed = false;
  }

  getHealth() {
    return {
      installed: this.installed,
      releaseFlag: this.config.townExitBarrier.releaseFlag,
      cells: this._getCells(),
    };
  }

  destroy() {
    this._restoreBarrier();
    this.originalTiles.clear();
    this.openingFlightSystem = null;
    this.scene = null;
  }
}
