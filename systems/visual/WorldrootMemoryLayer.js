import { WORLDROOT_CONFIG } from "../../values/worldroot.js";

function mixColor(first, second, amount) {
  const t = Math.max(0, Math.min(1, amount));
  const channel = shift => Math.round(
    ((first >> shift) & 0xff) + (((second >> shift) & 0xff) - ((first >> shift) & 0xff)) * t,
  );
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function drawOrganicLine(graphics, start, end, color, alpha, width, seed = 0) {
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(start.x, start.y);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / length;
  const ny = dx / length;
  for (let index = 1; index < 6; index += 1) {
    const progress = index / 6;
    const bend = Math.sin(progress * Math.PI * 2 + seed) * (5 + (seed % 4));
    graphics.lineTo(start.x + dx * progress + nx * bend, start.y + dy * progress + ny * bend);
  }
  graphics.lineTo(end.x, end.y);
  graphics.strokePath();
}

/** Batched story marks rendered over the authored Worldroot art. */
export class WorldrootMemoryLayer {
  constructor(scene, transform, config = WORLDROOT_CONFIG) {
    this.scene = scene;
    this.transform = transform;
    this.config = config;
    this.snapshot = null;
    this.staticGraphics = null;
    this.pulseGraphics = null;
    this.arrivals = new Set();
  }

  create() {
    this.staticGraphics = this.scene.add.graphics()
      .setDepth(this.config.placement.overlayDepth);
    this.pulseGraphics = this.scene.add.graphics()
      .setDepth(this.config.placement.overlayDepth + 0.01);
    return this;
  }

  pointToWorld(point) {
    return {
      x: this.transform.left + point.x * this.transform.width,
      y: this.transform.top + point.y * this.transform.height,
    };
  }

  sync(snapshot) {
    this.snapshot = snapshot;
    this._redrawStatic();
  }

  _redrawStatic() {
    const graphics = this.staticGraphics;
    const snapshot = this.snapshot;
    if (!graphics || !snapshot) return;
    graphics.clear();
    this._drawConvergenceCurrents(graphics, snapshot);
    this._drawTalentSap(graphics, snapshot);
    this._drawBiomeKnots(graphics, snapshot);
    this._drawStarMemories(graphics, snapshot);
    this._drawTitanWounds(graphics, snapshot);
  }

  _drawConvergenceCurrents(graphics, snapshot) {
    const crown = this.pointToWorld({ x: 0.82, y: 0.20 });
    const sources = [
      { point: { x: 0.217, y: 0.858 }, color: this.config.colors.warmth },
      { point: { x: 0.54, y: 0.43 }, color: 0x76d88c },
      { point: { x: 0.64, y: 0.59 }, color: this.config.colors.intact },
      { point: { x: 0.365, y: 0.665 }, color: this.config.colors.focus },
      { point: { x: 0.76, y: 0.64 }, color: 0xc878ff },
    ];
    snapshot.currents.forEach((current, index) => {
      if (!current.ready) return;
      const source = sources[index] || sources[0];
      drawOrganicLine(
        graphics,
        this.pointToWorld(source.point),
        crown,
        source.color,
        0.24,
        2.1,
        index * 1.31,
      );
    });
  }

  _drawTalentSap(graphics, snapshot) {
    const root = this.pointToWorld(this.config.interaction.rootTalent);
    for (const [index, talent] of snapshot.talentMemories.entries()) {
      if (!talent.rootPurchased) continue;
      const point = this.pointToWorld(talent.point);
      const alpha = 0.3 + talent.progress * 0.52;
      drawOrganicLine(graphics, root, point, talent.color, alpha, 3 + talent.progress * 2, index);
      graphics.fillStyle(talent.color, talent.completed ? 0.95 : 0.55);
      graphics.fillPoints([
        { x: point.x, y: point.y - 7 },
        { x: point.x + 6, y: point.y },
        { x: point.x, y: point.y + 7 },
        { x: point.x - 6, y: point.y },
      ], true);
    }
  }

  _drawBiomeKnots(graphics, snapshot) {
    for (const memory of snapshot.profileMemories) {
      const point = this.pointToWorld(memory.anchor);
      const sleeping = memory.status === "sleeping";
      const consumed = memory.status === "consumed";
      const mixed = memory.status === "mixed";
      const color = sleeping
        ? this.config.colors.sleeping
        : consumed
          ? this.config.colors.scar
          : memory.color;
      const radius = sleeping ? 3.5 : 5 + Math.min(4, memory.knownCount * 0.35);
      graphics.fillStyle(color, sleeping ? 0.3 : mixed ? 0.58 : 0.82);
      graphics.fillCircle(point.x, point.y, radius);
      graphics.lineStyle(sleeping ? 1 : 1.6, memory.color, sleeping ? 0.25 : 0.72);
      graphics.strokeCircle(point.x, point.y, radius + 3);
      if (consumed || mixed) {
        graphics.lineStyle(1.8, this.config.colors.scar, consumed ? 0.95 : 0.7);
        graphics.lineBetween(point.x - radius, point.y + radius, point.x + radius, point.y - radius);
      }
    }
  }

  _drawStarMemories(graphics, snapshot) {
    for (const star of snapshot.starMemories) {
      const point = this.pointToWorld(star.point);
      const rarity = Math.max(0, Math.min(5, Number(star.rarityIndex) || 0));
      const radius = this.config.markers.starRadiusPx + rarity * 0.45;
      if (star.state === "consumed") {
        graphics.fillStyle(this.config.colors.consumed, 0.88);
        graphics.fillCircle(point.x, point.y, radius + 1.2);
        graphics.lineStyle(1.7, this.config.colors.scar, 0.92);
        graphics.lineBetween(point.x - radius, point.y - radius, point.x + radius, point.y + radius);
        graphics.lineBetween(point.x - radius, point.y + radius, point.x + radius, point.y - radius);
      } else {
        graphics.fillStyle(star.color || this.config.colors.intact, 0.83);
        graphics.fillCircle(point.x, point.y, radius);
        graphics.lineStyle(1, 0xc9fbff, 0.52);
        graphics.strokeCircle(point.x, point.y, radius + 2.3);
      }
    }
  }

  _drawTitanWounds(graphics, snapshot) {
    for (const titan of snapshot.titanMemories) {
      if (!titan.discovered) continue;
      const point = this.pointToWorld(titan.point);
      const size = titan.worldrootKeystone ? 15 : 7 + (titan.index % 4) * 1.6;
      const color = titan.color || 0xc878ff;
      graphics.lineStyle(titan.worldrootKeystone ? 3.2 : 2, color, 0.78);
      graphics.beginPath();
      graphics.moveTo(point.x - size, point.y - size * 0.2);
      graphics.lineTo(point.x - size * 0.18, point.y + size * 0.22);
      graphics.lineTo(point.x + size * 0.12, point.y - size * 0.54);
      graphics.lineTo(point.x + size, point.y + size * 0.3);
      graphics.strokePath();
      if (titan.worldrootKeystone) {
        graphics.lineStyle(1.5, 0xe8c8ff, 0.85);
        graphics.strokeCircle(point.x, point.y, size + 5);
      }
    }
  }

  update(time = 0) {
    const graphics = this.pulseGraphics;
    const snapshot = this.snapshot;
    if (!graphics || !snapshot) return;
    graphics.clear();
    const idle = (Math.sin(time / this.config.markers.idlePulsePeriodMs * Math.PI * 2) + 1) / 2;
    const hearth = this.pointToWorld(this.config.interaction.rootTalent);
    const buffColor = this.config.colors[snapshot.activeCampfireBuff?.type]
      || this.config.colors.warmth;
    graphics.lineStyle(2 + idle * 2, buffColor, 0.22 + idle * 0.32);
    graphics.strokeCircle(hearth.x, hearth.y, 13 + idle * 8 + snapshot.campfireLevel * 0.6);

    this._drawGpPulse(graphics, snapshot, time);
    this._drawActiveTitanPulse(graphics, snapshot, time);
    this._drawCrownPulse(graphics, snapshot, idle);
  }

  _drawGpPulse(graphics, snapshot, time) {
    if (snapshot.gpRatio <= 0) return;
    const route = [
      this.pointToWorld({ x: 0.217, y: 0.858 }),
      this.pointToWorld({ x: 0.31, y: 0.72 }),
      this.pointToWorld({ x: 0.48, y: 0.54 }),
      this.pointToWorld({ x: 0.65, y: 0.49 }),
    ];
    const phase = ((time / 1850) % 1) * (route.length - 1);
    const index = Math.min(route.length - 2, Math.floor(phase));
    const local = phase - index;
    const first = route[index];
    const second = route[index + 1];
    const x = first.x + (second.x - first.x) * local;
    const y = first.y + (second.y - first.y) * local;
    const radius = 3 + snapshot.gpRatio * 6;
    graphics.fillStyle(0x6eeaff, 0.3 + snapshot.gpRatio * 0.58);
    graphics.fillCircle(x, y, radius);
  }

  _drawActiveTitanPulse(graphics, snapshot, time) {
    const tracked = snapshot.titanMemories.find(titan => titan.tracked);
    if (!tracked) return;
    const point = this.pointToWorld(tracked.point);
    const pulse = (Math.sin(time / this.config.markers.activeTitanPulsePeriodMs * Math.PI * 2) + 1) / 2;
    graphics.lineStyle(2.4, tracked.color, 0.45 + pulse * 0.5);
    graphics.strokeCircle(point.x, point.y, 10 + pulse * 12);
    graphics.lineBetween(point.x - 15, point.y, point.x + 15, point.y);
  }

  _drawCrownPulse(graphics, snapshot, idle) {
    const crown = this.pointToWorld({ x: 0.82, y: 0.20 });
    const color = snapshot.endgameReady
      ? this.config.colors.crownReady
      : this.config.colors.crownDormant;
    const readyBoost = snapshot.endgameReady ? 18 : 0;
    graphics.lineStyle(snapshot.endgameReady ? 4 : 2, color, 0.18 + idle * 0.3);
    graphics.strokeCircle(crown.x, crown.y, 96 + readyBoost + idle * 20);
  }

  queueStarArrival(detail = {}) {
    if (!this.scene || this.arrivals.size >= this.config.markers.maximumArrivalQueue) return false;
    const tileSize = this.scene.config?.tileSize || 94;
    const matching = this.snapshot?.starMemories.find(star => (
      star.tile.tx === detail.originTileX && star.tile.ty === detail.originTileY
    ));
    const target = this.pointToWorld(matching?.point || {
      x: 0.25 + ((Number(detail.identityIndex) || 0) % 7) * 0.018,
      y: 0.79 - ((Number(detail.rarity) || 0) * 0.012),
    });
    const start = Number.isFinite(detail.originTileX) && Number.isFinite(detail.originTileY)
      ? {
          x: (detail.originTileX + 0.5) * tileSize,
          y: (detail.originTileY + 0.5) * tileSize,
        }
      : this.pointToWorld(this.config.interaction.rootTalent);
    const color = Number.parseInt(String(detail.identityPrimary || "8eeaff").replace("#", ""), 16)
      || this.config.colors.intact;
    const halo = this.scene.add.circle(start.x, start.y, 11, color, 0.18)
      .setDepth(this.config.placement.overlayDepth + 0.02);
    const core = this.scene.add.circle(start.x, start.y, 4.5, color, 0.95)
      .setDepth(this.config.placement.overlayDepth + 0.03);
    const arrival = { halo, core };
    this.arrivals.add(arrival);
    this.scene.tweens.add({
      targets: [halo, core],
      x: target.x,
      y: target.y,
      duration: this.config.markers.arrivalDurationMs,
      ease: "Sine.inOut",
      onComplete: () => {
        this.arrivals.delete(arrival);
        halo.destroy();
        core.destroy();
      },
    });
    this.scene.tweens.add({
      targets: halo,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: this.config.markers.arrivalDurationMs,
      ease: "Power2.out",
    });
    return true;
  }

  destroy() {
    for (const arrival of this.arrivals) {
      this.scene?.tweens?.killTweensOf?.([arrival.core, arrival.halo]);
      arrival.core?.destroy();
      arrival.halo?.destroy();
    }
    this.arrivals.clear();
    this.staticGraphics?.destroy();
    this.pulseGraphics?.destroy();
    this.staticGraphics = null;
    this.pulseGraphics = null;
    this.scene = null;
  }
}
