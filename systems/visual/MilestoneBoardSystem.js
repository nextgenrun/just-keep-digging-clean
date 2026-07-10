import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { DEPTH_MILESTONES, getMilestoneAtDepth, computeMilestoneBonuses } from "../../values/depthMilestones.js";
import { USER_SETTINGS } from "../UserSettings.js";

function parseColorHex(value, fallback = 0x666666) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string") return fallback;

  const normalized = value.startsWith("#") ? value.slice(1) : value;
  const fullHex = normalized.length === 3
    ? normalized.split("").map((ch) => ch + ch).join("")
    : normalized;
  const parsed = Number.parseInt(fullHex, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createButton(scene, {
  x = 0,
  y = 0,
  width = 120,
  height = 30,
  label = "BUTTON",
  hint = "",
  accent = UI_COLORS.borderDim,
  labelColor = "#ffffff",
  depth = 0,
  fontSize = "10px",
  onClick = () => {},
}) {
  const fg = parseColorHex(accent, 0x4a4a4a);
  const hover = Math.max(0x000000, fg - 0x0f0f0f);

  const root = scene.add.container(x, y).setScrollFactor(0).setDepth(depth);

  const bg = scene.add.rectangle(0, 0, width, height, 0x1b1b1f, 0.95)
    .setScrollFactor(0)
    .setDepth(depth)
    .setStrokeStyle(2, fg, 0.95)
    .setInteractive({ useHandCursor: true });

  const labelText = scene.add.text(-width / 2 + 10, -1, label, {
    fontFamily: "Consolas, monospace",
    fontSize,
    fontStyle: "bold",
    color: labelColor,
    stroke: "#000000",
    strokeThickness: 2,
  }).setOrigin(0).setDepth(depth + 1);

  const hintText = hint
    ? scene.add.text(width / 2 - 10, 0, hint, {
      fontFamily: "Consolas, monospace",
      fontSize: "8px",
      color: UI_COLORS.hint,
      stroke: "#000000",
      strokeThickness: 1,
    }).setOrigin(1, 0.5).setDepth(depth + 1)
    : null;

  bg.on("pointerdown", () => {
    onClick();
  });
  bg.on("pointerover", () => {
    try { bg.setFillStyle(hover, 0.98); } catch (e) {}
  });
  bg.on("pointerout", () => {
    try { bg.setFillStyle(0x1b1b1f, 0.95); } catch (e) {}
  });

  root.add([bg, labelText]);
  root.add(labelText);
  if (hintText) root.add(hintText);
  return { root, bg, labelText, hintText };
}

/**
 * MilestoneBoardSystem
 * 
 * Renders a milestone board at the left side of town.
 * Tracks player's best depth reached each run and unlocks milestone rewards.
 * Milestones persist per save slot via localStorage.
 */
export class MilestoneBoardSystem {
  constructor(scene, config, worldModel) {
    this.scene = scene;
    this.config = config;
    this.worldModel = worldModel;

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

    const cx = this.scene.cameras.main.width / 2;
    const cy = this.scene.cameras.main.height / 2;
    const W = 600;
    const H = 500;
    const DEPTH = 2600;

    // Dark overlay
    this._overlay = this.scene.add.rectangle(cx, cy, 1280, 720, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(DEPTH).setAlpha(0).setInteractive();
    this.scene.tweens.add({ targets: this._overlay, alpha: 1, duration: 200 });
    this._boardObjects.push(this._overlay);

    // Panel
    const panelG = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);
    panelG.fillStyle(0x0A0E1A, 1);
    panelG.fillRoundedRect(cx - W / 2, cy - H / 2, W, H, 6);
    panelG.lineStyle(2, 0xC9A227, 0.8);
    panelG.strokeRoundedRect(cx - W / 2, cy - H / 2, W, H, 6);
    this._boardObjects.push(panelG);
    this.scene.tweens.add({ targets: panelG, alpha: 1, duration: 200 });

    // Title
    const title = this.scene.add.text(cx, cy - H / 2 + 25, '✦  DEPTH MILESTONES  ✦', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#C9A227',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2).setAlpha(0);
    this._boardObjects.push(title);
    this.scene.tweens.add({ targets: title, alpha: 1, duration: 250 });

    const closeBtn = createButton(this.scene, {
      x: cx + W / 2 - 62,
      y: cy - H / 2 + 28,
      width: 104,
      height: 30,
      label: 'CLOSE',
      hint: 'ESC',
      accent: UI_COLORS.borderBad,
      labelColor: UI_COLORS.danger,
      depth: DEPTH + 3,
      fontSize: '10px',
      onClick: () => this._closeBoardView(),
    });
    closeBtn.root.setAlpha(0);
    this._boardObjects.push(closeBtn.root);
    this.scene.tweens.add({ targets: closeBtn.root, alpha: 1, duration: 250 });

    // Stats bar
    const bonuses = this.getBonuses();
    const statsText = this.scene.add.text(cx, cy - H / 2 + 50, 
      `+${bonuses.gpMaxBonus} GP Max  |  +${bonuses.miningSpeedPct}% Speed  |  +${bonuses.critChancePct}% Crit`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#88AACC',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2).setAlpha(0);
    this._boardObjects.push(statsText);
    this.scene.tweens.add({ targets: statsText, alpha: 1, duration: 300 });

    // Divider
    const divY = cy - H / 2 + 62;
    const divG = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);
    divG.lineStyle(1, 0x334466, 0.6);
    divG.lineBetween(cx - W / 2 + 10, divY, cx + W / 2 - 10, divY);
    this._boardObjects.push(divG);
    this.scene.tweens.add({ targets: divG, alpha: 1, duration: 250 });

    // Milestone list
    const startY = cy - H / 2 + 78;
    let rowY = startY;

    DEPTH_MILESTONES.forEach((m, i) => {
      const isReached = this._reachedDepths.includes(m.depth);
      const rowColor = isReached ? '#4ECB71' : '#334455';
      const rowName  = isReached ? m.name : '???';
      const rowDepth = isReached ? `${m.depth}m` : `???`;
      const rowReward = isReached ? m.reward : '???';
      const rowAlpha = isReached ? 1 : 0.3;

      // Row background (alternating)
      if (i % 2 === 0) {
        const rowBg = this.scene.add.rectangle(
          cx, rowY + 11, W - 10, 22,
          isReached ? 0x0A1A0A : 0x0A0E1A,
          isReached ? 0.4 : 0.2
        ).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);
        this._boardObjects.push(rowBg);
        this.scene.tweens.add({ targets: rowBg, alpha: 1, duration: 150 + i * 20 });
      }

      // Depth
      const dText = this.scene.add.text(cx - W / 2 + 15, rowY, rowDepth, {
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: isReached ? '#C9A227' : '#334455',
        stroke: '#000000',
        strokeThickness: 2,
        alpha: rowAlpha,
      }).setScrollFactor(0).setDepth(DEPTH + 2).setAlpha(0);
      this._boardObjects.push(dText);
      this.scene.tweens.add({ targets: dText, alpha: rowAlpha, duration: 150 + i * 20 });

      // Milestone name
      const nText = this.scene.add.text(cx - 80, rowY, rowName, {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: '13px',
        color: rowColor,
        stroke: '#000000',
        strokeThickness: 2,
        alpha: rowAlpha,
        shadow: isReached ? { offsetX: 0, offsetY: 0, color: '#4ECB71', blur: 4, fill: true } : undefined,
      }).setScrollFactor(0).setDepth(DEPTH + 2).setAlpha(0);
      this._boardObjects.push(nText);
      this.scene.tweens.add({ targets: nText, alpha: rowAlpha, duration: 180 + i * 20 });

      // Reward
      const rText = this.scene.add.text(cx + 100, rowY, rowReward, {
        fontFamily: 'Consolas, monospace',
        fontSize: '11px',
        color: isReached ? '#AABBEE' : '#334455',
        stroke: '#000000',
        strokeThickness: 2,
        alpha: rowAlpha,
      }).setScrollFactor(0).setDepth(DEPTH + 2).setAlpha(0);
      this._boardObjects.push(rText);
      this.scene.tweens.add({ targets: rText, alpha: rowAlpha, duration: 200 + i * 20 });

      // Unlocked checkmark
      if (isReached) {
        const check = this.scene.add.text(cx + W / 2 - 20, rowY, '✦', {
          fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
          fontSize: '12px',
          color: '#4ECB71',
          stroke: '#000000',
          strokeThickness: 2,
        }).setScrollFactor(0).setDepth(DEPTH + 2).setAlpha(0);
        this._boardObjects.push(check);
        this.scene.tweens.add({ targets: check, alpha: 1, duration: 220 + i * 20 });
      }

      rowY += 24;
    });

    // Close hint
    const closeHint = this.scene.add.text(cx, cy + H / 2 - 15, `Press ${USER_SETTINGS.getKeyLabel("interact")} or ESC to close`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#556677',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2).setAlpha(0);
    this._boardObjects.push(closeHint);
    this.scene.tweens.add({ targets: closeHint, alpha: 1, duration: 400 });
  }

  _closeBoardView() {
    if (!this._isBoardOpen) return;
    this._isBoardOpen = false;

    this._boardObjects.forEach(obj => {
      this.scene.tweens.add({
        targets: obj,
        alpha: 0,
        duration: 100,
        onComplete: () => obj.destroy(),
      });
    });
    this._boardObjects = [];
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
      localStorage.setItem('dig-game-milestones', JSON.stringify(this._reachedDepths));
    } catch (e) {}
  }

  _loadMilestones() {
    try {
      const data = localStorage.getItem('dig-game-milestones');
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
