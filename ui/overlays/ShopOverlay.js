import { UPGRADES } from "../../values/upgradeDefinitions.js";
import { getUpgradeCost } from "../../values/upgradeFormulas.js";
import {
  RESOURCE_PRICES_CONFIG,
  getAdjustedResourceUnitPrice,
} from "../../values/resourcePrices.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS, SHOP_MERCHANT_PROFILES } from "../../values/uiLayout.js";
import { UI_RESOURCE_PRESENTATION } from "../../values/uiIcons.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { OPENING_FLIGHT_ARTIFACT_CONFIG } from "../../values/openingFlightArtifact.js";
import { CRAFTING_RECIPES } from "../../values/craftingRecipes.js";
import { isGameplayUpgradeEnabled } from "../../values/gameplayDevFlags.js";
import {
  MONEY_MONSTER_RESOURCE_KEYS,
  SECOND_WORLD_RESOURCE_KEYS,
  getResourceDisplayName,
  tileTypeToResource,
} from "../../values/resourceTypes.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { createButton } from "../PhaserUiKit.js";
import {
  isSellCapableMerchant,
  resolveMerchantUiIcon,
  resolveUpgradeUiIcon,
} from "../UiIconAtlas.js";
import { createIconBadge, createModalShell } from "../UiModalShell.js";

const LIST_ROW_HEIGHT = 62;
const ARC_FORGE_MERCHANT_ID = "magmaMoneyMonster";
const SELL_ALL_CONFIRM_WINDOW_MS = 4500;

function isArcForgeMerchant(merchantId) {
  return merchantId === ARC_FORGE_MERCHANT_ID;
}

function resourceIconKey(resource) {
  const presentation = UI_RESOURCE_PRESENTATION[resource];
  return presentation?.icon || presentation?.iconKey || resource;
}

function formatMoney(value) {
  return Math.max(0, Number(value) || 0).toLocaleString() + " M";
}

function sellResourceKeysForMerchant(merchantId) {
  return merchantId === "magmaMoneyMonster"
    ? SECOND_WORLD_RESOURCE_KEYS
    : MONEY_MONSTER_RESOURCE_KEYS;
}

export class ShopOverlay {
  constructor(scene, upgradeSystem, soundSystem) {
    this.scene = scene;
    this.upgradeSystem = upgradeSystem;
    this.soundSystem = soundSystem;
    this.currentMerchant = null;
    this.isVisible = false;
    this._destroyed = false;
    this.moneyMonsterMode = "buy";
    this.currentPage = 0;
    this.selectedIndex = 0;
    this.itemsPerPage = 5;
    this.allUpgrades = [];
    this.forgeRecipes = [];
    this.sellItems = [];
    this.sellButtons = [];
    this.selectedSellButton = 0;
    this.topButtonSelected = null;
    this.sellAllConfirmUntil = 0;
    this.saleConfirmSignature = "";

    this.shell = createModalShell(scene, {
      title: "MERCHANT DESK",
      subtitle: "Select an item to inspect it",
      icon: "shop",
      maxWidth: 1040,
      maxHeight: 672,
      depth: 3000,
      onClose: () => this.hide(),
    });
    this.container = this.shell.root;
    this.backdrop = this.shell.backdrop;
    this.upgradesContainer = this.shell.content;

    this.walletText = scene.add.text(0, 0, "WALLET  0 M", {
      fontFamily: UI_FONTS.mono,
      fontSize: "16px",
      fontStyle: "bold",
      color: UI_COLORS.gold,
    }).setOrigin(1, 0.5);
    this.helpText = scene.add.text(0, 0, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: UI_COLORS.hint || UI_COLORS.body,
      align: "center",
    }).setOrigin(0.5);
    this.shell.root.add([this.walletText, this.helpText]);

    this._setupKeyboardInput();
    this.refreshKeybindHints();
    this._layoutChrome();
  }

  _setupKeyboardInput() {
    const keyboard = this.scene.input.keyboard;
    const code = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: keyboard.addKey(code.W),
      down: keyboard.addKey(code.S),
      left: keyboard.addKey(code.A),
      right: keyboard.addKey(code.D),
      arrowUp: keyboard.addKey(code.UP),
      arrowDown: keyboard.addKey(code.DOWN),
      arrowLeft: keyboard.addKey(code.LEFT),
      arrowRight: keyboard.addKey(code.RIGHT),
      previous: keyboard.addKey(code.Q),
      next: keyboard.addKey(code.E),
      confirm: keyboard.addKey(code.ENTER),
      action: keyboard.addKey(code.F),
      space: keyboard.addKey(code.SPACE),
      tab: keyboard.addKey(code.TAB),
      escape: keyboard.addKey(code.ESC),
    };
  }

  _layoutChrome() {
    this.shell.layout();
    this.walletText.setPosition(this.shell.width / 2 - 82, -this.shell.height / 2 + 41);
    this.helpText.setPosition(0, this.shell.height / 2 - 25);
  }

  refreshKeybindHints() {
    const interact = USER_SETTINGS.getKeyLabel("interact");
    this.helpText.setText(
      "W/S or arrows: select    A/D or Tab: tabs    " +
      interact + "/Enter: action    ESC: close"
    );
  }

  update() {
    if (!this.isVisible || this._destroyed) return;
    const just = Phaser.Input.Keyboard.JustDown;
    if (just(this.keys.escape)) {
      this.hide();
      return;
    }
    if (just(this.keys.tab)) {
      this.toggleMoneyMonsterMode();
      return;
    }
    if (just(this.keys.up) || just(this.keys.arrowUp)) this.navigateUp();
    else if (just(this.keys.down) || just(this.keys.arrowDown)) this.navigateDown();
    else if (just(this.keys.left) || just(this.keys.arrowLeft)) this.navigateLeft();
    else if (just(this.keys.right) || just(this.keys.arrowRight)) this.navigateRight();
    else if (just(this.keys.previous)) this.prevPage();
    else if (this.scene.interactKey && just(this.scene.interactKey)) this.purchaseSelected();
    else if (just(this.keys.confirm) || just(this.keys.space)) this.purchaseSelected();
    else if (just(this.keys.action)) {
      if (this.moneyMonsterMode === "sell") this.sellSelectedStack();
      else this.purchaseSelected();
    }
  }

  show(merchantId) {
    if (this._destroyed) return;
    this.currentMerchant = merchantId;
    this.isVisible = true;
    this.currentPage = 0;
    this.selectedIndex = 0;
    this.moneyMonsterMode = isArcForgeMerchant(merchantId) ? "craft" : "buy";
    this.selectedSellButton = 0;
    this.sellAllConfirmUntil = 0;
    this.saleConfirmSignature = "";
    this.scene.setShopOpen?.(true);
    this._syncMerchantChrome();
    this.populateUpgrades(merchantId);
    this.shell.show();
    this._layoutChrome();
    this.soundSystem?.playUiSelect?.();
  }

  hide() {
    if (this._destroyed || !this.isVisible) return;
    this.isVisible = false;
    this.scene.setShopOpen?.(false);
    this.shell.hide();
  }

  _syncMerchantChrome() {
    const profile = SHOP_MERCHANT_PROFILES[this.currentMerchant] || SHOP_MERCHANT_PROFILES.default;
    this.shell.setHeader(profile.title, profile.role + "  |  " + profile.greeting);
    this.shell.setIcon(resolveMerchantUiIcon(this.currentMerchant));
    this.moneyText = this.walletText;
    this._updateWallet();
  }

  _updateWallet() {
    this.walletText.setText("WALLET  " + formatMoney(this.upgradeSystem?.getMoney?.() || 0));
  }

  setMerchantMode(mode, silent = false) {
    if (mode === "sell" && !isSellCapableMerchant(this.currentMerchant)) return;
    if (mode === "craft" && !isArcForgeMerchant(this.currentMerchant)) return;
    const primaryMode = isArcForgeMerchant(this.currentMerchant) ? "craft" : "buy";
    const next = mode === "sell" ? "sell" : primaryMode;
    if (next === this.moneyMonsterMode && !silent) return;
    this.moneyMonsterMode = next;
    this.currentPage = 0;
    this.selectedIndex = 0;
    this.selectedSellButton = 0;
    this.sellAllConfirmUntil = 0;
    this.saleConfirmSignature = "";
    if (!silent) this.soundSystem?.playUiSelect?.();
    this._render();
  }

  toggleMoneyMonsterMode() {
    if (!isSellCapableMerchant(this.currentMerchant)) return;
    const primaryMode = isArcForgeMerchant(this.currentMerchant) ? "craft" : "buy";
    this.setMerchantMode(this.moneyMonsterMode === primaryMode ? "sell" : primaryMode);
  }

  populateUpgrades(merchantId = this.currentMerchant) {
    this.currentMerchant = merchantId;
    this.allUpgrades = Object.entries(UPGRADES)
      .filter(([upgradeId, upgrade]) => (
        isGameplayUpgradeEnabled(upgradeId) &&
        upgrade.merchant === merchantId &&
        !upgrade.comingSoon &&
        !upgrade.hiddenFromShop
      ))
      .map(([id, upgrade]) => ({ ...upgrade, id }));
    this.forgeRecipes = isArcForgeMerchant(merchantId)
      ? Object.values(CRAFTING_RECIPES).filter(recipe => (
        isGameplayUpgradeEnabled(recipe.output?.upgradeId)
      ))
      : [];
    this.sellItems = sellResourceKeysForMerchant(merchantId).map(resource => ({
      resource,
      name: getResourceDisplayName(resource),
      basePrice: RESOURCE_PRICES_CONFIG.basePrices[resource] || 0,
    }));
    this._render();
  }

  populateMoneyMonster() {
    this.populateUpgrades(this.currentMerchant || "moneyMonster");
  }

  _itemsForCurrentMode() {
    if (this.moneyMonsterMode === "sell") return this.sellItems;
    if (this.moneyMonsterMode === "craft") return this.forgeRecipes;
    return this.allUpgrades;
  }

  _render() {
    if (!this.isVisible && !this.shell.root.visible) return;
    this._layoutChrome();
    this.upgradesContainer.removeAll(true);
    const rect = this.shell.getContentRect();
    const seller = isSellCapableMerchant(this.currentMerchant);
    let bodyTop = rect.top;

    if (seller) {
      const tabY = rect.top + 20;
      const primaryMode = isArcForgeMerchant(this.currentMerchant) ? "craft" : "buy";
      createButton(this.scene, {
        x: rect.left + 92,
        y: tabY,
        width: 176,
        height: 38,
        label: primaryMode === "craft" ? "ARC FORGE" : "UPGRADES",
        hint: "A",
        icon: primaryMode === "craft" ? "power" : "upgrade",
        accent: this.moneyMonsterMode === primaryMode ? UI_COLORS.borderSel : UI_COLORS.borderDim,
        parent: this.upgradesContainer,
        fontSize: "12px",
        onClick: () => this.setMerchantMode(primaryMode),
      });
      createButton(this.scene, {
        x: rect.left + 278,
        y: tabY,
        width: 176,
        height: 38,
        label: "SELL",
        hint: "D",
        icon: "sell",
        accent: this.moneyMonsterMode === "sell" ? UI_COLORS.borderSel : UI_COLORS.borderDim,
        parent: this.upgradesContainer,
        fontSize: "12px",
        onClick: () => this.setMerchantMode("sell"),
      });
      bodyTop += 50;
    }

    const bodyBottom = rect.bottom;
    const bodyHeight = bodyBottom - bodyTop;
    const gap = 16;
    const leftWidth = Math.min(390, Math.max(285, rect.width * 0.4));
    const rightWidth = rect.width - leftWidth - gap;
    const leftX = rect.left;
    const rightX = leftX + leftWidth + gap;
    this.itemsPerPage = Math.max(2, Math.min(6, Math.floor((bodyHeight - 72) / LIST_ROW_HEIGHT)));

    this._drawSurface(leftX, bodyTop, leftWidth, bodyHeight, false);
    this._drawSurface(rightX, bodyTop, rightWidth, bodyHeight, true);

    const items = this._itemsForCurrentMode();
    if (items.length) {
      this.selectedIndex = Phaser.Math.Clamp(this.selectedIndex, 0, items.length - 1);
      this.currentPage = Phaser.Math.Clamp(
        Math.floor(this.selectedIndex / this.itemsPerPage),
        0,
        Math.max(0, Math.ceil(items.length / this.itemsPerPage) - 1)
      );
    } else {
      this.selectedIndex = 0;
      this.currentPage = 0;
    }

    this._renderList(items, leftX, bodyTop, leftWidth, bodyHeight);
    if (this.moneyMonsterMode === "sell") {
      this._renderSellDetail(items[this.selectedIndex], rightX, bodyTop, rightWidth, bodyHeight);
    } else if (this.moneyMonsterMode === "craft") {
      this._renderForgeDetail(items[this.selectedIndex], rightX, bodyTop, rightWidth, bodyHeight);
    } else {
      this._renderUpgradeDetail(items[this.selectedIndex], rightX, bodyTop, rightWidth, bodyHeight);
    }
    this._updateWallet();
  }

  _drawSurface(x, y, width, height, emphasized) {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(emphasized ? UI_COLORS.cardBase : UI_COLORS.bg, emphasized ? 0.98 : 0.72);
    gfx.fillRoundedRect(x, y, width, height, 7);
    gfx.lineStyle(emphasized ? 2 : 1, emphasized ? UI_COLORS.borderSel : UI_COLORS.borderDim, 0.92);
    gfx.strokeRoundedRect(x, y, width, height, 7);
    this.upgradesContainer.add(gfx);
  }

  _text(x, y, value, style = {}, originX = 0, originY = 0) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: style.fontFamily || UI_FONTS.body,
      fontSize: style.fontSize || "14px",
      color: style.color || UI_COLORS.body,
      fontStyle: style.fontStyle,
      align: style.align,
      wordWrap: style.wordWrap,
      lineSpacing: style.lineSpacing,
    }).setOrigin(originX, originY);
    this.upgradesContainer.add(text);
    return text;
  }

  _renderList(items, x, y, width, height) {
    const title = this.moneyMonsterMode === "sell"
      ? "RESOURCE STOCK"
      : this.moneyMonsterMode === "craft"
        ? "HEAVENBLOCK SCHEMATICS"
        : "AVAILABLE UPGRADES";
    this._text(x + 16, y + 14, title, {
      fontFamily: UI_FONTS.display,
      fontSize: "15px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });

    if (!items.length) {
      this._text(x + width / 2, y + height / 2, "Nothing is available here yet.", {
        fontFamily: UI_FONTS.mono,
        fontSize: "13px",
        color: UI_COLORS.body,
        align: "center",
        wordWrap: { width: width - 40 },
      }, 0.5, 0.5);
      return;
    }

    const start = this.currentPage * this.itemsPerPage;
    const visible = items.slice(start, start + this.itemsPerPage);
    const listTop = y + 39;
    visible.forEach((item, localIndex) => {
      const index = start + localIndex;
      const selected = index === this.selectedIndex;
      const rowY = listTop + localIndex * LIST_ROW_HEIGHT;
      const bg = this.scene.add.rectangle(
        x + width / 2,
        rowY + 27,
        width - 18,
        54,
        selected ? UI_COLORS.cardSel : UI_COLORS.cardBase,
        selected ? 1 : 0.82
      ).setStrokeStyle(selected ? 2 : 1, selected ? UI_COLORS.borderSel : UI_COLORS.borderDim)
        .setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        if (index !== this.selectedIndex) bg.setStrokeStyle(1, UI_COLORS.borderHov);
      });
      bg.on("pointerout", () => {
        if (index !== this.selectedIndex) bg.setStrokeStyle(1, UI_COLORS.borderDim);
      });
      bg.on("pointerdown", () => {
        this.selectedIndex = index;
        this.selectedSellButton = index;
        this.soundSystem?.playUiSelect?.();
        this._render();
      });
      this.upgradesContainer.add(bg);

      const iconKey = this.moneyMonsterMode === "sell"
        ? resourceIconKey(item.resource)
        : this.moneyMonsterMode === "craft"
          ? item.ui?.iconAssetKey || "power"
          : resolveUpgradeUiIcon(item);
      createIconBadge(this.scene, iconKey, {
        x: x + 42,
        y: rowY + 27,
        size: 42,
        iconSize: 34,
        selected,
        parent: this.upgradesContainer,
      });

      const name = this.moneyMonsterMode === "sell" ? item.name : item.name;
      const sub = this.moneyMonsterMode === "sell"
        ? String(this._getResourceAmount(item.resource)).toLocaleString() + " owned"
        : this.moneyMonsterMode === "craft"
          ? this._forgeRowStatus(item)
          : this._upgradeRowStatus(item);
      this._text(x + 69, rowY + 16, name, {
        fontSize: "14px",
        fontStyle: "bold",
        color: selected ? UI_COLORS.title : UI_COLORS.body,
        wordWrap: { width: width - 150 },
      });
      this._text(x + 69, rowY + 37, sub, {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: selected ? UI_COLORS.gold : UI_COLORS.dim,
      });
      if (this.moneyMonsterMode === "sell") {
        this._text(x + width - 22, rowY + 27, formatMoney(this._adjustedUnitPrice(item.resource, item.basePrice)), {
          fontFamily: UI_FONTS.mono,
          fontSize: "11px",
          color: UI_COLORS.gold,
        }, 1, 0.5);
      }
    });

    const pages = Math.max(1, Math.ceil(items.length / this.itemsPerPage));
    const footerY = y + height - 22;
    this._text(x + width / 2, footerY, "PAGE " + (this.currentPage + 1) + " / " + pages, {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: UI_COLORS.body,
    }, 0.5, 0.5);
    if (pages > 1) {
      createButton(this.scene, {
        x: x + 55,
        y: footerY,
        width: 82,
        height: 30,
        label: "PREV",
        hint: "Q",
        accent: UI_COLORS.borderDim,
        parent: this.upgradesContainer,
        fontSize: "10px",
        onClick: () => this.prevPage(),
      });
      createButton(this.scene, {
        x: x + width - 55,
        y: footerY,
        width: 82,
        height: 30,
        label: "NEXT",
        hint: "E",
        accent: UI_COLORS.borderDim,
        parent: this.upgradesContainer,
        fontSize: "10px",
        onClick: () => this.nextPage(),
      });
    }
  }

  _upgradeRowStatus(upgrade) {
    const level = this.upgradeSystem?.getUpgradeLevel?.(upgrade.id) || 0;
    if (upgrade.oneTimePurchase) return level > 0 ? "OWNED" : "ONE-TIME PURCHASE";
    const max = upgrade.maxLevel ?? "MAX";
    return "LEVEL " + level + " / " + max;
  }

  _forgeRowStatus(recipe) {
    const status = this.scene.craftingSystem?.getRecipeStatus?.(recipe.id);
    if (status?.canCraft) return "READY TO CRAFT";
    if (status?.reason === "already_owned") return "OWNED";
    const failed = status?.checks?.find?.((entry) => !entry.met);
    return failed?.label || "SCHEMATIC LOCKED";
  }

  _renderForgeDetail(recipe, x, y, width, height) {
    if (!recipe) {
      this._renderEmptyDetail(x, y, width, height, "No schematics available");
      return;
    }
    const status = this.scene.craftingSystem?.getRecipeStatus?.(recipe.id) || {
      canCraft: false,
      reason: "crafting_system_unavailable",
      checks: [],
    };
    const owned = status.reason === "already_owned";

    createIconBadge(this.scene, recipe.ui?.iconAssetKey || "power", {
      x: x + 58,
      y: y + 58,
      size: 76,
      iconSize: 64,
      selected: true,
      parent: this.upgradesContainer,
    });
    this._text(x + 110, y + 27, recipe.name, {
      fontFamily: UI_FONTS.display,
      fontSize: "23px",
      fontStyle: "bold",
      color: UI_COLORS.title,
      wordWrap: { width: width - 138 },
    });
    this._text(x + 110, y + 59, recipe.ui?.category || "ARC FORGE", {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: UI_COLORS.gold,
    });
    this._text(x + 20, y + 108, recipe.ui?.description || "Forge a permanent vehicle core.", {
      fontSize: "13px",
      color: UI_COLORS.body,
      wordWrap: { width: width - 40, useAdvancedWrap: true },
      lineSpacing: 2,
    });

    const requirementsY = y + Math.min(190, height * 0.38);
    this._text(x + 20, requirementsY, "PERMANENT PROGRESSION + MATERIALS", {
      fontFamily: UI_FONTS.display,
      fontSize: "14px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    const checks = status.checks || [];
    const availableHeight = Math.max(80, y + height - 96 - (requirementsY + 25));
    const lineHeight = checks.length > 7 ? 17 : 20;
    const visibleChecks = checks.slice(0, Math.max(1, Math.floor(availableHeight / lineHeight)));
    visibleChecks.forEach((entry, index) => {
      this._text(x + 24, requirementsY + 27 + index * lineHeight, `${entry.met ? "✓" : "•"} ${entry.label}`, {
        fontFamily: UI_FONTS.mono,
        fontSize: checks.length > 7 ? "10px" : "11px",
        color: entry.met ? UI_COLORS.success : UI_COLORS.danger,
        wordWrap: { width: width - 48 },
      });
    });

    const actionY = y + height - 37;
    const label = owned
      ? "OWNED"
      : status.canCraft
        ? "CRAFT " + recipe.name.toUpperCase()
        : "REQUIREMENTS NOT MET";
    const action = createButton(this.scene, {
      x: x + width / 2,
      y: actionY,
      width: width - 36,
      height: 48,
      label,
      hint: USER_SETTINGS.getKeyLabel("interact"),
      icon: "power",
      accent: status.canCraft ? UI_COLORS.borderSel : UI_COLORS.borderDim,
      parent: this.upgradesContainer,
      fontSize: "13px",
      onClick: () => this.craftRecipe(recipe.id),
    });
    action.setEnabled?.(status.canCraft);
  }

  _renderUpgradeDetail(upgrade, x, y, width, height) {
    if (!upgrade) {
      this._renderEmptyDetail(x, y, width, height, "No upgrades available");
      return;
    }
    const level = this.upgradeSystem.getUpgradeLevel(upgrade.id);
    const cost = getUpgradeCost(upgrade.id, level);
    const check = this.upgradeSystem.canPurchaseUpgrade(upgrade.id);
    const owned = upgrade.oneTimePurchase && level > 0;
    const maxed = owned || level >= (upgrade.maxLevel ?? Infinity) || cost >= Infinity;

    createIconBadge(this.scene, resolveUpgradeUiIcon(upgrade), {
      x: x + 58,
      y: y + 58,
      size: 76,
      iconSize: 64,
      selected: true,
      parent: this.upgradesContainer,
    });
    this._text(x + 110, y + 27, upgrade.name, {
      fontFamily: UI_FONTS.display,
      fontSize: "23px",
      fontStyle: "bold",
      color: UI_COLORS.title,
      wordWrap: { width: width - 138 },
    });
    this._text(x + 110, y + 59, upgrade.category ? String(upgrade.category).toUpperCase() : "UPGRADE", {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: UI_COLORS.gold,
    });
    this._text(x + 20, y + 108, upgrade.description || "No description available.", {
      fontSize: "14px",
      color: UI_COLORS.body,
      wordWrap: { width: width - 40, useAdvancedWrap: true },
      lineSpacing: 3,
    });

    const miningPreview = this._buildMiningPreview(upgrade);
    const statY = y + Math.min(195, height * 0.43);
    const stat = this.scene.add.graphics();
    stat.fillStyle(UI_COLORS.bg, 0.95);
    stat.fillRoundedRect(x + 18, statY, width - 36, 84, 6);
    stat.lineStyle(1, UI_COLORS.borderDim, 0.95);
    stat.strokeRoundedRect(x + 18, statY, width - 36, 84, 6);
    this.upgradesContainer.add(stat);
    this._text(x + 36, statY + 13, owned ? "OWNERSHIP" : "CURRENT LEVEL", {
      fontFamily: UI_FONTS.mono,
      fontSize: "10px",
      color: UI_COLORS.dim,
    });
    this._text(x + 36, statY + 38, owned ? "OWNED" : String(level), {
      fontFamily: UI_FONTS.display,
      fontSize: "22px",
      fontStyle: "bold",
      color: owned ? UI_COLORS.success : UI_COLORS.title,
    });
    this._text(x + width / 2, statY + 38, maxed ? "MAXIMUM" : "NEXT  >  " + (level + 1), {
      fontFamily: UI_FONTS.display,
      fontSize: "18px",
      fontStyle: "bold",
      color: maxed ? UI_COLORS.dim : UI_COLORS.gold,
    }, 0.5, 0.5);
    if (miningPreview) {
      const breakpoint = miningPreview.afterHits < miningPreview.beforeHits;
      this._text(
        x + 36,
        statY + 67,
        `${miningPreview.material.toUpperCase()}  ${miningPreview.beforeHits} → ${miningPreview.afterHits} HITS`
          + (breakpoint ? "  •  BREAKPOINT!" : ""),
        {
          fontFamily: UI_FONTS.mono,
          fontSize: "11px",
          fontStyle: "bold",
          color: breakpoint ? UI_COLORS.success : UI_COLORS.body,
        }
      );
    }

    const requirementsY = statY + 100;
    this._text(x + 20, requirementsY, "REQUIREMENTS", {
      fontFamily: UI_FONTS.display,
      fontSize: "14px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    const requirementLines = this._buildRequirementLines(upgrade, cost);
    requirementLines.slice(0, 4).forEach((line, index) => {
      this._text(x + 24, requirementsY + 26 + index * 20, line.text, {
        fontFamily: UI_FONTS.mono,
        fontSize: "12px",
        color: line.met ? UI_COLORS.success : UI_COLORS.danger,
      });
    });

    const actionY = y + height - 37;
    const actionLabel = owned
      ? (upgrade.id === "sellAllButton" ? "SELL ALL RESOURCES" : "OWNED")
      : maxed
        ? "MAXIMUM LEVEL"
        : "BUY UPGRADE  -  " + formatMoney(cost);
    const action = createButton(this.scene, {
      x: x + width / 2,
      y: actionY,
      width: width - 36,
      height: 48,
      label: actionLabel,
      hint: USER_SETTINGS.getKeyLabel("interact"),
      icon: owned && upgrade.id === "sellAllButton" ? "sell" : "upgrade",
      accent: check.canPurchase || (owned && upgrade.id === "sellAllButton")
        ? UI_COLORS.borderSel
        : UI_COLORS.borderDim,
      parent: this.upgradesContainer,
      fontSize: "13px",
      onClick: () => {
        if (owned && upgrade.id === "sellAllButton") this.sellAllResources();
        else this.purchaseUpgrade(upgrade.id);
      },
    });
    action.setEnabled?.(!maxed || (owned && upgrade.id === "sellAllButton"));
  }

  _buildRequirementLines(upgrade, cost) {
    const wallet = this.upgradeSystem?.getMoney?.() || 0;
    const resources = this.scene.digSystem?.getResourceTotals?.() || {};
    const lines = [{
      text: "Money  " + formatMoney(wallet) + " / " + formatMoney(Number.isFinite(cost) ? cost : 0),
      met: Number.isFinite(cost) && wallet >= cost,
    }];
    Object.entries(upgrade.resources || {}).forEach(([resource, amount]) => {
      const have = resources[resource] || 0;
      lines.push({
        text: getResourceDisplayName(resource) + "  " + have.toLocaleString() + " / " + amount.toLocaleString(),
        met: have >= amount,
      });
    });
    if (upgrade.requiresLevel) {
      const current = this.upgradeSystem?.playerLevelSystem?.getLevel?.() || 0;
      lines.push({ text: "Player level  " + current + " / " + upgrade.requiresLevel, met: current >= upgrade.requiresLevel });
    }
    return lines;
  }

  _buildMiningPreview(upgrade) {
    const digSystem = this.scene.digSystem;
    const worldModel = this.scene.worldModel;
    if (!digSystem?.getHitsToBreakPreview || !worldModel || !upgrade?.id) return null;

    const bestDepth = this.scene.retentionProgressSystem?.getBestDepth?.() || 1;
    const ty = Math.max(
      this.scene.config.topAirRows + 1,
      Math.min(worldModel.depthTiles - 2, this.scene.config.topAirRows + bestDepth)
    );
    let tx = Math.max(1, Math.min(worldModel.widthTiles - 2, this.scene.config.spawnTileX || 1));
    let tileType = TILE_TYPES.DIRT;
    for (let offset = 0; offset < Math.min(40, worldModel.widthTiles - 2); offset += 1) {
      const candidateX = Math.max(1, Math.min(worldModel.widthTiles - 2, tx + offset));
      const candidateType = worldModel.getTileType(candidateX, ty);
      if (worldModel.isDiggable(candidateX, ty) && tileTypeToResource(candidateType)) {
        tx = candidateX;
        tileType = candidateType;
        break;
      }
    }

    const current = digSystem.getHitsToBreakPreview(tileType, tx, ty);
    const projectedEffects = this.upgradeSystem.getProjectedUpgradeEffects?.(upgrade.id);
    const projected = digSystem.getHitsToBreakPreview(tileType, tx, ty, projectedEffects);
    return {
      material: getResourceDisplayName(tileTypeToResource(tileType) || "dirt"),
      beforeHits: current.hits,
      afterHits: projected.hits,
      beforeDamage: current.damage,
      afterDamage: projected.damage,
    };
  }

  _renderSellDetail(item, x, y, width, height) {
    if (!item) {
      this._renderEmptyDetail(x, y, width, height, "No resources can be sold here");
      return;
    }
    const amount = this._getResourceAmount(item.resource);
    const unitPrice = this._adjustedUnitPrice(item.resource, item.basePrice);
    createIconBadge(this.scene, resourceIconKey(item.resource), {
      x: x + 58,
      y: y + 58,
      size: 76,
      iconSize: 64,
      selected: true,
      parent: this.upgradesContainer,
    });
    this._text(x + 110, y + 28, item.name, {
      fontFamily: UI_FONTS.display,
      fontSize: "24px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    this._text(x + 110, y + 62, "RESOURCE EXCHANGE", {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: UI_COLORS.gold,
    });
    this._text(x + 20, y + 116, "Sell from your current stock. Market bonuses are already included in the value shown below.", {
      fontSize: "14px",
      color: UI_COLORS.body,
      wordWrap: { width: width - 40, useAdvancedWrap: true },
      lineSpacing: 3,
    });

    const statY = y + Math.min(205, height * 0.46);
    this._drawSurface(x + 18, statY, width - 36, 78, false);
    this._text(x + 36, statY + 17, "IN STOCK", {
      fontFamily: UI_FONTS.mono,
      fontSize: "10px",
      color: UI_COLORS.dim,
    });
    this._text(x + 36, statY + 48, amount.toLocaleString(), {
      fontFamily: UI_FONTS.display,
      fontSize: "24px",
      fontStyle: "bold",
      color: amount > 0 ? UI_COLORS.title : UI_COLORS.dim,
    });
    this._text(x + width - 36, statY + 17, "VALUE EACH", {
      fontFamily: UI_FONTS.mono,
      fontSize: "10px",
      color: UI_COLORS.dim,
    }, 1, 0);
    this._text(x + width - 36, statY + 48, formatMoney(unitPrice), {
      fontFamily: UI_FONTS.display,
      fontSize: "21px",
      fontStyle: "bold",
      color: UI_COLORS.gold,
    }, 1, 0.5);

    const buttonsY = y + height - 39;
    const half = (width - 48) / 2;
    const sellOne = createButton(this.scene, {
      x: x + 18 + half / 2,
      y: buttonsY,
      width: half,
      height: 48,
      label: "SELL 1  -  " + formatMoney(unitPrice),
      hint: "Enter",
      icon: "sell",
      accent: amount > 0 ? UI_COLORS.borderGood : UI_COLORS.borderDim,
      parent: this.upgradesContainer,
      fontSize: "11px",
      onClick: () => this.sellResource(item.resource, 1, item.basePrice),
    });
    sellOne.setEnabled?.(amount > 0);
    const sellStack = createButton(this.scene, {
      x: x + width - 18 - half / 2,
      y: buttonsY,
      width: half,
      height: 48,
      label: "SELL STACK  -  " + formatMoney(unitPrice * amount),
      hint: "F",
      icon: "sell",
      accent: amount > 0 ? UI_COLORS.borderSel : UI_COLORS.borderDim,
      parent: this.upgradesContainer,
      fontSize: "11px",
      onClick: () => this.sellResource(item.resource, amount, item.basePrice),
    });
    sellStack.setEnabled?.(amount > 0);
  }

  _renderEmptyDetail(x, y, width, height, label) {
    createIconBadge(this.scene, "lock", {
      x: x + width / 2,
      y: y + height / 2 - 35,
      size: 72,
      iconSize: 60,
      parent: this.upgradesContainer,
    });
    this._text(x + width / 2, y + height / 2 + 34, label, {
      fontFamily: UI_FONTS.mono,
      fontSize: "13px",
      color: UI_COLORS.body,
      align: "center",
      wordWrap: { width: width - 60 },
    }, 0.5, 0.5);
  }

  _getResourceAmount(resource) {
    return this.scene.digSystem?.getResourceTotals?.()?.[resource] || 0;
  }

  _adjustedUnitPrice(resource, basePrice) {
    const effects = this.upgradeSystem?.getUpgradeEffects?.() || {};
    return getAdjustedResourceUnitPrice(resource, effects, basePrice);
  }

  getItemsOnCurrentPage() {
    const items = this._itemsForCurrentMode();
    const start = this.currentPage * this.itemsPerPage;
    return items.slice(start, start + this.itemsPerPage);
  }

  navigateUp() {
    const items = this._itemsForCurrentMode();
    if (!items.length) return;
    this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
    this.selectedSellButton = this.selectedIndex;
    this.soundSystem?.playUiSelect?.();
    this._render();
  }

  navigateDown() {
    const items = this._itemsForCurrentMode();
    if (!items.length) return;
    this.selectedIndex = (this.selectedIndex + 1) % items.length;
    this.selectedSellButton = this.selectedIndex;
    this.soundSystem?.playUiSelect?.();
    this._render();
  }

  navigateLeft() {
    if (isSellCapableMerchant(this.currentMerchant) && this.moneyMonsterMode === "sell") {
      this.setMerchantMode(isArcForgeMerchant(this.currentMerchant) ? "craft" : "buy");
    } else {
      this.prevPage();
    }
  }

  navigateRight() {
    if (
      isSellCapableMerchant(this.currentMerchant)
      && this.moneyMonsterMode === (isArcForgeMerchant(this.currentMerchant) ? "craft" : "buy")
    ) {
      this.setMerchantMode("sell");
    } else {
      this.nextPage();
    }
  }

  prevPage() {
    const items = this._itemsForCurrentMode();
    const pages = Math.max(1, Math.ceil(items.length / this.itemsPerPage));
    this.currentPage = (this.currentPage - 1 + pages) % pages;
    this.selectedIndex = Math.min(this.currentPage * this.itemsPerPage, Math.max(0, items.length - 1));
    this.soundSystem?.playUiSelect?.();
    this._render();
  }

  nextPage() {
    const items = this._itemsForCurrentMode();
    const pages = Math.max(1, Math.ceil(items.length / this.itemsPerPage));
    this.currentPage = (this.currentPage + 1) % pages;
    this.selectedIndex = Math.min(this.currentPage * this.itemsPerPage, Math.max(0, items.length - 1));
    this.soundSystem?.playUiSelect?.();
    this._render();
  }

  updateSelection() {
    this._render();
  }

  updateSellSelection() {
    this.selectedIndex = this.selectedSellButton;
    this._render();
  }

  updatePagination() {
    this._render();
  }

  purchaseSelected() {
    if (this.moneyMonsterMode === "sell") {
      const item = this.sellItems[this.selectedIndex];
      if (item) this.sellResource(item.resource, 1, item.basePrice);
      return;
    }
    if (this.moneyMonsterMode === "craft") {
      const recipe = this.forgeRecipes[this.selectedIndex];
      if (recipe) this.craftRecipe(recipe.id);
      return;
    }
    const upgrade = this.allUpgrades[this.selectedIndex];
    if (!upgrade) return;
    const level = this.upgradeSystem.getUpgradeLevel(upgrade.id);
    if (upgrade.id === "sellAllButton" && level > 0) this.sellAllResources();
    else this.purchaseUpgrade(upgrade.id);
  }

  sellSelectedStack() {
    if (this.moneyMonsterMode !== "sell") return;
    const item = this.sellItems[this.selectedIndex];
    if (!item) return;
    this.sellResource(item.resource, this._getResourceAmount(item.resource), item.basePrice);
  }

  craftRecipe(recipeId) {
    if (!this.isVisible || !recipeId) return;
    const result = this.scene.craftingSystem?.craft?.(recipeId);
    if (!result?.success) {
      const messages = {
        already_owned: "This core is already forged.",
        not_enough_relics: "More Ancient Relics must be discovered.",
        requires_upgrade: "A prerequisite upgrade is missing.",
        requires_blueprint: "Complete all three Heavenblocks first.",
        requires_installed_parts: "All three Heavenblock parts must be installed.",
        requires_zenith_keystone: "Open all three Arc Vaults to forge the Zenith Keystone.",
        not_enough_resources: "Required crafting materials are missing.",
        craft_in_progress: "The Forge is already active.",
        progression_system_unavailable: "Heavenblock progression is unavailable.",
      };
      this.soundSystem?.playUiSelect?.();
      this._notify(messages[result?.reason] || "Crafting requirements are not met.", UI_COLORS.danger);
      this._render();
      return;
    }

    this.soundSystem?.playUiConfirm?.();
    this.scene.arcCoreVehicleSystem?.syncOwnership?.();
    this.scene.uiResourceBar?.setResources?.(this.scene.digSystem?.getResourceTotals?.() || {});
    this.scene.queueDugTilesSave?.();
    this._notify(
      result.recipe?.ui?.successCopy || `Forged ${result.recipe?.name || "Arc Core"}.`,
      UI_COLORS.success,
    );
    this._render();
  }

  purchaseUpgrade(upgradeId) {
    if (!this.isVisible || !upgradeId) return;
    const upgrade = UPGRADES[upgradeId];
    const miningPreview = upgrade ? this._buildMiningPreview({ ...upgrade, id: upgradeId }) : null;
    const result = this.upgradeSystem?.purchaseUpgrade?.(upgradeId);
    if (!upgrade || !result) {
      this._notify("Upgrade unavailable", UI_COLORS.danger);
      return;
    }
    if (!result.success) {
      const messages = {
        not_enough_money: "Not enough money.",
        max_level: "This upgrade is already at maximum.",
        not_enough_resources: "Required materials are missing.",
        requires_upgrade: "Another upgrade is required first.",
        requires_depth_gate: "A deeper milestone must be claimed first.",
      };
      this.soundSystem?.playUiSelect?.();
      this._notify(messages[result.reason] || "Purchase requirements are not met.", UI_COLORS.danger);
      this._render();
      return;
    }

    this.soundSystem?.playUiConfirm?.();
      if (upgradeId === "worldTwoTunnelAccess") this.scene.surfaceTunnelDoorSystem?.syncFromUpgrade?.(true);
      if (upgradeId === "arcCoreVehicle") this.scene.arcCoreVehicleSystem?.syncOwnership?.();
    this._notify("Purchased " + upgrade.name + ".", UI_COLORS.success);
    this.scene.retentionProgressSystem?.recordUpgrade?.(upgrade.name, miningPreview);
    this.scene.queueDugTilesSave?.();

    if (upgradeId === "boboWisdom") {
      this.hide();
      this.scene.showGameDialog?.(
        "Bobo's Wisdom",
        "Flight, Quickslash, and Thunder Strike all draw from Gem Power.\n\n" +
        "Build capacity, efficiency, regeneration, and movement before attempting the highest sky routes.\n\n" +
        OPENING_FLIGHT_ARTIFACT_CONFIG.copy.merchantHint
      );
      return;
    }
    if (upgradeId === "gemPowerUnlock") {
      this.hide();
      this.scene.showGameDialog?.(
        "Gem of Great Power",
        "Flight is unlocked.\n\nHold " + USER_SETTINGS.getKeyLabel("fly") +
        " in the air to fly. Visit the Gem Power Workshop to improve capacity, efficiency, and speed."
      );
      return;
    }
    this.populateUpgrades(this.currentMerchant);
  }

  sellResource(resource, amount, basePrice) {
    const digSystem = this.scene.digSystem;
    if (!digSystem || !this.upgradeSystem) return;
    const resources = digSystem.getResourceTotals();
    const available = resources[resource] || 0;
    const count = Math.max(0, Math.min(available, Math.floor(amount || 0)));
    if (count <= 0) {
      this._notify("No " + getResourceDisplayName(resource) + " available to sell.", UI_COLORS.danger);
      return;
    }
    if (!this._confirmCraftingMaterialSale([resource], `resource:${resource}:${count}`)) return;

    const unitPrice = this._adjustedUnitPrice(resource, basePrice);
    let total = unitPrice * count;
    const luckySales = this.upgradeSystem.getUpgradeEffects?.().luckySales || 0;
    if (luckySales > 0 && Math.random() < luckySales * 0.1) {
      const bonus = Math.floor(total * 0.5);
      total += bonus;
      this._notify("Lucky sale bonus: +" + formatMoney(bonus), UI_COLORS.gold);
    }

    resources[resource] = available - count;
    digSystem.setResourceTotals(resources);
    this.upgradeSystem.addMoney(total);
    this.scene.retentionProgressSystem?.recordSale?.(total, count);
    this.soundSystem?.playUiConfirm?.();
    this._notify(
      "Sold " + count.toLocaleString() + " " + getResourceDisplayName(resource) + " for " + formatMoney(total) + ".",
      UI_COLORS.success
    );
    this.scene.uiResourceBar?.setResources?.(digSystem.getResourceTotals());
    this.scene.queueDugTilesSave?.();
    this._render();
  }

  sellAllResources() {
    const digSystem = this.scene.digSystem;
    if (!digSystem || !this.upgradeSystem) return;
    const resources = digSystem.getResourceTotals();
    const sellKeys = sellResourceKeysForMerchant(this.currentMerchant);
    if (!this._confirmCraftingMaterialSale(sellKeys, `all:${this.currentMerchant}`)) return;
    let totalMoney = 0;
    let totalSold = 0;
    sellKeys.forEach(resource => {
      const amount = resources[resource] || 0;
      if (amount <= 0) return;
      const basePrice = RESOURCE_PRICES_CONFIG.basePrices[resource] || 0;
      totalMoney += this._adjustedUnitPrice(resource, basePrice) * amount;
      totalSold += amount;
      resources[resource] = 0;
    });
    if (totalSold <= 0) {
      this._notify("No resources are available to sell.", UI_COLORS.danger);
      return;
    }
    digSystem.setResourceTotals(resources);
    this.upgradeSystem.addMoney(totalMoney);
    this.scene.retentionProgressSystem?.recordSale?.(totalMoney, totalSold);
    this.soundSystem?.playUiConfirm?.();
    this._notify("Sold " + totalSold.toLocaleString() + " resources for " + formatMoney(totalMoney) + ".", UI_COLORS.success);
    this.scene.uiResourceBar?.setResources?.(resources);
    this.scene.queueDugTilesSave?.();
    this._render();
  }

  _confirmCraftingMaterialSale(resourceKeys, signature) {
    const conflicts = this.scene.craftingSystem
      ?.getRecipeIngredientConflicts?.(resourceKeys) || [];
    const resources = this.scene.digSystem?.getResourceTotals?.() || {};
    const atRisk = conflicts.filter((entry) => (resources[entry.resourceKey] || 0) > 0);
    if (!atRisk.length) return true;

    const now = Date.now();
    if (this.saleConfirmSignature === signature && now <= this.sellAllConfirmUntil) {
      this.saleConfirmSignature = "";
      this.sellAllConfirmUntil = 0;
      return true;
    }

    this.saleConfirmSignature = signature;
    this.sellAllConfirmUntil = now + SELL_ALL_CONFIRM_WINDOW_MS;
    const names = atRisk.map((entry) => getResourceDisplayName(entry.resourceKey)).join(", ");
    this.soundSystem?.playUiSelect?.();
    this._notify(
      `FORGE MATERIAL WARNING  •  ${names} are used by an uncrafted Arc Core. Repeat within 4 seconds to sell.`,
      UI_COLORS.gold,
    );
    return false;
  }

  _notify(message, color) {
    this.scene.hudSystem?.flashStatus?.(message, color || UI_COLORS.body, 2200);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.isVisible = false;
    Object.values(this.keys || {}).forEach(key => key?.destroy?.());
    this.shell?.destroy?.();
    this.scene = null;
  }
}
