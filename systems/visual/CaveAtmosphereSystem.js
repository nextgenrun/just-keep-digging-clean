import {
  CAVE_ARCHETYPE_CONFIG,
  getCaveArchetype,
} from "../../values/caveArchetypes.js";
import { hash01 } from "../../values/deterministicMath.js";

function getZoneIdentity(zone) {
  const archetype = getCaveArchetype(zone?.archetypeId);
  return {
    motif: zone?.identity?.motif || archetype.motif,
    palette: zone?.identity?.palette || archetype.palette,
    seed: zone?.visualSeed || 1,
  };
}

/**
 * Streams deterministic cave-only backwall art behind the authoritative grid.
 * Terrain remains in front, so all procedural detail is naturally clipped to air.
 */
export class CaveAtmosphereSystem {
  constructor(scene, config = CAVE_ARCHETYPE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.worldModel = null;
    this.backdropGraphics = null;
    this.detailGraphics = null;
    this.motionGraphics = null;
    this.activeZones = [];
    this.activeSignature = "";
    this.lastUpdateMs = Number.NEGATIVE_INFINITY;
    this.revealStartedAt = new Map();
  }

  create(worldModel) {
    if (!this.config.enabled || !worldModel) return false;
    this.worldModel = worldModel;
    const render = this.config.render;
    this.backdropGraphics = this.scene.add.graphics().setDepth(render.backdropDepth);
    this.detailGraphics = this.scene.add.graphics().setDepth(render.detailDepth);
    this.motionGraphics = this.scene.add.graphics().setDepth(render.motionDepth);
    const addBlend = globalThis.Phaser?.BlendModes?.ADD;
    if (addBlend !== undefined) this.motionGraphics.setBlendMode(addBlend);
    return true;
  }

  update(playerTile, now = this.scene.time?.now || 0) {
    if (!this.worldModel || !this.motionGraphics || !playerTile) return;
    if (now - this.lastUpdateMs < this.config.render.updateIntervalMs) return;
    this.lastUpdateMs = now;

    const nextZones = this._collectVisibleZones(playerTile);
    const signature = nextZones.map(zone => zone.id).join("|");
    if (signature !== this.activeSignature) {
      this.activeZones = nextZones;
      this.activeSignature = signature;
      this._redrawStatic();
    }
    this._redrawMotion(now);
  }

  celebrateDiscovery(zoneId) {
    if (!zoneId) return;
    this.revealStartedAt.set(zoneId, this.scene.time?.now || 0);
  }

  destroy() {
    this.backdropGraphics?.destroy();
    this.detailGraphics?.destroy();
    this.motionGraphics?.destroy();
    this.backdropGraphics = null;
    this.detailGraphics = null;
    this.motionGraphics = null;
    this.worldModel = null;
    this.activeZones = [];
    this.revealStartedAt.clear();
  }

  _collectVisibleZones(playerTile) {
    const range = this.config.render.rangeTiles;
    return (this.worldModel.caveZones || [])
      .filter(zone => (
        zone?.standaloneScene !== true
        && Math.abs(zone.cx - playerTile.tx) <= range + zone.rx
        && Math.abs(zone.cy - playerTile.ty) <= range + zone.ry
      ))
      .sort((a, b) => {
        const aDistance = Math.abs(a.cx - playerTile.tx) + Math.abs(a.cy - playerTile.ty);
        const bDistance = Math.abs(b.cx - playerTile.tx) + Math.abs(b.cy - playerTile.ty);
        return aDistance - bDistance;
      })
      .slice(0, this.config.render.maxVisibleZones);
  }

  _redrawStatic() {
    const backdrop = this.backdropGraphics;
    const detail = this.detailGraphics;
    const tileSize = this.scene.config?.tileSize || 94;
    const render = this.config.render;
    backdrop.clear();
    detail.clear();

    for (const zone of this.activeZones) {
      const identity = getZoneIdentity(zone);
      const centerX = (zone.cx + 0.5) * tileSize;
      const centerY = (zone.cy + 0.5) * tileSize;
      const width = (zone.rx * 2 + 1) * tileSize;
      const height = (zone.ry * 2 + 1) * tileSize;

      backdrop.fillStyle(identity.palette.backdrop, render.backdropAlpha);
      backdrop.fillEllipse(centerX, centerY, width, height);
      backdrop.fillStyle(identity.palette.shadow, render.shadowAlpha);
      backdrop.fillEllipse(centerX, centerY - height * 0.24, width * 0.96, height * 0.46);

      detail.lineStyle(Math.max(2, tileSize * 0.035), identity.palette.strata, render.strataAlpha);
      detail.lineBetween(centerX - width * 0.47, centerY - tileSize * 0.23, centerX + width * 0.47, centerY - tileSize * 0.23);
      detail.lineBetween(centerX - width * 0.44, centerY + tileSize * 0.29, centerX + width * 0.44, centerY + tileSize * 0.29);
      this._drawMotif(detail, zone, identity, centerX, centerY, width, height, tileSize);
    }
  }

  _drawMotif(graphics, zone, identity, x, y, width, height, tileSize) {
    const alpha = this.config.render.accentAlpha;
    graphics.lineStyle(Math.max(2, tileSize * 0.025), identity.palette.accent, alpha);

    if (identity.motif === "echo") {
      for (let index = 0; index < 4; index += 1) {
        const px = x - width * 0.31 + width * 0.2 * index;
        const scale = 0.22 + hash01(identity.seed, index, zone.cx, 11) * 0.18;
        graphics.strokeEllipse(px, y, tileSize * scale * 2, height * 0.58);
      }
      return;
    }

    if (identity.motif === "roots") {
      for (let index = 0; index < 6; index += 1) {
        const px = x - width * 0.42 + width * (index + 0.5) / 6;
        const drift = (hash01(identity.seed, index, zone.cy, 23) - 0.5) * tileSize * 0.6;
        graphics.beginPath();
        graphics.moveTo(px, y - height * 0.43);
        graphics.lineTo(px + drift * 0.35, y - tileSize * 0.08);
        graphics.lineTo(px + drift, y + height * 0.34);
        graphics.strokePath();
      }
      return;
    }

    if (identity.motif === "crystal") {
      graphics.fillStyle(identity.palette.accent, alpha * 0.82);
      for (let index = 0; index < 5; index += 1) {
        const px = x - width * 0.34 + width * 0.17 * index;
        const crystalHeight = tileSize * (0.18 + hash01(identity.seed, index, 31) * 0.32);
        graphics.fillTriangle(
          px - tileSize * 0.07,
          y + height * 0.38,
          px + tileSize * 0.07,
          y + height * 0.38,
          px,
          y + height * 0.38 - crystalHeight,
        );
      }
      return;
    }

    if (identity.motif === "storm" || identity.motif === "ember") {
      const lineY = identity.motif === "ember" ? y + height * 0.26 : y - height * 0.08;
      graphics.beginPath();
      graphics.moveTo(x - width * 0.43, lineY);
      for (let index = 1; index <= 9; index += 1) {
        const px = x - width * 0.43 + width * 0.86 * index / 9;
        const jitter = (hash01(identity.seed, index, zone.cx, 47) - 0.5) * tileSize * 0.46;
        graphics.lineTo(px, lineY + jitter);
      }
      graphics.strokePath();
      return;
    }

    const blockWidth = Math.max(tileSize * 0.45, width / 12);
    for (let px = x - width * 0.42; px < x + width * 0.42; px += blockWidth) {
      graphics.lineBetween(px, y - height * 0.31, px, y + height * 0.31);
    }
    graphics.strokeEllipse(x, y + height * 0.1, Math.min(width * 0.28, tileSize * 4), height * 0.62);
  }

  _redrawMotion(now) {
    const graphics = this.motionGraphics;
    const tileSize = this.scene.config?.tileSize || 94;
    const render = this.config.render;
    graphics.clear();

    for (const zone of this.activeZones) {
      const identity = getZoneIdentity(zone);
      const centerX = (zone.cx + 0.5) * tileSize;
      const centerY = (zone.cy + 0.5) * tileSize;
      const width = (zone.rx * 2 + 1) * tileSize;
      const moteCount = Math.min(8, Math.max(3, Math.ceil(zone.rx / 5)));
      for (let index = 0; index < moteCount; index += 1) {
        const baseX = hash01(identity.seed, index, zone.cx, 61);
        const baseY = hash01(identity.seed, index, zone.cy, 73);
        const phase = now * 0.0012 + index * 1.73 + identity.seed % 17;
        const px = centerX + (baseX - 0.5) * width * 0.82 + Math.sin(phase) * tileSize * 0.08;
        const py = centerY + (baseY - 0.5) * tileSize * 0.9 + Math.cos(phase * 0.7) * tileSize * 0.05;
        const pulse = 0.45 + Math.sin(phase * 1.4) * 0.2;
        graphics.fillStyle(identity.palette.glow, render.motionAlpha * pulse);
        graphics.fillCircle(px, py, 1.5 + baseY * 2.4);
      }

      const revealStart = this.revealStartedAt.get(zone.id);
      if (revealStart === undefined) continue;
      const progress = (now - revealStart) / render.revealDurationMs;
      if (progress >= 1) {
        this.revealStartedAt.delete(zone.id);
        continue;
      }
      graphics.lineStyle(
        Math.max(2, tileSize * 0.045 * (1 - progress)),
        identity.palette.glow,
        0.8 * (1 - progress),
      );
      graphics.strokeEllipse(
        centerX,
        centerY,
        width * (0.18 + progress * 0.78),
        tileSize * (0.35 + progress * 1.15),
      );
    }
  }
}
