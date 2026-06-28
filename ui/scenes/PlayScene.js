/**
 * PlayScene — Main game scene.
 * Orchestrates world model, player, mining, and rendering.
 */
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { PLAYER_STATS_CONFIG } from "../../values/playerStats.js";
import { PLAYER_ABILITIES_CONFIG } from "../../values/playerAbilities.js";
import { UI_CONFIG } from "../../values/uiConfig.js";
import { MINING_CONFIG } from "../../values/miningConfig.js";
import { WorldModel } from "../../world/WorldModel.js";
import { PlayerController } from "../../player/PlayerController.js";

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
    this.worldModel = null;
    this.playerController = null;
    this.tileLayer = null;
    this.rootOverlayLayer = null;
    this._lastUpdateTime = 0;
  }

  create(data = {}) {
    const config = GAME_CONFIG;

    // Set background color
    this.cameras.main.setBackgroundColor("#111820");

    // Create world model
    this.worldModel = new WorldModel(config);
    console.log('[PlayScene] World created:', this.worldModel.width, 'x', this.worldModel.depth);

    // Create tilemap
    this._createTilemap();

    // Create player sprite
    const playerSprite = this.add.sprite(0, 0, 'char-v5-idle-sheet', 0);
    playerSprite.setOrigin(0.5, 1);
    playerSprite.setDepth(10);

    // Create player controller
    this.playerController = new PlayerController(
      this, playerSprite, this.worldModel, config
    );

    // Setup camera
    this.cameras.main.startFollow(playerSprite, false, 0.14, 0.18);
    const ts = config.tileSize || 94;
    this.cameras.main.setZoom(config.defaultCameraZoom || 1.1);
    this.cameras.main.setDeadzone(
      config.viewportWidth * (config.cameraDeadzoneXFrac || 0.1),
      config.viewportHeight * (config.cameraDeadzoneYFrac || 0.18)
    );

    // Input - SPACE to dig
    this._digKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this._digKeyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this._digKeySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._lastMineTime = 0;

    // Show welcome message
    this._showWelcomeMessage();
  }

  _createTilemap() {
    const config = GAME_CONFIG;
    const ts = config.tileSize || 94;
    const world = this.worldModel;

    // Create blank tilemap
    this.tileMap = this.make.tilemap({
      tileWidth: ts, tileHeight: ts,
      width: world.width, height: world.depth,
    });

    // Use a simple generated tilesheet
    const tileSheetKey = this._generateTileSheet();
    const tileset = this.tileMap.addTilesetImage('world-tiles', tileSheetKey, ts, ts, 0, 0);

    this.tileLayer = this.tileMap.createBlankLayer('world', tileset, 0, 0);
    this.tileLayer.setDepth(0);

    this.rootOverlayLayer = this.tileMap.createBlankLayer('overlays', tileset, 0, 0);
    this.rootOverlayLayer.setDepth(1);

    // Paint initial world
    this._paintWorld();
  }

  _generateTileSheet() {
    const key = '__world_tiles_' + Date.now();
    if (this.textures.exists(key)) return key;

    const ts = GAME_CONFIG.tileSize || 94;
    const canvas = this.textures.createCanvas(key, ts * 16, ts * 16);
    const ctx = canvas.getContext();
    ctx.imageSmoothingEnabled = false;

    // Generate colored tile textures
    const colors = {
      0: 0x000000, // AIR - transparent
      1: 0x8B4513, // DIRT - brown
      2: 0x808080, // STONE - gray
      3: 0xB87333, // COPPER - copper
      4: 0x1a1a2e, // BEDROCK - dark
      5: 0x654321, // DARK_DIRT_NORMAL - dark brown
      6: 0x3E2723, // DARK_DIRT_STRONG - very dark
      7: 0xCD7F32, // BRONZE - bronze
      8: 0x4682B4, // STEEL - steel blue
      9: 0x71797E, // IRON - iron gray
      10: 0xC0C0C0, // SILVER - silver
      11: 0xFFD700, // GOLD - gold
      12: 0x00FF88, // TELEPORT - green
      13: 0xFF4488, // GAMBLE - pink
      14: 0x5a4a3a, // FLOOR_TOWN_1
      15: 0x6a5a4a, // FLOOR_TOWN_2
      16: 0x87CEEB, // SKY_TILE - sky blue
      17: 0x9900FF, // GEM_POWER - purple
      18: 0x00FFEE, // SPEED - cyan
      19: 0xFFFF00, // XP - yellow
      20: 0xFF6600, // CRIT - orange
      21: 0xDC143C, // BERSERK - crimson
      22: 0xFF8800, // COMBO - orange
      23: 0xFFD700, // LEGEND - gold
      24: 0x2a2a3e, // CAVE_WALL - dark
      25: 0x4a7a4a, // ROOT_OVERLAY
      26: 0x2a5a2a, // ROOT_OVERLAY_DEEP
      27: 0x88FF88, // GEODE_INTERIOR
      28: 0x3a3a5e, // GEODE_WALL
      29: 0xFFAA00, // CHEST
      30: 0x66E8FF, // GLOW_CRYSTAL
    };

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = y * 16 + x;
        const color = colors[idx] || 0x333333;
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x * ts, y * ts, ts, ts);

        // Add border
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * ts, y * ts, ts, ts);
      }
    }

    canvas.refresh();
    return key;
  }

  _paintWorld() {
    const world = this.worldModel;
    const row = new Array(world.width);
    const rootRow = new Array(world.width);

    for (let ty = 0; ty < world.depth; ty++) {
      for (let tx = 0; tx < world.width; tx++) {
        const type = world.getTileType(tx, ty);
        row[tx] = type > 0 ? type : -1;
        rootRow[tx] = world.getRootOverlayType(tx, ty) > 0 ? 25 : -1;
      }
      this.tileLayer.putTilesAt(row, 0, ty);
      this.rootOverlayLayer?.putTilesAt(rootRow, 0, ty);
    }
  }

  update(time, delta) {
    if (!this.playerController || !this.worldModel) return;

    // Update player
    this.playerController.update(delta);

    // Handle mining
    if (this.playerController.consumeMineInput()) {
      this._tryMine(time);
    }

    // Update tile layer for any changes
    this._lastUpdateTime = time;
  }

  _tryMine(time) {
    const config = GAME_CONFIG;
    const cooldown = config.mineCooldownMs || 200;
    if (time - this._lastMineTime < cooldown) return;
    this._lastMineTime = time;

    const target = this.playerController.getAimTargetTile();
    if (!target) return;

    const world = this.worldModel;
    if (!world.isSolid(target.tx, target.ty)) return;
    if (!world.isDiggable(target.tx, target.ty)) return;

    // Simple mining: destroy tile in one hit
    const damage = MINING_CONFIG.baseDamage || 5;
    const result = world.damageTile(target.tx, target.ty, damage);

    if (result.success && result.changed) {
      // Update tile visually
      const type = world.getTileType(target.tx, target.ty);
      const idx = type > 0 ? type : -1;
      this.tileLayer.putTileAt(idx, target.tx, target.ty);

      // Show break effect
      const ts = config.tileSize || 94;
      const fx = this.add.circle(
        target.tx * ts + ts / 2,
        target.ty * ts + ts / 2,
        8, 0xffffff, 0.6
      );
      this.tweens.add({
        targets: fx, alpha: 0, scale: 2,
        duration: 200, onComplete: () => fx.destroy(),
      });

      if (result.destroyed) {
        // Destroy root overlay if present
        this.rootOverlayLayer?.removeTileAt(target.tx, target.ty, true, true);
      }
    }
  }

  _showWelcomeMessage() {
    const { width, height } = this.cameras.main;
    const text = this.add.text(width / 2, height / 2, "Use arrow keys to move\nPress DOWN to dig", {
      fontFamily: 'Consolas, monospace',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 3000,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  resize(gameSize, baseSize, displaySize, previousWidth, previousHeight) {
    // Handle resize if needed
  }
}