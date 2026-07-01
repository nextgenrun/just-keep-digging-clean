import { UPGRADES } from "../../values/upgradeDefinitions.js";
import { UPGRADE_CATEGORIES } from "../../values/upgradeCategories.js";
import { getUpgradeCost } from "../../values/upgradeFormulas.js";
import { RESOURCE_PRICES_CONFIG } from "../../values/resourcePrices.js";
import { RESOURCE_SPAWN_CONFIG } from "../../values/resourceSpawn.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { createButton } from "../PhaserUiKit.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";

/**
 * Main Menu Theme Color Palette (matches MainMenuScene.js / PlaySceneUI.js esc menu)
 */
const COL = { ...UI_COLORS }; // Alias for backward compatibility during migration

export class ShopOverlay {
  constructor(scene, upgradeSystem, soundSystem) {
    this.scene = scene;
    this.upgradeSystem = upgradeSystem;
    this.soundSystem = soundSystem;
    this.currentMerchant = null;
    this.isVisible = false;  // CRITICAL: Initialize to false so shop doesn't block input on boot
    this._destroyed = false;
    this._isTransitioning = false;
    this._mmButtons = [];
    this.upgradesContainer = null;
    this.prevPageButton = null;
    this.nextPageButton = null;
    
    // FIX: Ensure backdrop is non-interactive to prevent input blocking during boot
    this.backdrop = null;
    this.container = null;

    // Grid-based navigation
    this.currentPage = 0;
    this.selectedRow = 0;
    this.selectedCol = 0;
    this.allUpgrades = []; // All upgrades across all pages
    this.itemsPerPage = 9; // 3 columns × 3 rows
    this.columns = 3;
    this.rows = 3;
    this.totalPages = 0;

    // Mode for Money Monster: 'buy' (upgrade grid), 'sell' (sell buttons), or 'top' (ESC button)
    this.moneyMonsterMode = 'buy';
    this.sellButtons = []; // Track sell button positions
    this.selectedSellButton = 0; // Index in sellButtons array

    // Top buttons (ESC, Sell All)
    this.topButtonSelected = null; // 'esc' or 'sellAll' or null (in grid)

    // Grid layout
    this.gridColumnWidth = 260; // Width of each column (780 / 3)
    this.gridRowHeight = 147; // Height of each row (3 rows × 147 = 441px, same total as before)
    this.gridStartX = -390; // Left edge of grid
    this.gridStartY = -185; // Top edge of grid

    // Keyboard input
    this.keyW = null;
    this.keyS = null;
    this.keyA = null;
    this.keyD = null;
    this.keyQ = null;
    this.keyE = null;
    this.keyF = null;
    this.keyB = null;
    this.keySpace = null;
    this.keyEsc = null;
    this.keyLeft = null;
    this.keyRight = null;
    this.keyUp = null;
    this.keyDown = null;
    this.keyTab = null;

    this.createOverlay();
  }

  createOverlay() {
    const viewportWidth = this.scene.config.viewportWidth;
    const viewportHeight = this.scene.config.viewportHeight;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    // Background - explicitly non-interactive to prevent click capture
    this.backdrop = this.scene.add
      .rectangle(centerX, centerY, viewportWidth, viewportHeight, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);

    // Main container
    this.container = this.scene.add.container(centerX, centerY)
      .setScrollFactor(0)
      .setDepth(3001)
      .setVisible(false);

    // Shop background panel — main menu dark theme
    this.shopBg = this.scene.add.rectangle(0, 0, 800, 600, UI_COLORS.bg, 0.98)
      .setStrokeStyle(2, UI_COLORS.borderDim);

    // Title background bar
    this.titleBg = this.scene.add.rectangle(0, -270, 780, 46, UI_COLORS.cardBase, 0.9)
      .setStrokeStyle(1, UI_COLORS.borderDim);

    // Title text — gold accent like main menu
    this.titleText = this.scene.add.text(0, -270, "SHOP", {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
      color: '#c9a227',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Money display
    this.moneyText = this.scene.add.text(-300, -270, "Money: 0", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: UI_COLORS.gold,
    }).setOrigin(0.5);

    // Grid container
    this.upgradesContainer = this.scene.add.container(0, 0);

    // Selection highlight box — gold accent
    this.selectionBox = this.scene.add.rectangle(0, 0, 240, 140, UI_COLORS.borderDim, 0)
      .setStrokeStyle(2, '#c9a227', 1)
      .setVisible(false);

    // Pagination display
    this.paginationText = this.scene.add.text(0, 270, "Page 1 / 1", {
      fontFamily: "Consolas, monospace",
      fontSize: "14px",
      color: '#5a7a8a',
    }).setOrigin(0.5);

    this.prevPageButton = createButton(this.scene, {
      x: -250,
      y: 270,
      width: 112,
      height: 32,
      label: 'PREV',
      hint: 'Q',
      accent: UI_COLORS.borderHov,
      parent: this.container,
      fontSize: '12px',
      onClick: () => this.prevPage(),
    });
    this.nextPageButton = createButton(this.scene, {
      x: 250,
      y: 270,
      width: 112,
      height: 32,
      label: 'NEXT',
      hint: 'E',
      accent: UI_COLORS.borderHov,
      parent: this.container,
      fontSize: '12px',
      onClick: () => this.nextPage(),
    });

    // Help text — using main menu hint color
    this.helpText = this.scene.add.text(0, -210, this._buildHelpText(), {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color: '#4a5a6a',
    }).setOrigin(0.5);

    this.closeButton = createButton(this.scene, {
      x: 350,
      y: -270,
      width: 104,
      height: 36,
      label: "CLOSE",
      hint: this._closeHint(),
      accent: UI_COLORS.borderBad,
      labelColor: UI_COLORS.danger,
      fontSize: "12px",
      parent: this.container,
      onClick: () => this.hide(),
    });

    this.closeButton.setVisible(false);

    this.container.add([
      this.shopBg,
      this.titleBg,
      this.titleText,
      this.moneyText,
      this.upgradesContainer,
      this.selectionBox,
      this.paginationText,
      this.helpText
    ]);
    this.container.bringToTop?.(this.prevPageButton.root);
    this.container.bringToTop?.(this.nextPageButton.root);
    this.container.bringToTop?.(this.closeButton.root);

    // Setup keyboard input
    this.setupKeyboardInput();
  }

  _closeHint() {
    const pauseKey = USER_SETTINGS.getKeyLabel("pause");
    return pauseKey === "ESC" ? "ESC" : `${pauseKey}/ESC`;
  }

  _buildHelpText() {
    return `WASD / Arrows: Navigate  |  Enter / Space: Buy  |  Q/E or Buttons: Page  |  ${this._closeHint()}: Close  |  TAB: Sell`;
  }

  refreshKeybindHints() {
    this.helpText?.setText(this._buildHelpText());
    this.closeButton?.setHint?.(this._closeHint());
  }

  setupKeyboardInput() {
    // Navigation keys (use addKey for continuous checking in update)
    this.keyW = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyA = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyQ = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyE = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyLeft = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyUp = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyTab = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);

    // Action keys - register with addKey() to avoid intercepting game input
    this.keyF = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.keyB = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyEnter = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyEsc = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }


  update() {
    if (this._destroyed || !this.isVisible) return;

    // W/Up key - navigate up in grid or to top buttons
    if (Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.keyUp)) {
      this.navigateUp();
    }

    // S/Down key - navigate down in grid
    if (Phaser.Input.Keyboard.JustDown(this.keyS) || Phaser.Input.Keyboard.JustDown(this.keyDown)) {
      this.navigateDown();
    }

    // A/Left key - navigate left in grid
    if (Phaser.Input.Keyboard.JustDown(this.keyA) || Phaser.Input.Keyboard.JustDown(this.keyLeft)) {
      this.navigateLeft();
    }

    // D/Right key - navigate right in grid
    if (Phaser.Input.Keyboard.JustDown(this.keyD) || Phaser.Input.Keyboard.JustDown(this.keyRight)) {
      this.navigateRight();
    }

    // Q key - previous page
    if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
      this.prevPage();
    }

    // E key - next page
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.nextPage();
    }

    // Tab key - toggle between buy/sell modes (only for Money Monster)
    if (Phaser.Input.Keyboard.JustDown(this.keyTab)) {
      if (this.currentMerchant === 'moneyMonster') {
        this.toggleMoneyMonsterMode();
      }
    }

    // F, B, Space, Enter keys - purchase selected upgrade
    if (Phaser.Input.Keyboard.JustDown(this.keyF) ||
        Phaser.Input.Keyboard.JustDown(this.keyB) ||
        Phaser.Input.Keyboard.JustDown(this.keySpace) ||
        Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
      this.purchaseSelected();
    }

    // ESC key - close shop
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      if (this.soundSystem) this.soundSystem.playUiConfirm();
      this.hide();
    }
  }

  toggleMoneyMonsterMode() {
    if (this.moneyMonsterMode === 'buy') {
      // Switch to sell mode
      this.moneyMonsterMode = 'sell';
      this.selectedSellButton = 0;
      this.selectionBox.setVisible(false); // Hide grid selection box
      // Show selection on first sell button
      if (this.sellButtons.length > 0) {
        this.updateSellSelection();
      }
    } else {
      // Switch to buy mode
      this.moneyMonsterMode = 'buy';
      this.topButtonSelected = null;
      this.updateSelection(); // Show grid selection box
    }

    if (this.soundSystem) this.soundSystem.playUiSelect();
  }

  navigateUp() {
    // Check if in top button mode and pressing W
    if (this.topButtonSelected !== null && (this.topButtonSelected === 'esc' || this.topButtonSelected === 'sellAll')) {
      // Move back to grid
      this.topButtonSelected = null;
      this.moneyMonsterMode = 'buy';
      if (this.soundSystem) this.soundSystem.playUiSelect();
      this.updateSelection();
      return;
    }

    // If in buy mode and at top of grid, go to top buttons
    if (this.moneyMonsterMode === 'buy' && this.currentMerchant === 'moneyMonster') {
      if (this.selectedRow === 0) {
        this.topButtonSelected = 'esc';
        this.selectionBox.setVisible(false);
        if (this.soundSystem) this.soundSystem.playUiSelect();
        return;
      }

      if (this.selectedRow > 0) {
        this.selectedRow--;
        if (this.soundSystem) this.soundSystem.playUiSelect();
        this.updateSelection();
      }
      return;
    }

    // Normal grid navigation for non-Money Monster or when not at top
    if (this.moneyMonsterMode === 'buy') {
      if (this.selectedRow > 0) {
        this.selectedRow--;
        if (this.soundSystem) this.soundSystem.playUiSelect();
        this.updateSelection();
      }
    } else if (this.moneyMonsterMode === 'sell') {
      if (this.selectedSellButton > 0) {
        this.selectedSellButton--;
        if (this.soundSystem) this.soundSystem.playUiSelect();
        this.updateSellSelection();
      } else {
        // Go back to buy mode
        this.toggleMoneyMonsterMode();
      }
    }
  }

  navigateDown() {
    // If in top button mode
    if (this.topButtonSelected !== null) {
      if (this.currentMerchant === 'moneyMonster' && this.topButtonSelected === 'esc') {
        // Could add sellAll button here in future
      }
      // Move to grid
      this.topButtonSelected = null;
      this.moneyMonsterMode = 'buy';
      this.selectedRow = 0;
      this.selectedCol = 0;
      if (this.soundSystem) this.soundSystem.playUiSelect();
      this.updateSelection();
      return;
    }

    // Normal grid navigation
    if (this.moneyMonsterMode === 'buy') {
      const itemsOnCurrentPage = this.getItemsOnCurrentPage();
      const maxRow = Math.min(this.rows - 1, Math.ceil(itemsOnCurrentPage.length / this.columns) - 1);

      if (this.selectedRow < maxRow) {
        const targetIndex = (this.selectedRow + 1) * this.columns + this.selectedCol;
        if (targetIndex < itemsOnCurrentPage.length) {
          this.selectedRow++;
          if (this.soundSystem) this.soundSystem.playUiSelect();
          this.updateSelection();
        }
      }
    } else if (this.moneyMonsterMode === 'sell') {
      if (this.selectedSellButton < this.sellButtons.length - 1) {
        this.selectedSellButton++;
        if (this.soundSystem) this.soundSystem.playUiSelect();
        this.updateSellSelection();
      }
    }
  }

  navigateLeft() {
    if (this.topButtonSelected !== null) return;

    if (this.moneyMonsterMode === 'buy') {
      if (this.selectedCol > 0) {
        this.selectedCol--;
        if (this.soundSystem) this.soundSystem.playUiSelect();
        this.updateSelection();
      }
    }
  }

  navigateRight() {
    if (this.topButtonSelected !== null) return;

    if (this.moneyMonsterMode === 'buy') {
      const itemsOnCurrentPage = this.getItemsOnCurrentPage();
      const itemsInCurrentRow = itemsOnCurrentPage.slice(
        this.selectedRow * this.columns,
        (this.selectedRow + 1) * this.columns
      );

      if (this.selectedCol < this.columns - 1 && this.selectedCol < itemsInCurrentRow.length - 1) {
        this.selectedCol++;
        if (this.soundSystem) this.soundSystem.playUiSelect();
        this.updateSelection();
      }
    }
  }

  nextPage() {
    if (this._destroyed || !this.isVisible || !this.upgradesContainer) return;
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.selectedRow = 0;
      this.selectedCol = 0;
      if (this.soundSystem) this.soundSystem.playUiSelect();
      this.renderCurrentPage();
      this.updatePagination();
    }
  }

  prevPage() {
    if (this._destroyed || !this.isVisible || !this.upgradesContainer) return;
    if (this.currentPage > 0) {
      this.currentPage--;
      this.selectedRow = 0;
      this.selectedCol = 0;
      if (this.soundSystem) this.soundSystem.playUiSelect();
      this.renderCurrentPage();
      this.updatePagination();
    }
  }

  purchaseSelected() {
    if (this._destroyed || !this.isVisible || !this.upgradeSystem) return;

    // Handle top button selection
    if (this.topButtonSelected === 'esc') {
      if (this.soundSystem) this.soundSystem.playUiConfirm();
      this.hide();
      return;
    }

    // Handle sell mode
    if (this.moneyMonsterMode === 'sell') {
      if (this.sellButtons[this.selectedSellButton]) {
        const btnInfo = this.sellButtons[this.selectedSellButton];
        this.sellResource(btnInfo.resourceKey, 1, btnInfo.price);
      }
      return;
    }

    const itemsOnCurrentPage = this.getItemsOnCurrentPage();
    const selectedIndex = this.selectedRow * this.columns + this.selectedCol;
    const selected = itemsOnCurrentPage[selectedIndex];

    if (selected && selected.id) {
      // Check if this is an owned one-time purchase upgrade (like Sell All Button)
      const currentOwnedLevel = this.upgradeSystem.getUpgradeLevel(selected.id);
      const isActuallyOwned = selected.oneTimePurchase && currentOwnedLevel > 0;

      // For owned one-time purchase upgrades like Sell All, trigger special action
      if (isActuallyOwned) {
        if (selected.id === 'sellAllButton') {
          const currentResources = this.scene?.digSystem?.getResourceTotals?.() || null;
          const canActuallySellAll = currentResources && Object.values(currentResources).some(v => v > 0);
          if (canActuallySellAll) {
            this.sellAllResources();
          } else {
            this.scene?.hudSystem?.flashStatus?.("No resources to sell!", "#ff4444", 1500);
          }
          return;
        }
      }

      this.purchaseUpgrade(selected.id);
    }
  }

  getItemsOnCurrentPage() {
    if (!Array.isArray(this.allUpgrades)) return [];
    const start = this.currentPage * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.allUpgrades.slice(start, end);
  }

  updateSelection() {
    if (this._destroyed || !this.selectionBox) return;

    if (this.moneyMonsterMode !== 'buy') {
      this.selectionBox.setVisible(false);
      return;
    }

    if (this.topButtonSelected === 'esc') {
      // Highlight ESC button
      this.selectionBox.setPosition(350, -270);
      this.selectionBox.setSize(90, 36);
      this.selectionBox.setVisible(true);
      return;
    }

    const itemsOnCurrentPage = this.getItemsOnCurrentPage();
    const selectedIndex = this.selectedRow * this.columns + this.selectedCol;

    if (selectedIndex >= itemsOnCurrentPage.length) {
      this.selectionBox.setVisible(false);
      return;
    }

    const selected = itemsOnCurrentPage[selectedIndex];
    if (selected) {
      this.selectionBox.setPosition(selected.x, selected.y);
      this.selectionBox.setSize(240, 100);
      this.selectionBox.setVisible(true);
      this.scene.tweens.killTweensOf(this.selectionBox);
      this.selectionBox.setScale(1.06);
      this.scene.tweens.add({ targets: this.selectionBox, scaleX: 1.0, scaleY: 1.0, duration: 120, ease: 'Power2.out' });
    } else {
      this.selectionBox.setVisible(false);
    }
  }

  updateSellSelection() {
    if (this._destroyed || !this.selectionBox) return;
    if (this.sellButtons[this.selectedSellButton]) {
      const btnInfo = this.sellButtons[this.selectedSellButton];
      this.selectionBox.setPosition(btnInfo.x ?? 300, btnInfo.y);
      this.selectionBox.setSize(94, 28);
      this.selectionBox.setVisible(true);
    }
  }

  updatePagination() {
    if (this._destroyed || !this.paginationText) return;
    this.paginationText.setText(`Page ${this.currentPage + 1} / ${this.totalPages}`);
    this.prevPageButton?.setEnabled(this.currentPage > 0);
    this.nextPageButton?.setEnabled(this.currentPage < this.totalPages - 1);
  }

  show(merchantId) {
    if (this._destroyed || !this.scene || !this.container || !this.backdrop || !this.upgradesContainer) return;
    this.scene.tweens.killTweensOf([this.backdrop, this.container]);
    this.scene.tweens.killTweensOf(this.upgradesContainer.getAll?.() || []);

    this._isTransitioning = true;
    this.currentMerchant = merchantId;
    this.isVisible = true;
    this.refreshKeybindHints();

    this.container.setVisible(true);
    this.closeButton?.setVisible(true);
    this.helpText.setVisible(true);
    this.paginationText.setVisible(true);

    // Disable player controls when shop is open
    if (this.scene.setShopOpen) {
      this.scene.setShopOpen(true);
    }

    // Reset page and selection
    this.currentPage = 0;
    this.selectedRow = 0;
    this.selectedCol = 0;
    this.moneyMonsterMode = 'buy';
    this.sellButtons = [];
    this.selectedSellButton = 0;
    this.topButtonSelected = null;

    // Expand panel for Money Monster to fit sell section
    if (merchantId === 'moneyMonster') {
      this.shopBg.setSize(800, 700);
      this.paginationText.setY(160);
      this.prevPageButton?.root.setY(160);
      this.nextPageButton?.root.setY(160);
    } else {
      this.shopBg.setSize(800, 600);
      this.paginationText.setY(270);
      this.prevPageButton?.root.setY(270);
      this.nextPageButton?.root.setY(270);
    }

    const money = this.upgradeSystem?.getMoney?.() ?? 0;
    this.moneyText.setText(`Money: ${money.toLocaleString()}`);

    const merchantNames = {
      'gemPowerMerchant': 'Gem Power Merchant',
      'playerUpgrades': 'Player Upgrades',
      'gearMerchant': 'Gear Merchant',
      'moneyMonster': 'Money Monster',
      'boboMerchant': "Bobo's Shop"
    };
    this.titleText.setText(merchantNames[merchantId] || 'Shop');

    this.populateUpgrades(merchantId);

    // ── Staggered entry animation ──────────────────────────────────────────
    // Cards are rebuilt before the animation so new merchant content is animated.
    const allCards = this.upgradesContainer.getAll?.() || [];
    allCards.forEach((obj, i) => {
      obj.setAlpha(0);
      this.scene.tweens.add({
        targets: obj,
        alpha: 1,
        duration: 220,
        ease: 'Power2.out',
        delay: i * 30,
      });
    });

    if (this.soundSystem) this.soundSystem.playUiSelect();

    // Fade in
    this.backdrop.setAlpha(0).setVisible(true);
    this.container.setAlpha(0).setVisible(true);
    this.scene.tweens.add({
      targets: [this.backdrop, this.container],
      alpha: 1,
      duration: 200,
      ease: 'Power2.out',
      onComplete: () => {
        if (!this._destroyed && this.isVisible) this._isTransitioning = false;
      },
    });
  }

  hide() {
    if (this._destroyed || !this.scene || !this.container || !this.backdrop) return;
    if (!this.isVisible && !this._isTransitioning) return;

    this.isVisible = false;
    this._isTransitioning = true;

    // Re-enable player controls immediately; the fade is visual only.
    if (this.scene.setShopOpen) {
      this.scene.setShopOpen(false);
    }

    // Fade-out then hide
    this.scene.tweens.killTweensOf([this.backdrop, this.container]);
    this.scene.tweens.killTweensOf(this.upgradesContainer?.getAll?.() || []);
    const finishHide = () => {
      if (this._destroyed) return;
      if (this.backdrop) this.backdrop.setVisible(false);
      if (this.container) this.container.setVisible(false);
      if (this.closeButton) this.closeButton.setVisible(false);
      if (this.helpText) this.helpText.setVisible(false);
      if (this.paginationText) this.paginationText.setVisible(false);
      if (this.selectionBox) this.selectionBox.setVisible(false);

      // Restore default panel size
      if (this.shopBg) {
        this.shopBg.setSize(800, 600);
      }
      if (this.paginationText) {
        this.paginationText.setY(270);
      }
      this._destroyMmButtons();

      // Clear upgrades container
      if (this.upgradesContainer) {
        this.upgradesContainer.removeAll(true);
      }
      this.allUpgrades = [];
      this._isTransitioning = false;
    };

    if (!this.backdrop.visible && !this.container.visible) {
      finishHide();
      return;
    }

    this.scene.tweens.add({
      targets: [this.backdrop, this.container],
      alpha: 0,
      duration: 150,
      ease: 'Power1.in',
      onComplete: finishHide,
    });
  }

  populateUpgrades(merchantId) {
    if (!this.upgradesContainer || !this.upgradeSystem) {
      this.allUpgrades = [];
      this.totalPages = 1;
      this.updatePagination();
      this.selectionBox?.setVisible(false);
      this.scene?.hudSystem?.flashStatus?.("Shop is unavailable", "#ff6b6b", 1500);
      return;
    }

    this._destroyMmButtons();
    this.upgradesContainer.removeAll(true);
    this.allUpgrades = [];

    if (merchantId === 'moneyMonster') {
      this.populateMoneyMonster();
      return;
    }

    const upgrades = [];
    for (const upgradeId in UPGRADES) {
      const upgrade = UPGRADES[upgradeId];
      if (upgrade.merchant === merchantId && !upgrade.comingSoon) {
        upgrades.push({ ...upgrade, id: upgradeId });
      }
    }

    this.allUpgrades = upgrades;
    this.totalPages = Math.max(1, Math.ceil(upgrades.length / this.itemsPerPage));

    this.renderCurrentPage();
    this.updatePagination();
    this.updateSelection();
  }

  renderCurrentPage() {
    if (!this.upgradesContainer || !this.upgradeSystem) return;

    // Clear current page display
    this.upgradesContainer.removeAll(true);

    const itemsOnPage = this.getItemsOnCurrentPage();

    for (let i = 0; i < itemsOnPage.length; i++) {
      const row = Math.floor(i / this.columns);
      const col = i % this.columns;
      const upgrade = itemsOnPage[i];

      this.createGridUpgradeItem(upgrade, row, col);
    }
  }

  createGridUpgradeItem(upgrade, row, col) {
    if (this._destroyed || !this.scene || !this.upgradeSystem || !this.upgradesContainer) return;

    const x = this.gridStartX + col * this.gridColumnWidth + (this.gridColumnWidth / 2);
    const y = this.gridStartY + row * this.gridRowHeight + (this.gridRowHeight / 2);

    const currentLevel = this.upgradeSystem.getUpgradeLevel(upgrade.id);
    const cost = getUpgradeCost(upgrade.id, currentLevel);

    // Check full purchase requirements (money + resources)
    const purchaseCheck = this.upgradeSystem.canPurchaseUpgrade(upgrade.id);
    const canPurchase = purchaseCheck.canPurchase;

    // Get resource requirements for display
    let resourceReqText = "";
    let missingResources = false;
    if (upgrade.resources) {
      const resourceNames = {
        dirt: "Dirt",
        stone: "Stone",
        copper: "Copper",
        iron: "Iron",
        bronze: "Bronze",
        steel: "Steel",
        silver: "Silver",
        gold: "Gold"
      };

      if (this.scene?.digSystem) {
        const resources = this.scene?.digSystem?.getResourceTotals?.() || {};
        const reqParts = [];

        for (const [resourceType, amount] of Object.entries(upgrade.resources)) {
          const have = resources[resourceType] || 0;
          const name = resourceNames[resourceType] || resourceType;
          const color = have >= amount ? "#44ff44" : "#ff4444";
          reqParts.push(`${name}: ${have}/${amount}`);

          if (have < amount) {
            missingResources = true;
          }
        }

        resourceReqText = reqParts.join(", ");
      }
    }

    // Store position for selection
    const itemsOnPage = this.getItemsOnCurrentPage();
    const index = row * this.columns + col;
    if (itemsOnPage[index]) {
      itemsOnPage[index].x = x;
      itemsOnPage[index].y = y;
    }

    // Special case: sellAllButton when owned — becomes a functional SELL ALL card
    const isSellAllOwned = upgrade.id === 'sellAllButton' && currentLevel > 0;
    const resources = isSellAllOwned ? (this.scene?.digSystem?.getResourceTotals?.() || null) : null;
    const canSellAll = isSellAllOwned && resources && Object.values(resources).some(v => v > 0);

    // Background box (make interactive for clicks) — using main menu color palette
    let bgColor, strokeColor, hoverColor;
    if (isSellAllOwned) {
      bgColor = canSellAll ? 0x2a2614 : UI_COLORS.neutral;
      strokeColor = canSellAll ? 0xffaa00 : UI_COLORS.borderDim;
      hoverColor = canSellAll ? 0x3a3418 : bgColor;
    } else if (cost >= Infinity || currentLevel >= (upgrade.maxLevel ?? Infinity)) {
      bgColor = 0x151a20;
      strokeColor = UI_COLORS.borderDim;
      hoverColor = 0x1a222a;
    } else if (canPurchase) {
      bgColor = 0x162b1e;
      strokeColor = UI_COLORS.borderGood;
      hoverColor = 0x1d3928;
    } else {
      bgColor = 0x241920;
      strokeColor = cost < Infinity ? UI_COLORS.borderBad : UI_COLORS.borderDim;
      hoverColor = 0x2d2028;
    }

    const bg = this.scene.add.rectangle(x, y, 240, 140, bgColor, 0.9)
      .setStrokeStyle(1, strokeColor)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this._destroyed || !this.isVisible || !this.upgradeSystem) return;
        this.selectedRow = row;
        this.selectedCol = col;
        this.moneyMonsterMode = 'buy';
        this.topButtonSelected = null;
        this.updateSelection();

        // Check ownership dynamically in case it changed since card creation
        const currentOwnedLevel = this.upgradeSystem.getUpgradeLevel(upgrade.id);
        const isActuallyOwned = upgrade.id === 'sellAllButton' && currentOwnedLevel > 0;

        // For owned one-time purchase upgrades like Sell All, trigger special action
        if (upgrade.oneTimePurchase && isActuallyOwned) {
          if (upgrade.id === 'sellAllButton') {
            const currentResources = this.scene?.digSystem?.getResourceTotals?.() || null;
            const canActuallySellAll = currentResources && Object.values(currentResources).some(v => v > 0);
            if (canActuallySellAll) {
              this.sellAllResources();
            } else {
              this.scene?.hudSystem?.flashStatus?.("No resources to sell!", "#ff4444", 1500);
            }
          }
        } else {
          this.purchaseUpgrade(upgrade.id);
        }
      })
      .on('pointerover', () => {
        if (this._destroyed || !this.isVisible) return;
        if (this.soundSystem) this.soundSystem.playUiSelect();
        try {
          bg.setFillStyle(hoverColor, 0.95);
        } catch (e) {}
      })
      .on('pointerout', () => {
        if (this._destroyed) return;
        try {
          bg.setFillStyle(bgColor, 0.9);
        } catch (e) {}
      });

    // Upgrade name — Consolas like main menu
    const nameText = this.scene.add.text(x, y - 55, upgrade.name, {
      fontFamily: "Consolas, monospace",
      fontSize: "13px",
      color: '#ffffff',
      fontWeight: "bold",
      wordWrap: { width: 220 }
    }).setOrigin(0.5);

    // Level display
    let levelText = upgrade.oneTimePurchase
      ? (currentLevel > 0 ? "OWNED" : "NOT OWNED")
      : `Level ${currentLevel}`;

    const levelDisplay = this.scene.add.text(x, y - 33, levelText, {
      fontFamily: "Consolas, monospace",
      fontSize: "11px",
      color: '#5a7a8a',
    }).setOrigin(0.5);

    // Cost display
    let costDisplay;
    if (isSellAllOwned) {
      costDisplay = canSellAll ? "SELL ALL" : "NO RESOURCES";
    } else {
      costDisplay = cost >= Infinity ? "MAX" : `${cost.toLocaleString()} M`;
      if (resourceReqText) costDisplay += ` | ${resourceReqText}`;
    }

    const costText = this.scene.add.text(x, y - 10, costDisplay, {
      fontFamily: "Consolas, monospace",
      fontSize: "10px",
      color: isSellAllOwned ? (canSellAll ? "#ffaa00" : '#4a5a6a') : (canPurchase ? '#c9a227' : '#4a5a6a'),
      fontWeight: "bold",
      wordWrap: { width: 220 }
    }).setOrigin(0.5);

    // Description
    const descText = this.scene.add.text(x, y + 48, upgrade.description, {
      fontFamily: "Consolas, monospace",
      fontSize: "10px",
      color: isSellAllOwned ? (canSellAll ? "#ffcc44" : '#4a5a6a') : (canPurchase ? '#4ecb71' : '#4a5a6a'),
      wordWrap: { width: 220 }
    }).setOrigin(0.5);

    this.upgradesContainer.add([bg, nameText, levelDisplay, costText, descText]);
  }

  _destroyMmButtons() {
    for (const obj of this._mmButtons) {
      // Remove from container if it was added there
      try {
        if (obj.parentContainer) {
          obj.parentContainer.remove(obj);
        }
      } catch (_) {}
      try { obj?.destroy?.(); } catch (_) {}
    }
    this._mmButtons = [];
  }

  populateMoneyMonster() {
    this._destroyMmButtons();
    this.upgradesContainer.removeAll(true);
    this.allUpgrades = [];
    this.sellButtons = []; // Clear sell button tracking
    this.moneyMonsterMode = 'buy'; // Reset to buy mode
    this.topButtonSelected = null;

    const upgrades = [];
    for (const upgradeId in UPGRADES) {
      const upgrade = UPGRADES[upgradeId];
      if (upgrade.merchant === 'moneyMonster') {
        upgrades.push({ ...upgrade, id: upgradeId });
      }
    }

    this.allUpgrades = upgrades;
    this.totalPages = Math.max(1, Math.ceil(upgrades.length / this.itemsPerPage));

    this.renderCurrentPage();
    this.updatePagination();
    this.updateSelection();
    this._buildMmSellUI();
  }

  _buildMmSellUI() {
    try {
      // Ensure scene reference is valid
      const scene = this.scene;
      if (!scene || !scene.digSystem || !this.upgradeSystem) {
        return;
      }
      const resources = scene.digSystem.getResourceTotals();

      const prices = RESOURCE_PRICES_CONFIG.basePrices;
      const names = RESOURCE_PRICES_CONFIG.resourceNames;

      const resourceKeys = [
        'dirt', 'stone', 'copper',
        'darkDirtNormal', 'darkDirtStrong',
        'steel', 'iron', 'bronze', 'silver', 'gold'
      ];

      const titleY = 178;
      let rowStartY = 218;
      const rowGap = 28;

      // Section title — main menu style
      const titleText = this.scene.add.text(0, titleY, "SELL RESOURCES FOR MONEY", {
        fontFamily: "Consolas, monospace",
        fontSize: "12px",
        color: '#5a7a8a',
        fontWeight: "bold"
      }).setOrigin(0.5);
      this._mmButtons.push(titleText);
      this.container.add(titleText);

      // Check if Sell All button is unlocked
      const effects = this.upgradeSystem.getUpgradeEffects();
      const sellAllUnlocked = effects.sellAllUnlocked > 0;
      const marketReportsUnlocked = effects.marketReports > 0;

      // Sell All button (if unlocked) - positioned after title, before resource rows
      if (sellAllUnlocked) {
        const sellAllBtnY = titleY + 28;
        const totalResources = Object.values(resources).reduce((sum, val) => sum + val, 0);
        const canSellAll = totalResources > 0;

        const sellAllBtn = createButton(this.scene, {
          x: 300,
          y: sellAllBtnY,
          width: 118,
          height: 26,
          label: 'SELL ALL',
          accent: 0xffaa00,
          labelColor: canSellAll ? '#ffd98f' : UI_COLORS.dim,
          parent: this.container,
          fontSize: '10px',
          onClick: () => this.sellAllResources(),
        });
        sellAllBtn.setEnabled(canSellAll);

        const sellAllHint = this.scene.add.text(180, sellAllBtnY, "Sell all resources:", {
          fontFamily: "Consolas, monospace",
          fontSize: "11px",
          color: '#ffffff'
        }).setOrigin(1, 0.5);

        this._mmButtons.push(sellAllBtn.root, sellAllHint);
        this.container.add(sellAllHint);

        // Adjust row start to account for sell all button
        rowStartY = titleY + 58;
      }

      for (let i = 0; i < resourceKeys.length; i++) {
        const key = resourceKeys[i];
        const amount = resources[key] || 0;
        const price = prices[key] || 0;
        const displayName = names[key] || key;
        const colIdx = i < 5 ? 0 : 1;
        const rowIdx = i % 5;
        const labelX = colIdx === 0 ? -370 : -10;
        const priceX = colIdx === 0 ? -120 : 240;
        const buttonX = colIdx === 0 ? -58 : 302;
        const y = rowStartY + rowIdx * rowGap;
        const canSell = amount > 0;

        // Name + amount
        const rowLabel = this.scene.add.text(labelX, y,
          `${displayName}: ${amount}`,
          {
            fontFamily: "Consolas, monospace",
            fontSize: "12px",
            color: canSell ? '#ffffff' : '#4a5a6a'
          }
        ).setOrigin(0, 0.5);

        // Price - always show adjusted price; Market Reports adds depth + total info
        let adjustedPrice = price;
        const startResources = ['dirt', 'stone', 'copper'];
        const nextResources = ['iron', 'bronze', 'steel', 'silver', 'gold'];
        if (startResources.includes(key) && effects.startResourceBonus > 0) {
          adjustedPrice = Math.floor(price * (1 + effects.startResourceBonus));
        }
        if (nextResources.includes(key) && effects.nextResourceBonus > 0) {
          adjustedPrice = Math.floor(price * (1 + effects.nextResourceBonus));
        }
        if (effects.marketBonus > 0) {
          adjustedPrice = Math.floor(adjustedPrice * (1 + effects.marketBonus));
        }

        const priceLabel = this.scene.add.text(priceX, y, `$${adjustedPrice}`, {
          fontFamily: "Consolas, monospace",
          fontSize: "12px",
          color: '#c9a227'
        }).setOrigin(1, 0.5);

        // Sell button
        const btn = createButton(this.scene, {
          x: buttonX,
          y,
          width: 84,
          height: 24,
          label: 'SELL',
          accent: UI_COLORS.borderGood,
          labelColor: UI_COLORS.success,
          parent: this.container,
          fontSize: '10px',
          onClick: () => {
            try {
              if (!this.scene?.digSystem) {
                console.error('[SHOP SELL ERROR] Missing digSystem!');
                this.scene?.hudSystem?.flashStatus('Shop system error!', "#ff4444", 1500);
                return;
              }

              if (!this.scene?.hudSystem) {
                console.error('[SHOP SELL ERROR] Missing hudSystem!');
                return;
              }

              const current = this.scene?.digSystem?.getResourceTotals?.() || {};
              if ((current[key] || 0) >= 1) {
                this.sellResource(key, 1, prices[key] || 0);
              } else {
                this.scene?.hudSystem?.flashStatus?.(`No ${displayName} to sell!`, "#ff4444", 1200);
              }
            } catch (e) {
              console.error('[SHOP SELL ERROR] Unhandled error in pointerdown:', e);
              if (this.scene?.hudSystem) {
                this.scene?.hudSystem?.flashStatus?.(`Error: ${e.message}`, "#ff4444", 2000);
              }
            }
          },
        });
        btn.setEnabled(canSell);

        this._mmButtons.push(rowLabel, priceLabel, btn.root);
        this.container.add([rowLabel, priceLabel]);

        // Track sell button position for keyboard navigation
        if (canSell) {
          this.sellButtons.push({
            resourceKey: key,
            displayName: displayName,
            amount: amount,
            price: price,
            x: buttonX,
            y: y,
            button: btn.root
          });
        }
      }
    } catch (e) {
      console.error('[SHOP] Error building sell UI:', e);
    }
  }

  purchaseUpgrade(upgradeId) {
    if (this._destroyed || !this.isVisible || !this.upgradeSystem || !upgradeId) return;

    try {
      const upgradeDef = UPGRADES[upgradeId];
      if (!upgradeDef) {
        this.scene?.hudSystem?.flashStatus?.("Upgrade unavailable", "#ff4444", 1800);
        return;
      }

      const result = this.upgradeSystem.purchaseUpgrade(upgradeId);
      if (!result) {
        this.scene?.hudSystem?.flashStatus?.("Upgrade unavailable", "#ff4444", 1800);
        return;
      }

      if (result.success) {
        if (this.soundSystem) this.soundSystem.playUiConfirm();

        if (upgradeId === 'boboWisdom') {
          this.hide();
          this.scene.showGameDialog(
            "Bobo's Wisdom",
            "Bobo leans close and whispers with wide eyes...\n\n" +
            "\"Ah, you seek wisdom! Let me tell you of the powers you can unlock!\"\n\n" +
            "═══════════════════════════════════════════════════════════════\n\n" +
            "✈️ FLIGHT (Gem Power Merchant)\n" +
            `   Hold ${USER_SETTINGS.getKeyLabel("fly")} in the air to fly! Costs Gem Power.\n` +
            "   Upgrade: Gem Power Tank (more GP), Efficiency (less drain),\n" +
            "   Regeneration (faster recharge), Fly Speed (faster flight)\n\n" +
            "👁️ GEM VISION (Gem Power Merchant)\n" +
            `   Hold ${USER_SETTINGS.getKeyLabel("gemVision")} to zoom out and see more of the world!\n` +
            "   Upgrade: Range (zoom further), Deep Sight (4x area), Efficiency\n\n" +
            "⚔️ QUICKSLASH (Always Active)\n" +
            `   Hold ${USER_SETTINGS.getKeyLabel("quickslash")} while moving to dash forward! Costs 10 GP per dash.\n` +
            "   Burst speed: 900 px/s, cooldown: 50ms\n\n" +
            "⚡ THUNDER STRIKE (Always Active)\n" +
            `   Press ${USER_SETTINGS.getKeyLabel("thunderStrike")} to charge, then strike downward!\n` +
            "   Costs 100 GP, charges in 1 second, hits up to 10 tiles.\n" +
            "   Damage: 3x normal, falloff: 10% per tile\n\n" +
            "═══════════════════════════════════════════════════════════════\n\n" +
            "\"There is a Gem of Great Power hidden high in the sky!\n" +
            "I have felt its energy carried on the wind above us.\n\n" +
            "Build your mobility, adventurer! Upgrade your flight tools\n" +
            "and Gem Power capacity.\n" +
            "and look UPWARD to the heavens.\n\n" +
            "The gem awaits those who are strong enough to reach it.\"\n\n" +
            `[Press any key or ${USER_SETTINGS.getKeyLabel("interact")} to close]`
          );
          return;
        }

        if (upgradeId === 'gemPowerUnlock') {
          this.hide();
          this.scene.showGameDialog(
            "Gem of Great Power",
            "You have discovered the Gem of Great Power!\n\n" +
            "FLIGHT IS NOW UNLOCKED!\n" +
            `Hold ${USER_SETTINGS.getKeyLabel("fly")} to fly - it costs Gem Power (purple bar).\n` +
            "Gem Power regenerates slowly on its own.\n\n" +
            "Talk to the Gem Power Merchant here on the Sky Island\n" +
            "to upgrade your fly capacity, efficiency, and speed!\n\n" +
            `[Press any key or ${USER_SETTINGS.getKeyLabel("interact")} to close]`
          );
          return;
        }

        if (upgradeId === 'worldTwoTunnelAccess') {
          this.scene?.surfaceTunnelDoorSystem?.syncFromUpgrade?.(true);
        }

        this.scene?.hudSystem?.flashStatus?.(`Purchased ${upgradeDef.name}!`, "#44ff44", 2000);
        this.populateUpgrades(this.currentMerchant);
        this.moneyText?.setText(`Money: ${this.upgradeSystem.getMoney().toLocaleString()}`);
      } else {
        if (this.soundSystem) this.soundSystem.playUiSelect();
        let message = "Cannot purchase";

        if (result.reason === "not_enough_money") {
          message = "Not enough money!";
        } else if (result.reason === "max_level") {
          message = "Max level reached!";
        } else if (result.reason === "not_enough_resources") {
          const upgrade = upgradeDef;
          if (upgrade && upgrade.resources) {
            const resourceNames = {
              dirt: "Dirt",
              stone: "Stone",
              copper: "Copper",
              iron: "Iron",
              bronze: "Bronze",
              steel: "Steel",
              silver: "Silver",
              gold: "Gold"
            };

            // Build detailed message about missing resources
            const missing = [];
            if (this.scene?.digSystem) {
              const resources = this.scene?.digSystem?.getResourceTotals?.() || {};
              for (const [resourceType, amount] of Object.entries(upgrade.resources)) {
                const have = resources[resourceType] || 0;
                if (have < amount) {
                  const name = resourceNames[resourceType] || resourceType;
                  missing.push(`${name} (${have}/${amount})`);
                }
              }
            }

            if (missing.length > 0) {
              message = `Need: ${missing.join(", ")}`;
            } else {
              message = "Not enough resources!";
            }
          } else {
            message = "Not enough resources!";
          }
        } else if (result.reason === "requires_upgrade") {
          message = "Requires another upgrade first!";
        } else if (result.reason === "requires_depth_gate") {
          message = `Reach and claim ${result.required}m first!`;
        }

        this.scene?.hudSystem?.flashStatus?.(message, "#ff4444", 2500);
      }
    } catch (e) {
      console.error('Error purchasing upgrade:', e);
      this.scene?.hudSystem?.flashStatus?.(`Error purchasing upgrade!`, "#ff4444", 2000);
    }
  }

  sellResource(resource, amount, price) {
    if (this._destroyed || !this.upgradeSystem) return;

    try {
      const digSystem = this.scene?.digSystem;
      if (!digSystem) {
        console.error('[SHOP SELL] No digSystem available');
        return;
      }
      const resources = digSystem.getResourceTotals();
      
      if ((resources[resource] || 0) >= amount) {
        // Get upgrade effects
        const effects = this.upgradeSystem.getUpgradeEffects();

        // Apply resource price bonuses
        let adjustedPrice = price;

        // Start resources: dirt, stone, copper
        const startResources = ['dirt', 'stone', 'copper'];
        if (startResources.includes(resource) && effects.startResourceBonus > 0) {
          adjustedPrice = Math.floor(price * (1 + effects.startResourceBonus));
        }

        // Next resources: iron, bronze, steel, silver, gold
        const nextResources = ['iron', 'bronze', 'steel', 'silver', 'gold'];
        if (nextResources.includes(resource) && effects.nextResourceBonus > 0) {
          adjustedPrice = Math.floor(price * (1 + effects.nextResourceBonus));
        }

        // Apply market insight bonus (percentage bonus on all sales)
        if (effects.marketBonus > 0) {
          adjustedPrice = Math.floor(adjustedPrice * (1 + effects.marketBonus));
        }

        // Apply lucky sales chance (10% chance per level for extra 50% money)
        let luckyBonus = 0;
        if (effects.luckySales > 0 && Math.random() < (effects.luckySales * 0.10)) {
          luckyBonus = Math.floor(adjustedPrice * 0.5);
          this.scene?.hudSystem?.flashStatus?.("LUCKY! Bonus money!", "#ffff00", 1000);
        }

        const finalPrice = adjustedPrice + luckyBonus;

        // SAVE current mode and selection
        const savedMode = this.moneyMonsterMode;
        const savedSellButtonIndex = this.selectedSellButton;

        // Modify resource copy and update dig system
        resources[resource] -= amount;
        digSystem.setResourceTotals(resources);
        this.upgradeSystem.addMoney(finalPrice);

        this.soundSystem?.playUiConfirm?.();
        this.scene?.hudSystem?.flashStatus?.(`Sold ${amount} ${resource} for ${finalPrice} Money!`, "#44ff44", 1500);

        // Rebuild Money Monster UI with updated totals
        this.populateMoneyMonster();

        // RESTORE mode and selection
        this.moneyMonsterMode = savedMode;
        if (savedMode === 'sell') {
          this.selectedSellButton = Math.min(savedSellButtonIndex, Math.max(0, this.sellButtons.length - 1));
          this.updateSellSelection();
        }

        this.moneyText?.setText(`Money: ${this.upgradeSystem.getMoney().toLocaleString()}`);
        this.scene?.uiResourceBar?.setResources?.(digSystem.getResourceTotals());
      }
    } catch (e) {
      console.error('[SHOP SELL] Error in sellResource:', e);
    }
  }

  sellAllResources() {
    if (this._destroyed || !this.scene?.digSystem || !this.upgradeSystem) return;

    try {
      const resources = this.scene?.digSystem?.getResourceTotals?.() || {};
      const effects = this.upgradeSystem.getUpgradeEffects();

      const resourceKeys = ['dirt', 'stone', 'copper', 'darkDirtNormal', 'darkDirtStrong', 'steel', 'iron', 'bronze', 'silver', 'gold'];
      let totalMoney = 0;
      let totalSold = 0;

      for (const key of resourceKeys) {
        const amount = resources[key] || 0;
        if (amount <= 0) continue;

        const basePrice = RESOURCE_PRICES_CONFIG.basePrices[key] || 0;
        let adjustedPrice = basePrice;

        // Apply resource price bonuses
        const startResources = ['dirt', 'stone', 'copper'];
        if (startResources.includes(key) && effects.startResourceBonus > 0) {
          adjustedPrice = Math.floor(basePrice * (1 + effects.startResourceBonus));
        }

        const nextResources = ['iron', 'bronze', 'steel', 'silver', 'gold'];
        if (nextResources.includes(key) && effects.nextResourceBonus > 0) {
          adjustedPrice = Math.floor(basePrice * (1 + effects.nextResourceBonus));
        }

        // Apply market insight bonus
        if (effects.marketBonus > 0) {
          adjustedPrice = Math.floor(adjustedPrice * (1 + effects.marketBonus));
        }

        // Apply lucky sales to each stack
        let luckyBonus = 0;
        if (effects.luckySales > 0) {
          for (let i = 0; i < amount; i++) {
            if (Math.random() < (effects.luckySales * 0.10)) {
              luckyBonus += Math.floor(adjustedPrice * 0.5);
            }
          }
        }

        totalMoney += adjustedPrice * amount + luckyBonus;
        totalSold += amount;
        resources[key] = 0;
      }

      if (totalSold > 0) {
        this.scene?.digSystem?.setResourceTotals?.(resources);
        this.upgradeSystem.addMoney(totalMoney);

        this.soundSystem?.playUiConfirm?.();
        this.scene?.hudSystem?.flashStatus?.(`Sold ${totalSold} resources for ${totalMoney.toLocaleString()} Money!`, "#44ff44", 2000);

        this.populateMoneyMonster();
        this.moneyText?.setText(`Money: ${this.upgradeSystem.getMoney().toLocaleString()}`);
        this.scene?.uiResourceBar?.setResources?.(this.scene?.digSystem?.getResourceTotals?.() || {});
      } else {
        this.scene?.hudSystem?.flashStatus?.("No resources to sell!", "#ff4444", 1500);
      }
    } catch (e) {
      console.error('Error in sellAllResources:', e);
      this.scene?.hudSystem?.flashStatus?.(`Error selling all resources!`, "#ff4444", 2000);
    }
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.scene?.tweens?.killTweensOf?.([this.backdrop, this.container, this.selectionBox]);
    this.scene?.tweens?.killTweensOf?.(this.upgradesContainer?.getAll?.() || []);
    this._destroyMmButtons();
    if (this.closeButton) this.closeButton.destroy();
    if (this.backdrop) this.backdrop.destroy();
    if (this.container) this.container.destroy();
    this.closeButton = null;
    this.backdrop = null;
    this.container = null;
    this.selectionBox = null;
    this.paginationText = null;
    this.helpText = null;
  }
}
