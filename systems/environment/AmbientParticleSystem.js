/**
 * AmbientParticleSystem — atmospheric dust motes + falling debris underground.
 * Spawns lightweight circle sprites around the camera view, hard-capped and
 * FPS-guarded so atmosphere never costs playability.
 * All tunables live in values/ambientParticleConfig.js.
 */
import { AMBIENT_PARTICLE_CONFIG } from "../../values/ambientParticleConfig.js";

export class AmbientParticleSystem {
  constructor(scene, config = AMBIENT_PARTICLE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = Boolean(config.enabled);
    this._live = new Set();
    this._lastSpawnAt = 0;
    this._onUpdate = null;
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
    if (time - this._lastSpawnAt < this.config.spawnIntervalMs) return;
    this._lastSpawnAt = time;
    if (this._live.size >= this.config.maxParticles) return;
    if ((this.scene.game?.loop?.actualFps || 60) < this.config.disableBelowFps) return;
    if (this._getDepthMeters() < this.config.minDepthMeters) return;

    const cam = this.scene.cameras?.main;
    if (!cam) return;
    const view = cam.worldView;
    const debrisCfg = this.config.debris;
    if (debrisCfg?.enabled && Math.random() < debrisCfg.chancePerSpawn) {
      this._spawnDebris(view, debrisCfg);
    } else {
      this._spawnMote(view, this.config.mote);
    }
  }

  _spawnMote(view, cfg) {
    const x = view.x + Math.random() * view.width;
    const y = view.y + Math.random() * view.height;
    const size = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
    const alpha = cfg.alphaMin + Math.random() * (cfg.alphaMax - cfg.alphaMin);
    const life = cfg.lifeMinMs + Math.random() * (cfg.lifeMaxMs - cfg.lifeMinMs);
    const dx = (cfg.driftXMin + Math.random() * (cfg.driftXMax - cfg.driftXMin)) * (life / 1000);
    const dy = (cfg.driftYMin + Math.random() * (cfg.driftYMax - cfg.driftYMin)) * (life / 1000);
    const mote = this.scene.add.circle(x, y, size, cfg.color, alpha);
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

  _spawnDebris(view, cfg) {
    const x = view.x + Math.random() * view.width;
    const y = view.y + Math.random() * view.height * 0.4; // upper part of view
    const size = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
    const life = cfg.lifeMinMs + Math.random() * (cfg.lifeMaxMs - cfg.lifeMinMs);
    const fall = (cfg.fallSpeedMin + Math.random() * (cfg.fallSpeedMax - cfg.fallSpeedMin)) * (life / 1000);
    const grit = this.scene.add.circle(x, y, size, cfg.color, cfg.alpha);
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
    for (const p of this._live) { try { p.destroy(); } catch (_) {} }
    this._live.clear();
    this.enabled = false;
  }
}