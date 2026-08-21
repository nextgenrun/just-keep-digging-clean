import { CAVE_OCCLUSION_CONFIG } from "../../values/caveOcclusionConfig.js";

/**
 * Draws visual-only cover over cave interiors until discovered.
 */
export class CaveInteriorOcclusionSystem {
  constructor(scene, config = CAVE_OCCLUSION_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.worldModel = null;
    this.graphics = null;
    this.revealed = new Set();
    this.zones = [];
    this.lastTileKey = "";
  }

  create(worldModel) {
    if (!this.config.enabled || !worldModel) return;
    this.worldModel = worldModel;
    this.graphics = this.scene.add.graphics().setDepth(this.config.depth);
    this.zones = this.collectZones(worldModel);
  }

  destroy() {
    this.graphics?.destroy();
    this.graphics = null;
    this.revealed.clear();
    this.zones = [];
  }

  update(playerTile) {
    if (!this.graphics || !this.worldModel || !playerTile) return;

    const tileKey = `${playerTile.tx},${playerTile.ty}`;
    if (tileKey === this.lastTileKey) return;
    this.lastTileKey = tileKey;

    for (const zone of this.zones) {
      if (this.revealed.has(zone.id)) continue;
      if (this.isPlayerInside(zone, playerTile) || this.isBreached(zone)) {
        this._revealZone(zone);
      }
    }

    this.redraw(playerTile);
  }

  collectZones(worldModel) {
    const zones = [];
    this.addEllipseZones(zones, "cave", worldModel.caveZones || []);
    this.addEllipseZones(zones, "hiddenCave", worldModel.hiddenCaveZones || []);
    this.addTreasureRooms(zones, worldModel.hiddenCaveZones || []);
    return zones;
  }

  addEllipseZones(out, type, sourceZones) {
    sourceZones.forEach((zone, index) => {
      const fallbackLabel = {
        cave: "Integrated Cave",
        hiddenCave: "Hidden Cave",
      }[type] || "Underground Discovery";
      const sourceId = zone.id || `${type}-${index}-${zone.cx}-${zone.cy}`;
      out.push({
        id: `${type}:${sourceId}`,
        sourceId,
        type,
        shape: "ellipse",
        cx: zone.cx,
        cy: zone.cy,
        rx: Math.max(1, Number(zone.rx) || 1),
        ry: Math.max(1, Number(zone.ry) || 1),
        wallThickness: Math.max(0, Number(zone.wallThickness) || 0),
        displayName: zone.displayName || fallbackLabel,
        journalLabel: zone.identity?.journalLabel || fallbackLabel,
        journalKey: zone.identity?.journalKey || sourceId,
        hint: zone.discoveryHint || "",
        glowColor: zone.identity?.palette?.glow || 0x8fe8ff,
      });
    });
  }

  addTreasureRooms(out, hiddenCaves) {
    hiddenCaves.forEach((zone, index) => {
      if (!zone?.hasTreasureRoom) return;
      out.push({
        id: `hiddenTreasure-${index}-${zone.cx}-${zone.cy}`,
        sourceId: `hiddenTreasure-${index}-${zone.cx}-${zone.cy}`,
        type: "hiddenTreasure",
        shape: "rect",
        cx: zone.treasureRoomCx || zone.cx,
        cy: zone.treasureRoomCy || zone.cy,
        halfW: Math.max(1, Math.ceil((zone.treasureRoomW || 3) / 2)),
        halfH: Math.max(1, Math.ceil((zone.treasureRoomH || 2) / 2)),
        wallThickness: 0,
        displayName: "Hidden Treasure Room",
        journalLabel: "Hidden Treasure Room",
        journalKey: "hidden-treasure-room",
        hint: "A sealed cache was concealed inside the cavern.",
        glowColor: 0xffd35a,
      });
    });
  }

  _revealZone(zone) {
    this.revealed.add(zone.id);
    this.scene.retentionProgressSystem?.discoverJournal?.(
      zone.journalKey || zone.sourceId || zone.id,
      zone.journalLabel || zone.displayName,
    );
    this.scene.caveAtmosphereSystem?.celebrateDiscovery?.(zone.sourceId);
  }

  redraw(playerTile) {
    const g = this.graphics;
    const tileSize = this.scene.config?.tileSize || 94;
    const range = this.config.updateRangeTiles;

    g.clear();
    for (const zone of this.zones) {
      if (this.revealed.has(zone.id)) continue;
      if (Math.abs(zone.cx - playerTile.tx) > range || Math.abs(zone.cy - playerTile.ty) > range) continue;
      this.drawZone(g, zone, tileSize);
    }
  }

  drawZone(g, zone, tileSize) {
    const bounds = this.getBounds(zone);
    for (let ty = bounds.minY; ty <= bounds.maxY; ty += 1) {
      for (let tx = bounds.minX; tx <= bounds.maxX; tx += 1) {
        if (!this.worldModel.inBounds(tx, ty) || !this.contains(zone, tx, ty)) continue;
        const shade = Math.abs((tx * 17 + ty * 31) % 5) * 0x020202;
        g.fillStyle(Math.min(0xffffff, this.config.fillColor + shade), this.config.fillAlpha);
        g.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
        if (this.isEdgeTile(zone, tx, ty)) {
          g.fillStyle(this.config.edgeColor, this.config.edgeAlpha);
          g.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
        } else if ((tx + ty) % 3 === 0) {
          g.fillStyle(0xffffff, this.config.bandAlpha);
          g.fillRect(tx * tileSize, ty * tileSize, tileSize, 2);
        }
      }
    }
  }

  getBounds(zone) {
    if (zone.shape === "rect") {
      return {
        minX: Math.floor(zone.cx - zone.halfW),
        maxX: Math.ceil(zone.cx + zone.halfW),
        minY: Math.floor(zone.cy - zone.halfH),
        maxY: Math.ceil(zone.cy + zone.halfH),
      };
    }
    return {
      minX: Math.floor(zone.cx - zone.rx),
      maxX: Math.ceil(zone.cx + zone.rx),
      minY: Math.floor(zone.cy - zone.ry),
      maxY: Math.ceil(zone.cy + zone.ry),
    };
  }

  contains(zone, tx, ty) {
    if (zone.shape === "rect") {
      return Math.abs(tx - zone.cx) <= zone.halfW && Math.abs(ty - zone.cy) <= zone.halfH;
    }
    return ((tx - zone.cx) / zone.rx) ** 2 + ((ty - zone.cy) / zone.ry) ** 2 <= 1;
  }

  isEdgeTile(zone, tx, ty) {
    return !this.contains(zone, tx - 1, ty) ||
      !this.contains(zone, tx + 1, ty) ||
      !this.contains(zone, tx, ty - 1) ||
      !this.contains(zone, tx, ty + 1);
  }

  isPlayerInside(zone, playerTile) {
    return this.contains(zone, playerTile.tx, playerTile.ty);
  }

  isBreached(zone) {
    // Authored cave mouths are permanent AIR, so shell damage cannot be used
    // as a discovery signal. Caves reveal only when the player enters them.
    return false;
  }
}
