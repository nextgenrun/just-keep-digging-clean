import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { DEPTH_MILESTONES, getMilestoneAtDepth, computeMilestoneBonuses } from "../../values/depthMilestones.js";
import { USER_SETTINGS } from "../UserSettings.js";

/**
 * MilestoneBoardSystem
 * 
 * Renders a milestone board at the left side of town.
 * Tracks player's best depth reached each run and unlocks milestone rewards.
 * Milestones persist per save slot via localStorage.
 */
export class MilestoneBoardSystem {
  constructor(scene, config, worldModel, ui, saveSlot = 1) {
    this.scene = scene;
    this.config = config;
    this.worldModel = worldModel;
    this.ui = ui;
    this.saveSlot = Number.isInteger(saveSlot) && saveSlot > 0 ? saveSlot : 1;

    // Persisted milestone state
    this._reachedDepths = []; // array of depths reached (e.g. [100, 200, 300])
    this._loadMilestones();

    // Board visual objects
    this._boardGfx = null;
    this._boardTexts = [];
    this._boardTitle = null;
    this._ePrompt = null;
    this._isBoardOpen = false;
    this._boardObjects = [];

    // Track best depth this run for milestone detection
    this._maxDepthThisRun = 0;
    this._pendingMilestoneCheck = false;
  }

  /**
   * Create the milestone board in the world (left side of town)
   */
  create() {
    const ts = this.config.tileSize;
    // Place board at tile x=3, y=topAirRows-3 (left side, above ground)
    const boardX = 3 * ts + ts / 2;
    const boardY = (this.config.topAirRows - 3) * ts + ts / 2;
    const boardWidth = 110;
    const boardHeight = 80;
    const boardLeft = boardX - boardWidth / 2;
    const boardTop = boardY - boardHeight / 2;
    const boardBottom = boardY + boardHeight / 2;
    const groundY = this.config.topAirRows * ts;
    const postBottom = groundY + Math.max(6, Math.round(ts * 0.08));
    const postHeight = Math.max(20, postBottom - boardBottom);

    // Wooden post and board face
    this._boardGfx = this.scene.add.graphics();
    this._boardGfx.setDepth(4);

    // Post first so the sign face sits cleanly on top.
    this._boardGfx.fillStyle(0x4A3020, 1);
    this._boardGfx.fillRect(boardX - 6, boardBottom, 12, postHeight);
    this._boardGfx.fillStyle(0x3A2610, 1);
    this._boardGfx.fillRect(boardX - 3, boardBottom, 6, postHeight);
    this._boardGfx.fillStyle(0x4A3020, 1);
    this._boardGfx.fillRoundedRect(boardX - 18, groundY - 3, 36, 10, 2);
    this._boardGfx.lineStyle(1, 0x6B4226, 0.8);
    this._boardGfx.strokeRoundedRect(boardX - 18, groundY - 3, 36, 10, 2);

    // Board background (dark wood rectangle)
    this._boardGfx.fillStyle(0x3A2610, 1);
    this._boardGfx.fillRoundedRect(boardLeft, boardTop, boardWidth, boardHeight, 4);
    this._boardGfx.lineStyle(2, 0x6B4226, 1);
    this._boardGfx.strokeRoundedRect(boardLeft, boardTop, boardWidth, boardHeight, 4);

    // Title
    this._boardTitle = this.scene.add.text(boardX, boardY - 25, 'MILESTONES', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#C9A227',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    // Milestone counter
    const reached = this._reachedDepths.length;
    const total = DEPTH_MILESTONES.length;
    this._boardCounter = this.scene.add.text(boardX, boardY + 5, `${reached} / ${total}`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '14px',
      color: '#88AACC',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    // Small "latest: Xm" text
    const latest = this._reachedDepths.length > 0 ? Math.max(...this._reachedDepths) : 0;
    this._boardLatest = this.scene.add.text(boardX, boardY + 22, latest > 0 ? `Best: ${latest}m` : '', {
      fontFamily: 'Consolas, monospace',
      fontSize: '9px',
      color: '#667788',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5).setDepth(5);

    // E prompt
    this._ePrompt = this.scene.add.text(boardX, boardY + 50, `Press ${USER_SETTINGS.getKeyLabel("interact")}`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      alpha: 0,
    }).setOrigin(0.5).setDepth(5);
    this.scene.tweens.add({
      targets: this._ePrompt,
      alpha: { from: 0, to: 0.8 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this._boardX = boardX;
    this._boardY = boardY;
  }

  /**
   * Called every frame - check player proximity to board
   */
  update(playerTile, keys) {
    if (!playerTile) return;

    // Check proximity to board (tile x=3, y=topAirRows-3 area)
    const boardTileX = 3;
    const boardTileY = this.config.topAirRows - 3;
    const dx = Math.abs(playerTile.tx - boardTileX);
    const dy = Math.abs(playerTile.ty - boardTileY);

    const inRange = dx <= 2 && dy <= 3;

    if (keys && inRange && keys.interact && Phaser.Input.Keyboard.JustDown(keys.interact)) {
      if (!this._isBoardOpen) {
        this._openBoardView();
      } else {
        this._closeBoardView();
      }
    }

    // Also close with ESC
    if (keys && this._isBoardOpen && (
      (keys.escape && Phaser.Input.Keyboard.JustDown(keys.escape)) ||
      (keys.hardEscape && Phaser.Input.Keyboard.JustDown(keys.hardEscape))
    )) {
      this._closeBoardView();
    }
  }

  refreshKeybinds() {
    this._ePrompt?.setText(`Press ${USER_SETTINGS.getKeyLabel("interact")}`);
  }

  /**
   * Check if current depth triggers a new milestone
   * Called from PlayScene update
   */
  checkDepthMilestone(depth) {
    if (depth <= this._maxDepthThisRun) return null;
    this._maxDepthThisRun = depth;

    const milestone = getMilestoneAtDepth(depth);
    if (!milestone) return null;

    // Check if already reached
    if (this._reachedDepths.includes(depth)) return null;

    // Reach milestone
    this._reachedDepths.push(depth);
    this._saveMilestones();
    this._updateBoardDisplay();

    // Return the milestone for the scene to handle (flash, shake, etc.)
    return milestone;
  }

  /**
   * Get total bonuses from all milestones
   */
  getBonuses() {
    return computeMilestoneBonuses(this._reachedDepths);
  }

  /**
   * Get the list of reached depths
   */
  getReachedDepths() {
    return [...this._reachedDepths];
  }

  /**
   * Open full milestone board view (scrollable list)
   */
  _openBoardView() {
    if (this._isBoardOpen) return;
    this._isBoardOpen = true;
    this.scene.setShopOpen?.(true);

    const shell = this.ui.createModalShell(this.scene, {
      title: "DEPTH MILESTONES",
      subtitle: this._reachedDepths.length + " / " + DEPTH_MILESTONES.length + " discovered  |  Permanent bonuses",
      icon: "journal",
      maxWidth: 900,
      maxHeight: 650,
      depth: 3150,
      onClose: () => this._closeBoardView(),
    });
    const content = shell.content;
    const rect = shell.getContentRect();
    const columns = rect.width >= 720 ? 2 : 1;
    const gap = 14;
    const columnWidth = (rect.width - gap * (columns - 1)) / columns;
    const rows = Math.ceil(DEPTH_MILESTONES.length / columns);
    const rowHeight = Math.max(52, Math.min(76, (rect.height - 16) / rows));

    DEPTH_MILESTONES.forEach((milestone, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = rect.left + col * (columnWidth + gap);
      const y = rect.top + row * rowHeight;
      const reached = this._reachedDepths.includes(milestone.depth);
      const card = this.scene.add.rectangle(
        x + columnWidth / 2,
        y + rowHeight / 2 - 3,
        columnWidth,
        rowHeight - 8,
        reached ? UI_COLORS.cardSel : UI_COLORS.cardBase,
        reached ? 1 : 0.84
      ).setStrokeStyle(reached ? 2 : 1, reached ? UI_COLORS.borderSel : UI_COLORS.borderDim);
      content.add(card);
      this.ui.createIconBadge(this.scene, reached ? "journal" : "lock", {
        x: x + 36,
        y: y + rowHeight / 2 - 3,
        size: Math.min(46, rowHeight - 18),
        iconSize: Math.min(38, rowHeight - 24),
        selected: reached,
        parent: content,
      });
      const title = this.scene.add.text(x + 66, y + rowHeight / 2 - 15,
        (milestone.depth || 0) + "M  " + (milestone.name || milestone.title || "Depth Milestone"), {
          fontFamily: UI_FONTS.display,
          fontSize: "14px",
          fontStyle: "bold",
          color: reached ? UI_COLORS.title : UI_COLORS.dim,
        }
      ).setOrigin(0, 0.5);
      const status = this.scene.add.text(x + columnWidth - 16, y + rowHeight / 2 - 15,
        reached ? "DISCOVERED" : "LOCKED", {
          fontFamily: UI_FONTS.mono,
          fontSize: "10px",
          color: reached ? UI_COLORS.success : UI_COLORS.dim,
        }
      ).setOrigin(1, 0.5);
      const description = this.scene.add.text(x + 66, y + rowHeight / 2 + 10,
        milestone.description || milestone.rewardDescription || "Permanent depth reward", {
          fontFamily: UI_FONTS.mono,
          fontSize: "10px",
          color: reached ? UI_COLORS.body : UI_COLORS.dim,
          wordWrap: { width: columnWidth - 150, useAdvancedWrap: true },
        }
      ).setOrigin(0, 0.5);
      content.add([title, status, description]);
    });

    this._boardObjects = [shell];
    shell.show();
  }

  _closeBoardView() {
    if (!this._isBoardOpen) return;
    this._isBoardOpen = false;
    this.scene.setShopOpen?.(false);
    const objects = this._boardObjects;
    this._boardObjects = [];
    objects.forEach(obj => {
      if (obj?.hide) obj.hide(() => obj.destroy?.());
      else obj?.destroy?.();
    });
  }

  _updateBoardDisplay() {
    const reached = this._reachedDepths.length;
    const total = DEPTH_MILESTONES.length;
    this._boardCounter.setText(`${reached} / ${total}`);

    const latest = reached > 0 ? Math.max(...this._reachedDepths) : 0;
    this._boardLatest.setText(latest > 0 ? `Best: ${latest}m` : '');
  }

  _saveMilestones() {
    try {
      localStorage.setItem(`dig-game-milestones-slot-${this.saveSlot}`, JSON.stringify(this._reachedDepths));
    } catch (e) {}
  }

  _loadMilestones() {
    try {
      const storageKey = `dig-game-milestones-slot-${this.saveSlot}`;
      let data = localStorage.getItem(storageKey);
      if (!data && this.saveSlot === 1) {
        data = localStorage.getItem('dig-game-milestones');
        if (data) localStorage.setItem(storageKey, data);
      }
      if (data) {
        this._reachedDepths = JSON.parse(data);
        if (!Array.isArray(this._reachedDepths)) this._reachedDepths = [];
      }
    } catch (e) {
      this._reachedDepths = [];
    }
  }

  destroy() {
    this._closeBoardView();
    this._boardGfx?.destroy();
    this._boardTitle?.destroy();
    this._boardCounter?.destroy();
    this._boardLatest?.destroy();
    this._ePrompt?.destroy();
  }
}

