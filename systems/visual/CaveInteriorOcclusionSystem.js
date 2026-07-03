import { CAVE_OCCLUSION_CONFIG } from "../../values/caveOcclusionConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

/**
 * Draws visual-only cover over cave and geode interiors until discovered.
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
        this.revealed.add(zone.id);
      }
    }

    this.redraw(playerTile);
  }

  collectZones(worldModel) {
    const zones = [];
    this.addEllipseZones(zones, "cave", worldModel.caveZones || []);
    this.addEllipseZones(zones, "hiddenCave", worldModel.hiddenCaveZones || []);
    this.addTreasureRooms(zones, worldModel.hiddenCaveZones || []);
    this.addEllipseZones(zones, "geode", worldModel.geodeZones || []);
    return zones;
  }

  addEllipseZones(out, type, sourceZones) {
    sourceZones.forEach((zone, index) => {
      out.push({
        id: `${type}-${index}-${zone.cx}-${zone.cy}`,
        type,
        shape: "ellipse",
        cx: zone.cx,
        cy: zone.cy,
        rx: Math.max(1, Number(zone.rx) || 1),
        ry: Math.max(1, Number(zone.ry) || 1),
        wallThickness: Math.max(0, Number(zone.wallThickness) || 0),
      });
    });
  }

  addTreasureRooms(out, hiddenCaves) {
    hiddenCaves.forEach((zone, index) => {
      if (!zone?.hasTreasureRoom) return;
      out.push({
        id: `hiddenTreasure-${index}-${zone.cx}-${zone.cy}`,
        type: "hiddenTreasure",
        shape: "rect",
        cx: zone.treasureRoomCx || zone.cx,
        cy: zone.treasureRoomCy || zone.cy,
        halfW: Math.max(1, Math.ceil((zone.treasureRoomW || 3) / 2)),
        halfH: Math.max(1, Math.ceil((zone.treasureRoomH || 2) / 2)),
        wallThickness: 0,
      });
    });
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
    if (zone.shape !== "ellipse" || zone.wallThickness <= 0) return false;

    const wallRx = zone.rx + zone.wallThickness;
    const wallRy = zone.ry + zone.wallThickness;
    for (let ty = Math.floor(zone.cy - wallRy); ty <= Math.ceil(zone.cy + wallRy); ty += 1) {
      for (let tx = Math.floor(zone.cx - wallRx); tx <= Math.ceil(zone.cx + wallRx); tx += 1) {
        if (!this.worldModel.inBounds(tx, ty)) continue;
        const outer = ((tx - zone.cx) / wallRx) ** 2 + ((ty - zone.cy) / wallRy) ** 2 <= 1;
        const inner = this.contains(zone, tx, ty);
        if (!outer || inner) continue;
        const tileType = this.worldModel.getTileType(tx, ty);
        if (zone.type === "geode" && tileType !== TILE_TYPES.GEODE_WALL) return true;
        if (zone.type === "cave" && tileType === TILE_TYPES.AIR) return true;
      }
    }
    return false;
  }
}
