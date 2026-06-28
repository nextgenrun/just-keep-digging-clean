/**
 * Handles tiled background rendering for PlayScene
 * Creates and manages background layers based on depth and location
 */
export class BackgroundRenderer {
  constructor(scene, ASSET_KEYS) {
    this.scene = scene;
    this.ASSET_KEYS = ASSET_KEYS;
  }

  createTiledBackground() {
    const topAirDepth = this.scene.config.topAirRows;
    const shallowDepth = topAirDepth + 50;
    const mediumDepth = topAirDepth + 150;
    const spawnX = this.scene.config.spawnTileX;
    const npcZoneEndX = spawnX + 40; // x=68, right edge of NPC zone
    
    const npcDefs = this.scene.npcManager.getNPCDefs();
    
    // Get base background dimensions — gracefully handle missing texture
    const bgTexture = this.scene.textures.get(this.ASSET_KEYS.background.world1);
    const bgImage = bgTexture?.getSourceImage();
    if (!bgImage) {
      console.warn('[BackgroundRenderer] World1 background texture not available, skipping tiled background creation');
      this.createLayeredSkyBackground(topAirDepth * this.scene.config.tileSize);
      this.createUndergroundDepthLoops(topAirDepth * this.scene.config.tileSize, this.scene.config.tileSize);
      this.createTownLoop(topAirDepth * this.scene.config.tileSize, this.scene.config.tileSize, npcZoneEndX);
      return;
    }
    const bgWidth = bgImage.width;
    const bgHeight = bgImage.height;

    const tilesX = Math.ceil(this.scene.config.worldWidthPx / bgWidth);
    const tilesY = Math.ceil(this.scene.config.worldDepthPx / bgHeight);

    // The single bg-image row that sits at ground level (contains the NPC floor tiles)
    const tileSize = this.scene.config.tileSize;
    const townBgRow = Math.floor((topAirDepth * tileSize) / bgHeight);
    const townFloorY = topAirDepth * tileSize;

    this.createLayeredSkyBackground(townFloorY);

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const x = tx * bgWidth + bgWidth / 2;
        const y = ty * bgHeight + bgHeight / 2;

        // Convert to tile coordinates for depth and NPC checking
        const tileY = Math.floor(y / tileSize);
        const tileX = Math.floor(x / this.scene.config.tileSize);

        // Determine background based on location and depth
        let bgKey = this.ASSET_KEYS.background.world1;

        // SKY AREA: handled once as full-width layers instead of random image tiles.
        if (ty < townBgRow) {
          continue;
        }
        // UNDERGROUND BEYOND NPC ZONE: y >= 65, x > 68
        // Keep existing depth-based system
        else if (tileX > npcZoneEndX) {
          // Check if near any NPC (within 10 tiles)
          const nearNPC = npcDefs.some(npc => {
            const distance = Math.abs(tileX - npc.tx) + Math.abs(tileY - npc.ty);
            return distance < 10;
          });
          
          if (nearNPC) {
            // Near NPCs: always use base background for consistency
            bgKey = this.ASSET_KEYS.background.world1;
          } else if (tileY < shallowDepth) {
            // Shallow depth: use dbImage2 (blue-themed) for worldbuilding
            bgKey = this.ASSET_KEYS.background.dbImage2;
          } else if (tileY < mediumDepth) {
            // Medium depth: use dbImage3
            bgKey = this.ASSET_KEYS.background.dbImage3;
          } else {
            // Deep depth: use dbImage4
            bgKey = this.ASSET_KEYS.background.dbImage4;
          }
        }
        // UNDERGROUND IN NPC ZONE: y >= 65, x <= 68
        // Use base background for consistency
        else {
          bgKey = this.ASSET_KEYS.background.world1;
        }

        const bgTile = this.scene.add.image(x, y, bgKey);
        bgTile.setDepth(-10);
        bgTile.setOrigin(0.0, 0.0);
      }
    }

    this.createUndergroundDepthLoops(townFloorY, tileSize);
    this.createTownLoop(townFloorY, tileSize, npcZoneEndX);
  }

  createUndergroundDepthLoops(floorY, tileSize) {
    // Re-implemented: Create seamless horizontal textures for each depth band
    // and place them as full-width Phaser.Image objects at the correct depths.
    // Uses scrollFactor for parallax (lower depth bands scroll slower).
    // Avoids TileSprite GPU OOM by reusing small source images composited
    // into canvas textures via createHorizontalLoopTexture().

    const bands = this.ASSET_KEYS.background.undergroundLoops;
    const worldWidth = this.scene.config.worldWidthPx;

    // Gather the five depth bands: 000-200, 200-400, 400-600, 600-800, 800-1000
    // Each covers 200 rows of tiles in the world.
    const bandHeightTiles = 200;
    const bandsCreated = [];

    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];

      // Create seamless horizontally-scrollable texture for this band
      const texture = this.createHorizontalLoopTexture(band);
      if (!texture) {
        console.warn(
          `[BackgroundRenderer] Skipping underground band ${i} — texture unavailable: ${band.source}`);
        continue;
      }

      const frame = texture.get();
      const bandStartY = floorY + i * bandHeightTiles * tileSize;
      const bandPixelHeight = bandHeightTiles * tileSize;

      // Place one seamless image per segment (segment width ~2048px to stay GPU-friendly)
      const maxSegmentPx = 2048;
      const bandLayers = [];

      for (let sx = 0; sx < worldWidth; sx += maxSegmentPx) {
        const segmentWidth = Math.min(maxSegmentPx, worldWidth - sx);
        const img = this.scene.add.image(sx, bandStartY, band.runtime);
        img.setOrigin(0, 0);
        img.setDisplaySize(segmentWidth, bandPixelHeight);
        img.setDepth(-9.75 + i * 0.01); // between sky layers (-9.96) and bg tiles (-10)
        img.setAlpha(0.92);
        // Parallax: deeper bands scroll even slower (0.12 → 0.28)
        img.setScrollFactor(0.12 + i * 0.04);
        bandLayers.push(img);
      }

      bandsCreated.push({ layers: bandLayers, bandIndex: i });
    }

    // Store reference so the update loop can manage depth-based visibility
    this._undergroundLoopBands = bandsCreated;
    this._townFloorY = floorY;
    this._bandHeightPx = bandHeightTiles * tileSize;

    console.log(
      `[BackgroundRenderer] Created ${bandsCreated.length} underground loop bands (parallax 0.12–0.28, depth -9.74 to -9.71)`
    );
  }

  /**
   * Update underground loop band visibility based on player depth.
   * Bands fade in as the player digs deeper — only bands at / above
   * the player's current depth are visible.
   * Called from PlaySceneUpdate each frame.
   * @param {number} playerDepthPx - Player's current Y position in world pixels
   */
  updateUndergroundLoopVisibility(playerDepthPx) {
    const bands = this._undergroundLoopBands;
    if (!bands || !bands.length) return;

    const floorY = this._townFloorY;
    const bandH = this._bandHeightPx;

    for (const band of bands) {
      const bandTopY = floorY + band.bandIndex * bandH;
      const shouldShow = playerDepthPx > bandTopY;

      for (const layer of band.layers) {
        layer.setVisible(shouldShow);
      }
    }
  }

  createHorizontalLoopTexture(keys) {
    if (this.scene.textures.exists(keys.runtime)) {
      return this.scene.textures.get(keys.runtime);
    }

    const source = this.scene.textures.get(keys.source)?.getSourceImage();
    if (!source) {
      console.warn(`[BackgroundRenderer] Underground loop source is unavailable: ${keys.source}`);
      return null;
    }

    // A wider blend keeps large rock shapes from snapping at the repeat point.
    const blendWidth = Math.min(256, Math.floor(source.width / 4));
    const repeatWidth = source.width - blendWidth;
    const splitX = Math.floor(source.width / 2);
    const leftWidth = source.width - blendWidth - splitX;
    const sourceContext = this.createImageContext(source, source.width, source.height);
    const sourcePixels = sourceContext.getImageData(0, 0, source.width, source.height);
    const canvas = document.createElement("canvas");
    canvas.width = repeatWidth;
    canvas.height = source.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    context.drawImage(
      source,
      splitX, 0, leftWidth, source.height,
      0, 0, leftWidth, source.height
    );

    const seam = context.createImageData(blendWidth, source.height);
    this.crossfadeHorizontalEdges(sourcePixels, seam, source.width, source.height, blendWidth);
    context.putImageData(seam, leftWidth, 0);

    context.drawImage(
      source,
      blendWidth, 0, splitX - blendWidth, source.height,
      leftWidth + blendWidth, 0, splitX - blendWidth, source.height
    );
    this.blurSeamBand(canvas, leftWidth, 0, blendWidth, source.height, true);

    return this.scene.textures.addCanvas(keys.runtime, canvas);
  }

  createTownLoop(floorY, tileSize, npcZoneEndX) {
    const townScale = 0.30;
    const zoneStartTileX = 1;
    const zoneStartX = zoneStartTileX * tileSize;
    const zoneWidthPx = (npcZoneEndX - zoneStartTileX + 1) * tileSize;
    const texture = this.createTownLoopTexture();
    if (!texture) return;

    const frame = texture.get();
    const town = this.scene.add.tileSprite(
      Math.round(zoneStartX),
      Math.round(floorY - frame.height * townScale),
      Math.round(zoneWidthPx),
      Math.round(frame.height * townScale),
      this.ASSET_KEYS.background.townLoop.runtime
    );
    town.setOrigin(0, 0);
    town.setDepth(-9.70);
    town.tileScaleX = townScale;
    town.tileScaleY = townScale;
    town.tilePositionX = 0;
    town.tilePositionY = 0;

    this.createApprovedTownDecor(floorY, tileSize, zoneStartX, zoneWidthPx);
  }

  createApprovedTownDecor(floorY, tileSize, zoneStartX, zoneWidthPx) {
    const ceilingKey = this.ASSET_KEYS.tiles.caveCeiling;
    const chainCeilingKey = this.ASSET_KEYS.tiles.caveCeilingChains;
    const townExitKey = this.ASSET_KEYS.tiles.townExit;

    const roofY = Math.round(floorY - tileSize * 5.85);
    if (this.scene.textures.exists(ceilingKey)) {
      const roof = this.scene.add.tileSprite(zoneStartX, roofY, Math.round(zoneWidthPx), Math.round(tileSize * 1.22), ceilingKey);
      roof.setOrigin(0, 0);
      roof.setDepth(-9.56);
      roof.tileScaleX = 1;
      roof.tileScaleY = 1;
      roof.setAlpha(0.96);
    }

    if (this.scene.textures.exists(chainCeilingKey)) {
      [0.26, 0.62].forEach((ratio) => {
        const chain = this.scene.add.image(
          Math.round(zoneStartX + zoneWidthPx * ratio),
          Math.round(roofY + tileSize * 0.18),
          chainCeilingKey
        );
        chain.setOrigin(0.5, 0);
        chain.setDepth(-9.55);
        chain.setAlpha(0.72);
        chain.setScale(1.12);
      });
    }

    this.createApprovedTownExit(floorY, tileSize, zoneStartX, zoneWidthPx, townExitKey);
  }

  createApprovedTownExit(floorY, tileSize, zoneStartX, zoneWidthPx, townExitKey) {
    const exitX = Math.round(zoneStartX + zoneWidthPx - tileSize * 3.1);
    const exitY = Math.round(floorY - tileSize * 2.05);
    const exitWidth = Math.round(tileSize * 1.85);
    const exitHeight = Math.round(tileSize * 2.55);

    const glow = this.scene.add.ellipse(exitX, exitY, exitWidth, exitHeight, 0x8bc7ff, 0.18);
    glow.setOrigin(0.5);
    glow.setDepth(-9.60);

    const opening = this.scene.add.ellipse(exitX, exitY + tileSize * 0.08, exitWidth * 0.76, exitHeight * 0.78, 0x5faeea, 0.28);
    opening.setOrigin(0.5);
    opening.setDepth(-9.59);

    const shadow = this.scene.add.rectangle(exitX, exitY + exitHeight * 0.30, exitWidth * 0.58, exitHeight * 0.28, 0x111117, 0.62);
    shadow.setOrigin(0.5);
    shadow.setDepth(-9.58);

    if (!this.scene.textures.exists(townExitKey)) return;
    const exit = this.scene.add.image(exitX, exitY, townExitKey);
    exit.setOrigin(0.5);
    exit.setDepth(-9.57);
    exit.setScale(1.55, 1.72);
    exit.setAlpha(0.86);
  }

  createTownLoopTexture() {
    const keys = this.ASSET_KEYS.background.townLoop;
    if (this.scene.textures.exists(keys.runtime)) {
      return this.scene.textures.get(keys.runtime);
    }

    const above = this.scene.textures.get(keys.aboveFloor)?.getSourceImage();
    const floor = this.scene.textures.get(keys.floor)?.getSourceImage();
    if (!above || !floor) {
      console.warn("[BackgroundRenderer] Town loop source textures are unavailable");
      return null;
    }

    const sourceWidth = Math.min(above.width, floor.width);
    const verticalBlend = Math.min(48, above.height, floor.height);
    const horizontalBlend = Math.min(64, Math.floor(sourceWidth / 4));
    const combinedHeight = above.height + floor.height - verticalBlend;

    const verticalCanvas = document.createElement("canvas");
    verticalCanvas.width = sourceWidth;
    verticalCanvas.height = combinedHeight;
    const verticalContext = verticalCanvas.getContext("2d", { willReadFrequently: true });
    verticalContext.drawImage(above, 0, 0, sourceWidth, above.height);
    verticalContext.drawImage(
      floor,
      0, verticalBlend, sourceWidth, floor.height - verticalBlend,
      0, above.height, sourceWidth, floor.height - verticalBlend
    );

    const aboveContext = this.createImageContext(above, sourceWidth, above.height);
    const floorContext = this.createImageContext(floor, sourceWidth, floor.height);
    const aboveBand = aboveContext.getImageData(0, above.height - verticalBlend, sourceWidth, verticalBlend);
    const floorBand = floorContext.getImageData(0, 0, sourceWidth, verticalBlend);
    const verticalBand = verticalContext.createImageData(sourceWidth, verticalBlend);
    this.crossfadeImageData(aboveBand.data, floorBand.data, verticalBand.data, verticalBlend, sourceWidth, false);
    const verticalSeamY = above.height - verticalBlend;
    verticalContext.putImageData(verticalBand, 0, verticalSeamY);
    this.blurSeamBand(verticalCanvas, 0, verticalSeamY, sourceWidth, verticalBlend, false);

    // Consume the left/right overlap into one period, then place the blended
    // seam inside the texture. Its outer boundary is a continuous source cut.
    const repeatWidth = sourceWidth - horizontalBlend;
    const splitX = Math.floor(sourceWidth / 2);
    const leftWidth = sourceWidth - horizontalBlend - splitX;
    const horizontalCanvas = document.createElement("canvas");
    horizontalCanvas.width = repeatWidth;
    horizontalCanvas.height = combinedHeight;
    const horizontalContext = horizontalCanvas.getContext("2d", { willReadFrequently: true });
    horizontalContext.drawImage(
      verticalCanvas,
      splitX, 0, leftWidth, combinedHeight,
      0, 0, leftWidth, combinedHeight
    );

    const verticalPixels = verticalContext.getImageData(0, 0, sourceWidth, combinedHeight);
    const edgeBand = horizontalContext.createImageData(horizontalBlend, combinedHeight);
    this.crossfadeHorizontalEdges(verticalPixels, edgeBand, sourceWidth, combinedHeight, horizontalBlend);
    horizontalContext.putImageData(edgeBand, leftWidth, 0);
    horizontalContext.drawImage(
      verticalCanvas,
      horizontalBlend, 0, splitX - horizontalBlend, combinedHeight,
      leftWidth + horizontalBlend, 0, splitX - horizontalBlend, combinedHeight
    );
    this.blurSeamBand(horizontalCanvas, leftWidth, 0, horizontalBlend, combinedHeight, true);

    return this.scene.textures.addCanvas(keys.runtime, horizontalCanvas);
  }

  createImageContext(image, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    return context;
  }

  crossfadeImageData(first, second, output, blendSize, lineSize, horizontal) {
    const pixelCount = output.length / 4;
    for (let pixel = 0; pixel < pixelCount; pixel++) {
      const position = horizontal ? pixel % lineSize : Math.floor(pixel / lineSize);
      const rawT = blendSize <= 1 ? 1 : position / (blendSize - 1);
      const t = rawT * rawT * (3 - 2 * rawT);
      const offset = pixel * 4;
      for (let channel = 0; channel < 4; channel++) {
        output[offset + channel] = Math.round(first[offset + channel] * (1 - t) + second[offset + channel] * t);
      }
    }
  }

  crossfadeHorizontalEdges(source, output, sourceWidth, height, blendWidth) {
    const left = new Uint8ClampedArray(output.data.length);
    const right = new Uint8ClampedArray(output.data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < blendWidth; x++) {
        const targetOffset = (y * blendWidth + x) * 4;
        const leftOffset = (y * sourceWidth + sourceWidth - blendWidth + x) * 4;
        const rightOffset = (y * sourceWidth + x) * 4;
        for (let channel = 0; channel < 4; channel++) {
          left[targetOffset + channel] = source.data[leftOffset + channel];
          right[targetOffset + channel] = source.data[rightOffset + channel];
        }
      }
    }
    this.crossfadeImageData(left, right, output.data, blendWidth, blendWidth, true);
  }

  blurSeamBand(canvas, x, y, width, height, horizontal) {
    const radius = 1.5;
    const padding = radius * 2;
    const sampleX = Math.max(0, x - (horizontal ? padding : 0));
    const sampleY = Math.max(0, y - (horizontal ? 0 : padding));
    const sampleWidth = Math.min(canvas.width - sampleX, width + (horizontal ? padding * 2 : 0));
    const sampleHeight = Math.min(canvas.height - sampleY, height + (horizontal ? 0 : padding * 2));
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = sampleWidth;
    blurCanvas.height = sampleHeight;
    const blurContext = blurCanvas.getContext("2d");
    if (!("filter" in blurContext)) return;
    blurContext.filter = `blur(${radius}px)`;
    blurContext.drawImage(canvas, sampleX, sampleY, sampleWidth, sampleHeight, 0, 0, sampleWidth, sampleHeight);
    blurContext.filter = "none";

    const mask = blurContext.createLinearGradient(
      horizontal ? x - sampleX : 0,
      horizontal ? 0 : y - sampleY,
      horizontal ? x - sampleX + width : 0,
      horizontal ? 0 : y - sampleY + height
    );
    mask.addColorStop(0, "rgba(255,255,255,0)");
    mask.addColorStop(0.25, "rgba(255,255,255,0.8)");
    mask.addColorStop(0.5, "rgba(255,255,255,1)");
    mask.addColorStop(0.75, "rgba(255,255,255,0.8)");
    mask.addColorStop(1, "rgba(255,255,255,0)");
    blurContext.globalCompositeOperation = "destination-in";
    blurContext.fillStyle = mask;
    blurContext.fillRect(0, 0, sampleWidth, sampleHeight);
    blurContext.globalCompositeOperation = "source-over";
    canvas.getContext("2d").drawImage(blurCanvas, sampleX, sampleY);
  }

  createLayeredSkyBackground(skyHeight) {
    if (skyHeight <= 0) return;

    const sky = this.ASSET_KEYS.background.skyBackgrounds;
    const worldWidth = this.scene.config.worldWidthPx;
    const maxSegmentPx = 2048;
    const clampY = (value) => Math.max(0, Math.min(skyHeight, value));
    const addTileLayer = (key, y, height, depth, alpha, tileScaleX = 1, tileScaleY = 1, tilePositionX = 0) => {
      // Skip if the texture doesn't exist
      if (!this.scene.textures.exists(key)) {
        console.warn(`[BackgroundRenderer] Sky layer texture "${key}" not found, skipping`);
        return [];
      }
      
      const layerY = clampY(y);
      const layerHeight = Math.max(1, Math.min(height, skyHeight - layerY));
      const layers = [];

      // Segment horizontally so no single TileSprite canvas exceeds
      // 2048×layerHeight — the sky is ~6110px tall, so a 30080-wide sprite
      // would allocate ~735MB and OOM.
      for (let sx = 0; sx < worldWidth; sx += maxSegmentPx) {
        const segmentWidth = Math.min(maxSegmentPx, worldWidth - sx);
        const layer = this.scene.add.tileSprite(sx, layerY, segmentWidth, layerHeight, key);
        layer.setOrigin(0, 0);
        layer.setDepth(depth);
        layer.setAlpha(alpha);
        layer.tileScaleX = tileScaleX;
        layer.tileScaleY = tileScaleY;
        layer.tilePositionX = tilePositionX + sx / tileScaleX;
        layer.tilePositionY = 0;
        layers.push(layer);
      }

      return layers;
    };

    const baseScaleY = Math.max(1, skyHeight / 2048);
    addTileLayer(sky.base, 0, skyHeight, -9.96, 1, 1.15, baseScaleY);
    addTileLayer(sky.nebula, 0, skyHeight * 0.76, -9.94, 0.70, 1.35, Math.max(1, skyHeight / 2600), 280);
    addTileLayer(sky.aurora, skyHeight * 0.06, Math.min(1500, skyHeight * 0.38), -9.92, 0.56, 1.18, 1.10, 620);

    if (this.scene.textures.exists(sky.planet2)) {
      this.scene.add.image(worldWidth * 0.31, skyHeight * 0.28, sky.planet2)
        .setDepth(-9.90)
        .setAlpha(0.68)
        .setScale(0.40)
        .setOrigin(0.5);
    }

    if (this.scene.textures.exists(sky.planet1)) {
      this.scene.add.image(worldWidth * 0.73, skyHeight * 0.24, sky.planet1)
        .setDepth(-9.89)
        .setAlpha(0.84)
        .setScale(0.66)
        .setOrigin(0.5);
    }

    addTileLayer(sky.cloudsFar, skyHeight - 1420, 840, -9.86, 0.68, 1.24, 1.10, 420);
    addTileLayer(sky.horizon, skyHeight - 650, 650, -9.84, 0.84, 1.35, 1.26);
    addTileLayer(sky.cloudsNear, skyHeight - 840, 840, -9.82, 0.84, 1.08, 1.12, 950);
  }
}
