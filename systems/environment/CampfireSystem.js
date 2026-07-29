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
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  CAMPFIRE_CONFIG,
  CAMPFIRE_TIERS,
  sanitizeCampfireData,
} from "../../values/campfireConfig.js";
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

export class CampfireSystem {
  constructor(scene, config, worldModel, ui, saveSlot = 1) {
    this.scene = scene;
    this.config = config;
    this.worldModel = worldModel;
    this.ui = ui;
    this.saveSlot = Number.isInteger(saveSlot) && saveSlot > 0 ? saveSlot : 1;

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
    const campTileX = CAMPFIRE_CONFIG.surfaceTileX;
    const campTileY = this.config.topAirRows - 1;
    this._campX = campTileX * ts + ts / 2;
    this._campY = campTileY * ts + ts / 2;
    this._campGroundY = (campTileY + 1) * ts;

    // Register own keyboard keys so selection input stays live while gameplay is paused.
    this.refreshKeybinds();

    // Campfire graphics
    this._campfireGfx = this.scene.add.graphics();
    this._campfireGfx.setDepth(4);
    this._drawCampfire();

    // Campfire sprite: bottom-center anchored so the brazier feet sit on the tile surface.
    this._campfireSprite = this.scene.add.image(this._campX, this._campGroundY + CAMPFIRE_CONFIG.groundOverlapPx, this._getCampfireSpriteKey());
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
    [this._keyInteract, this._keyW, this._keyS, this._keyEsc, this._keyEnter]
      .forEach(key => key?.destroy?.());
    const actions = CAMPFIRE_CONFIG.inputActions;
    const addBoundKey = actionId => this.scene.input.keyboard.addKey(keyToPhaserKey(USER_SETTINGS.getKey(actionId)));
    this._keyInteract = addBoundKey(actions.interact);
    this._keyW = addBoundKey(actions.previousBlessing);
    this._keyS = addBoundKey(actions.nextBlessing);
    this._keyEsc = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this._keyEnter = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this._prevW = false;
    this._prevS = false;
    this._prevEsc = false;
    this._prevInteract = false;
    this._prevEnter = false;
    this._ePrompt?.setText(`Press ${USER_SETTINGS.getKeyLabel(actions.interact)}`);
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

  getSaveData() {
    return sanitizeCampfireData({ level: this._campfireLevel });
  }

  loadSaveData(data) {
    if (!data || typeof data !== "object") return this.getSaveData();
    const normalized = sanitizeCampfireData(data);
    this._campfireLevel = normalized.level;
    this._saveCampfireLevel();
    this._updateCampfireSprite();
    return this.getSaveData();
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
    this._syncMoneyUi();
    this.scene.queueDugTilesSave?.();
    this.scene.hudSystem?.flashStatus?.(`🔥 Campfire upgraded to ${nextTier.label}!`, COL.cssSuccess, 1800);

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
      const storageKey = `jkd-campfire-level-slot-${this.saveSlot}`;
      let saved = localStorage.getItem(storageKey);
      if (!saved && this.saveSlot === 1) {
        saved = localStorage.getItem('jkd-campfire-level');
        if (saved) localStorage.setItem(storageKey, saved);
      }
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
      localStorage.setItem(`jkd-campfire-level-slot-${this.saveSlot}`, String(this._campfireLevel));
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

  _syncMoneyUi() {
    const money = this.scene.upgradeSystem?.getMoney?.() ?? 0;
    this.scene.uiResourceBar?.setMoney?.(money);
    this.scene.uiInventoryPopup?.setMoney?.(money);
  }

  _getCampfireSpriteKey() {
    const idx = Phaser.Math.Clamp(this._campfireLevel - 1, 0, CAMPFIRE_CONFIG.spriteKeys.length - 1);
    return CAMPFIRE_CONFIG.spriteKeys[idx];
  }

  _getCampfireDisplayHeightPx() {
    const idx = Phaser.Math.Clamp(this._campfireLevel - 1, 0, CAMPFIRE_CONFIG.heightByLevelTiles.length - 1);
    return Math.round(this.config.tileSize * CAMPFIRE_CONFIG.heightByLevelTiles[idx]);
  }

  _getCampfireTopY() {
    return this._campGroundY + CAMPFIRE_CONFIG.groundOverlapPx - (this._campfireDisplayHeightPx || this._getCampfireDisplayHeightPx());
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
      .setPosition(this._campX, this._campGroundY + CAMPFIRE_CONFIG.groundOverlapPx)
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
    this._justOpenedFrame = true;
    if (!options.preserveSelection) this._selectedIndex = 0;
    this.scene.setShopOpen?.(true);

    const tier = this._getTierConfig();
    const values = this._getBuffValues();
    const durationSeconds = Math.round(values.durationMs / 1000);
    const actions = CAMPFIRE_CONFIG.inputActions;
    const nextTier = CAMPFIRE_TIERS[this._campfireLevel];
    const upgradeCost = nextTier?.cost ?? 0;
    const currentMoney = this.scene.upgradeSystem?.getMoney?.() ?? 0;
    const canUpgrade = currentMoney >= upgradeCost;
    const shell = this.ui.createModalShell(this.scene, {
      title: "CAMPFIRE RITUAL",
      subtitle: "Tier " + this._campfireLevel + "  |  " + durationSeconds + " seconds  |  "
        + USER_SETTINGS.getKeyLabel(actions.previousBlessing) + "/" + USER_SETTINGS.getKeyLabel(actions.nextBlessing)
        + " select  |  " + USER_SETTINGS.getKeyLabel(actions.interact) + " activate",
      icon: "torch",
      maxWidth: 860,
      maxHeight: 600,
      depth: 3200,
      onClose: () => this._closeBuffSelection(),
    });
    const content = shell.content;
    const rect = shell.getContentRect();
    const gap = 16;
    const leftWidth = Math.min(330, rect.width * 0.41);
    const rightX = rect.left + leftWidth + gap;
    const rightWidth = rect.width - leftWidth - gap;
    const selected = this._buffs[this._selectedIndex] || this._buffs[0];
    const iconKeys = ["torch", "journal", "focus"];

    const leftPanel = this.scene.add.rectangle(
      rect.left + leftWidth / 2,
      rect.top + rect.height / 2,
      leftWidth,
      rect.height,
      UI_COLORS.bg,
      0.82
    ).setStrokeStyle(1, UI_COLORS.borderDim);
    const rightPanel = this.scene.add.rectangle(
      rightX + rightWidth / 2,
      rect.top + rect.height / 2,
      rightWidth,
      rect.height,
      UI_COLORS.cardBase,
      0.98
    ).setStrokeStyle(2, UI_COLORS.borderSel);
    content.add([leftPanel, rightPanel]);

    const sectionTitle = this.scene.add.text(rect.left + 16, rect.top + 14, "AVAILABLE BLESSINGS", {
      fontFamily: UI_FONTS.display,
      fontSize: "15px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    content.add(sectionTitle);

    this._buffs.forEach((buff, index) => {
      const isSelected = index === this._selectedIndex;
      const rowY = rect.top + 48 + index * 76;
      const row = this.scene.add.rectangle(
        rect.left + leftWidth / 2,
        rowY + 31,
        leftWidth - 18,
        64,
        isSelected ? UI_COLORS.cardSel : UI_COLORS.cardBase,
        0.98
      ).setStrokeStyle(isSelected ? 2 : 1, isSelected ? UI_COLORS.borderSel : UI_COLORS.borderDim)
        .setInteractive({ useHandCursor: true });
      row.on("pointerover", () => {
        if (!isSelected) row.setStrokeStyle(1, UI_COLORS.borderHov);
      });
      row.on("pointerout", () => {
        if (!isSelected) row.setStrokeStyle(1, UI_COLORS.borderDim);
      });
      row.on("pointerdown", () => {
        if (index === this._selectedIndex) return;
        this._selectedIndex = index;
        this.scene.soundSystem?.playUiSelect?.();
        this._rebuffSelection();
      });
      content.add(row);
      this.ui.createIconBadge(this.scene, iconKeys[index], {
        x: rect.left + 42,
        y: rowY + 31,
        size: 46,
        iconSize: 38,
        selected: isSelected,
        parent: content,
      });
      const name = this.scene.add.text(rect.left + 74, rowY + 18, buff.name, {
        fontFamily: UI_FONTS.display,
        fontSize: "16px",
        fontStyle: "bold",
        color: isSelected ? UI_COLORS.title : UI_COLORS.body,
      });
      const summary = index === 0
        ? "+" + Math.round(values.miningSpeedBonus * 100) + "% mining speed"
        : index === 1
          ? "+" + Math.round(values.xpBonus * 100) + "% XP gain"
          : "+" + Math.round(values.critBonus * 100) + "% critical chance";
      const effect = this.scene.add.text(rect.left + 74, rowY + 42, summary, {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: isSelected ? UI_COLORS.gold : UI_COLORS.dim,
      });
      content.add([name, effect]);
    });

    this.ui.createIconBadge(this.scene, iconKeys[this._selectedIndex], {
      x: rightX + 64,
      y: rect.top + 68,
      size: 82,
      iconSize: 68,
      selected: true,
      parent: content,
    });
    const detailTitle = this.scene.add.text(rightX + 120, rect.top + 31, selected.name.toUpperCase(), {
      fontFamily: UI_FONTS.display,
      fontSize: "24px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    const detailSub = this.scene.add.text(rightX + 120, rect.top + 67, selected.desc, {
      fontFamily: UI_FONTS.mono,
      fontSize: "12px",
      color: UI_COLORS.gold,
    });
    const detailBody = this.scene.add.text(rightX + 22, rect.top + 132,
      "A focused campfire blessing. The effect starts immediately and remains visible in the HUD until it expires.", {
        fontFamily: UI_FONTS.body,
        fontSize: "14px",
        color: UI_COLORS.body,
        lineSpacing: 3,
        wordWrap: { width: rightWidth - 44, useAdvancedWrap: true },
      }
    );
    content.add([detailTitle, detailSub, detailBody]);

    const statTop = rect.top + 212;
    const stat = this.scene.add.rectangle(
      rightX + rightWidth / 2,
      statTop + 45,
      rightWidth - 36,
      90,
      UI_COLORS.bg,
      0.95
    ).setStrokeStyle(1, UI_COLORS.borderDim);
    content.add(stat);
    const effectValue = this.scene.add.text(rightX + 34, statTop + 21,
      selected.type === "warmth"
        ? "+" + Math.round(values.miningSpeedBonus * 100) + "% MINING SPEED"
        : selected.type === "inspiration"
          ? "+" + Math.round(values.xpBonus * 100) + "% XP GAIN"
          : "+" + Math.round(values.critBonus * 100) + "% CRITICAL CHANCE", {
        fontFamily: UI_FONTS.display,
        fontSize: "18px",
        fontStyle: "bold",
        color: UI_COLORS.gold,
      }
    );
    const duration = this.scene.add.text(rightX + 34, statTop + 57,
      "DURATION  " + durationSeconds + " SECONDS", {
        fontFamily: UI_FONTS.mono,
        fontSize: "12px",
        color: UI_COLORS.body,
      }
    );
    content.add([effectValue, duration]);

    if (nextTier) {
      this.ui.createButton(this.scene, {
        x: rightX + rightWidth / 2,
        y: rect.bottom - 88,
        width: rightWidth - 36,
        height: 40,
        label: "UPGRADE TO TIER " + (this._campfireLevel + 1) + (upgradeCost > 0 ? "  -  " + upgradeCost.toLocaleString() + " M" : ""),
        icon: "upgrade",
        accent: UI_COLORS.borderDim,
        parent: content,
        fontSize: "11px",
        enabled: canUpgrade,
        disabledReason: "NEED " + upgradeCost.toLocaleString() + " GOLD",
        onClick: () => {
          const result = this.upgradeCampfire();
          if (result.success) this._rebuffSelection();
        },
      });
    }

      this.ui.createButton(this.scene, {
      x: rightX + rightWidth / 2,
      y: rect.bottom - 34,
      width: rightWidth - 36,
      height: 48,
      label: "ACTIVATE " + selected.name.toUpperCase(),
      hint: USER_SETTINGS.getKeyLabel("interact"),
      icon: iconKeys[this._selectedIndex],
      accent: UI_COLORS.borderSel,
      parent: content,
      fontSize: "13px",
      onClick: () => this._confirmBuffSelection(this._selectedIndex),
    });

    this._selectionOverlay = shell.backdrop;
    this._selectionObjects = [shell];
    shell.show();
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
  }

  _updateBuffTimer(delta) {
    if (!this._activeBuff || this._activeBuff.remainingMs <= 0) {
      if (this._activeBuff && this._activeBuff.remainingMs <= 0) {
        this._expireActiveBuff();
      }
      return;
    }

    const frameDelta = delta || this.scene?.game?.loop?.delta || 16;
    this._activeBuff.remainingMs -= frameDelta;
    if (this._activeBuff.remainingMs <= 0) {
      this._expireActiveBuff();
    }
  }

  _expireActiveBuff() {
    if (!this._activeBuff) return;
    this._activeBuff = null;
    this.scene.soundSystem?.playFirstAvailableSfx?.(
      ["sfx-ui-select", "tileHit-0", "footsteps-0"],
      0.25
    );
    this._pulseCampfire(0.4, 320);
  }

  _pulseCampfire(minAlpha, duration) {
    if (!this._campfireSprite || !this.scene.tweens) return;
    this.scene.tweens.killTweensOf(this._campfireSprite);
    this._campfireSprite.setAlpha(1);
    this.scene.tweens.add({
      targets: this._campfireSprite,
      alpha: minAlpha,
      duration,
      yoyo: true,
      ease: "Sine.InOut",
      onComplete: () => this._campfireSprite?.setAlpha?.(1),
    });
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


