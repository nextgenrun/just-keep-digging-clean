import { UPGRADES } from "../../values/upgradeDefinitions.js";
import { resolveFirstFiveMinutesEnabled } from "../../values/firstFiveMinutes.js";
import { getUpgradeCost } from "../../values/upgradeFormulas.js";
import {
  RESOURCE_PRICES_CONFIG,
  getAdjustedResourceUnitPrice,
  roundResourceCurrency,
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
} from "../../values/resourceTypes.js";
import { createButton } from "../PhaserUiKit.js";
import {
  createUiIcon,
  isSellCapableMerchant,
  resolveMerchantUiIcon,
  resolveUpgradeUiIcon,
} from "../UiIconAtlas.js";
import { createIconBadge, createModalShell } from "../UiModalShell.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HARDCORE_MODE_CONFIG } from "../../values/hardcoreMode.js";

const LIST_ROW_HEIGHT = 62;
const ARC_FORGE_MERCHANT_ID = "magmaMoneyMonster";
const SELL_ALL_CONFIRM_WINDOW_MS = 4500;

function isArcForgeMerchant(merchantId) {
  return merchantId === ARC_FORGE_MERCHANT_ID;
}

function isKnownShopMerchant(merchantId) {
  return merchantId !== "default"
    && Object.prototype.hasOwnProperty.call(SHOP_MERCHANT_PROFILES, merchantId);
}

function resourceIconKey(resource) {
  const presentation = UI_RESOURCE_PRESENTATION[resource];
  return presentation?.icon || presentation?.iconKey || resource;
}

function formatMoney(value) {
  return Math.max(0, Number(value) || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }) + " M";
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
      previousPage: keyboard.addKey(code.PAGE_UP),
      nextPage: keyboard.addKey(code.PAGE_DOWN),
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
      "W/S or arrows: select    PgUp/PgDn: pages    " +
      "A/D or Tab: tabs/pages    " + interact + "/Enter: action    ESC: close"
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
    else if (just(this.keys.previousPage)) this.prevPage();
    else if (just(this.keys.nextPage)) this.nextPage();
    else if (this.scene.interactKey && just(this.scene.interactKey)) this.purchaseSelected();
    else if (just(this.keys.confirm) || just(this.keys.space)) this.purchaseSelected();
    else if (just(this.keys.action)) {
      if (this.moneyMonsterMode === "sell") this.sellSelectedStack();
      else this.purchaseSelected();
    }
  }

  isOperational() {
    return Boolean(
      !this._destroyed
      && this.scene
      && this.shell?.root
      && this.shell.root.active !== false
      && this.shell?.backdrop
      && this.shell.backdrop.active !== false
    );
  }

  show(merchantId) {
    if (!this.isOperational() || !isKnownShopMerchant(merchantId)) return false;
    if (this.scene?.systemIntroductionSystem
      && this.scene.systemIntroductionSystem.isMerchantAvailable?.(merchantId) === false) return false;
    this.currentMerchant = merchantId;
    this.isVisible = true;
    this.currentPage = 0;
    this.selectedIndex = 0;
    this.moneyMonsterMode = this.scene.townSquareTutorialSystem
      ?.getPreferredMerchantMode?.(merchantId)
      || (isArcForgeMerchant(merchantId) ? "craft" : "buy");
    this.selectedSellButton = 0;
    this.sellAllConfirmUntil = 0;
    this.saleConfirmSignature = "";
    this.scene.setShopOpen?.(true);
    this._syncMerchantChrome();
    this.populateUpgrades(merchantId);
    this.shell.show();
    this._layoutChrome();
    this.soundSystem?.playUiSelect?.();
    return true;
  }

  hide() {
    if (this._destroyed || !this.isVisible) return;
    this.isVisible = false;
    this.scene.setShopOpen?.(false);
    this.shell.hide();
  }

  _syncMerchantChrome() {
    const profile = SHOP_MERCHANT_PROFILES[this.currentMerchant] || SHOP_MERCHANT_PROFILES.default;
    const rushHeader = this.scene?.randomEventBridge?.getShopHeader?.(this.currentMerchant);
    this.shell.setHeader(profile.title, rushHeader || (profile.role + "  |  " + profile.greeting));
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
    const firstFiveEnabled = this.scene?.townSquareTutorialSystem
      ?.isFirstFiveEnabled?.()
      ?? resolveFirstFiveMinutesEnabled();
    const focusedUpgradeId = this.scene?.townSquareTutorialSystem
      ?.getFocusedUpgradeId?.(merchantId) || null;
    const isTutorialUpgradeAvailable = id => this.scene?.townSquareTutorialSystem
      ?.isUpgradeAvailable?.(id) ?? true;
    const introduction = this.scene?.systemIntroductionSystem;
    const presentation = introduction?.config?.shopPresentation || {};
    const keepLocked = presentation.keepLockedUpgradesVisible !== false;
    const getSystemAvailability = (id, upgrade) => (
      introduction?.getUpgradeAvailability?.(id, upgrade)
      || {
        available: introduction?.isUpgradeAvailable?.(id, upgrade) ?? true,
        reason: null,
        feature: "core",
        short: "AVAILABLE NOW",
        detail: "",
      }
    );
    this.allUpgrades = Object.entries(UPGRADES)
      .filter(([id, upgrade]) => (
        isGameplayUpgradeEnabled(id, this.scene.gameplayCapabilities) &&
        upgrade.merchant === merchantId &&
        !upgrade.comingSoon &&
        !upgrade.hiddenFromShop &&
        (!upgrade.firstFiveOnly || firstFiveEnabled) &&
        (!upgrade.depthEconomyOnly || this.scene?.config?.resourceEconomyEnabled !== false)
      ))
      .map(([id, upgrade]) => {
        const owned = (this.upgradeSystem?.getUpgradeLevel?.(id) || 0) > 0;
        const tutorialLocked = !owned && (
          !isTutorialUpgradeAvailable(id)
          || (focusedUpgradeId && id !== focusedUpgradeId)
        );
        const availability = tutorialLocked
          ? {
            available: false,
            reason: "guided_step_locked",
            feature: "tutorial",
            short: presentation.guidedLockShort || "GUIDED STEP",
            detail: presentation.guidedLockDetail || "Complete the current guided shop step first.",
          }
          : getSystemAvailability(id, upgrade);
        return { ...upgrade, id, availability };
      })
      .filter(upgrade => keepLocked || upgrade.availability.available)
      .sort((a, b) => Number(b.id === focusedUpgradeId) - Number(a.id === focusedUpgradeId));
    if (
      merchantId === HARDCORE_MODE_CONFIG.bobo.merchantId
      && this.scene.canOfferHardcoreConversion?.()
    ) {
      this.allUpgrades.unshift({
        id: HARDCORE_MODE_CONFIG.bobo.itemId,
        isHardcoreConversion: true,
        name: HARDCORE_MODE_CONFIG.copy.boboOfferName,
        description: HARDCORE_MODE_CONFIG.copy.boboOfferSummary,
        category: HARDCORE_MODE_CONFIG.bobo.category,
      });
    }
    this.forgeRecipes = isArcForgeMerchant(merchantId)
      ? Object.values(CRAFTING_RECIPES).filter(recipe => (
        isGameplayUpgradeEnabled(recipe.output?.upgradeId, this.scene.gameplayCapabilities)
      ))
      : [];
    this.sellItems = sellResourceKeysForMerchant(merchantId).map(resource => ({
      resource,
      name: getResourceDisplayName(resource),
      basePrice: RESOURCE_PRICES_CONFIG.basePrices[resource] || 0,
    }));
    const rushTarget = this.scene?.randomEventBridge?.getRushSnapshot?.()?.targetResource;
    if (merchantId === "moneyMonster" && rushTarget) {
      this.sellItems.sort((a, b) => Number(b.resource === rushTarget) - Number(a.resource === rushTarget));
    }
    this._syncPageToSelection(this._itemsForCurrentMode());
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
      this._createShopButton({
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
      this._createShopButton({
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

  _createShopButton(options = {}) {
    return createButton(this.scene, {
      depth: this.shell.depth + 2,
      parent: this.upgradesContainer,
      ...options,
    });
  }

  _renderList(items, x, y, width, height) {
    const title = this.moneyMonsterMode === "sell"
      ? "RESOURCE STOCK"
      : this.moneyMonsterMode === "craft"
        ? "HEAVENBLOCK SCHEMATICS"
        : "UPGRADE CATALOG";
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
      ).setStrokeStyle(selected ? 2 : 1, selected ? UI_COLORS.borderSel : UI_COLORS.borderDim);
      this.upgradesContainer.add(bg);

      const progressionLocked = this.moneyMonsterMode === "buy"
        && item.availability?.available === false;
      const iconKey = this.moneyMonsterMode === "sell"
        ? resourceIconKey(item.resource)
        : this.moneyMonsterMode === "craft"
          ? item.ui?.iconAssetKey || "power"
          : item.isHardcoreConversion
            ? null
            : resolveUpgradeUiIcon(item);
      if (item.isHardcoreConversion) {
        const crest = this.scene.add.image(
          x + 42,
          rowY + 27,
          ASSET_KEYS.ui.hardcore.oathCrest,
        ).setDisplaySize(42, 42).setAlpha(selected ? 1 : 0.78);
        this.upgradesContainer.add(crest);
      } else {
        createIconBadge(this.scene, iconKey, {
          x: x + 42,
          y: rowY + 27,
          size: 42,
          iconSize: 34,
          selected,
          parent: this.upgradesContainer,
        });
      }
      if (progressionLocked) {
        createUiIcon(this.scene, "lock", {
          x: x + 54,
          y: rowY + 39,
          size: 14,
          parent: this.upgradesContainer,
        });
      }

      const name = this.moneyMonsterMode === "sell" ? item.name : item.name;
      const rushStatus = this.moneyMonsterMode === "sell"
        ? this.scene?.randomEventBridge?.getRushRowStatus?.(item.resource, this.currentMerchant)
        : null;
      const sub = this.moneyMonsterMode === "sell"
        ? (rushStatus || String(this._getResourceAmount(item.resource)).toLocaleString() + " owned")
        : this.moneyMonsterMode === "craft"
          ? this._forgeRowStatus(item)
          : this._upgradeRowStatus(item);
      this._text(x + 69, rowY + 16, name, {
        fontSize: "14px",
        fontStyle: "bold",
        color: progressionLocked ? UI_COLORS.dim : selected ? UI_COLORS.title : UI_COLORS.body,
        wordWrap: { width: width - 150 },
      });
      this._text(x + 69, rowY + 37, sub, {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: progressionLocked ? UI_COLORS.danger : selected ? UI_COLORS.gold : UI_COLORS.dim,
      });
      if (this.moneyMonsterMode === "sell") {
        this._text(x + width - 22, rowY + 27, formatMoney(this._adjustedUnitPrice(item.resource, item.basePrice)), {
          fontFamily: UI_FONTS.mono,
          fontSize: "11px",
          color: UI_COLORS.gold,
        }, 1, 0.5);
      }

      // Use the same shared interaction primitive as the shop tabs/actions.
      // Its sole hit layer sits over the icon, labels, status, price, and gap.
      const rowButton = this._createShopButton({
        x: x + width / 2,
        y: rowY + 27,
        width: width - 18,
        height: 54,
        label: "",
        autoIcon: false,
        visibleChrome: false,
        playSounds: false,
        selected,
        onFocus: () => {
          if (index === this.selectedIndex) return;
          this.selectedIndex = index;
          this.selectedSellButton = index;
          this.topButtonSelected = null;
          this._render();
        },
        onClick: () => {
          this.selectedIndex = index;
          this.selectedSellButton = index;
          this.topButtonSelected = null;
          this.soundSystem?.playUiSelect?.();
          this._render();
        },
      });
      rowButton.hit.on("pointerout", () => {
        if (index !== this.selectedIndex) bg.setStrokeStyle(1, UI_COLORS.borderDim);
      });
    });

    const pages = Math.max(1, Math.ceil(items.length / this.itemsPerPage));
    const footerY = y + height - 22;
    this._text(x + width / 2, footerY, "PAGE " + (this.currentPage + 1) + " / " + pages, {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: UI_COLORS.body,
    }, 0.5, 0.5);
    if (pages > 1) {
      this._createShopButton({
        x: x + 55,
        y: footerY,
        width: 82,
        height: 30,
        label: "PREV",
        hint: "PGUP",
        accent: UI_COLORS.borderDim,
        parent: this.upgradesContainer,
        fontSize: "10px",
        onClick: () => this.prevPage(),
      });
      this._createShopButton({
        x: x + width - 55,
        y: footerY,
        width: 82,
        height: 30,
        label: "NEXT",
        hint: "PGDN",
        accent: UI_COLORS.borderDim,
        parent: this.upgradesContainer,
        fontSize: "10px",
        onClick: () => this.nextPage(),
      });
    }
  }

  _upgradeRowStatus(upgrade) {
    if (upgrade?.isHardcoreConversion) return HARDCORE_MODE_CONFIG.bobo.rowStatus;
    const level = this.upgradeSystem?.getUpgradeLevel?.(upgrade.id) || 0;
    if (upgrade.oneTimePurchase && level > 0) return "OWNED";
    if (upgrade.availability?.available === false) {
      return "LOCKED  •  " + (upgrade.availability.short || "PROGRESSION");
    }
    if (upgrade.oneTimePurchase) return "ONE-TIME PURCHASE";
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
      const lineY = requirementsY + 27 + index * lineHeight;
      createUiIcon(this.scene, entry.met ? "check" : "warning", {
        x: x + 28,
        y: lineY + 7,
        size: 14,
        parent: this.upgradesContainer,
      });
      this._text(x + 42, lineY, entry.label, {
        fontFamily: UI_FONTS.mono,
        fontSize: checks.length > 7 ? "10px" : "11px",
        color: entry.met ? UI_COLORS.success : UI_COLORS.danger,
        wordWrap: { width: width - 66 },
      });
    });

    const actionY = y + height - 37;
    const label = owned
      ? "OWNED"
      : status.canCraft
        ? "CRAFT " + recipe.name.toUpperCase()
        : "REQUIREMENTS NOT MET";
    const action = this._createShopButton({
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
    if (upgrade.isHardcoreConversion) {
      this._renderHardcoreConversionDetail(upgrade, x, y, width, height);
      return;
    }
    const level = this.upgradeSystem.getUpgradeLevel(upgrade.id);
    const cost = getUpgradeCost(upgrade.id, level);
    const availability = upgrade.availability || { available: true, short: "", detail: "" };
    const progressionLocked = availability.available === false;
    const purchaseCheck = this.upgradeSystem.canPurchaseUpgrade(upgrade.id);
    const check = progressionLocked
      ? { canPurchase: false, reason: availability.reason || "progression_locked" }
      : purchaseCheck;
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
    if (progressionLocked) {
      createUiIcon(this.scene, "lock", {
        x: x + 78,
        y: y + 78,
        size: 22,
        parent: this.upgradesContainer,
      });
    }
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
    const requirementsY = statY + 100;
    this._text(x + 20, requirementsY, "REQUIREMENTS", {
      fontFamily: UI_FONTS.display,
      fontSize: "14px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    });
    const requirementLines = this._buildRequirementLines(upgrade, cost);
    const requirementColumns = requirementLines.length > 4 ? 2 : 1;
    const rowsPerColumn = Math.ceil(requirementLines.length / requirementColumns);
    const requirementGap = 20;
    requirementLines.forEach((line, index) => {
      const column = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      const columnWidth = (width - 48) / requirementColumns;
      this._text(x + 24 + column * columnWidth, requirementsY + 26 + row * requirementGap, line.text, {
        fontFamily: UI_FONTS.mono,
        fontSize: requirementColumns > 1 ? "11px" : "12px",
        color: line.met ? UI_COLORS.success : UI_COLORS.danger,
      });
    });

    const actionY = y + height - 37;
    const actionLabel = progressionLocked
      ? "LOCKED  -  " + (availability.short || "KEEP PROGRESSING")
      : owned
        ? (upgrade.id === "sellAllButton" ? "SELL ALL RESOURCES" : "OWNED")
        : maxed
          ? "MAXIMUM LEVEL"
          : "BUY UPGRADE  -  " + formatMoney(cost);
    const action = this._createShopButton({
      x: x + width / 2,
      y: actionY,
      width: width - 36,
      height: 48,
      label: actionLabel,
      hint: USER_SETTINGS.getKeyLabel("interact"),
      icon: progressionLocked ? "lock" : owned && upgrade.id === "sellAllButton" ? "sell" : "upgrade",
      accent: check.canPurchase || (owned && upgrade.id === "sellAllButton")
        ? UI_COLORS.borderSel
        : UI_COLORS.borderDim,
      parent: this.upgradesContainer,
      fontSize: "13px",
      onClick: () => {
        if (progressionLocked) {
          this._notify(availability.detail || "Keep progressing to unlock this upgrade.", UI_COLORS.danger);
        } else if (owned && upgrade.id === "sellAllButton") this.sellAllResources();
        else this.purchaseUpgrade(upgrade.id);
      },
    });
    action.setEnabled?.(!progressionLocked && (!maxed || (owned && upgrade.id === "sellAllButton")));
  }

  _renderHardcoreConversionDetail(upgrade, x, y, width, height) {
    const crest = this.scene.add.image(
      x + 60,
      y + 62,
      ASSET_KEYS.ui.hardcore.oathCrest,
    ).setDisplaySize(88, 88);
    this.upgradesContainer.add(crest);
    this._text(x + 118, y + 25, upgrade.name, {
      fontFamily: UI_FONTS.display,
      fontSize: "23px",
      fontStyle: "bold",
      color: UI_COLORS.danger,
      wordWrap: { width: width - 145 },
    });
    this._text(x + 118, y + 59, HARDCORE_MODE_CONFIG.bobo.category, {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      color: UI_COLORS.gold,
    });
    this._text(x + 20, y + 125, upgrade.description, {
      fontSize: "14px",
      color: UI_COLORS.body,
      wordWrap: { width: width - 40, useAdvancedWrap: true },
      lineSpacing: 3,
    });

    const warningY = y + Math.min(220, height * 0.46);
    this._drawSurface(x + 18, warningY, width - 36, 132, false);
    [
      "• Hardcore is armed immediately because Flight is unlocked.",
      "• Darkness, pressure, hazards, abilities and the Wurm can drain GP.",
      "• At 0 GP the free revive or one life is consumed; the save stays intact.",
      "• This conversion can never be reversed.",
    ].forEach((line, index) => {
      this._text(x + 36, warningY + 18 + index * 27, line, {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: index >= 2 ? UI_COLORS.danger : UI_COLORS.body,
        wordWrap: { width: width - 72 },
      });
    });

    this._createShopButton({
      x: x + width / 2,
      y: y + height - 37,
      width: width - 36,
      height: 48,
      label: HARDCORE_MODE_CONFIG.bobo.actionLabel,
      hint: USER_SETTINGS.getKeyLabel("interact"),
      icon: "warning",
      accent: UI_COLORS.borderBad,
      parent: this.upgradesContainer,
      fontSize: "12px",
      onClick: () => this.scene.requestHardcoreConversion?.(),
    });
  }

  _buildRequirementLines(upgrade, cost) {
    const wallet = this.upgradeSystem?.getMoney?.() || 0;
    const resources = this.scene.digSystem?.getResourceTotals?.() || {};
    const lines = [];
    if (upgrade.availability?.available === false) {
      lines.push({
        text: "Unlock  " + (upgrade.availability.detail || "Keep progressing."),
        met: false,
      });
    }
    lines.push({
      text: "Money  " + formatMoney(wallet) + " / " + formatMoney(Number.isFinite(cost) ? cost : 0),
      met: Number.isFinite(cost) && wallet >= cost,
    });
    Object.entries(upgrade.resources || {}).forEach(([resource, amount]) => {
      const have = resources[resource] || 0;
      lines.push({
        text: getResourceDisplayName(resource) + "  " + have.toLocaleString() + " / " + amount.toLocaleString(),
        met: have >= amount,
      });
    });
    if (upgrade.requires) {
      const requiredUpgrade = UPGRADES[upgrade.requires];
      const requiredLevel = this.upgradeSystem?.getUpgradeLevel?.(upgrade.requires) || 0;
      lines.push({
        text: "Requires  " + (requiredUpgrade?.name || upgrade.requires),
        met: requiredLevel > 0,
      });
    }
    if (upgrade.requiresLevel) {
      const current = this.upgradeSystem?.playerLevelSystem?.getLevel?.() || 0;
      lines.push({ text: "Player level  " + current + " / " + upgrade.requiresLevel, met: current >= upgrade.requiresLevel });
    }
    if (upgrade.requiresDepthGateAccepted) {
      const depth = upgrade.requiresDepthGateAccepted;
      lines.push({
        text: "Depth milestone  " + depth + " m",
        met: this.upgradeSystem?.isDepthGateAccepted?.(depth) === true,
      });
    }
    return lines;
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
    const sellOne = this._createShopButton({
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
    const sellStack = this._createShopButton({
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
    const permanent = this._permanentUnitPrice(resource, basePrice);
    return this.scene?.randomEventBridge?.quoteSaleUnit?.(resource, permanent, this.currentMerchant) ?? permanent;
  }

  _permanentUnitPrice(resource, basePrice) {
    const effects = this.upgradeSystem?.getUpgradeEffects?.() || {};
    return getAdjustedResourceUnitPrice(resource, effects, basePrice);
  }

  getItemsOnCurrentPage() {
    const items = this._itemsForCurrentMode();
    const start = this.currentPage * this.itemsPerPage;
    return items.slice(start, start + this.itemsPerPage);
  }

  _syncPageToSelection(items = this._itemsForCurrentMode()) {
    if (!items.length) {
      this.selectedIndex = 0;
      this.selectedSellButton = 0;
      this.currentPage = 0;
      return;
    }
    this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, items.length - 1));
    this.selectedSellButton = this.selectedIndex;
    this.currentPage = Math.floor(this.selectedIndex / this.itemsPerPage);
  }

  navigateUp() {
    const items = this._itemsForCurrentMode();
    if (!items.length) return;
    this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
    this._syncPageToSelection(items);
    this.selectedSellButton = this.selectedIndex;
    this.soundSystem?.playUiSelect?.();
    this._render();
  }

  navigateDown() {
    const items = this._itemsForCurrentMode();
    if (!items.length) return;
    this.selectedIndex = (this.selectedIndex + 1) % items.length;
    this._syncPageToSelection(items);
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
    if (upgrade.isHardcoreConversion) {
      this.scene.requestHardcoreConversion?.();
      return;
    }
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
    this.scene.journeySystem?.recordCraft?.(result);
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
    const listedUpgrade = this.allUpgrades?.find(item => item.id === upgradeId);
    if (!upgrade || !listedUpgrade || upgrade.merchant !== this.currentMerchant) {
      this.soundSystem?.playUiSelect?.();
      this._notify("This merchant does not sell that upgrade.", UI_COLORS.danger);
      return;
    }
    if (listedUpgrade?.availability?.available === false) {
      this.soundSystem?.playUiSelect?.();
      this._notify(
        listedUpgrade.availability.detail || "Keep progressing to unlock this upgrade.",
        UI_COLORS.danger,
      );
      this._render();
      return;
    }
    const tutorialPreview = this.scene.townSquareTutorialSystem
      ?.getUpgradePreview?.(upgradeId) || null;
    const beforeLevel = this.upgradeSystem?.getUpgradeLevel?.(upgradeId) || 0;
    const beforeJourneySnapshot = this.scene.journeySystem?.captureSnapshot?.();
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
        requires_player_level: "A higher player level is required.",
        feature_disabled: "This upgrade belongs to the modern depth economy.",
        progression_locked: "Keep progressing to unlock this upgrade.",
        guided_step_locked: "Complete the current guided shop step first.",
      };
      this.soundSystem?.playUiSelect?.();
      this._notify(messages[result.reason] || "Purchase requirements are not met.", UI_COLORS.danger);
      this._render();
      return;
    }

    this.soundSystem?.playUiConfirm?.();
    if (ASSET_KEYS.ui.pickaxeHud?.[upgradeId]) {
      this.scene.hudSystem?.setCurrentPickaxe?.(upgradeId, {
        animate: true,
        force: true,
      });
    }
    if (upgradeId === "worldTwoTunnelAccess") this.scene.surfaceTunnelDoorSystem?.syncFromUpgrade?.(true);
    if (upgradeId === "arcCoreVehicle") this.scene.arcCoreVehicleSystem?.syncOwnership?.();
    this.scene.earthquakeSystem?.syncSuppression?.();
    this._notify(upgrade.purchaseCopy || ("Purchased " + upgrade.name + "."), UI_COLORS.success);
    this.scene.retentionProgressSystem?.recordUpgrade?.(upgrade.name, {
      ...(tutorialPreview || {}),
      upgradeId,
    });
    this.scene.journeySystem?.recordUpgradePurchase?.({
      upgrade,
      beforeSnapshot: beforeJourneySnapshot,
      afterSnapshot: this.scene.journeySystem?.captureSnapshot?.(),
      beforeLevel,
      afterLevel: result.level,
    });
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
      this.scene.playerController?.fillGemPower?.();
      this.scene.armHardcoreAfterFlightUnlock?.("bobo-flight-purchase");
      this.hide();
      this.scene.showGameDialog?.(
        "Gem of Great Power",
        "Flight is unlocked.\n\nHold " + USER_SETTINGS.getKeyLabel("fly") +
        " to power Flight. Use " + USER_SETTINGS.getKeyLabel("aimUp") + "/" +
        USER_SETTINGS.getKeyLabel("aimDown") +
        " to build climb or dive momentum. Visit the Gem Power Workshop to improve capacity, efficiency, and speed."
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

    const permanentUnitPrice = this._permanentUnitPrice(resource, basePrice);
    const unitPrice = this._adjustedUnitPrice(resource, basePrice);
    let total = unitPrice * count;
    const luckySales = this.upgradeSystem.getUpgradeEffects?.().luckySales || 0;
    if (luckySales > 0 && Math.random() < luckySales * 0.1) {
      const bonus = roundResourceCurrency(total * 0.5);
      total += bonus;
      this._notify("Lucky sale bonus: +" + formatMoney(bonus), UI_COLORS.gold);
    }
    total = roundResourceCurrency(total);

    resources[resource] = available - count;
    digSystem.setResourceTotals(resources);
    this.upgradeSystem.addMoney(total);
    this.scene.retentionProgressSystem?.recordSale?.(total, count);
    this.soundSystem?.playUiConfirm?.();
    this.scene?.randomEventBridge?.recordRushSale?.(resource, count, permanentUnitPrice, unitPrice);
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
      const permanentUnitPrice = this._permanentUnitPrice(resource, basePrice);
      const unitPrice = this._adjustedUnitPrice(resource, basePrice);
      totalMoney += unitPrice * amount;
      this.scene?.randomEventBridge?.recordRushSale?.(resource, amount, permanentUnitPrice, unitPrice);
      totalSold += amount;
      resources[resource] = 0;
    });
    totalMoney = roundResourceCurrency(totalMoney);
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
    const rushQuoteId = this.scene?.randomEventBridge?.getRushSnapshot?.()?.id || "base";
    signature = `${signature}|${rushQuoteId}`;
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
