import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  DAMAGE_STAGE_KEYS_BY_TYPE,
  RUBBLE_DAMAGE_STAGE_COUNT,
  RUBBLE_FRAME_COUNT,
  RUBBLE_INDEX_START,
  RUBBLE_TILE_TYPES,
  TILESET_SOURCE_KEYS,
  TILE_RENDER_INDEX,
} from "./tileRenderMap.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  SOIL_ATLAS_FRAME_COUNT,
  SOIL_BAND_COUNT,
  SOIL_VARIANT_COUNT,
  SOIL_TYPE_COUNT,
  SOIL_RARITY_COUNT,
  SOIL_DAMAGE_STAGE_COUNT,
  getSoilAtlasOffset,
} from "../../values/dynamicSoil.js";

// Resource color used for brief "what's inside" flash on sky tiles
const RESOURCE_GLOW_COLORS = {
  1:  0x8B4513, // dirt — brown
  2:  0x808080, // stone — gray
  3:  0xB87333, // copper — copper
  5:  0x654321, // darkDirtNormal — dark brown
  6:  0x3E2723, // darkDirtStrong — very dark brown
  7:  0xCD7F32, // bronze — bronze
  8:  0x4682B4, // steel — steel blue
  9:  0x71797E, // iron — iron gray
  10: 0xC0C0C0, // silver — silver
  11: 0xFFD700, // gold — gold
};

// Per-rarity glow configuration
const RARITY_GLOW = [
  { color: 0x87CEEB, speed: 500,  alphaBase: 0.3,  edgeAlpha: 0.8  }, // 0 common — blue
  { color: 0xCC44FF, speed: 280,  alphaBase: 0.45, edgeAlpha: 1.0  }, // 1 rare — purple
  { color: 0xFFD700, speed: 160,  alphaBase: 0.55, edgeAlpha: 1.0  }, // 2 legendary — gold
  { color: 0xFF4422, speed: 120,  alphaBase: 0.60, edgeAlpha: 1.0  }, // 3 ancient — red
  { color: 0x00FFEE, speed:  90,  alphaBase: 0.65, edgeAlpha: 1.0  }, // 4 cosmic — cyan
  { color: 0x9900FF, speed:  60,  alphaBase: 0.70, edgeAlpha: 1.0  }, // 5 void — violet
];

const TAU = Math.PI * 2;

const RUBBLE_ACCENT_COLORS = {
  [TILE_TYPES.DIRT]: 0x8a4f28,
  [TILE_TYPES.STONE]: 0x858585,
  [TILE_TYPES.COPPER]: 0xb87333,
  [TILE_TYPES.DARK_DIRT_NORMAL]: 0x5d3825,
  [TILE_TYPES.DARK_DIRT_STRONG]: 0x3f2b22,
  [TILE_TYPES.BRONZE]: 0xcd7f32,
  [TILE_TYPES.STEEL]: 0x4682b4,
  [TILE_TYPES.IRON]: 0x71797e,
  [TILE_TYPES.SILVER]: 0xc0c0c0,
  [TILE_TYPES.GOLD]: 0xffd700,
};

function hashUnit(seed, a = 0, b = 0, c = 0) {
  let value = (seed + Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function mixColor(from, to, amount) {
  const t = Phaser.Math.Clamp(amount, 0, 1);
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return (r << 16) | (g << 8) | b;
}

function cssColor(color, alpha = 1) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRubbleAccents(ctx, tileSize, type, stage) {
  const base = RUBBLE_ACCENT_COLORS[type] ?? 0x777777;
  const shadow = mixColor(base, 0x15110d, 0.62);
  const highlight = mixColor(base, 0xf2d9ad, 0.24);
  const damageWeight = (RUBBLE_DAMAGE_STAGE_COUNT - stage + 1) / RUBBLE_DAMAGE_STAGE_COUNT;

  ctx.save();
  ctx.fillStyle = cssColor(0x17110d, 0.20 + damageWeight * 0.10);
  ctx.fillRect(0, 0, tileSize, tileSize);

  ctx.fillStyle = cssColor(shadow, 0.62);
  ctx.beginPath();
  ctx.moveTo(tileSize * 0.05, tileSize * 0.88);
  ctx.lineTo(tileSize * 0.18, tileSize * 0.70);
  ctx.lineTo(tileSize * 0.34, tileSize * 0.78);
  ctx.lineTo(tileSize * 0.50, tileSize * 0.63);
  ctx.lineTo(tileSize * 0.72, tileSize * 0.76);
  ctx.lineTo(tileSize * 0.92, tileSize * 0.66);
  ctx.lineTo(tileSize * 0.98, tileSize * 0.94);
  ctx.lineTo(tileSize * 0.05, tileSize * 0.96);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cssColor(highlight, 0.38);
  ctx.beginPath();
  ctx.moveTo(tileSize * 0.16, tileSize * 0.73);
  ctx.lineTo(tileSize * 0.30, tileSize * 0.66);
  ctx.lineTo(tileSize * 0.42, tileSize * 0.75);
  ctx.lineTo(tileSize * 0.31, tileSize * 0.81);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tileSize * 0.61, tileSize * 0.72);
  ctx.lineTo(tileSize * 0.76, tileSize * 0.66);
  ctx.lineTo(tileSize * 0.87, tileSize * 0.73);
  ctx.lineTo(tileSize * 0.72, tileSize * 0.82);
  ctx.closePath();
  ctx.fill();

  const chipCount = 5 + Math.round(damageWeight * 5);
  for (let i = 0; i < chipCount; i += 1) {
    const x = tileSize * (0.15 + ((i * 37) % 70) / 100);
    const y = tileSize * (0.18 + ((i * 23 + stage * 11) % 56) / 100);
    const size = tileSize * (0.035 + ((i + stage) % 3) * 0.012);
    ctx.fillStyle = cssColor(i % 2 === 0 ? highlight : shadow, 0.36 + damageWeight * 0.18);
    ctx.fillRect(x, y, size, size * 0.72);
  }

  ctx.restore();
}

function crystalEllipseValue(tx, ty, zone) {
  const rx = Math.max(0.001, zone.rx || 1);
  const ry = Math.max(0.001, zone.ry || 1);
  const nx = (tx - zone.cx) / rx;
  const ny = (ty - zone.cy) / ry;
  return nx * nx + ny * ny;
}

export class WorldRenderer {
  constructor(scene, worldModel, config) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.map = null;
    this.layer = null;
    this.rootOverlayLayer = null;
    
    // Gem Vision state
    this._gemVisionActive = false;
    this._revealedResources = new Map(); // Map: "tx,ty" -> {timestamp, type}
    this._highlightGraphics = null; // Graphics object for resource highlights
    
    // Sky tile highlighting
    this._skyTileGraphics = null; // Graphics object for sky tile glow effects
    this._specialBlockGraphics = null; // Graphics object for special block glow effects
    
    // Chest glow — golden pulsing light around treasure chests
    this._chestGlowGfx = null;
    
    // Glow crystal — pretty colored crystal clusters
    this._glowCrystalGfx = null;
    this._glowCrystalShardGfx = null;
  }

  create() {
    this.createTilesheetTexture();
    this.createLayer();
    this.paintInitialWorld();
    this.layer.setCollisionByExclusion([-1, 0], true);
    
    // Create graphics object for resource highlights
    this._highlightGraphics = this.scene.add.graphics();
    
    // Create graphics object for sky tile glow effects
    this._skyTileGraphics = this.scene.add.graphics();
    this._skyTileGraphics.setDepth(0); // Above tiles, below player
    
    // Create graphics object for special block glow effects
    this._specialBlockGraphics = this.scene.add.graphics();
    this._specialBlockGraphics.setDepth(0); // Above tiles, below player

    if (this.rootOverlayLayer) {
      this.rootOverlayLayer.setDepth(1);
    }
    
    // Create chest glow graphics (golden pulsing light)
    this._chestGlowGfx = this.scene.add.graphics();
    this._chestGlowGfx.setDepth(0); // Same depth as tiles
    
    // Create glow crystal graphics (pretty colored clusters)
    this._glowCrystalGfx = this.scene.add.graphics();
    this._glowCrystalGfx.setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    this._glowCrystalShardGfx = this.scene.add.graphics();
    this._glowCrystalShardGfx.setDepth(2); // Physical shards stay under darkness reveal.
  }

  /**
   * Keeps dedicated luminous effects below the darkness compositor so they
   * inherit the same player-vision mask as the tilemap.
   */
  setEmissiveRenderDepth(depth) {
    const renderDepth = Number.isFinite(depth) ? depth : 898;
    [
      this._skyTileGraphics,
      this._specialBlockGraphics,
      this._chestGlowGfx,
      this._glowCrystalGfx,
    ].forEach((graphics) => {
      graphics?.setDepth(renderDepth).setBlendMode(Phaser.BlendModes.ADD);
    });
  }

  createTilesheetTexture() {
    const textureKey = ASSET_KEYS.runtime.tilesheet;

    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey);
    }

    const tileSize = this.config.tileSize;
    const totalCells = SOIL_ATLAS_FRAME_COUNT + TILESET_SOURCE_KEYS.length + RUBBLE_FRAME_COUNT + 1;
    const columns = Math.ceil(Math.sqrt(totalCells));
    const rows = Math.ceil(totalCells / columns);
    const canvasTexture = this.scene.textures.createCanvas(textureKey, columns * tileSize, rows * tileSize);
    const ctx = canvasTexture.getContext();

    ctx.imageSmoothingEnabled = false;

    const drawCell = (index, image) => {
      const dx = (index % columns) * tileSize;
      const dy = Math.floor(index / columns) * tileSize;
      ctx.clearRect(dx, dy, tileSize, tileSize);
      ctx.drawImage(image, 0, 0, image.width, image.height, dx, dy, tileSize, tileSize);
    };

    const soilKeys = ASSET_KEYS.tiles.dynamicSoil;
    const rarityKeys = [null, soilKeys.rarity.rich, soilKeys.rarity.packed, soilKeys.rarity.ancient];
    const getImage = (key) => this.scene.textures.get(key)?.getSourceImage();
    const scratch = document.createElement('canvas');
    scratch.width = tileSize;
    scratch.height = tileSize;
    const scratchContext = scratch.getContext('2d');
    scratchContext.imageSmoothingEnabled = false;

    for (let band = 0; band < SOIL_BAND_COUNT; band += 1) {
      for (let variant = 0; variant < SOIL_VARIANT_COUNT; variant += 1) {
        const baseImage = getImage(soilKeys.bases[band][variant]);
        if (!baseImage) throw new Error(`Missing dynamic soil base: band ${band}, variant ${variant}`);
        for (let typeIndex = 0; typeIndex < SOIL_TYPE_COUNT; typeIndex += 1) {
          for (let rarity = 0; rarity < SOIL_RARITY_COUNT; rarity += 1) {
            for (let stage = 1; stage <= SOIL_DAMAGE_STAGE_COUNT; stage += 1) {
              scratchContext.clearRect(0, 0, tileSize, tileSize);
              scratchContext.drawImage(baseImage, 0, 0, tileSize, tileSize);

              if (typeIndex > 0) {
                scratchContext.fillStyle = typeIndex === 1 ? 'rgba(8,7,12,0.17)' : 'rgba(5,4,9,0.34)';
                scratchContext.fillRect(0, 0, tileSize, tileSize);
                const hardnessKey = typeIndex === 1 ? soilKeys.hardness.compact : soilKeys.hardness.strong;
                scratchContext.drawImage(getImage(hardnessKey), 0, 0, tileSize, tileSize);
              }

              if (rarityKeys[rarity]) {
                scratchContext.drawImage(getImage(rarityKeys[rarity]), 0, 0, tileSize, tileSize);
              }
              scratchContext.drawImage(getImage(soilKeys.cracks[stage - 1]), 0, 0, tileSize, tileSize);

              const descriptor = { band, variant, typeIndex, rarity };
              const index = 1 + getSoilAtlasOffset(descriptor, stage);
              drawCell(index, scratch);
            }
          }
        }
      }
    }

    console.log('[WorldRenderer] Building tilesheet with', totalCells - 1, 'tiles in', columns, 'x', rows, 'cells');

    for (let i = 0; i < TILESET_SOURCE_KEYS.length; i += 1) {
      const sourceKey = TILESET_SOURCE_KEYS[i];
      const sourceTexture = this.scene.textures.get(sourceKey);
      const sourceImage = sourceTexture?.getSourceImage();

      if (!sourceImage) {
        throw new Error(`Missing source texture for tilesheet key: ${sourceKey}`);
      }

      const index = SOIL_ATLAS_FRAME_COUNT + i + 1;
      drawCell(index, sourceImage);
      
      if (i < 3 || i >= TILESET_SOURCE_KEYS.length - 3) {
        console.log('[WorldRenderer] Tile', index, '- source:', sourceKey);
      }
    }

    const rubbleOverlay = getImage(soilKeys.material.rubble);
    if (!rubbleOverlay) {
      throw new Error("Missing dynamic soil rubble material overlay");
    }

    for (let typeIndex = 0; typeIndex < RUBBLE_TILE_TYPES.length; typeIndex += 1) {
      const type = RUBBLE_TILE_TYPES[typeIndex];
      const stageKeys = DAMAGE_STAGE_KEYS_BY_TYPE[type];
      for (let stage = 1; stage <= RUBBLE_DAMAGE_STAGE_COUNT; stage += 1) {
        const sourceImage = getImage(stageKeys[stage - 1]);
        if (!sourceImage) {
          throw new Error(`Missing rubble source texture for tile type ${type}, stage ${stage}`);
        }

        scratchContext.clearRect(0, 0, tileSize, tileSize);
        scratchContext.drawImage(sourceImage, 0, 0, tileSize, tileSize);
        scratchContext.drawImage(rubbleOverlay, 0, 0, tileSize, tileSize);
        drawRubbleAccents(scratchContext, tileSize, type, stage);
        drawCell(RUBBLE_INDEX_START + typeIndex * RUBBLE_DAMAGE_STAGE_COUNT + stage - 1, scratch);
      }
    }

    canvasTexture.refresh();
    console.log('[WorldRenderer] Tilesheet built successfully');
  }

  createLayer() {
    this.map = this.scene.make.tilemap({
      tileWidth: this.config.tileSize,
      tileHeight: this.config.tileSize,
      width: this.worldModel.width,
      height: this.worldModel.depth,
    });

    const tileset = this.map.addTilesetImage(
      ASSET_KEYS.runtime.tilesheet,
      ASSET_KEYS.runtime.tilesheet,
      this.config.tileSize,
      this.config.tileSize,
      0,
      0,
    );

    this.layer = this.map.createBlankLayer("world", tileset, 0, 0);
    this.layer.setCullPadding(3, 3);
    this.rootOverlayLayer = this.map.createBlankLayer("root-overlays", tileset, 0, 0);
    this.rootOverlayLayer.setCullPadding(3, 3);
    this.rootOverlayLayer.setDepth(1);
  }

  paintInitialWorld() {
    const row = new Array(this.worldModel.width);
    const rootRow = new Array(this.worldModel.width);

    for (let ty = 0; ty < this.worldModel.depth; ty += 1) {
      for (let tx = 0; tx < this.worldModel.width; tx += 1) {
        row[tx] = this.worldModel.getRenderIndex(tx, ty);
        rootRow[tx] = this.getRootOverlayRenderIndex(tx, ty);
      }

      this.layer.putTilesAt(row, 0, ty);
      this.rootOverlayLayer?.putTilesAt(rootRow, 0, ty);
    }
  }

  getRootOverlayRenderIndex(tx, ty) {
    const overlayType = this.worldModel.getRootOverlayType(tx, ty);
    if (overlayType === 0 || this.worldModel.getTileType(tx, ty) === TILE_TYPES.AIR) {
      return -1;
    }
    if (overlayType === TILE_TYPES.ROOT_OVERLAY) {
      return TILE_RENDER_INDEX.ROOT_OVERLAY;
    }
    if (overlayType === TILE_TYPES.ROOT_OVERLAY_DEEP) {
      return TILE_RENDER_INDEX.ROOT_OVERLAY_DEEP;
    }
    return -1;
  }

  applyRootOverlayUpdate(tx, ty) {
    if (!this.rootOverlayLayer) return;
    const renderIndex = this.getRootOverlayRenderIndex(tx, ty);
    if (renderIndex === -1) {
      this.rootOverlayLayer.removeTileAt(tx, ty, true, true);
      return;
    }
    const existing = this.rootOverlayLayer.getTileAt(tx, ty, false);
    if (!existing || existing.index !== renderIndex) {
      this.rootOverlayLayer.putTileAt(renderIndex, tx, ty, true);
    }
  }

  applyTileUpdate(tx, ty) {
    const renderIndex = this.worldModel.getRenderIndex(tx, ty);

    if (renderIndex === -1) {
      if (this.layer.getTileAt(tx, ty, false)) {
        this.layer.removeTileAt(tx, ty, true, true);
      }
      this.applyRootOverlayUpdate(tx, ty);
      return;
    }

    const existing = this.layer.getTileAt(tx, ty, false);
    if (existing && existing.index === renderIndex) {
      return;
    }

    const tile = this.layer.putTileAt(renderIndex, tx, ty, true);
    if (tile) {
      tile.setCollision(true, true, true, true);
    }
    this.applyRootOverlayUpdate(tx, ty);
  }

  /**
   * Start gem vision - scan for rare resources around player
   * @param {Object} playerTile - Current player position
   * @param {number} range - Vision range in tiles
   * @param {boolean} deepSight - Whether deep sight upgrade is unlocked
   */
  startGemVision(playerTile, range, deepSight) {
    this._gemVisionActive = true;
    this._revealedResources.clear();

    // Basic vision reveals copper; Deep Sight reveals all metals
    const basicTypes = new Set([TILE_TYPES.COPPER]);
    const deepTypes = new Set([
      TILE_TYPES.COPPER, TILE_TYPES.BRONZE, TILE_TYPES.IRON,
      TILE_TYPES.STEEL, TILE_TYPES.SILVER, TILE_TYPES.GOLD,
    ]);
    const visibleTypes = deepSight ? deepTypes : basicTypes;

    const tileTypeToName = {
      [TILE_TYPES.COPPER]: 'copper',
      [TILE_TYPES.BRONZE]: 'bronze',
      [TILE_TYPES.IRON]:   'iron',
      [TILE_TYPES.STEEL]:  'steel',
      [TILE_TYPES.SILVER]: 'silver',
      [TILE_TYPES.GOLD]:   'gold',
    };

    const radius = Math.floor(range);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const checkTx = playerTile.tx + dx;
        const checkTy = playerTile.ty + dy;
        if (!this.worldModel.inBounds(checkTx, checkTy)) continue;

        const tileType = this.worldModel.getTileType(checkTx, checkTy);
        if (visibleTypes.has(tileType)) {
          this._revealedResources.set(`${checkTx},${checkTy}`, {
            timestamp: performance.now(),
            type: tileTypeToName[tileType] ?? 'unknown',
          });
        }
      }
    }
  }

  /**
   * Stop gem vision - clear all highlighted resources
   */
  stopGemVision() {
    this._gemVisionActive = false;
    this._revealedResources.clear();
    
    // Clear highlight graphics
    if (this._highlightGraphics) {
      this._highlightGraphics.clear();
    }
  }

  /**
   * Update gem vision highlights - render glowing outlines on revealed resources
   * Should be called every frame while vision is active
   */
  updateGemVisionHighlights() {
    if (!this._gemVisionActive || !this._highlightGraphics) {
      return;
    }
    
    const tileSize = this.config.tileSize;
    const currentTime = performance.now();
    const highlightDuration = 3000; // 3 seconds
    const fadeStartTime = currentTime - highlightDuration;
    
    // Clear previous highlights
    this._highlightGraphics.clear();
    
    // Render highlights for each revealed resource
    for (const [key, data] of this._revealedResources.entries()) {
      const [tx, ty] = key.split(',').map(Number);
      const { timestamp, type } = data;
      
      // Check if this resource should still be highlighted
      if (currentTime - timestamp < highlightDuration) {
        const x = tx * tileSize + tileSize / 2;
        const y = ty * tileSize + tileSize / 2;
        
        // Color-coded by resource type for Deep Sight readability
        const typeColors = {
          copper: 0xff8800, bronze: 0xcd7f32, iron:   0xaaaacc,
          steel:  0xccccdd, silver: 0xe0e0ff, gold:   0xffd700,
        };
        const color = typeColors[type] ?? 0xffff00;
        
        // Render glowing outline
        this._highlightGraphics.lineStyle(3, 0xff00ff, 1); // 3px stroke, no fill
        this._highlightGraphics.strokeRect(x, y, tileSize - 4, tileSize - 4);

        // Add glow effect
        this._highlightGraphics.fillStyle(0x220000, 0.3); // Semi-transparent glow
        this._highlightGraphics.fillRect(x, y, tileSize, tileSize);
      }
    }
  }

  /**
   * Convert player tile coordinates to pixel coordinates
   */
  playerTileToPixel(playerTile) {
    const tileSize = this.config.tileSize;
    return {
      x: playerTile.tx * tileSize,
      y: playerTile.ty * tileSize
    };
  }

  /**
   * Refresh all tiles from WorldModel (used after hard reset)
   * Repaints entire world to reflect reset state
   */
  refreshAllTiles() {
    for (let ty = 0; ty < this.worldModel.depth; ty += 1) {
      for (let tx = 0; tx < this.worldModel.width; tx += 1) {
        const renderIndex = this.worldModel.getRenderIndex(tx, ty);

        if (renderIndex === -1) {
          // Air tile - remove if exists
          if (this.layer.getTileAt(tx, ty, false)) {
            this.layer.removeTileAt(tx, ty, true, true);
          }
          this.applyRootOverlayUpdate(tx, ty);
        } else {
          // Solid tile - update or create
          const existing = this.layer.getTileAt(tx, ty, false);
          if (!existing || existing.index !== renderIndex) {
            const tile = this.layer.putTileAt(renderIndex, tx, ty, true);
            if (tile) {
              tile.setCollision(true, true, true, true);
            }
          }
          this.applyRootOverlayUpdate(tx, ty);
        }
      }
    }
  }

  /**
   * Check if gem vision is active
   */
  isGemVisionActive() {
    return this._gemVisionActive;
  }

  /**
   * Update sky tile glow effects — rarity-aware colours, resource flash hint
   * Should be called every frame to animate the glow
   * @param {Object} playerTile - Current player position (for optimization)
   * @param {number} viewRange - How many tiles around player to render (optimization)
   */
  updateSkyTileGlow(playerTile, viewRange = 20) {
    if (!this._skyTileGraphics) {
      return;
    }

    const tileSize = this.config.tileSize;
    const currentTime = performance.now();

    // Clear previous glow
    this._skyTileGraphics.clear();

    // Only render sky tiles near the player (optimization)
    const startX = Math.max(0, playerTile.tx - viewRange);
    const endX = Math.min(this.worldModel.width - 1, playerTile.tx + viewRange);
    const startY = Math.max(0, playerTile.ty - viewRange);
    const endY = Math.min(this.worldModel.depth - 1, playerTile.ty + viewRange);

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (this.worldModel.getTileType(tx, ty) !== TILE_TYPES.SKY_TILE) continue;

        const x = tx * tileSize;
        const y = ty * tileSize;
        const rarity = this.worldModel.getSkyTileRarity(tx, ty);
        const cfg = RARITY_GLOW[rarity] || RARITY_GLOW[0];

        const pulsePhase = Math.sin(currentTime / cfg.speed) * 0.5 + 0.5;
        const rarityBoost = Math.min(rarity, RARITY_GLOW.length - 1) * 0.018;
        const auraAlpha = 0.10 + rarityBoost + pulsePhase * 0.05;
        const coreAlpha = 0.07 + rarityBoost * 0.65 + pulsePhase * 0.035;
        const edgeAlpha = (0.15 + rarityBoost) * cfg.edgeAlpha;
        const outerInset = Math.max(5, Math.floor(tileSize * 0.06));
        const innerInset = Math.max(11, Math.floor(tileSize * 0.13));
        const coreInset = Math.max(17, Math.floor(tileSize * 0.20));
        const outerRadius = Math.max(8, Math.floor(tileSize * 0.15));
        const innerRadius = Math.max(6, Math.floor(tileSize * 0.11));
        const cx = x + tileSize / 2;
        const cy = y + tileSize / 2;

        // Inset rounded glow keeps the tile readable instead of tinting the
        // entire square and making seams with neighboring tiles obvious.
        this._skyTileGraphics.fillStyle(cfg.color, auraAlpha * 0.45);
        this._skyTileGraphics.fillRoundedRect(
          x + outerInset,
          y + outerInset,
          tileSize - outerInset * 2,
          tileSize - outerInset * 2,
          outerRadius
        );

        this._skyTileGraphics.fillStyle(cfg.color, coreAlpha);
        this._skyTileGraphics.fillRoundedRect(
          x + coreInset,
          y + coreInset,
          tileSize - coreInset * 2,
          tileSize - coreInset * 2,
          innerRadius
        );

        this._skyTileGraphics.lineStyle(2, cfg.color, auraAlpha);
        this._skyTileGraphics.strokeRoundedRect(
          x + innerInset,
          y + innerInset,
          tileSize - innerInset * 2,
          tileSize - innerInset * 2,
          innerRadius
        );

        this._skyTileGraphics.lineStyle(1, 0xFFFFFF, edgeAlpha);
        this._skyTileGraphics.strokeRoundedRect(
          x + innerInset + 4,
          y + innerInset + 4,
          tileSize - (innerInset + 4) * 2,
          tileSize - (innerInset + 4) * 2,
          innerRadius
        );

        // Rare: small inset sparkle dots
        if (rarity >= 1) {
          const dotPulse = Math.sin(currentTime / cfg.speed + 1.5) * 0.2 + 0.35;
          this._skyTileGraphics.fillStyle(0xFFFFFF, dotPulse);
          const sparkleInset = Math.max(16, Math.floor(tileSize * 0.19));
          const offsets = [
            [sparkleInset, sparkleInset + 3],
            [tileSize - sparkleInset - 2, sparkleInset],
            [sparkleInset + 3, tileSize - sparkleInset - 1],
            [tileSize - sparkleInset - 4, tileSize - sparkleInset + 2],
          ];
          for (const [ox, oy] of offsets) {
            this._skyTileGraphics.fillCircle(x + ox, y + oy, 2);
          }
        }

        // Legendary: extra outer rainbow corona
        if (rarity === 2) {
          const huePhase = (currentTime / 3000) % 1;
          // Cycle through hue by blending between gold, cyan, magenta
          const coronaColors = [0xFFD700, 0x00FFEE, 0xFF44CC, 0xFFD700];
          const seg = huePhase * 3;
          const segIdx = Math.floor(seg);
          const segFrac = seg - segIdx;
          const cA = coronaColors[segIdx];
          const cB = coronaColors[segIdx + 1];
          // Simple lerp on each channel
          const rA = (cA >> 16) & 0xFF, gA = (cA >> 8) & 0xFF, bA = cA & 0xFF;
          const rB = (cB >> 16) & 0xFF, gB = (cB >> 8) & 0xFF, bB = cB & 0xFF;
          const coronaColor = (
            (Math.round(rA + (rB - rA) * segFrac) << 16) |
            (Math.round(gA + (gB - gA) * segFrac) << 8) |
            Math.round(bA + (bB - bA) * segFrac)
          );
          this._skyTileGraphics.lineStyle(2, coronaColor, 0.32 + pulsePhase * 0.14);
          this._skyTileGraphics.strokeRoundedRect(x + 3, y + 3, tileSize - 6, tileSize - 6, outerRadius + 3);
        }

        // Ancient (3): double border pulse outside the legendary corona
        if (rarity >= 3) {
          const dPulse = Math.sin(currentTime / cfg.speed + 0.5) * 0.2 + 0.35;
          this._skyTileGraphics.lineStyle(2, cfg.color, dPulse);
          this._skyTileGraphics.strokeRoundedRect(x + 1, y + 1, tileSize - 2, tileSize - 2, outerRadius + 5);
        }

        // Cosmic (4): rotating arc corona — 4 quarter arcs spinning around the tile
        if (rarity >= 4) {
          const arcPhase = (currentTime / 1800) % (Math.PI * 2);
          for (let a = 0; a < 4; a++) {
            const arcAngle = arcPhase + (a * Math.PI / 2);
            this._skyTileGraphics.lineStyle(2, 0x00FFEE, 0.42);
            this._skyTileGraphics.beginPath();
            this._skyTileGraphics.arc(cx, cy, tileSize * 0.56, arcAngle, arcAngle + 0.75);
            this._skyTileGraphics.strokePath();
          }
        }

        // Void (5): dark inner fill + thick pulsing violet outer ring
        if (rarity === 5) {
          const vPulse = Math.sin(currentTime / 60) * 0.2 + 0.6;
          this._skyTileGraphics.fillStyle(0x220033, vPulse * 0.22);
          this._skyTileGraphics.fillRoundedRect(x + coreInset, y + coreInset, tileSize - coreInset * 2, tileSize - coreInset * 2, innerRadius);
          this._skyTileGraphics.lineStyle(3, 0x9900FF, vPulse * 0.55);
          this._skyTileGraphics.strokeRoundedRect(x + outerInset, y + outerInset, tileSize - outerInset * 2, tileSize - outerInset * 2, outerRadius + 4);
        }

        // Resource type flash: every 2500ms briefly show the hidden resource colour (~375ms)
        const flashCycle = (currentTime % 2500) / 2500;
        if (flashCycle > 0.85) {
          const idx = this.worldModel.index(tx, ty);
          const origType = this.worldModel.skyTileOriginalType[idx];
          const resColor = RESOURCE_GLOW_COLORS[origType] || 0x87CEEB;
          const flashAlpha = Math.sin((flashCycle - 0.85) / 0.15 * Math.PI) * 0.30;
          this._skyTileGraphics.fillStyle(resColor, flashAlpha);
          this._skyTileGraphics.fillRoundedRect(
            x + innerInset,
            y + innerInset,
            tileSize - innerInset * 2,
            tileSize - innerInset * 2,
            innerRadius
          );
        }
      }
    }
  }

  /**
   * Update chest glow effects — golden pulsing light around treasure chests
   * @param {Object} playerTile - Current player position
   * @param {number} viewRange - View range in tiles
   */
  updateChestGlow(playerTile, viewRange = 20) {
    if (!this._chestGlowGfx || !this.worldModel) return;
    
    const tileSize = this.config.tileSize;
    const currentTime = performance.now();
    
    this._chestGlowGfx.clear();
    
    if (!playerTile) return;
    
    const startX = Math.max(0, playerTile.tx - viewRange);
    const endX = Math.min(this.worldModel.width - 1, playerTile.tx + viewRange);
    const startY = Math.max(0, playerTile.ty - viewRange);
    const endY = Math.min(this.worldModel.depth - 1, playerTile.ty + viewRange);
    
    // Check all treasure room chest positions
    const treasureRooms = this.worldModel.treasureRoomZones || [];
    const hiddenCaves = this.worldModel.hiddenCaveZones || [];
    
    // Render chest glow for treasure rooms
    for (const zone of treasureRooms) {
      const tx = zone.chestTx;
      const ty = zone.chestTy;
      
      // Only render if within view range
      if (Math.abs(tx - playerTile.tx) > viewRange || Math.abs(ty - playerTile.ty) > viewRange) continue;
      
      const x = tx * tileSize;
      const y = ty * tileSize;
      
      // Golden pulsing glow — visible through blocks
      const pulse = Math.sin(currentTime / 800) * 0.3 + 0.5;
      
      // Outer glow (golden)
      this._chestGlowGfx.fillStyle(0xFFD700, pulse * 0.3);
      this._chestGlowGfx.fillRect(x - 4, y - 4, tileSize + 8, tileSize + 8);
      
      // Inner glow (brighter)
      this._chestGlowGfx.fillStyle(0xFFAA00, pulse * 0.6);
      this._chestGlowGfx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      
      // Sparkle dots
      this._chestGlowGfx.fillStyle(0xFFFFFF, pulse * 0.8);
      this._chestGlowGfx.fillCircle(x + tileSize / 2, y + tileSize / 2 - 4, 2);
      this._chestGlowGfx.fillCircle(x + tileSize / 2 + 6, y + tileSize / 2 + 4, 2);
      this._chestGlowGfx.fillCircle(x + tileSize / 2 - 6, y + tileSize / 2 + 4, 2);
    }
    
    // Also render chest glow for hidden cave treasure rooms
    for (const zone of hiddenCaves) {
      if (!zone.hasTreasureRoom) continue;
      
      // Hidden cave treasure room — render a golden glow at the center
      const cx = zone.cx;
      const cy = zone.cy;
      
      if (Math.abs(cx - playerTile.tx) > viewRange || Math.abs(cy - playerTile.ty) > viewRange) continue;
      
      const x = cx * tileSize;
      const y = cy * tileSize;
      
      // Larger, more diffuse glow for hidden cave treasure
      const pulse = Math.sin(currentTime / 1200) * 0.2 + 0.4;
      
      this._chestGlowGfx.fillStyle(0xFFD700, pulse * 0.2);
      this._chestGlowGfx.fillRect(x - 8, y - 8, tileSize + 16, tileSize + 16);
      
      this._chestGlowGfx.fillStyle(0xFFAA00, pulse * 0.4);
      this._chestGlowGfx.fillRect(x - 2, y - 2, tileSize + 4, tileSize + 4);
    }
  }

  /**
   * Update glow crystal effects — pretty colored crystal clusters
   * @param {Object} playerTile - Current player position
   * @param {number} viewRange - View range in tiles
   */
  updateGlowCrystals(playerTile, viewRange = 20) {
    if (!this._glowCrystalGfx || !this._glowCrystalShardGfx || !this.worldModel) return;

    const tileSize = this.config.tileSize;
    const currentTime = performance.now();

    this._glowCrystalGfx.clear();
    this._glowCrystalShardGfx.clear();

    if (!playerTile) return;

    const crystalZones = this.worldModel.getGlowCrystalZonesInRange
      ? this.worldModel.getGlowCrystalZonesInRange(playerTile, viewRange)
      : (this.worldModel.glowCrystalZones || []);

    for (const zone of crystalZones) {
      if (Math.abs(zone.cx - playerTile.tx) > viewRange + zone.rx + 3) continue;
      if (Math.abs(zone.cy - playerTile.ty) > viewRange + zone.ry + 3) continue;

      const activeRatio = this.worldModel.getGlowCrystalActiveRatio
        ? this.worldModel.getGlowCrystalActiveRatio(zone)
        : 1;
      if (activeRatio <= 0) continue;

      const color = zone.color || 0x66E8FF;
      const seed = zone.seed || (zone.cx * 73856093) ^ (zone.cy * 19349663);
      const phase = zone.phase || 0;
      const alpha = (zone.alpha || 0.6) * activeRatio;
      const pulse = 0.82 + Math.sin(currentTime * 0.0022 + phase) * 0.14;
      const glintPulse = 0.55 + Math.sin(currentTime * 0.006 + phase * 1.7) * 0.45;
      const centerX = zone.cx * tileSize + tileSize * 0.5;
      const centerY = zone.cy * tileSize + tileSize * 0.5;

      const haloX = (zone.rx + 2.8) * tileSize;
      const haloY = (zone.ry + 2.15) * tileSize;
      const coreX = (zone.rx + 0.85) * tileSize;
      const coreY = (zone.ry + 0.70) * tileSize;

      this._glowCrystalGfx.fillStyle(color, alpha * 0.11 * pulse);
      this._glowCrystalGfx.fillEllipse(centerX, centerY, haloX * 2, haloY * 2);
      this._glowCrystalGfx.fillStyle(mixColor(color, 0xffffff, 0.24), alpha * 0.08 * pulse);
      this._glowCrystalGfx.fillEllipse(centerX, centerY, coreX * 2, coreY * 2);

      const minTx = Math.max(0, Math.floor(zone.cx - zone.rx));
      const maxTx = Math.min(this.worldModel.width - 1, Math.ceil(zone.cx + zone.rx));
      const minTy = Math.max(0, Math.floor(zone.cy - zone.ry));
      const maxTy = Math.min(this.worldModel.depth - 1, Math.ceil(zone.cy + zone.ry));

      for (let ty = minTy; ty <= maxTy; ty += 1) {
        for (let tx = minTx; tx <= maxTx; tx += 1) {
          const ellipseValue = crystalEllipseValue(tx, ty, zone);
          if (ellipseValue > 1) continue;
          if (this.worldModel.getTileType(tx, ty) === TILE_TYPES.AIR) continue;

          const tileX = tx * tileSize;
          const tileY = ty * tileSize;
          const edgeStrength = 1 - Math.sqrt(ellipseValue);
          const tileAlpha = alpha * (0.46 + edgeStrength * 0.44) * pulse;

          this._glowCrystalGfx.fillStyle(color, tileAlpha * 0.085);
          this._glowCrystalGfx.fillRect(tileX + 2, tileY + 2, tileSize - 4, tileSize - 4);

          const shardCount = hashUnit(seed, tx, ty, 1) > 0.62 ? 2 : 1;
          for (let shard = 0; shard < shardCount; shard += 1) {
            const localSeed = shard + 1;
            const baseX = tileX + tileSize * (0.22 + hashUnit(seed, tx, ty, 10 + localSeed) * 0.56);
            const baseY = tileY + tileSize * (0.60 + hashUnit(seed, tx, ty, 20 + localSeed) * 0.24);
            const height = tileSize * (0.28 + hashUnit(seed, tx, ty, 30 + localSeed) * 0.36);
            const halfWidth = tileSize * (0.07 + hashUnit(seed, tx, ty, 40 + localSeed) * 0.10);
            const lean = tileSize * (hashUnit(seed, tx, ty, 50 + localSeed) - 0.5) * 0.24;
            const topX = baseX + lean;
            const topY = Math.max(tileY + 3, baseY - height);
            const shardColor = mixColor(color, 0xffffff, 0.16 + edgeStrength * 0.38);

            this._glowCrystalShardGfx.fillStyle(shardColor, Phaser.Math.Clamp(tileAlpha * 0.72, 0, 0.9));
            this._glowCrystalShardGfx.fillTriangle(topX, topY, baseX - halfWidth, baseY, baseX + halfWidth, baseY);
            this._glowCrystalShardGfx.lineStyle(1, 0xffffff, Phaser.Math.Clamp(tileAlpha * 0.42, 0, 0.6));
            this._glowCrystalShardGfx.beginPath();
            this._glowCrystalShardGfx.moveTo(topX, topY);
            this._glowCrystalShardGfx.lineTo(baseX + halfWidth, baseY);
            this._glowCrystalShardGfx.strokePath();
          }

          const veinAlpha = Phaser.Math.Clamp(tileAlpha * 0.56, 0, 0.72);
          const veinColor = mixColor(color, 0xffffff, 0.44);
          const angle = hashUnit(seed, tx, ty, 70) * TAU;
          const midX = tileX + tileSize * (0.25 + hashUnit(seed, tx, ty, 71) * 0.50);
          const midY = tileY + tileSize * (0.25 + hashUnit(seed, tx, ty, 72) * 0.50);
          const length = tileSize * (0.32 + hashUnit(seed, tx, ty, 73) * 0.38);
          this._glowCrystalShardGfx.lineStyle(1, veinColor, veinAlpha);
          this._glowCrystalShardGfx.beginPath();
          this._glowCrystalShardGfx.moveTo(midX - Math.cos(angle) * length * 0.5, midY - Math.sin(angle) * length * 0.5);
          this._glowCrystalShardGfx.lineTo(midX + Math.cos(angle) * length * 0.5, midY + Math.sin(angle) * length * 0.5);
          this._glowCrystalShardGfx.strokePath();

          if (hashUnit(seed, tx, ty, 90) > 0.48) {
            const sparkleX = tileX + tileSize * (0.18 + hashUnit(seed, tx, ty, 91) * 0.64);
            const sparkleY = tileY + tileSize * (0.18 + hashUnit(seed, tx, ty, 92) * 0.64);
            const sparkleAlpha = Phaser.Math.Clamp(alpha * (0.24 + edgeStrength * 0.34) * glintPulse, 0, 0.85);
            this._glowCrystalGfx.fillStyle(0xffffff, sparkleAlpha);
            this._glowCrystalGfx.fillCircle(sparkleX, sparkleY, Math.max(1.2, tileSize * 0.035));
          }
        }
      }
    }
  }

  /**
   * Root overlays are now rendered by a dedicated tilemap layer using
   * transparent PNG atlas sprites. This method remains as the update hook
   * expected by PlaySceneUpdate, but no longer draws Phaser Graphics.
   */
  updateRootOverlays(playerTile, viewRange = 20) {
    if (!this.rootOverlayLayer || !playerTile) return;
    this.rootOverlayLayer.setDepth(1);
  }

  /**
   * Update special block glow effects
   * Note: This method is currently disabled to prevent rendering issues.
   * Special blocks should use graphics overlay effects (like sky tiles) instead of
   * direct tile property manipulation which causes performance and visual problems.
   * 
   * @param {Object} playerTile - Current player tile position (unused, kept for API compatibility)
   * @param {number} viewRange - View range in tiles (unused, kept for API compatibility)
   */
  updateSpecialBlockGlow(playerTile, viewRange = 20) {
    // DISABLED: Direct alpha manipulation on tilemap tiles causes:
    // - Rendering corruption (normal tiles not appearing)
    // - Performance issues (400+ tile property updates per frame)
    // - Visual glitches from constant property modifications
    // 
    // Future: Use _specialBlockGraphics overlay (like sky tiles use _skyTileGraphics)
    // for special block effects without modifying tile properties.
    return;
  }

  /**
   * Clean up graphics objects created by this renderer
   */
  destroy() {
    this._highlightGraphics?.destroy();
    this._skyTileGraphics?.destroy();
    this._specialBlockGraphics?.destroy();
    this.rootOverlayLayer?.destroy();
    this._chestGlowGfx?.destroy();
    this._glowCrystalGfx?.destroy();
    this._glowCrystalShardGfx?.destroy();
  }
}
