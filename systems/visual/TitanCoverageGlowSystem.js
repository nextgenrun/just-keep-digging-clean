import { TITAN_DISCOVERY_CONFIG } from "../../values/titanDiscoveries.js";
import { distanceToTitanZone } from "./titanChamberGeometry.js";

export class TitanCoverageGlowSystem {
  constructor(scene, worldModel, config = TITAN_DISCOVERY_CONFIG) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.sprites = [];
    this.targetId = "";
    this.visibleTiles = 0;
    this.created = false;
  }

  create() {
    const key = this.config.assets.coverResonance.key;
    this.created = (
      typeof this.scene.textures?.exists !== "function"
      || this.scene.textures.exists(key)
    );
    return this.created;
  }

  update(time, playerTile, views) {
    if (!this.created || !playerTile) return this.hide();
    const glow = this.config.coverageGlow;
    const target = views
      .filter(view => (
        !view.discovered
        && !view.ready
        && view.coverageValid
        && distanceToTitanZone(playerTile, view.zone)
          <= glow.activationRangeTiles
      ))
      .sort((left, right) => (
        distanceToTitanZone(playerTile, left.zone)
          - distanceToTitanZone(playerTile, right.zone)
        || left.definition.index - right.definition.index
      ))[0];
    if (!target) return this.hide();

    const cells = target.coverageCells
      .filter(cell => this.worldModel.isSolid(cell.tx, cell.ty))
      .slice(0, glow.maxVisibleTiles);
    const tileSize = this.worldModel.tileSize;
    const baseSize = tileSize * glow.displaySizeTiles;
    const pulseRange = glow.maximumAlpha - glow.minimumAlpha;
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      const sprite = this._ensureSprite(index);
      const phase = (
        (Number(time) || 0) / glow.pulsePeriodMs * Math.PI * 2
        + index * glow.phaseStep
      );
      const wave = (Math.sin(phase) + 1) / 2;
      const size = baseSize * (1 + glow.scalePulse * wave);
      sprite
        .setPosition(
          (cell.tx + 0.5) * tileSize,
          (cell.ty + 0.5) * tileSize,
        )
        .setDisplaySize(size, size)
        .setTint(target.definition.glowTint)
        .setAlpha(glow.minimumAlpha + pulseRange * wave)
        .setVisible(true);
    }
    for (let index = cells.length; index < this.sprites.length; index += 1) {
      this.sprites[index].setVisible(false);
    }
    this.targetId = target.definition.id;
    this.visibleTiles = cells.length;
    return target;
  }

  _ensureSprite(index) {
    if (this.sprites[index]) return this.sprites[index];
    const glow = this.config.coverageGlow;
    const sprite = this.scene.add.image(
      0,
      0,
      this.config.assets.coverResonance.key,
    )
      .setOrigin(0.5)
      .setDepth(glow.depth)
      .setBlendMode(glow.blendMode)
      .setVisible(false);
    this.sprites.push(sprite);
    return sprite;
  }

  hide() {
    this.sprites.forEach(sprite => sprite.setVisible(false));
    this.targetId = "";
    this.visibleTiles = 0;
    return null;
  }

  getSnapshot() {
    return {
      created: this.created,
      target: this.targetId,
      visibleTiles: this.visibleTiles,
      pooledTiles: this.sprites.length,
    };
  }

  destroy() {
    this.sprites.forEach(sprite => sprite.destroy?.());
    this.sprites = [];
    this.targetId = "";
    this.visibleTiles = 0;
    this.created = false;
    this.scene = null;
    this.worldModel = null;
  }
}
