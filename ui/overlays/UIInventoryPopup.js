import { createButton, createTabBar } from "../PhaserUiKit.js";
import { createModalShell } from "../UiModalShell.js";
import { INVENTORY_RESOURCE_GUIDE } from "../../values/inventoryResourceGuide.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../../values/starIdentityLibrary.js";
import { UI_COLORS } from "../../values/uiColors.js";
import {
  UI_INVENTORY_COPY,
  UI_INVENTORY_LAYOUT,
  UI_RESOURCE_PRESENTATION,
} from "../../values/uiIcons.js";
import { USER_SETTINGS, keyToPhaserKey } from "../../systems/UserSettings.js";
import { renderInventoryHoldingsView } from "./UIInventoryHoldingsView.js";
import { renderInventoryResourceGuide } from "./UIInventoryResourceGuide.js";
import { renderInventoryStarAtlas } from "./UIInventoryStarAtlas.js";
import { UIInventoryStarAtlasAssetController } from
  "./UIInventoryStarAtlasAssetController.js";
import { UIInventoryStarAtlasKeyboard } from
  "./UIInventoryStarAtlasKeyboard.js";
import { INVENTORY_SPECIAL_BLOCKS } from "../../values/inventorySpecialBlocks.js";
import { renderInventorySpecialBlocks } from "./UIInventorySpecialBlocks.js";

export class UIInventoryPopup {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.shell = null;
    this.panel = null;
    this.backdrop = null;
    this.items = {};
    this.money = 0;
    this.moneyText = null;
    this.summaryText = null;
    this.returnButton = null;
    this.tabs = null;
    this.activeTab = 0;
    this.selectedGuideResource = INVENTORY_RESOURCE_GUIDE.resourceKeys[0];
    this.selectedStarRarity = 0;
    this.selectedStarIdentity = 0;
    this.selectedSpecialBlock = INVENTORY_SPECIAL_BLOCKS.entries[0].id;
    this.starAtlasAssets = new UIInventoryStarAtlasAssetController(scene);
    this.starAtlasKeyboard = new UIInventoryStarAtlasKeyboard(scene, {
      getState: () => this.getHealthSnapshot(),
      onCycleTab: direction => this._cycleTab(direction),
      onSelectRarity: rarityIndex => {
        void this._activateStarAtlasRarity(rarityIndex);
      },
      onSelectIdentity: identityIndex => {
        this.selectedStarIdentity = identityIndex;
        this._render();
      },
    });
    Object.keys(UI_RESOURCE_PRESENTATION).forEach(key => {
      this.items[key] = 0;
    });
    this.setupKeyboardListeners();
  }

  setupKeyboardListeners() {
    this.inventoryKey?.off("down", this.handleInventoryToggle, this);
    this.escapeKey?.off("down", this.handleInventoryClose, this);
    this.inventoryKey = this.scene.input.keyboard.addKey(keyToPhaserKey(USER_SETTINGS.getKey("inventory")));
    this.escapeKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.handleInventoryToggle = () => this.toggle();
    this.handleInventoryClose = () => {
      if (this.isOpen) this.close();
    };
    this.inventoryKey.on("down", this.handleInventoryToggle);
    this.escapeKey.on("down", this.handleInventoryClose);
  }

  refreshKeybinds() {
    this.setupKeyboardListeners();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.scene.setShopOpen?.(true);
    this.scene.playerController?.setControlsEnabled?.(false);
    this.createPopup();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const shell = this.shell;
    this.shell = null;
    this.panel = null;
    this.backdrop = null;
    this.moneyText = null;
    this.summaryText = null;
    this.returnButton = null;
    this.tabs = null;
    shell?.hide?.(() => shell.destroy?.());
    this.scene.setShopOpen?.(false);
    this.scene.playerController?.setControlsEnabled?.(true);
    this.starAtlasAssets.releaseAll();
    this.activeTab = 0;
  }

  createPopup() {
    this.shell?.destroy?.();
    const shell = createModalShell(this.scene, {
      title: UI_INVENTORY_COPY.title,
      subtitle: UI_INVENTORY_COPY.subtitle,
      icon: "inventory",
      maxWidth: UI_INVENTORY_LAYOUT.maxWidth,
      maxHeight: UI_INVENTORY_LAYOUT.maxHeight,
      depth: 3220,
      dismissOnBackdrop: true,
      onClose: () => this.close(),
    });
    this.shell = shell;
    this.panel = shell;
    this.backdrop = shell.backdrop;
    this._render();
    shell.show();
  }

  _render() {
    if (!this.shell) return;
    this.shell.layout();
    this.shell.content.removeAll(true);
    this.returnButton?.destroy?.();
    this.returnButton = null;
    this.moneyText = null;
    this.summaryText = null;
    const fullRect = this.shell.getContentRect();
    const guide = INVENTORY_RESOURCE_GUIDE;
    const starAtlas = STAR_IDENTITY_LIBRARY_CONFIG.inventory;
    const showStarAtlas = this.scene.systemIntroductionSystem
      ?.isFeatureAvailable?.("inventoryStarAtlas") ?? true;
    const specialTabIndex = showStarAtlas ? 3 : 2;
    const subtitle = this.activeTab === 1
      ? guide.copy.guideSubtitle
      : showStarAtlas && this.activeTab === 2
        ? starAtlas.copy.subtitle
        : this.activeTab === specialTabIndex
          ? INVENTORY_SPECIAL_BLOCKS.subtitle
        : UI_INVENTORY_COPY.subtitle;
    this.shell.setHeader(
      UI_INVENTORY_COPY.title,
      subtitle
    );
    this.tabs = createTabBar(this.scene, {
      x: 0,
      y: fullRect.top + guide.layout.tabTopInset,
      tabs: [
        { label: guide.copy.inventoryTab, icon: "inventory" },
        { label: guide.copy.guideTab, icon: "stone" },
        ...(showStarAtlas ? [{
          label: starAtlas.copy.tabLabel,
          icon: "gem",
        }] : []),
        { label: INVENTORY_SPECIAL_BLOCKS.tabLabel, icon: "power" },
      ],
      activeIndex: this.activeTab,
      spacing: guide.layout.tabSpacing,
      buttonWidth: guide.layout.tabButtonWidth,
      buttonHeight: guide.layout.tabButtonHeight,
      fontSize: "10px",
      parent: this.shell.content,
      onChange: index => {
        if (showStarAtlas && index === 2) {
          // Keep the visible tab state truthful until its on-demand art is
          // actually ready. The successful render below selects STAR ATLAS.
          this.tabs?.setActive?.(this.activeTab, true);
          void this._activateStarAtlasRarity(this.selectedStarRarity);
          return;
        }
        this.activeTab = index;
        this._render();
      },
    });
    const bodyTop = fullRect.top + guide.layout.tabBodyGap;
    const bodyRect = {
      left: fullRect.left,
      top: bodyTop,
      right: fullRect.right,
      bottom: fullRect.bottom,
      width: fullRect.width,
      height: fullRect.bottom - bodyTop,
    };
    if (this.activeTab === 0) {
      const refs = renderInventoryHoldingsView(
        this.scene,
        this.shell,
        bodyRect,
        this.items,
        this.money
      );
      this.moneyText = refs.moneyText;
      this.summaryText = refs.summaryText;
    } else if (this.activeTab === 1) {
      this.selectedGuideResource = renderInventoryResourceGuide(
        this.scene,
        this.shell,
        bodyRect,
        this.selectedGuideResource,
        resourceKey => {
          this.selectedGuideResource = resourceKey;
          this._render();
        }
      );
    } else if (showStarAtlas && this.activeTab === 2) {
      const state = renderInventoryStarAtlas(
        this.scene,
        this.shell,
        bodyRect,
        this.selectedStarRarity,
        this.selectedStarIdentity,
        rarityIndex => {
          void this._activateStarAtlasRarity(rarityIndex);
        },
        identityIndex => {
          this.selectedStarIdentity = identityIndex;
          this._render();
        },
      );
      this.selectedStarRarity = state.rarityIndex;
      this.selectedStarIdentity = state.identityIndex;
    } else {
      this.selectedSpecialBlock = renderInventorySpecialBlocks(
        this.scene,
        this.shell,
        bodyRect,
        this.selectedSpecialBlock,
        blockId => {
          this.selectedSpecialBlock = blockId;
          this._render();
        },
      );
    }

    this.returnButton = createButton(this.scene, {
      x: 0,
      y: this.shell.height / 2 - 27,
      width: 250,
      height: 36,
      label: UI_INVENTORY_COPY.returnLabel,
      hint: USER_SETTINGS.getKeyLabel("inventory") + " / ESC",
      icon: "close",
      accent: UI_COLORS.borderDim,
      parent: this.shell.root,
      fontSize: "11px",
      onClick: () => this.close(),
    });
  }

  _cycleTab(direction) {
    const navigation = STAR_IDENTITY_LIBRARY_CONFIG.inventory.navigation;
    const showStarAtlas = this.scene.systemIntroductionSystem
      ?.isFeatureAvailable?.("inventoryStarAtlas") ?? true;
    const tabCount = showStarAtlas ? navigation.starAtlasTabIndex + 2 : 3;
    const target = (this.activeTab + direction + tabCount) % tabCount;
    if (target === navigation.starAtlasTabIndex) {
      void this._activateStarAtlasRarity(this.selectedStarRarity);
      return;
    }
    this.activeTab = target;
    this._render();
  }

  async _activateStarAtlasRarity(rarityIndex) {
    const result = await this.starAtlasAssets.ensureRarity(rarityIndex);
    if (!result.ready || !this.isOpen) {
      this.tabs?.setActive?.(this.activeTab, true);
      return false;
    }
    this.activeTab = 2;
    this.selectedStarRarity = rarityIndex;
    this.selectedStarIdentity = STAR_IDENTITY_LIBRARY_CONFIG.identities
      .find(identity => identity.rarityIndex === rarityIndex)?.index || 0;
    this._render();
    return true;
  }

  setMoney(amount) {
    if (Object.is(this.money, amount)) return;
    this.money = amount;
    this.moneyText?.setText(
      `${Number(amount || 0).toLocaleString()} ${UI_INVENTORY_COPY.walletSuffix}`
    );
  }

  setResources(resources) {
    const next = resources || {};
    const changed = Object.keys(UI_RESOURCE_PRESENTATION)
      .some(key => !Object.is(this.items[key], next[key] ?? this.items[key]));
    if (!changed) return;
    this.items = { ...this.items, ...next };
    if (this.isOpen) this._render();
  }

  resize() {
    if (this.isOpen) this._render();
  }

  getHealthSnapshot() {
    return Object.freeze({
      open: this.isOpen,
      activeTab: this.activeTab,
      selectedTab: this.tabs?.getActive?.() ?? null,
      selectedGuideResource: this.selectedGuideResource,
      selectedStarRarity: this.selectedStarRarity,
      selectedStarIdentity: this.selectedStarIdentity,
      selectedSpecialBlock: this.selectedSpecialBlock,
    });
  }

  destroy() {
    if (this.isOpen) this.close();
    else this.shell?.destroy?.();
    this.inventoryKey?.off("down", this.handleInventoryToggle, this);
    this.escapeKey?.off("down", this.handleInventoryClose, this);
    this.starAtlasKeyboard.destroy();
    this.starAtlasAssets.destroy();
  }
}
