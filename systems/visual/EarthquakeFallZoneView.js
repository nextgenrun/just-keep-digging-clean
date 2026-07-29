import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";
import { EarthquakeRockImpactView } from "./EarthquakeRockImpactView.js";

const clamp01 = value => Math.max(0, Math.min(1, value));

export class EarthquakeFallZoneView {
  constructor(scene, source, config = EARTHQUAKE_FEEDBACK_CONFIG) {
    this.scene = scene;
    this.source = source;
    this.config = config;
    this.warningPool = [];
    this.rockPool = [];
    this.impactView = new EarthquakeRockImpactView(scene, config);
    this._createPools();
  }

  get impactPool() {
    return this.impactView.pool;
  }

  _createPools() {
    const cfg = this.config.hazards;
    for (let index = 0; index < cfg.maxFallZones; index += 1) {
      this.warningPool.push(this._createWarningEntry());
      this.rockPool.push(this._createRockEntry());
    }
  }

  _createWarningEntry() {
    const cfg = this.config.hazards;
    return {
      id: null,
      footprint: this.scene.add.image(
        0,
        0,
        this.config.assets.landingFootprint.key,
      ).setOrigin(0.5, cfg.footprintOriginY)
        .setDepth(cfg.landingFootprintDepth)
        .setVisible(false),
      fracture: this.scene.add.image(
        0,
        0,
        this.config.assets.ceilingFracture.key,
      ).setOrigin(0.5, cfg.fractureOriginY)
        .setDepth(cfg.ceilingFractureDepth)
        .setVisible(false),
    };
  }

  _createRockEntry() {
    const cfg = this.config.hazards;
    return {
      id: null,
      image: this.scene.add.image(
        0,
        0,
        this.config.assets.fallingBoulder.key,
      ).setOrigin(0.5, cfg.boulderOriginY)
        .setDepth(cfg.fallingBoulderDepth)
        .setVisible(false),
    };
  }

  update() {
    this._syncWarningZones();
    this._syncFallingRocks();
  }

  _syncWarningZones() {
    const cfg = this.config.hazards;
    const ts = this.scene.config.tileSize;
    const now = this.scene.time?.now || 0;
    const caveIns = (this.source?.caveIns || []).map(zone => ({
      ...zone,
      isFalling: false,
    }));
    const warningIds = new Set(caveIns.map(zone => zone.id));
    const fallingZones = (this.source?.fallingRocks || [])
      .filter(rock => !warningIds.has(rock.id))
      .map(rock => ({
        ...rock,
        remaining: 0,
        isFalling: true,
      }));
    const zones = caveIns.concat(fallingZones).slice(0, cfg.maxFallZones);
    const activeIds = new Set(zones.map(zone => zone.id));
    this._releaseMissing(this.warningPool, activeIds, entry => {
      entry.footprint.setVisible(false);
      entry.fracture.setVisible(false);
    });

    for (const zone of zones) {
      const entry = this._acquireById(this.warningPool, zone.id);
      if (!entry) continue;
      const remainingRatio = clamp01(
        zone.remaining / this.source.config.caveInWarningMs,
      );
      const urgency = 1 - remainingRatio;
      const pulse = (
        Math.sin(now / cfg.footprintPulseMs * Math.PI * 2) + 1
      ) / 2;
      const footprintScale = cfg.footprintMinScale
        + (1 - cfg.footprintMinScale) * pulse;
      const x = (zone.tx + 0.5) * ts;

      entry.footprint
        .setPosition(x, zone.landingTy * ts)
        .setDisplaySize(
          ts * cfg.footprintWidthTiles,
          ts * cfg.footprintHeightTiles,
        )
        .setAlpha(
          cfg.footprintMinAlpha
          + (cfg.footprintMaxAlpha - cfg.footprintMinAlpha)
            * Math.max(urgency, pulse * 0.58),
        )
        .setVisible(true);
      entry.footprint.setScale(
        entry.footprint.scaleX * footprintScale,
        entry.footprint.scaleY * footprintScale,
      );
      entry.fracture
        .setPosition(x, (zone.ty + 1) * ts)
        .setDisplaySize(
          ts * cfg.fractureWidthTiles,
          ts * cfg.fractureHeightTiles,
        )
        .setAlpha(
          cfg.fractureMinAlpha
          + (cfg.fractureMaxAlpha - cfg.fractureMinAlpha) * urgency,
        )
        .setVisible(!zone.isFalling);
    }
  }

  _syncFallingRocks() {
    const cfg = this.config.hazards;
    const ts = this.scene.config.tileSize;
    const rocks = (this.source?.fallingRocks || []).slice(0, cfg.maxFallZones);
    const activeIds = new Set(rocks.map(rock => rock.id));
    this._releaseMissing(
      this.rockPool,
      activeIds,
      entry => entry.image.setVisible(false),
    );
    for (const rock of rocks) {
      const entry = this._acquireById(this.rockPool, rock.id);
      if (!entry) continue;
      entry.image
        .setPosition(rock.x, rock.y)
        .setDisplaySize(
          ts * cfg.boulderWidthTiles,
          ts * cfg.boulderHeightTiles,
        )
        .setRotation(rock.angle)
        .setAlpha(cfg.boulderMinAlpha)
        .setVisible(true);
    }
  }

  playRockImpact(rock) {
    return this.impactView.play(rock);
  }

  _acquireById(pool, id) {
    const existing = pool.find(entry => entry.id === id);
    if (existing) return existing;
    const free = pool.find(entry => entry.id === null);
    if (!free) return null;
    free.id = id;
    return free;
  }

  _releaseMissing(pool, activeIds, release) {
    for (const entry of pool) {
      if (entry.id === null || activeIds.has(entry.id)) continue;
      release(entry);
      entry.id = null;
    }
  }

  clear() {
    this.warningPool.forEach(entry => {
      entry.id = null;
      entry.footprint.setVisible(false);
      entry.fracture.setVisible(false);
    });
    this.rockPool.forEach(entry => {
      entry.id = null;
      entry.image.setVisible(false);
    });
    this.impactView.clear();
  }

  destroy() {
    this.clear();
    this.warningPool.forEach(entry => {
      entry.footprint.destroy();
      entry.fracture.destroy();
    });
    this.rockPool.forEach(entry => entry.image.destroy());
    this.impactView.destroy();
    this.scene = null;
    this.source = null;
  }
}
