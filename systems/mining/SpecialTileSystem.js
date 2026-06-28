import { TILE_TYPES } from "../../values/tileTypes.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { USER_SETTINGS } from "../UserSettings.js";

export class SpecialTileSystem {
  constructor(scene, worldModel, playerController, floatingTextSystem) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.playerController = playerController;
    this.floatingTextSystem = floatingTextSystem;
    
    // Track used gamble tiles
    this.usedGambleTiles = new Set();
    
    // Paired teleporters: keyed by underground teleporter tileKey "tx,ty"
    // Each entry: { dungeonTx, dungeonTy, skyTx, skyTy }
    this.pairedTeleporters = new Map();
    
    // Reverse lookup: sky island tileKey -> dungeon tileKey (for back-and-forth prompt)
    this.skyToDungeonMap = new Map();
    
    // Current prompt UI
    this.promptText = null;
    this.promptTile = null;
    
    // Initialize
    this._initializePrompt();
  }
  
  _initializePrompt() {
    // Create prompt text for special tiles
    this.promptText = this.scene.add.text(0, 0, '', {
      fontSize: HUD_LAYOUT.promptFontSize,
      fontFamily: 'Consolas, monospace',
      color: UI_COLORS.white,
      backgroundColor: '#131c26',
      padding: { x: HUD_LAYOUT.promptPadX, y: HUD_LAYOUT.promptPadY },
      stroke: '#000000',
      strokeThickness: Math.max(1, HUD_LAYOUT.promptStrokeThickness - 1),
    });
    this.promptText.setDepth(HUD_LAYOUT.floatingTextDepth);
    this.promptText.setVisible(false);
  }
  
  /**
   * Update special tile prompts based on player position
   */
  update() {
    const playerTile = this.playerController.getPlayerTile();
    
    // Check adjacent tiles for special tiles
    const adjacentTiles = [
      { tx: playerTile.tx, ty: playerTile.ty - 1 }, // Above
      { tx: playerTile.tx, ty: playerTile.ty + 1 }, // Below
      { tx: playerTile.tx - 1, ty: playerTile.ty }, // Left
      { tx: playerTile.tx + 1, ty: playerTile.ty }, // Right
    ];
    
    let foundSpecialTile = false;
    
    for (const tile of adjacentTiles) {
      const tileType = this.worldModel.getTileType(tile.tx, tile.ty);
      
      if (tileType === TILE_TYPES.TELEPORT_TILE) {
        const tileKey = `${tile.tx},${tile.ty}`;
        
        // Check if this is a paired teleporter — sky island or dungeon side
        if (this.pairedTeleporters.has(tileKey)) {
          // This is a dungeon-side (underground) teleporter that has been paired
          const pair = this.pairedTeleporters.get(tileKey);
          const depthTiles = pair.dungeonTy - this.worldModel.config.topAirRows;
          this._showPrompt(tile.tx, tile.ty, `Press ${USER_SETTINGS.getKeyLabel("interact")} to Teleport to Sky Island (depth ${depthTiles}m)`);
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: 'teleportPaired', key: tileKey };
        } else if (this.skyToDungeonMap.has(tileKey)) {
          // This is a sky island teleporter — go back to dungeon
          const dungeonKey = this.skyToDungeonMap.get(tileKey);
          const pair = this.pairedTeleporters.get(dungeonKey);
          const depthTiles = pair.dungeonTy - this.worldModel.config.topAirRows;
          this._showPrompt(tile.tx, tile.ty, `Press ${USER_SETTINGS.getKeyLabel("interact")} to Teleport to Depth ${depthTiles}m`);
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: 'teleportSkyReturn', key: tileKey, dungeonKey };
        } else {
          // Unpaired teleporter — first time, will create a pair
          this._showPrompt(tile.tx, tile.ty, `Press ${USER_SETTINGS.getKeyLabel("interact")} to Teleport to Sky Island`);
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: 'teleport', key: tileKey };
        }
        
        foundSpecialTile = true;
        break;
      } else if (tileType === TILE_TYPES.GAMBLE_TILE) {
        const tileKey = `${tile.tx},${tile.ty}`;
        if (!this.usedGambleTiles.has(tileKey)) {
          this._showPrompt(tile.tx, tile.ty, `Press ${USER_SETTINGS.getKeyLabel("interact")} to Gamble (x3 or Lose All!)`);
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: 'gamble', key: tileKey };
          foundSpecialTile = true;
          break;
        } else {
          // Already used
          this._showPrompt(tile.tx, tile.ty, "Gamble Tile Used", true);
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: 'gambleUsed' };
          foundSpecialTile = true;
          break;
        }
      }
    }
    
    if (!foundSpecialTile) {
      this.promptText.setVisible(false);
      this.promptTile = null;
    }
  }
  
  _showPrompt(tx, ty, text, used = false) {
    const worldPos = this.worldModel.tileToWorld(tx, ty);
    this.promptText.setPosition(worldPos.x, worldPos.y - 50);
    
    if (used) {
      this.promptText.setColor('#888888');
      this.promptText.setBackgroundColor('#101820');
    } else {
      this.promptText.setColor(UI_COLORS.white);
      this.promptText.setBackgroundColor('#131c26');
    }
    
    this.promptText.setText(text);
    this.promptText.setVisible(true);
  }

  refreshPromptText() {
    if (this.promptTile) this.update();
  }
  
  /**
   * Handle E key press for special tile interaction
   */
  handleInteract() {
    if (!this.promptTile) {
      return { success: false, reason: 'no-special-tile' };
    }
    
    const type = this.promptTile.type;
    
    if (type === 'teleport' || type === 'teleportPaired') {
      return this._activateTeleport();
    } else if (type === 'teleportSkyReturn') {
      return this._activateSkyTeleportReturn();
    } else if (type === 'gamble') {
      return this._activateGamble();
    } else if (type === 'gambleUsed') {
      return { success: false, reason: 'already-used' };
    }
    
    return { success: false, reason: 'unknown-type' };
  }
  
  /**
   * Calculate sky island teleporter X position based on depth
   * Left side of sky island for shallow teleporters, right side for deep ones
   * @param {number} dungeonTy - Tile Y of the underground teleporter
   * @returns {number} Sky island tile X coordinate
   */
  _calculateSkyIslandTx(dungeonTy) {
    const topAirRows = this.worldModel.config.topAirRows;
    const worldDepth = this.worldModel.config.worldDepthTiles;
    const depthTiles = dungeonTy - topAirRows;
    const totalDiggableDepth = worldDepth - topAirRows;
    
    // Sky island spans tiles [skyIslandTileX, skyIslandTileX + skyIslandWidthTiles - 1]
    const islandStartX = this.worldModel.config.skyIslandTileX;
    const islandWidth  = this.worldModel.config.skyIslandWidthTiles;
    const islandEndX = islandStartX + islandWidth - 1;
    const secondaryOffset = this._getSkyTeleporterSecondaryOffset();

    const pillarSafeMinX =
      (this.worldModel.config.starPillarTileX ?? islandStartX) +
      (this.worldModel.config.starPillarProximityTiles ?? 0) +
      2;

    const minTx = Math.max(islandStartX + 1, pillarSafeMinX);
    const maxTx = islandEndX - secondaryOffset;
    
    // Map depth ratio across the right-side teleporter lane, away from the Star Pillar.
    const depthRatio = Math.min(1, Math.max(0, depthTiles / totalDiggableDepth));
    const hasRightSideLane = maxTx >= minTx;
    const laneStart = hasRightSideLane ? minTx : Math.max(islandStartX, maxTx);
    const laneEnd = hasRightSideLane ? maxTx : laneStart;
    const skyTx = laneStart + Math.floor(depthRatio * (laneEnd - laneStart));
    
    return Math.max(laneStart, Math.min(laneEnd, skyTx));
  }

  _getSkyTeleporterSecondaryOffset() {
    return 3;
  }

  _getSkyTeleporterSecondaryTx(skyTx) {
    return skyTx + this._getSkyTeleporterSecondaryOffset();
  }

  _registerSkyTeleporterTiles(pairData, dungeonKey) {
    this.skyToDungeonMap.set(`${pairData.skyTx},${pairData.skyTy}`, dungeonKey);

    if (Number.isFinite(pairData.skySecondaryTx) && Number.isFinite(pairData.skySecondaryTy)) {
      this.skyToDungeonMap.set(`${pairData.skySecondaryTx},${pairData.skySecondaryTy}`, dungeonKey);
    }
  }

  _restoreSkyTeleporterTile(tx, ty) {
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;

    const currentType = this.worldModel.getTileType(tx, ty);
    if (currentType !== TILE_TYPES.TELEPORT_TILE) {
      this.worldModel.setTile(tx, ty, TILE_TYPES.TELEPORT_TILE, 0);
      if (this.scene.worldRenderer) {
        this.scene.worldRenderer.applyTileUpdate(tx, ty);
      }
    }
  }
  
  /**
   * Spawn a teleporter tile on the sky island at the given position
   * Places it on the row above the BEDROCK (skyIslandTileY - 1) so BEDROCK remains intact
   * @param {number} skyTx - Tile X on sky island (first teleporter position)
   * @param {number} skyTy - Tile Y on sky island (row above BEDROCK platform)
   */
  _spawnSkyIslandTeleporter(skyTx, skyTy) {
    const skySecondaryTx = this._getSkyTeleporterSecondaryTx(skyTx);

    // Place teleporter on the row above BEDROCK instead of replacing it
    this.worldModel.setTile(skyTx, skyTy, TILE_TYPES.TELEPORT_TILE, 0);
    
    // Place a second teleporter with exactly two empty tiles between the pair.
    this.worldModel.setTile(skySecondaryTx, skyTy, TILE_TYPES.TELEPORT_TILE, 0);
    
    // Update the visual render for both tiles
    this.scene.worldRenderer.applyTileUpdate(skyTx, skyTy);
    this.scene.worldRenderer.applyTileUpdate(skySecondaryTx, skyTy);

    return { skySecondaryTx, skySecondaryTy: skyTy };
  }
  
  /**
   * Activate teleport tile (first use = create pair, subsequent = go to sky island)
   */
  _activateTeleport() {
    const tile = this.promptTile;
    const tileKey = tile.key;
    const skyIslandY = this.worldModel.config.skyIslandTileY;
    
    // Check if this teleporter has already been paired
    if (this.pairedTeleporters.has(tileKey)) {
      // Already paired — teleport to the sky island teleporter
      const pair = this.pairedTeleporters.get(tileKey);
      this.playerController.teleportToTile(pair.skyTx, pair.skyTy - 1); // Land on the row above the teleporter tile
      
      this._playSound('teleport');
      
      if (this.floatingTextSystem) {
        const worldPos = this.worldModel.tileToWorld(pair.skyTx, skyIslandY - 1);
        this.floatingTextSystem.showFloatingText(
          worldPos.x,
          worldPos.y,
          'Teleported to Sky Island!',
          '#00ffff'
        );
      }
      
      return { success: true, type: 'teleport', target: 'skyIsland' };
    }
    
    // First time activating this teleporter — create a paired teleporter on sky island
    const dungeonTy = tile.ty;
    const skyTx = this._calculateSkyIslandTx(dungeonTy);
    const skyTy = skyIslandY - 1; // Place above BEDROCK — keeps BEDROCK intact
    
    // Spawn the sky island teleporter pair (2 tiles with 2 empty tiles between).
    const secondaryTile = this._spawnSkyIslandTeleporter(skyTx, skyTy);
    
    // Store the pairing (first teleporter)
    const pairData = {
      dungeonTx: tile.tx,
      dungeonTy: tile.ty,
      skyTx: skyTx,
      skyTy: skyTy,
      skySecondaryTx: secondaryTile.skySecondaryTx,
      skySecondaryTy: secondaryTile.skySecondaryTy,
    };
    this.pairedTeleporters.set(tileKey, pairData);
    
    // Reverse lookup for sky island prompt — both teleporter tiles map back to the underground tile.
    this._registerSkyTeleporterTiles(pairData, tileKey);
    
    // Teleport player to the sky island teleporter (land above it)
    this.playerController.teleportToTile(skyTx, skyTy - 1);
    
    this._playSound('teleport');
    
    if (this.floatingTextSystem) {
      const worldPos = this.worldModel.tileToWorld(skyTx, skyTy - 1);
      const depthTiles = dungeonTy - this.worldModel.config.topAirRows;
      this.floatingTextSystem.showFloatingText(
        worldPos.x,
        worldPos.y,
        `Teleported to Sky Island! (from depth ${depthTiles}m)`,
        '#00ffff'
      );
    }
    
    return { success: true, type: 'teleport', target: 'skyIsland', pairData };
  }
  
  /**
   * Activate return teleport from sky island back to the dungeon teleporter
   */
  _activateSkyTeleportReturn() {
    const tile = this.promptTile;
    const dungeonKey = tile.dungeonKey;
    const pair = this.pairedTeleporters.get(dungeonKey);
    
    if (!pair) {
      return { success: false, reason: 'no-paired-teleporter' };
    }
    
    // Teleport back to the dungeon teleporter (land next to it)
    this.playerController.teleportToTile(pair.dungeonTx, pair.dungeonTy - 1);
    
    this._playSound('teleport');
    
    if (this.floatingTextSystem) {
      const worldPos = this.worldModel.tileToWorld(pair.dungeonTx, pair.dungeonTy - 1);
      const depthTiles = pair.dungeonTy - this.worldModel.config.topAirRows;
      this.floatingTextSystem.showFloatingText(
        worldPos.x,
        worldPos.y,
        `Returned to Depth ${depthTiles}m!`,
        '#00ffff'
      );
    }
    
    return { success: true, type: 'teleport', target: 'dungeon' };
  }
  
  /**
   * Activate gamble tile - 50% chance to x3 resources, 50% to lose all
   */
  _activateGamble() {
    const digSystem = this.scene.digSystem;
    if (!digSystem) {
      return { success: false, reason: 'no-dig-system' };
    }
    
    // Mark as used
    this.usedGambleTiles.add(this.promptTile.key);
    
    // Get current resources
    const resources = digSystem.getResourceTotals();
    const totalResources = Object.values(resources).reduce((sum, val) => sum + val, 0);
    
    if (totalResources === 0) {
      // No resources to gamble
      if (this.floatingTextSystem) {
        const worldPos = this.worldModel.tileToWorld(this.promptTile.tx, this.promptTile.ty);
        this.floatingTextSystem.showFloatingText(
          worldPos.x,
          worldPos.y,
          'No resources to gamble!',
          '#ff0000'
        );
      }
      return { success: true, type: 'gamble', result: 'no-resources' };
    }
    
    // 50% chance
    const win = Math.random() < 0.5;
    
    const worldPos = this.worldModel.tileToWorld(this.promptTile.tx, this.promptTile.ty);
    
    if (win) {
      // Triple all resources
      const newResources = {};

      for (const [key, value] of Object.entries(resources)) {
        if (value > 0) {
          newResources[key] = value * 3;
        }
      }
      
      // Update dig system resources
      digSystem.setResourceTotals(newResources);
      
      // Show floating text
      if (this.floatingTextSystem) {
        this.floatingTextSystem.showFloatingText(
          worldPos.x,
          worldPos.y,
          `GAMBLE WIN! x3 Resources!`,
          '#00ff00'
        );
      }
      
      // Play win sound
      this._playSound('gamble-win');
      
      return { success: true, type: 'gamble', result: 'win', multiplied: newResources };
    } else {
      // Lose all resources
      const emptyResources = {
        dirt: 0,
        stone: 0,
        copper: 0,
        darkDirtNormal: 0,
        darkDirtStrong: 0,
        steel: 0,
        iron: 0,
        bronze: 0,
        silver: 0,
        gold: 0,
      };
      
      digSystem.setResourceTotals(emptyResources);
      
      // Show floating text
      if (this.floatingTextSystem) {
        this.floatingTextSystem.showFloatingText(
          worldPos.x,
          worldPos.y,
          `GAMBLE LOSE! All resources lost!`,
          '#ff0000'
        );
      }
      
      // Play lose sound
      this._playSound('gamble-lose');
      
      return { success: true, type: 'gamble', result: 'lose', lostResources: resources };
    }
  }
  
  _playSound(type) {
    // Play sound effects
    if (this.scene.soundSystem) {
      switch (type) {
        case 'teleport':
          // Could add teleport sound
          break;
        case 'gamble-win':
          this.scene.soundSystem.playSfx('reward');
          break;
        case 'gamble-lose':
          // Could add lose sound
          break;
      }
    }
  }
  
  /**
   * Get save data for used gamble tiles and paired teleporters
   */
  getSaveData() {
    return {
      usedGambleTiles: Array.from(this.usedGambleTiles),
      pairedTeleporters: Array.from(this.pairedTeleporters.entries()).map(([key, data]) => ({
        key,
        dungeonTx: data.dungeonTx,
        dungeonTy: data.dungeonTy,
        skyTx: data.skyTx,
        skyTy: data.skyTy,
        skySecondaryTx: data.skySecondaryTx,
        skySecondaryTy: data.skySecondaryTy,
      })),
    };
  }
  
  /**
   * Load save data for used gamble tiles and paired teleporters
   */
  loadSaveData(data) {
    if (!data) return;
    
    if (data.usedGambleTiles) {
      this.usedGambleTiles = new Set(data.usedGambleTiles);
    }
    
    if (data.pairedTeleporters) {
      for (const entry of data.pairedTeleporters) {
        const pairData = {
          dungeonTx: entry.dungeonTx,
          dungeonTy: entry.dungeonTy,
          skyTx: entry.skyTx,
          skyTy: entry.skyTy,
          skySecondaryTx: entry.skySecondaryTx,
          skySecondaryTy: entry.skySecondaryTy,
        };
        this.pairedTeleporters.set(entry.key, pairData);
        this._registerSkyTeleporterTiles(pairData, entry.key);
      }
      
      // Restore sky island teleporter tiles visually. Old saves without secondary data
      // keep their original primary-only sky teleporter.
      for (const pair of data.pairedTeleporters) {
        this._restoreSkyTeleporterTile(pair.skyTx, pair.skyTy);
        this._restoreSkyTeleporterTile(pair.skySecondaryTx, pair.skySecondaryTy);
      }
    }
  }
  
  destroy() {
    if (this.promptText) {
      this.promptText.destroy();
      this.promptText = null;
    }
  }
}
