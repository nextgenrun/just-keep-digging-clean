/**
 * GroundEffectsAtmosphere
 * Ground-level ambient effects: mist, fireflies, wind particles.
 * Extracted from AtmosphereSystem for the ≤300-line rule.
 */
export class GroundEffectsAtmosphere {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = config;

    // Ground mist
    this.mistParticles = [];

    // Fireflies
    this.fireflies = [];

    // Wind particles
    this.windParticles = [];
    this._windTimer = 0;

    this._createMist();
    this._createFireflies();
  }

  update(delta, phase, nightAmount, windPower) {
    this._updateMist(phase, nightAmount);
    this._updateFireflies(phase, nightAmount);
    this._updateWindParticles(delta, windPower);
  }

  destroy() {
    this.mistParticles.forEach(m => m?.sprite?.destroy());
    this.fireflies.forEach(f => f?.sprite?.destroy());
    this.windParticles.forEach(w => w?.sprite?.destroy());
    this.mistParticles = [];
    this.fireflies = [];
    this.windParticles = [];
  }

  // ─── Ground Mist ─────────────────────────────────────────

  _createMist() {
    const tileSize = this.config.tileSize || 94;
    const surfaceY = (this.config.topAirRows || 65) * tileSize;

    for (let i = 0; i < 8; i++) {
      const gfx = this.scene.add.graphics();
      const mw = 120 + Math.random() * 160;
      const mh = 8 + Math.random() * 10;

      gfx.fillStyle(0xc8d8e8, 0.04 + Math.random() * 0.03);
      gfx.fillEllipse(0, 0, mw, mh);

      const viewportW = this.config.viewportWidth || 1280;
      const spawnCentreX = (this.config.spawnTileX || 28) * tileSize + viewportW * 0.5;
      const zoneHalfW = viewportW * 2;

      const x = spawnCentreX - zoneHalfW + Math.random() * zoneHalfW * 2;
      const y = surfaceY + 10 + Math.random() * 30;
      gfx.setPosition(x, y);
      gfx.setDepth(20);

      this.mistParticles.push({
        sprite: gfx,
        baseX: x,
        y,
        speed: 5 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        alpha: 0,
        targetAlpha: 0,
      });
    }
  }

  _updateMist(phase, nightAmount) {
    const isMistyTime = phase === "dawn" || phase === "morning" || (phase === "dusk" && nightAmount < 0.4);
    const targetAlpha = isMistyTime ? 1 : 0;

    this.mistParticles.forEach(m => {
      m.targetAlpha = targetAlpha;
      m.alpha += (m.targetAlpha - m.alpha) * 0.02;

      if (m.alpha < 0.01) {
        m.sprite.setAlpha(0);
        return;
      }

      m.sprite.x += m.speed * (1 / 60);
      m.sprite.setAlpha(m.alpha * 0.08);
    });
  }

  // ─── Fireflies ───────────────────────────────────────────

  _createFireflies() {
    const tileSize = this.config.tileSize || 94;
    const surfaceY = (this.config.topAirRows || 65) * tileSize;

    for (let i = 0; i < 15; i++) {
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(0xffdd66, 0.6);
      gfx.fillCircle(0, 0, 2);
      gfx.fillStyle(0xffee88, 0.3);
      gfx.fillCircle(0, 0, 4);
      gfx.setDepth(25);

      const viewportW = this.config.viewportWidth || 1280;
      const spawnCentreX = (this.config.spawnTileX || 28) * tileSize + viewportW * 0.5;
      const zoneHalfW = viewportW * 2;

      this.fireflies.push({
        sprite: gfx,
        x: spawnCentreX - zoneHalfW + Math.random() * zoneHalfW * 2,
        y: surfaceY - 10 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.3,
        bobAmplitude: 4 + Math.random() * 8,
        alpha: 0,
        targetAlpha: 0,
      });
    }
  }

  _updateFireflies(phase, nightAmount) {
    const isFireflyTime = nightAmount > 0.2 || phase === "dusk" || phase === "sunset";
    const targetAlpha = isFireflyTime ? 1 : 0;

    this.fireflies.forEach(f => {
      f.targetAlpha = targetAlpha;
      f.alpha += (f.targetAlpha - f.alpha) * 0.03;

      if (f.alpha < 0.01) {
        f.sprite.setAlpha(0);
        return;
      }

      const now = Date.now();
      const wobbleX = Math.sin((now / 800) + f.phase) * 0.5;
      const wobbleY = Math.sin((now / 600) + f.phase * 1.3) * 0.8;

      f.x += (f.vx + wobbleX) * f.speed;
      f.y += (f.vy + wobbleY) * f.speed;

      const tileSize = this.config.tileSize || 94;
      const surfaceY = (this.config.topAirRows || 65) * tileSize;

      if (f.y < surfaceY - 120) f.vy += 0.1;
      if (f.y > surfaceY + 40) f.vy -= 0.1;

      f.sprite.setPosition(f.x, f.y);

      const glow = 0.3 + Math.sin((now / 400) + f.phase * 2) * 0.7;
      f.sprite.setAlpha(f.alpha * glow);
    });
  }

  // ─── Wind Particles ──────────────────────────────────────

  _updateWindParticles(delta, windPower) {
    if (windPower < 0.3) {
      this.windParticles.forEach(w => {
        w.sprite.setAlpha(Math.max(0, w.sprite.alpha - 0.02));
      });
      this._windTimer = 0;
      return;
    }

    this._windTimer += delta;

    if (this._windTimer > Math.max(200, 800 - windPower * 500)) {
      this._windTimer = 0;
      this._emitWindParticle(windPower);
    }

    for (let i = this.windParticles.length - 1; i >= 0; i--) {
      const w = this.windParticles[i];
      w.sprite.x += w.vx * (delta / 16);
      w.sprite.y += w.vy * (delta / 16);
      w.sprite.setAlpha(Math.max(0, w.sprite.alpha - 0.003));

      if (w.sprite.alpha <= 0.01) {
        w.sprite.destroy();
        this.windParticles.splice(i, 1);
      }
    }
  }

  _emitWindParticle(windPower) {
    const cam = this.scene.cameras.main;
    const gfx = this.scene.add.graphics();

    const size = 2 + Math.random() * 3;
    gfx.fillStyle(0xc8b888, 0.3 + Math.random() * 0.3);
    gfx.fillCircle(0, 0, size);
    gfx.setDepth(35);

    const ws = this.scene.weatherSystem;
    const windDir = ws ? Math.sign(ws.wind || 1) : 1;
    const startX = windDir > 0 ? cam.scrollX - 50 : cam.scrollX + cam.width + 50;
    const startY = cam.scrollY + Math.random() * cam.height * 0.6;

    gfx.setPosition(startX, startY);

    this.windParticles.push({
      sprite: gfx,
      vx: windDir * (2 + windPower * 3),
      vy: -0.5 + Math.random() * 1,
    });
  }
}