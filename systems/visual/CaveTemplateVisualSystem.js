import { CAVE_GEODE_CRYSTAL_TEMPLATES } from "../../values/caveGeodeCrystalTemplates.js";

/**
 * Places optional authored visual templates over procedural cave/geode/crystal zones.
 */
export class CaveTemplateVisualSystem {
  constructor(scene, templateData = CAVE_GEODE_CRYSTAL_TEMPLATES) {
    this.scene = scene;
    this.templateData = templateData;
    this.placedObjects = [];
    this._textureFilenameIndex = null;
  }

  create(worldModel) {
    if (!this.templateData?.enabled || !worldModel) return;

    const groups = this.templateData.templateGroups || {};
    this.placeZoneGroup(worldModel.caveZones, groups.normalCaves, "normalCaves");
    this.placeZoneGroup(worldModel.hiddenCaveZones, groups.hiddenCaves, "hiddenCaves");
    this.placeTreasureRoomGroup(worldModel.hiddenCaveZones, groups.hiddenCaveTreasureRooms);
    this.placeZoneGroup(worldModel.geodeZones, groups.geodes, "geodes");
    this.placeZoneGroup(worldModel.glowCrystalZones, groups.glowCrystals, "glowCrystals");

    console.log(`[CaveTemplateVisualSystem] placed ${this.placedObjects.length} authored cave/geode/crystal visuals`);
  }

  destroy() {
    for (const obj of this.placedObjects) {
      if (obj?.active) obj.destroy();
    }
    this.placedObjects = [];
  }

  placeZoneGroup(zones, templates, templateType) {
    if (!Array.isArray(zones) || !Array.isArray(templates) || templates.length === 0) return;
    for (let i = 0; i < zones.length; i += 1) {
      const zone = zones[i];
      const template = this.pickTemplate(templates, zone, i);
      if (template) this.placeTemplate(template, zone, templateType);
    }
  }

  placeTreasureRoomGroup(zones, templates) {
    if (!Array.isArray(zones) || !Array.isArray(templates) || templates.length === 0) return;
    for (let i = 0; i < zones.length; i += 1) {
      const zone = zones[i];
      if (!zone?.hasTreasureRoom) continue;
      const template = this.pickTemplate(templates, zone, i);
      if (!template) continue;
      this.placeTemplate(template, {
        ...zone,
        cx: zone.treasureRoomCx || zone.cx,
        cy: zone.treasureRoomCy || zone.cy,
        rx: 1,
        ry: 1,
      }, "hiddenCaveTreasureRooms");
    }
  }

  pickTemplate(templates, zone, index) {
    if (!zone || templates.length === 0) return null;
    const bucket = this.getZoneSizeBucket(zone);
    const sameBucket = templates.filter(t => t.sizeBucket === bucket);
    const candidates = sameBucket.length > 0 ? sameBucket : templates;
    const pick = Math.abs(this.hashZone(zone, index)) % candidates.length;
    return candidates[pick];
  }

  getZoneSizeBucket(zone) {
    const rx = Math.max(1, Number(zone.rx) || 1);
    const ry = Math.max(1, Number(zone.ry) || 1);
    const area = rx * 2 * ry * 2;
    if (area < 40) return "small";
    if (area < 130) return "medium";
    return "large";
  }

  hashZone(zone, index) {
    const cx = Math.floor(Number(zone.cx) || 0);
    const cy = Math.floor(Number(zone.cy) || 0);
    const seed = Math.floor(Number(zone.seed) || index || 0);
    return ((cx * 73856093) ^ (cy * 19349663) ^ (seed * 83492791)) | 0;
  }

  placeTemplate(template, zone, templateType) {
    if (!Array.isArray(template.objects) || template.objects.length === 0) return;

    const tilePx = this.templateData.tilePx || this.scene.config?.tileSize || 94;
    const worldTilePx = this.scene.config?.tileSize || tilePx;
    const centerX = zone.cx * worldTilePx + worldTilePx / 2;
    const centerY = zone.cy * worldTilePx + worldTilePx / 2;
    const scale = this.getTemplateScale(template, zone);
    const baseDepth = templateType === "glowCrystals" ? 2 : 1.4;

    for (const obj of template.objects) {
      const textureKey = this.findTextureForObject(obj);
      if (!textureKey) {
        console.warn("[CaveTemplateVisualSystem] Missing template texture", obj.name || obj.textureKey || obj.sourcePath);
        continue;
      }

      const img = this.scene.add.image(
        centerX + (Number(obj.localX) || 0) * scale,
        centerY + (Number(obj.localY) || 0) * scale,
        textureKey
      );
      img.setOrigin(0.5);
      img.setDepth(baseDepth);
      img.setAlpha(this.clampAlpha(obj.opacity));
      img.setDisplaySize(Math.max(1, (Number(obj.w) || tilePx) * scale), Math.max(1, (Number(obj.h) || tilePx) * scale));
      if (obj.rotation) img.setAngle(Number(obj.rotation) || 0);
      if (obj.tint) {
        const tint = Number.parseInt(String(obj.tint).replace("#", ""), 16);
        if (Number.isFinite(tint)) img.setTint(tint);
      }
      this.placedObjects.push(img);
    }
  }

  getTemplateScale(template, zone) {
    const templateW = Math.max(1, Number(template.widthTiles) || 1);
    const templateH = Math.max(1, Number(template.heightTiles) || 1);
    const zoneW = Math.max(1, (Number(zone.rx) || 1) * 2 + (Number(zone.wallThickness) || 0) * 2 + 4);
    const zoneH = Math.max(1, (Number(zone.ry) || 1) * 2 + (Number(zone.wallThickness) || 0) * 2 + 4);
    return Math.max(0.35, Math.min(2.2, Math.min(zoneW / templateW, zoneH / templateH)));
  }

  findTextureForObject(obj) {
    if (obj.textureKey && this.scene.textures.exists(obj.textureKey)) return obj.textureKey;
    const filename = this.extractFilename(obj.resolvedFilename || obj.sourcePath || obj.name || "");
    if (!filename) return null;

    const knownFiles = this.getTextureFilenameIndex();
    const normalized = this.normalizeFilename(filename);
    if (knownFiles.has(normalized)) return knownFiles.get(normalized);
    const base = normalized.replace(/\.\w+$/, "");
    for (const [file, key] of knownFiles) {
      if (file.includes(base) || base.includes(file.replace(/\.\w+$/, ""))) return key;
    }
    return null;
  }

  getTextureFilenameIndex() {
    if (this._textureFilenameIndex) return this._textureFilenameIndex;
    const knownFiles = new Map();
    for (const key of this.scene.textures.getTextureKeys()) {
      const tex = this.scene.textures.get(key);
      const source = tex?.getSourceImage();
      const srcFile = source?.src?.split("/").pop()?.split("?")[0] || "";
      const normalized = this.normalizeFilename(srcFile);
      if (normalized) knownFiles.set(normalized, key);
    }
    this._textureFilenameIndex = knownFiles;
    return knownFiles;
  }

  extractFilename(name) {
    return String(name || "").replace(/^\d+:\s*/, "").split(/[\\/]/).pop().trim();
  }

  normalizeFilename(filename) {
    try {
      return decodeURIComponent(filename).toLowerCase();
    } catch (_) {
      return String(filename || "").toLowerCase();
    }
  }

  clampAlpha(value) {
    const alpha = Number(value);
    if (!Number.isFinite(alpha)) return 1;
    return Math.max(0, Math.min(1, alpha));
  }
}
