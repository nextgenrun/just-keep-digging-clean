/**
 * AmbientParticleSystem — atmospheric dust motes + falling debris underground.
 * Spawns lightweight circle sprites around the camera view, hard-capped and
 * FPS-guarded so atmosphere never costs playability.
 * All tunables live in values/ambientParticleConfig.js.
 */
import {
  AMBIENT_PARTICLE_CONFIG,
  resolveAmbientParticleDepthBand,
} from "../../values/ambientParticleConfig.js";

export class AmbientParticleSystem {
  constructor(scene, config = AMBIENT_PARTICLE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = Boolean(config.enabled);
    this._live = new Set();
    this._lastSpawnAt = 0;
    this._onUpdate = null;
    this._snapshot = {
      depthMeters: 0,
      depthBandId: null,
      insideBuilding: false,
      admissionReason: "not-created",
    };
  }

  create() {
    if (!this.enabled) return;
    this._onUpdate = (time) => this._tick(time);
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this._onUpdate);
  }

  _getDepthMeters() {
    const ts = this.scene.config?.tileSize;
    const playerY = this.scene.player?.y;
    if (!Number.isFinite(ts) || !Number.isFinite(playerY)) return 0;
    return Math.max(0, Math.floor(playerY / ts) - (this.scene.config?.topAirRows || 0));
  }

  _tick(time) {
    if (!this.enabled) return;
    const depthMeters = this._getDepthMeters();
    const depthBand = resolveAmbientParticleDepthBand(depthMeters, this.config);
    const insideBuilding = this._isInsideBuilding();
    this._snapshot = {
      depthMeters,
      depthBandId: depthBand?.id || null,
      insideBuilding,
      admissionReason: "eligible",
    };
    if (this.config.suppressInBuildings !== false && insideBuilding) {
      this._snapshot.admissionReason = "inside-building";
      this._clearLive();
      return;
    }
    if (time - this._lastSpawnAt < this.config.spawnIntervalMs) return;
    this._lastSpawnAt = time;
    if (this._live.size >= this.config.maxParticles) return;
    if ((this.scene.game?.loop?.actualFps || 60) < this.config.disableBelowFps) {
      this._snapshot.admissionReason = "low-fps";
      return;
    }
    if (depthMeters < this.config.minDepthMeters) {
      this._snapshot.admissionReason = "too-shallow";
      return;
    }

    const cam = this.scene.cameras?.main;
    if (!cam) {
      this._snapshot.admissionReason = "missing-camera";
      return;
    }
    const view = cam.worldView;
    const debrisCfg = this.config.debris;
    const debrisChance = (debrisCfg?.chancePerSpawn || 0)
      * (depthBand?.debrisChanceScale || 1);
    if (debrisCfg?.enabled && Math.random() < debrisChance) {
      this._spawnDebris(view, debrisCfg, depthBand);
    } else {
      this._spawnMote(view, this.config.mote, depthBand);
    }
    this._snapshot.admissionReason = "spawned";
  }

  _isInsideBuilding() {
    const occupancy = this.scene.getEnvironmentOccupancySnapshot?.();
    if (occupancy && typeof occupancy.insideBuilding === "boolean") {
      return occupancy.insideBuilding;
    }
    if (typeof this.scene.isPlayerInsideBuilding === "function") {
      return this.scene.isPlayerInsideBuilding() === true;
    }
    const player = this.scene.player;
    if (player && typeof this.scene.buildingInteriorSystem?.containsWorldPoint === "function") {
      return this.scene.buildingInteriorSystem.containsWorldPoint(player.x, player.y) === true;
    }
    return false;
  }

  _spawnMote(view, cfg, depthBand = null) {
    const x = view.x + Math.random() * view.width;
    const y = view.y + Math.random() * view.height;
    const size = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
    const alphaScale = depthBand?.alphaScale || 1;
    const alpha = Math.min(1,
      (cfg.alphaMin + Math.random() * (cfg.alphaMax - cfg.alphaMin)) * alphaScale);
    const life = cfg.lifeMinMs + Math.random() * (cfg.lifeMaxMs - cfg.lifeMinMs);
    const driftScale = depthBand?.driftScale || 1;
    const dx = (cfg.driftXMin + Math.random() * (cfg.driftXMax - cfg.driftXMin))
      * (life / 1000) * driftScale;
    const dy = (cfg.driftYMin + Math.random() * (cfg.driftYMax - cfg.driftYMin))
      * (life / 1000) * driftScale;
    const mote = this.scene.add.circle(x, y, size, depthBand?.moteColor ?? cfg.color, alpha);
    mote.setDepth(cfg.depth);
    mote.setBlendMode(Phaser.BlendModes.ADD);
    this._live.add(mote);
    this.scene.tweens.add({
      targets: mote,
      x: x + dx,
      y: y + dy,
      alpha: 0,
      duration: life,
      ease: "Sine.easeInOut",
      onComplete: () => { this._live.delete(mote); mote.destroy(); },
    });
  }

  _spawnDebris(view, cfg, depthBand = null) {
    const x = view.x + Math.random() * view.width;
    const y = view.y + Math.random() * view.height * 0.4; // upper part of view
    const size = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
    const life = cfg.lifeMinMs + Math.random() * (cfg.lifeMaxMs - cfg.lifeMinMs);
    const fall = (cfg.fallSpeedMin + Math.random() * (cfg.fallSpeedMax - cfg.fallSpeedMin)) * (life / 1000);
    const alpha = Math.min(1, cfg.alpha * (depthBand?.alphaScale || 1));
    const grit = this.scene.add.circle(
      x,
      y,
      size,
      depthBand?.debrisColor ?? cfg.color,
      alpha,
    );
    grit.setDepth(this.config.mote.depth);
    this._live.add(grit);
    this.scene.tweens.add({
      targets: grit,
      y: y + fall,
      alpha: 0,
      duration: life,
      ease: "Quad.easeIn",
      onComplete: () => { this._live.delete(grit); grit.destroy(); },
    });
  }

  destroy() {
    if (this._onUpdate) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._onUpdate);
      this._onUpdate = null;
    }
    this._clearLive();
    this.enabled = false;
  }

  _clearLive() {
    for (const particle of this._live) {
      try { this.scene.tweens?.killTweensOf?.(particle); } catch (_) {}
      try { particle.destroy(); } catch (_) {}
    }
    this._live.clear();
  }

  getSnapshot() {
    return {
      ...this._snapshot,
      liveParticles: this._live.size,
      enabled: this.enabled,
    };
  }
}
