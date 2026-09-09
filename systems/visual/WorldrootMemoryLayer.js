import { WORLDROOT_CONFIG } from "../../values/worldroot.js?rev=20260830-worldroot-v13";
import { WorldrootStarArrivalController } from "./WorldrootStarArrivalController.js?rev=20260830-worldroot-v10";

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
    this.arrivalController = new WorldrootStarArrivalController(scene, config);
    this.arrivals = this.arrivalController.arrivals;
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

  _getRevealRight(snapshot = this.snapshot) {
    const maximumStage = this.config.reveal.rightByStage.length - 1;
    const stage = Math.max(0, Math.min(
      maximumStage,
      Math.floor(Number(snapshot?.growthStage) || 0),
    ));
    return this.config.reveal.rightByStage[stage];
  }

  _isPointRevealed(point, snapshot = this.snapshot) {
    return Number.isFinite(point?.x) && point.x <= this._getRevealRight(snapshot);
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
    const crown = this.pointToWorld(this.config.currents.crownPoint);
    const routesById = new Map(
      this.config.currents.routes.map(route => [route.id, route]),
    );
    (snapshot.currents || []).forEach((current) => {
      if (!current.ready) return;
      const source = routesById.get(current.id);
      if (!source || !this._isPointRevealed(source.point, snapshot)) return;
      drawOrganicLine(
        graphics,
        this.pointToWorld(source.point),
        crown,
        source.color,
        this.config.currents.lineAlpha,
        this.config.currents.lineWidthPx,
        source.seed,
      );
    });
  }

  _drawTalentSap(graphics, snapshot) {
    const root = this.pointToWorld(this.config.interaction.rootTalent);
    for (const [index, talent] of snapshot.talentMemories.entries()) {
      if (!talent.rootPurchased || !this._isPointRevealed(talent.point, snapshot)) continue;
      const point = this.pointToWorld(talent.point);
      // These currents should read as sap inside the authored structure, not as
      // screen-wide debug beams when all three branches are complete.
      const alpha = 0.12 + talent.progress * 0.2;
      drawOrganicLine(graphics, root, point, talent.color, alpha, 1.5 + talent.progress * 0.8, index);
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
      if (!this._isPointRevealed(memory.anchor, snapshot)) continue;
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
      if (!this._isPointRevealed(star.point, snapshot)) continue;
      const point = this.pointToWorld(star.point);
      const rarity = Math.max(0, Math.min(5, Number(star.rarityIndex) || 0));
      const radius = star.state === "consumed"
        ? this.config.markers.consumedRadiusPx + rarity * 0.45
        : this.config.markers.starRadiusPx + rarity * 0.45;
      if (star.state === "consumed") {
        graphics.fillStyle(this.config.colors.consumed, 0.88);
        graphics.fillCircle(point.x, point.y, radius);
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
      if (!titan.discovered || !this._isPointRevealed(titan.point, snapshot)) continue;
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
    this.arrivalController?.update(time);
    const graphics = this.pulseGraphics;
    const snapshot = this.snapshot;
    if (!graphics || !snapshot) return;
    graphics.clear();
    const idle = (Math.sin(time / this.config.markers.idlePulsePeriodMs * Math.PI * 2) + 1) / 2;
    const hearth = this.pointToWorld(this.config.interaction.rootHearth);
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
    const route = this.config.motion.gpRoute
      .filter(point => this._isPointRevealed(point, snapshot))
      .map(point => this.pointToWorld(point));
    if (route.length < 2) return;
    const phase = ((time / this.config.motion.gpPulsePeriodMs) % 1) * (route.length - 1);
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
    if (!tracked || !this._isPointRevealed(tracked.point, snapshot)) return;
    const point = this.pointToWorld(tracked.point);
    const pulse = (Math.sin(time / this.config.markers.activeTitanPulsePeriodMs * Math.PI * 2) + 1) / 2;
    graphics.lineStyle(2.4, tracked.color, 0.45 + pulse * 0.5);
    graphics.strokeCircle(point.x, point.y, 10 + pulse * 12);
    graphics.lineBetween(point.x - 15, point.y, point.x + 15, point.y);
  }

  _drawCrownPulse(graphics, snapshot, idle) {
    const crown = this.pointToWorld(this.config.currents.crownPoint);
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
    const matching = this.snapshot?.starMemories?.find(star => (
      star?.tile?.tx === detail.originTileX && star?.tile?.ty === detail.originTileY
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
      : this.pointToWorld(this.config.interaction.rootHearth);
    const color = Number.parseInt(String(detail.identityPrimary || "8eeaff").replace("#", ""), 16)
      || this.config.colors.intact;
    return this.arrivalController?.queue({ start, target, color }) === true;
  }

  destroy() {
    this.arrivalController?.destroy();
    this.arrivalController = null;
    this.staticGraphics?.destroy();
    this.pulseGraphics?.destroy();
    this.staticGraphics = null;
    this.pulseGraphics = null;
    this.scene = null;
  }
}
