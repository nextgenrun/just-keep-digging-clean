/**
 * CampfireSystem
 *
 * Renders a campfire at a fixed surface location near spawn.
 * Players can interact (E) to choose a temporary buff.
 * Buffs last 60-360 seconds depending on campfire upgrade tier,
 * and are shown in persistent HUD timer.
 *
 * Features 10 upgrade tiers purchased with gold:
 *   Tier 1 (free):     60s,  +5% speed,  +10% XP,  +2% crit
 *   Tier 2 (5 gold):   75s,  +8% speed,  +15% XP,  +3% crit
 *   Tier 3 (10 gold):  90s,  +10% speed, +20% XP,  +5% crit
 *   Tier 4 (20 gold):  120s, +12% speed, +25% XP,  +6% crit
 *   Tier 5 (50 gold):  150s, +15% speed, +30% XP,  +8% crit
 *   Tier 6 (75 gold):  180s, +18% speed, +40% XP,  +10% crit
 *   Tier 7 (100 gold): 210s, +20% speed, +50% XP,  +12% crit
 *   Tier 8 (150 gold): 240s, +25% speed, +60% XP,  +15% crit
 *   Tier 9 (200 gold): 270s, +30% speed, +75% XP,  +18% crit
 *   Tier 10 (300 gold): 360s, +35% speed, +90% XP,  +20% crit
 *
 * Uses its own Phaser keyboard keys (NOT shared game input keys)
 * to avoid JustDown flag consumption by PlayerController.
 *
 * Stops player controls while menu is open (setShopOpen).
 * Prevents E-key double-fire with _justOpenedFrame flag.
 * Uses main menu theme colors (gold accent #c9a227, bg 0x0d1117).
 *
 * The campfire sprite is anchored by its feet on the surface tile line.
 */

import { UI_COLORS } from "../../values/uiColors.js";
import { createButton } from "../../ui/PhaserUiKit.js";
import { USER_SETTINGS, keyToPhaserKey } from "../UserSettings.js";

// ── Main Menu Theme Palette (matches ShopOverlay / MainMenuScene) ──────────
const COL = {
  bg:        UI_COLORS.bg,
  cardBase:  UI_COLORS.cardBase,
  cardHover: UI_COLORS.cardHover,
  borderDim: UI_COLORS.borderDim,
  borderHov: UI_COLORS.borderHov,
  accent:    UI_COLORS.borderSel,
  cssAccent: UI_COLORS.gold,
  white:     UI_COLORS.white,
  title:     UI_COLORS.title,
  dim:       UI_COLORS.dim,
  hint:      UI_COLORS.hint,
  body:      UI_COLORS.body,
  gold:      '#ffd700',
  success:   UI_COLORS.borderGood,
  cssSuccess:UI_COLORS.success,
  danger:    UI_COLORS.danger,
  good:      0x2a4a2a,
  poor:      0x4a2a2a,
};

// ── Campfire Upgrade Tiers (10 levels) ─────────────────────────────────────
// Nerfed early game: level 1 is very cheap, levels 5-10 scale sensibly
// against other upgrade prices (agility=3g, strength=18g, critChance=60g)
const CAMPFIRE_TIERS = [
  {
    level: 1,
    label: 'Tier I',
    cost: 0,
    durationMs: 60000,       // 1 min
    miningSpeedBonus: 0.05,
    xpBonus: 0.10,
    critBonus: 0.02,
    desc: 'Basic warmth (60s)',
  },
  {
    level: 2,
    label: 'Tier II',
    cost: 5,
    durationMs: 75000,       // 1.25 min
    miningSpeedBonus: 0.08,
    xpBonus: 0.15,
    critBonus: 0.03,
    desc: 'Cozy fire (75s)',
  },
  {
    level: 3,
    label: 'Tier III',
    cost: 10,
    durationMs: 90000,       // 1.5 min
    miningSpeedBonus: 0.10,
    xpBonus: 0.20,
    critBonus: 0.05,
    desc: 'Warm glow (90s)',
  },
  {
    level: 4,
    label: 'Tier IV',
    cost: 20,
    durationMs: 120000,      // 2 min
    miningSpeedBonus: 0.12,
    xpBonus: 0.25,
    critBonus: 0.06,
    desc: 'Steady flame (120s)',
  },
  {
    level: 5,
    label: 'Tier V',
    cost: 50,
    durationMs: 150000,      // 2.5 min
    miningSpeedBonus: 0.15,
    xpBonus: 0.30,
    critBonus: 0.08,
    desc: 'Bright blaze (150s)',
  },
  {
    level: 6,
    label: 'Tier VI',
    cost: 75,
    durationMs: 180000,      // 3 min
    miningSpeedBonus: 0.18,
    xpBonus: 0.40,
    critBonus: 0.10,
    desc: 'Roaring fire (180s)',
  },
  {
    level: 7,
    label: 'Tier VII',
    cost: 100,
    durationMs: 210000,      // 3.5 min
    miningSpeedBonus: 0.20,
    xpBonus: 0.50,
    critBonus: 0.12,
    desc: 'Intense heat (210s)',
  },
  {
    level: 8,
    label: 'Tier VIII',
    cost: 150,
    durationMs: 240000,      // 4 min
    miningSpeedBonus: 0.25,
    xpBonus: 0.60,
    critBonus: 0.15,
    desc: 'Inferno (240s)',
  },
  {
    level: 9,
    label: 'Tier IX',
    cost: 200,
    durationMs: 270000,      // 4.5 min
    miningSpeedBonus: 0.30,
    xpBonus: 0.75,
    critBonus: 0.18,
    desc: 'Volcanic (270s)',
  },
  {
    level: 10,
    label: 'Tier X',
    cost: 300,
    durationMs: 360000,      // 6 min
    miningSpeedBonus: 0.35,
    xpBonus: 0.90,
    critBonus: 0.20,
    desc: 'Eternal flame (360s)',
  },
];

// ── Campfire Sprite Layout ─────────────────────────────────────────────────
const CAMPFIRE_SPRITE_KEYS = [
  'campfire-tier-01', 'campfire-tier-02', 'campfire-tier-03', 'campfire-tier-04', 'campfire-tier-05',
  'campfire-tier-06', 'campfire-tier-07', 'campfire-tier-08', 'campfire-tier-09', 'campfire-tier-10',
];
const CAMPFIRE_GROUND_OVERLAP_PX = 1;
const CAMPFIRE_HEIGHT_BY_LEVEL_TILES = [
  1.06, 1.10, 1.14, 1.18, 1.22,
  1.26, 1.30, 1.34, 1.38, 1.42,
];

export class CampfireSystem {
  constructor(scene, config, worldModel) {
    this.scene = scene;
    this.config = config;
    this.worldModel = worldModel;

    // Campfire visual objects
    this._campfireGfx = null;
    this._campfireSprite = null;
    this._flameEmbers = [];
    this._ePrompt = null;
    this._interactLabel = null;

    // Buff state
    this._activeBuff = null;

    // Buff selection UI state
    this._isSelecting = false;
    this._selectionObjects = [];
    this._selectedIndex = 0;
    this._selectionOverlay = null;
    this._justOpenedFrame = false;
    this._lastNavDir = null;

    // Campfire position
    this._campX = 0;
    this._campY = 0;
    this._campGroundY = 0;
    this._campfireDisplayWidthPx = 0;
    this._campfireDisplayHeightPx = 0;

    // Own keys (separate Key references, but Phaser shares the same Key object per keycode).
    // For W/S we use manual prev-state tracking because JustDown gets consumed
    // by the player controller's movement handler which runs first.
    this._keyInteract = null;
    this._keyW = null;
    this._keyS = null;
    this._keyEsc = null;
    this._keyEnter = null;
    this._prevW = false;   // prev-frame isDown for W (manual JustDown)
    this._prevS = false;   // prev-frame isDown for S (manual JustDown)
    this._prevEsc = false; // prev-frame isDown for ESC (manual JustDown)
    this._prevInteract = false; // prev-frame for E (manual JustDown)
    this._prevEnter = false; // prev-frame for Enter (manual JustDown)

    // Upgrade tier
    this._campfireLevel = 1; // 1-10

    // Available buff definitions (use getter to apply tier scaling)
    this._buffs = [
      { type: 'warmth',      name: 'Warmth',      color: '#FF6633', desc: '+Mining Speed', miningSpeedBonus: true },
      { type: 'inspiration', name: 'Inspiration',  color: '#66AAFF', desc: '+XP Gain',      xpBonus: true },
      { type: 'focus',       name: 'Focus',       color: '#DD66FF', desc: '+Crit Chance',   critBonus: true },
    ];
  }

  // ── Public API ──────────────────────────────────────────────────────────

  create() {
    this._loadCampfireLevel();

    const ts = this.config.tileSize;
    const campTileX = this.config.spawnTileX + 38; // one tile left of the previous campfire station spot
    const campTileY = this.config.topAirRows - 1;
    this._campX = campTileX * ts + ts / 2;
    this._campY = campTileY * ts + ts / 2;
    this._campGroundY = (campTileY + 1) * ts;

    // Register own keyboard keys (independent from game input)
    this.refreshKeybinds();
    this._keyW = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this._keyS = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this._keyEsc = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this._keyEnter = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Campfire graphics
    this._campfireGfx = this.scene.add.graphics();
    this._campfireGfx.setDepth(4);
    this._drawCampfire();

    // Campfire sprite: bottom-center anchored so the brazier feet sit on the tile surface.
    this._campfireSprite = this.scene.add.image(this._campX, this._campGroundY + CAMPFIRE_GROUND_OVERLAP_PX, this._getCampfireSpriteKey());
    this._campfireSprite.setDepth(5);
    this._campfireSprite.setOrigin(0.5, 1);
    this._applyCampfireVisualLayout();

    // Interact label
    this._interactLabel = this.scene.add.text(this._campX, this._getCampfireTopY() - 18, 'Campfire', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '10px',
      color: COL.cssAccent,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    // E prompt (pulsing)
    this._ePrompt = this.scene.add.text(this._campX, this._getCampfireTopY() - 3, `Press ${USER_SETTINGS.getKeyLabel("interact")}`, {
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

    this._applyCampfireVisualLayout();

    // Animate fire particles
    this._fireAnimTimer = this.scene.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => this._sparkEmber(),
    });
  }

  refreshKeybinds() {
    if (this._keyInteract) this._keyInteract.destroy?.();
    this._keyInteract = this.scene.input.keyboard.addKey(keyToPhaserKey(USER_SETTINGS.getKey("interact")));
    this._prevInteract = false;
    this._ePrompt?.setText(`Press ${USER_SETTINGS.getKeyLabel("interact")}`);
  }

  /**
   * Update loop
   * @param {Object} playerTile - {tx, ty}
   * @param {*} unusedKeys - not used (we own our keys)
   * @param {number} [delta] - frame delta ms
   */
  update(playerTile, unusedKeys, delta) {
    if (!playerTile) return;

    // Proximity
    const campTileX = Math.floor(this._campX / this.config.tileSize);
    const campTileY = Math.floor(this._campY / this.config.tileSize);
    const dx = Math.abs(playerTile.tx - campTileX);
    const dy = Math.abs(playerTile.ty - campTileY);
    const inRange = dx <= 2 && dy <= 3;

    // E prompt visibility
    if (this._ePrompt) {
      this._ePrompt.setVisible(inRange && !this._isSelecting);
    }

    // Manual JustDown tracking for all keys (done BEFORE any conditionals
    // so we don't lose state when menu is open/closed mid-frame)
    const wDown = this._keyW && this._keyW.isDown;
    const sDown = this._keyS && this._keyS.isDown;
    const escDown = this._keyEsc && this._keyEsc.isDown;
    const eDown = this._keyInteract && this._keyInteract.isDown;
    const enterDown = this._keyEnter && this._keyEnter.isDown;
    const justW = wDown && !this._prevW;
    const justS = sDown && !this._prevS;
    const justEsc = escDown && !this._prevEsc;
    const justE = eDown && !this._prevInteract;
    const justEnter = enterDown && !this._prevEnter;
    this._prevW = wDown;
    this._prevS = sDown;
    this._prevEsc = escDown;
    this._prevInteract = eDown;
    this._prevEnter = enterDown;

    // Open buff selection (E + in range + not selecting)
    if (inRange && justE && !this._isSelecting) {
      this._openBuffSelection();
      return; // Skip rest of update this frame (justOpened prevents E confirm)
    }

    // ESC to close (use manual tracking to ensure it works)
    if (this._isSelecting && justEsc) {
      this._closeBuffSelection();
      return;
    }

    // Handle W/S navigation and E confirmation when menu is open
    if (this._isSelecting) {
      this._handleSelectionInput(justW, justS, justE, justEnter);
    }

    // Buff timer
    this._updateBuffTimer(delta);
  }

  /** Check if the campfire selection UI is currently open */
  isSelecting() {
    return this._isSelecting;
  }

  /** Get remaining time of active buff in ms (0 = no buff) */
  getRemainingMs() {
    if (this._activeBuff && this._activeBuff.remainingMs > 0) {
      return this._activeBuff.remainingMs;
    }
    return 0;
  }

  /** Get active buff info for HUD display */
  getActiveBuff() {
    if (!this._activeBuff || this._activeBuff.remainingMs <= 0) return null;
    return { ...this._activeBuff };
  }

  /** Get mining speed bonus (only if Warmth buff is active) */
  getMiningSpeedBonus() {
    if (this._activeBuff && this._activeBuff.remainingMs > 0 && this._activeBuff.type === 'warmth') {
      const tier = this._getTierConfig();
      return tier.miningSpeedBonus;
    }
    return 0;
  }

  /** Get XP bonus (only if Inspiration buff is active) */
  getXpBonus() {
    if (this._activeBuff && this._activeBuff.remainingMs > 0 && this._activeBuff.type === 'inspiration') {
      const tier = this._getTierConfig();
      return tier.xpBonus;
    }
    return 0;
  }

  /** Get crit chance bonus (only if Focus buff is active) */
  getCritBonus() {
    if (this._activeBuff && this._activeBuff.remainingMs > 0 && this._activeBuff.type === 'focus') {
      const tier = this._getTierConfig();
      return tier.critBonus;
    }
    return 0;
  }

  /** Get current campfire tier level (1-10) */
  getCampfireLevel() {
    return this._campfireLevel;
  }

  /**
   * Attempt to upgrade campfire to next tier.
   * Returns { success: boolean, message: string }
   */
  upgradeCampfire() {
    const currentIdx = this._campfireLevel - 1;
    const nextTier = CAMPFIRE_TIERS[currentIdx + 1];
    if (!nextTier) {
      return { success: false, message: 'Already max level!' };
    }

    const money = this.scene.upgradeSystem ? this.scene.upgradeSystem.getMoney() : 0;
    if (money < nextTier.cost) {
      return { success: false, message: `Need ${nextTier.cost} gold!` };
    }

    // Spend money
    if (this.scene.upgradeSystem) {
      this.scene.upgradeSystem.spendMoney(nextTier.cost);
    }

    this._campfireLevel = nextTier.level;
    this._saveCampfireLevel();

    // Update campfire sprite to match new level
    this._updateCampfireSprite();

    return {
      success: true,
      message: `🔥 Campfire upgraded to ${nextTier.label}!`,
      tier: nextTier,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  _getTierConfig() {
    const idx = Math.min(this._campfireLevel - 1, CAMPFIRE_TIERS.length - 1);
    return CAMPFIRE_TIERS[idx] || CAMPFIRE_TIERS[0];
  }

  _getBuffValues() {
    const tier = this._getTierConfig();
    return {
      miningSpeedBonus: tier.miningSpeedBonus,
      xpBonus: tier.xpBonus,
      critBonus: tier.critBonus,
      durationMs: tier.durationMs,
    };
  }

  _loadCampfireLevel() {
    try {
      const saved = localStorage.getItem('jkd-campfire-level');
      if (saved) {
        const level = parseInt(saved, 10);
        if (level >= 1 && level <= 10) {
          this._campfireLevel = level;
        }
      }
    } catch (e) {
      // ignore localStorage errors
    }
  }

  _saveCampfireLevel() {
    try {
      localStorage.setItem('jkd-campfire-level', String(this._campfireLevel));
    } catch (e) {
      // ignore
    }
  }

  _updateCampfireSprite() {
    if (this._campfireSprite) {
      const spriteKey = this._getCampfireSpriteKey();
      if (this.scene.textures.exists(spriteKey)) {
        this._campfireSprite.setTexture(spriteKey);
      }
      this._applyCampfireVisualLayout();
    }
  }

  _getCampfireSpriteKey() {
    const idx = Phaser.Math.Clamp(this._campfireLevel - 1, 0, CAMPFIRE_SPRITE_KEYS.length - 1);
    return CAMPFIRE_SPRITE_KEYS[idx];
  }

  _getCampfireDisplayHeightPx() {
    const idx = Phaser.Math.Clamp(this._campfireLevel - 1, 0, CAMPFIRE_HEIGHT_BY_LEVEL_TILES.length - 1);
    return Math.round(this.config.tileSize * CAMPFIRE_HEIGHT_BY_LEVEL_TILES[idx]);
  }

  _getCampfireTopY() {
    return this._campGroundY + CAMPFIRE_GROUND_OVERLAP_PX - (this._campfireDisplayHeightPx || this._getCampfireDisplayHeightPx());
  }

  _applyCampfireVisualLayout() {
    if (!this._campfireSprite) return;

    const source = this._campfireSprite.texture?.getSourceImage?.();
    const displayHeight = this._getCampfireDisplayHeightPx();
    const aspect = source?.width && source?.height ? source.width / source.height : 1.55;
    const displayWidth = Math.round(displayHeight * aspect);

    this._campfireDisplayWidthPx = displayWidth;
    this._campfireDisplayHeightPx = displayHeight;
    this._campfireSprite
      .setOrigin(0.5, 1)
      .setPosition(this._campX, this._campGroundY + CAMPFIRE_GROUND_OVERLAP_PX)
      .setDisplaySize(displayWidth, displayHeight);

    const topY = this._getCampfireTopY();
    this._interactLabel?.setPosition(this._campX, topY - 18);
    this._ePrompt?.setPosition(this._campX, topY - 3);
  }

  _drawCampfire() {
    const g = this._campfireGfx;
    const x = this._campX;
    const y = this._campGroundY + 1;

    g.clear();
    g.fillStyle(0xFF8A24, 0.12);
    g.fillEllipse(x, y - 4, this.config.tileSize * 1.35, 10);
  }

  _sparkEmber() {
    const flameCenterY = this._campGroundY - (this._campfireDisplayHeightPx || this._getCampfireDisplayHeightPx()) * 0.58;
    const x = this._campX + (Math.random() - 0.5) * (this._campfireDisplayWidthPx || this.config.tileSize) * 0.42;
    const y = flameCenterY - Math.random() * 8;
    const radius = 1 + Math.random() * 2;

    const ember = this.scene.add.circle(x, y, radius, 0xFFAA44, 0.8);
    ember.setDepth(6);
    this.scene.tweens.add({
      targets: ember,
      y: y - 15 - Math.random() * 10,
      x: x + (Math.random() - 0.5) * 10,
      alpha: 0,
      duration: 600 + Math.random() * 400,
      onComplete: () => ember.destroy(),
    });
  }

  _openBuffSelection(options = {}) {
    if (this._isSelecting) return;
    this._isSelecting = true;
    if (options.preserveSelection) {
      this._selectedIndex = Phaser.Math.Clamp(this._selectedIndex, 0, this._buffs.length - 1);
    } else {
      this._selectedIndex = 0;
    }
    this._justOpenedFrame = !options.preserveSelection;

    // Stop player movement (like ShopOverlay does)
    if (this.scene.setShopOpen) {
      this.scene.setShopOpen(true);
    }

    const cx = this.scene.cameras.main.width / 2;
    const cy = this.scene.cameras.main.height / 2;
    const W = 450;
    const H = 380;
    const DEPTH = 2600;

    // Dark overlay — make interactive to capture clicks and prevent them
    // from passing through to game world
    this._selectionOverlay = this.scene.add.rectangle(cx, cy, 1280, 720, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(DEPTH).setInteractive();
    this._selectionObjects.push(this._selectionOverlay);

    // Panel (main menu theme)
    const panelG = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    panelG.fillStyle(COL.bg, 1);
    panelG.fillRoundedRect(cx - W / 2, cy - H / 2, W, H, 8);
    panelG.lineStyle(2, COL.accent, 0.8);
    panelG.strokeRoundedRect(cx - W / 2, cy - H / 2, W, H, 8);
    this._selectionObjects.push(panelG);

    // Title
    const title = this.scene.add.text(cx, cy - H / 2 + 22, '🔥  Campfire Buffs', {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: COL.cssAccent,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this._selectionObjects.push(title);

    const closeBtn = createButton(this.scene, {
      x: cx + W / 2 - 58,
      y: cy - H / 2 + 24,
      width: 92,
      height: 30,
      label: 'CLOSE',
      hint: 'ESC',
      accent: UI_COLORS.borderBad,
      labelColor: UI_COLORS.danger,
      depth: DEPTH + 3,
      fontSize: '10px',
      onClick: () => this._closeBuffSelection(),
    });
    this._selectionObjects.push(closeBtn.root);

    // Subtitle + Tier info
    const tier = this._getTierConfig();
    const subtitle = this.scene.add.text(cx, cy - H / 2 + 46,
      `Choose a buff  •  ${tier.label} (${Math.floor(tier.durationMs / 1000)}s duration)`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: COL.hint,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this._selectionObjects.push(subtitle);

    // Divider
    const divY = cy - H / 2 + 60;
    const divG = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    divG.lineStyle(1, COL.borderDim, 0.6);
    divG.lineBetween(cx - W / 2 + 15, divY, cx + W / 2 - 15, divY);
    this._selectionObjects.push(divG);

    // Active buff indicator
    if (this._activeBuff && this._activeBuff.remainingMs > 0) {
      const remaining = Math.ceil(this._activeBuff.remainingMs / 1000);
      const activeText = this.scene.add.text(cx, divY + 12,
        `Active: ${this._activeBuff.name} (${remaining}s remaining)`, {
        fontFamily: 'Consolas, monospace',
        fontSize: '10px',
        color: COL.cssSuccess,
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
      this._selectionObjects.push(activeText);
    }

    // Buff options
    const buffValues = this._getBuffValues();
    const startY = cy - H / 2 + 82;
    this._buffs.forEach((buff, i) => {
      const y = startY + i * 60;
      const isSelected = i === this._selectedIndex;
      const isActive = this._activeBuff?.remainingMs > 0 && this._activeBuff.type === buff.type;

      // Build tier-scaled description
      let descParts = [];
      if (buff.miningSpeedBonus) descParts.push(`+${Math.round(buffValues.miningSpeedBonus * 100)}% Mining Speed`);
      if (buff.xpBonus) descParts.push(`+${Math.round(buffValues.xpBonus * 100)}% XP Gain`);
      if (buff.critBonus) descParts.push(`+${Math.round(buffValues.critBonus * 100)}% Crit Chance`);
      const scaledDesc = descParts.join(', ') + ` (${Math.floor(buffValues.durationMs / 1000)}s)`;

      // Card background — make interactive for clicks
      const bgColor = isSelected ? COL.cardHover : isActive ? COL.good : COL.cardBase;
      const bg = this.scene.add.rectangle(cx, y + 22, W - 24, 50, bgColor, isSelected || isActive ? 1 : 0.7)
        .setScrollFactor(0).setDepth(DEPTH + 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this._confirmBuffSelection(i);
        })
        .on('pointerover', () => {
          if (this._selectedIndex === i) return;
          this.scene.soundSystem?.playUiSelect?.();
          this._selectedIndex = i;
          this._rebuffSelection();
        });
      if (isSelected) {
        bg.setStrokeStyle(2, COL.accent, 1);
      } else if (isActive) {
        bg.setStrokeStyle(2, COL.success, 0.85);
      }
      this._selectionObjects.push(bg);

      // Accent bar (left side of card)
      const accentBar = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
      accentBar.fillStyle(buff.miningSpeedBonus ? 0xFF6633 : buff.xpBonus ? 0x66AAFF : 0xDD66FF, 1);
      accentBar.fillRect(cx - W / 2 + 8, y + 6, 4, 32);
      this._selectionObjects.push(accentBar);

      // Buff name
      const nameText = this.scene.add.text(cx - W / 2 + 22, y + 5, buff.name, {
        fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: buff.color,
        stroke: '#000000',
        strokeThickness: 2,
      }).setScrollFactor(0).setDepth(DEPTH + 2);
      this._selectionObjects.push(nameText);

      // Buff description (scaled)
      const descText = this.scene.add.text(cx - W / 2 + 22, y + 24, scaledDesc, {
        fontFamily: 'Consolas, monospace',
        fontSize: '10px',
        color: COL.body,
        stroke: '#000000',
        strokeThickness: 1,
      }).setScrollFactor(0).setDepth(DEPTH + 2);
      this._selectionObjects.push(descText);

      if (isActive) {
        const activeBadge = this.scene.add.text(cx + W / 2 - 56, y + 14, 'ACTIVE', {
          fontFamily: 'Consolas, monospace',
          fontSize: '10px',
          color: COL.cssSuccess,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
        this._selectionObjects.push(activeBadge);
      }

      // Selector arrow
      if (isSelected) {
        const arrow = this.scene.add.text(cx + W / 2 - 20, y + 14, '►', {
          fontFamily: 'Consolas, monospace',
          fontSize: '18px',
          color: COL.cssAccent,
          stroke: '#000000',
          strokeThickness: 2,
        }).setScrollFactor(0).setDepth(DEPTH + 2);
        this._selectionObjects.push(arrow);
      }
    });

    // ── Upgrade section ──────────────────────────────────────────────────
    const upgradeDivY = cy - H / 2 + 248;
    const upgG = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    upgG.lineStyle(1, COL.borderDim, 0.6);
    upgG.lineBetween(cx - W / 2 + 15, upgradeDivY, cx + W / 2 - 15, upgradeDivY);
    this._selectionObjects.push(upgG);

    if (this._campfireLevel < 10) {
      const nextTier = CAMPFIRE_TIERS[this._campfireLevel]; // index = current level (1-based → 0-based)
      const money = this.scene.upgradeSystem ? this.scene.upgradeSystem.getMoney() : 0;
      const canAfford = money >= nextTier.cost;

      const upgY = upgradeDivY + 18;
      const upgLabel = this.scene.add.text(cx - 100, upgY,
        `Upgrade: ${nextTier.label} (${nextTier.cost} gold)`, {
        fontFamily: 'Consolas, monospace',
        fontSize: '11px',
        color: COL.body,
        stroke: '#000000',
        strokeThickness: 2,
      }).setScrollFactor(0).setDepth(DEPTH + 2);
      this._selectionObjects.push(upgLabel);

      const upgBtnColor = canAfford ? COL.good : COL.poor;
      const upgBtn = this.scene.add.rectangle(cx + 100, upgY, 70, 20, upgBtnColor, 0.9)
        .setScrollFactor(0).setDepth(DEPTH + 2)
        .setStrokeStyle(1, canAfford ? 0x4a8a4a : 0x5a3a3a)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          const result = this.upgradeCampfire();
          if (this.scene.hudSystem) {
            this.scene.hudSystem.flashStatus(result.message, result.success ? COL.cssAccent : '#ff4444', 2000);
          }
          // Re-open with new tier
          if (result.success) {
            this._rebuffSelection();
          }
        })
        .on('pointerover', () => {
          try { upgBtn.setFillStyle(canAfford ? 0x3a6a3a : 0x6a3a3a, 0.9); } catch (e) {}
        })
        .on('pointerout', () => {
          try { upgBtn.setFillStyle(upgBtnColor, 0.9); } catch (e) {}
        });
      this._selectionObjects.push(upgBtn);

      const upgBtnLabel = this.scene.add.text(cx + 100, upgY, canAfford ? 'BUY' : 'LOCKED', {
        fontFamily: 'Consolas, monospace',
        fontSize: '10px',
        color: canAfford ? '#4ecb71' : '#aa4444',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 1,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3);
      this._selectionObjects.push(upgBtnLabel);
    } else {
      const maxText = this.scene.add.text(cx, upgradeDivY + 18, '✦  MAX TIER  ✦', {
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        color: COL.gold,
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
      this._selectionObjects.push(maxText);
    }

    // Controls hint
    const hintText = this.scene.add.text(cx, cy + H / 2 - 14,
      `W/S Navigate  •  ${USER_SETTINGS.getKeyLabel("interact")}/Enter Select  •  ESC Cancel  •  Click Buff`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: COL.dim,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this._selectionObjects.push(hintText);
  }

  _handleSelectionInput(justW, justS, justE, justEnter) {
    // Skip on the same frame we just opened (prevents double-fire)
    if (this._justOpenedFrame) {
      this._justOpenedFrame = false;
      return;
    }

    if (justW) {
      const nextIndex = Math.max(0, this._selectedIndex - 1);
      if (nextIndex !== this._selectedIndex) {
        this.scene.soundSystem?.playUiSelect?.();
        this._selectedIndex = nextIndex;
        this._rebuffSelection();
      }
      return;
    }
    if (justS) {
      const nextIndex = Math.min(this._buffs.length - 1, this._selectedIndex + 1);
      if (nextIndex !== this._selectedIndex) {
        this.scene.soundSystem?.playUiSelect?.();
        this._selectedIndex = nextIndex;
        this._rebuffSelection();
      }
      return;
    }

    // E or Enter to confirm
    if (justE || justEnter) {
      this._confirmBuffSelection(this._selectedIndex);
    }
  }

  _rebuffSelection() {
    const selectedIndex = this._selectedIndex;
    this._closeBuffSelection();
    this._selectedIndex = selectedIndex;
    this._openBuffSelection({ preserveSelection: true });
  }

  _confirmBuffSelection(index) {
    const buffDef = this._buffs[index];
    if (!buffDef) return;

    this._selectedIndex = index;
    this.scene.soundSystem?.playUiConfirm?.();
    this._applyBuff(buffDef);
    this._closeBuffSelection();
  }

  _applyBuff(buffDef) {
    const tier = this._getTierConfig();

    this._activeBuff = {
      type: buffDef.type,
      name: buffDef.name,
      color: buffDef.color,
      durationMs: tier.durationMs,
      remainingMs: tier.durationMs,
    };

    // Show persistent HUD timer
    if (this.scene.hudSystem) {
      const durationSec = Math.floor(tier.durationMs / 1000);
      this.scene.hudSystem.flashStatus(`🔥 ${buffDef.name} Active! (${durationSec}s)`, buffDef.color, 2000);
    }
  }

  _updateBuffTimer(delta) {
    if (!this._activeBuff || this._activeBuff.remainingMs <= 0) {
      if (this._activeBuff && this._activeBuff.remainingMs <= 0) {
        this._activeBuff = null;
        if (this.scene.hudSystem) {
          this.scene.hudSystem.flashStatus('🔥 Campfire buff expired', COL.cssAccent, 1500);
        }
      }
      return;
    }

    const frameDelta = delta || this.scene?.game?.loop?.delta || 16;
    this._activeBuff.remainingMs -= frameDelta;
    if (this._activeBuff.remainingMs <= 0) {
      this._activeBuff = null;
      if (this.scene.hudSystem) {
        this.scene.hudSystem.flashStatus('🔥 Campfire buff expired', COL.cssAccent, 1500);
      }
    }
  }

  _closeBuffSelection() {
    if (!this._isSelecting) return;
    this._isSelecting = false;
    this._justOpenedFrame = false;

    // Re-enable player movement
    if (this.scene.setShopOpen) {
      this.scene.setShopOpen(false);
    }

    this._selectionObjects.forEach(obj => {
      if (obj && obj.destroy) obj.destroy();
    });
    this._selectionObjects = [];
    this._selectionOverlay = null;
  }

  destroy() {
    if (this._fireAnimTimer) this._fireAnimTimer.remove();
    this._closeBuffSelection();
    this._campfireGfx?.destroy();
    this._campfireSprite?.destroy();
    this._ePrompt?.destroy();
    this._interactLabel?.destroy();
    this._flameEmbers.forEach(e => e.destroy());
  }
}
