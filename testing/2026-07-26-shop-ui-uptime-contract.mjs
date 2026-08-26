import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ASSET_KEYS } from "../values/assetKeys.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";
import {
  SHOP_MERCHANT_PROFILES,
  SHOP_SELECTION_BEHAVIOR,
} from "../values/uiLayout.js";
import { MilestoneBoardSystem } from "../systems/visual/MilestoneBoardSystem.js";
import { NPCManager } from "../world/playScene/NPCManager.js";
import { ShopOverlay } from "../ui/overlays/ShopOverlay.js";

const originalPhaser = globalThis.Phaser;
globalThis.Phaser = {
  Input: {
    Keyboard: {
      JustDown(key) {
        const wasJustDown = key.justDown === true;
        key.justDown = false;
        return wasJustDown;
      },
    },
  },
};

try {
  const boboTile = {
    tx: TOWN_SQUARE_CONFIG.merchantSlots.boboMerchant.tileX,
    ty: 65 + TOWN_SQUARE_CONFIG.merchantSurfaceTileOffset,
  };
  const interactKey = { justDown: true };
  const openedShops = [];
  let playerTile = { ...boboTile };
  const shopOverlay = Object.assign(Object.create(ShopOverlay.prototype), {
    _destroyed: false,
    scene: null,
    shell: {
      root: { active: true },
      backdrop: { active: true },
    },
    show(merchantId) {
      if (!this.isOperational()) return false;
      openedShops.push(merchantId);
      return true;
    },
  });
  const scene = {
    config: {
      spawnTileX: 28,
      tileSize: 94,
      topAirRows: 65,
    },
    interactKey,
    playerController: {
      state: {
        getPlayerTile: () => ({ ...playerTile }),
      },
    },
    shopOverlay,
    soundSystem: {
      playNPCVoiceLine() {},
    },
  };
  shopOverlay.scene = scene;
  const manager = new NPCManager(scene, ASSET_KEYS);
  const milestone = Object.create(MilestoneBoardSystem.prototype);
  milestone.config = scene.config;
  milestone._isBoardOpen = false;
  milestone._ePrompt = { setVisible() {} };
  milestone._openBoardView = () => {
    milestone._isBoardOpen = true;
  };
  milestone._closeBoardView = () => {
    milestone._isBoardOpen = false;
  };

  const milestoneDistance = milestone.getInteractionDistance(boboTile);
  const nearestNpcDistance = manager.getNearestInteractionDistance(boboTile);
  assert.ok(
    nearestNpcDistance < milestoneDistance,
    "Bobo must win the overlapping Town Square interaction",
  );
  const milestoneConsumed = milestone.update(
    boboTile,
    { interact: interactKey },
    { allowOpen: milestoneDistance < nearestNpcDistance },
  );
  assert.equal(milestoneConsumed, false);
  assert.equal(
    interactKey.justDown,
    true,
    "a blocked Milestone Pillar must not consume Bobo's E press",
  );
  assert.equal(manager.checkNPCInteraction(), true);
  assert.deepEqual(openedShops, ["boboMerchant"]);
  manager.setMerchantAvailability(TOWN_SQUARE_CONFIG.surfaceMerchantOrder);
  assert.equal(manager._isMerchantAvailable("magmaMoneyMonster"), false);
  openedShops.length = 0;
  for (const merchantId of TOWN_SQUARE_CONFIG.surfaceMerchantOrder) {
    const npc = manager.getNPCDefs().find(candidate => (
      candidate.merchantId === merchantId
    ));
    assert.ok(npc, `missing NPC definition for ${merchantId}`);
    playerTile = { tx: npc.tx, ty: npc.ty };
    interactKey.justDown = true;
    assert.equal(
      manager.checkNPCInteraction(),
      true,
      merchantId + " must reach the live shop overlay",
    );
  }
  assert.deepEqual(
    openedShops,
    TOWN_SQUARE_CONFIG.surfaceMerchantOrder,
    "all five Town Square merchants must use the same live open path",
  );

  for (const npc of manager.getNPCDefs()) {
    manager.npcSprites.set(npc.merchantId, { setVisible() { return this; } });
    manager._interactPrompts.push({
      npc: { merchantId: npc.merchantId },
      text: { setVisible() { return this; } },
    });
  }
  const interactionHealth = manager.getInteractionHealthSnapshot();
  assert.equal(interactionHealth.ready, true);
  assert.equal(interactionHealth.boboDefined, true);
  assert.equal(interactionHealth.promptReady, true);
  assert.equal(interactionHealth.visualReady, true);
  assert.equal(interactionHealth.shopReady, true);
  assert.equal(interactionHealth.interactKeyReady, true);
  assert.equal(interactionHealth.merchantCount, 5);
  assert.deepEqual(
    interactionHealth.expectedMerchantIds,
    TOWN_SQUARE_CONFIG.surfaceMerchantOrder,
  );
  assert.deepEqual(interactionHealth.missingDefinitionIds, []);
  assert.deepEqual(interactionHealth.missingPromptIds, []);
  assert.deepEqual(interactionHealth.missingVisualIds, []);
  assert.deepEqual(interactionHealth.unavailableMerchantIds, []);
  shopOverlay._destroyed = true;
  const destroyedOverlayHealth = manager.getInteractionHealthSnapshot();
  assert.equal(destroyedOverlayHealth.shopReady, false);
  assert.equal(destroyedOverlayHealth.ready, false);
  shopOverlay._destroyed = false;
  shopOverlay.shell.root.active = false;
  const inactiveRootHealth = manager.getInteractionHealthSnapshot();
  assert.equal(inactiveRootHealth.shopReady, false);
  assert.equal(inactiveRootHealth.ready, false);
  shopOverlay.shell.root.active = true;
  assert.equal(
    manager.getInteractionHealthSnapshot().ready,
    true,
    "restoring the live shell must restore merchant health",
  );
  manager.setMerchantAvailability(
    TOWN_SQUARE_CONFIG.surfaceMerchantOrder.filter(id => id !== "gearMerchant"),
  );
  const gatedHealth = manager.getInteractionHealthSnapshot();
  assert.equal(gatedHealth.ready, false);
  assert.deepEqual(gatedHealth.unavailableMerchantIds, ["gearMerchant"]);
  manager.setMerchantAvailability(TOWN_SQUARE_CONFIG.surfaceMerchantOrder);
  assert.equal(manager.getInteractionHealthSnapshot().ready, true);

  assert.equal(SHOP_MERCHANT_PROFILES.boboMerchant.title, "BOBO'S COUNTER");

  const openCounters = {
    setShopOpen: 0,
    syncChrome: 0,
    populate: 0,
    shellShow: 0,
    layout: 0,
    sound: 0,
  };
  const merchantAdmissionOverlay = Object.assign(
    Object.create(ShopOverlay.prototype),
    {
      _destroyed: false,
      currentMerchant: null,
      isVisible: false,
      scene: {
        setShopOpen(open) {
          if (open) openCounters.setShopOpen += 1;
        },
      },
      shell: {
        root: { active: true },
        backdrop: { active: true },
        show() {
          openCounters.shellShow += 1;
        },
        hide() {},
      },
      soundSystem: {
        playUiSelect() {
          openCounters.sound += 1;
        },
      },
      _syncMerchantChrome() {
        openCounters.syncChrome += 1;
      },
      populateUpgrades(merchantId) {
        this.populatedMerchant = merchantId;
        openCounters.populate += 1;
      },
      _layoutChrome() {
        openCounters.layout += 1;
      },
    },
  );
  assert.equal(merchantAdmissionOverlay.show("unknownMerchant"), false);
  assert.equal(merchantAdmissionOverlay.show("default"), false);
  assert.equal(merchantAdmissionOverlay.currentMerchant, null);
  assert.equal(merchantAdmissionOverlay.isVisible, false);
  assert.deepEqual(openCounters, {
    setShopOpen: 0, syncChrome: 0, populate: 0, shellShow: 0, layout: 0, sound: 0,
  });
  assert.equal(merchantAdmissionOverlay.show("gearMerchant"), true);
  assert.equal(merchantAdmissionOverlay.currentMerchant, "gearMerchant");
  assert.equal(merchantAdmissionOverlay.isVisible, true);
  assert.equal(merchantAdmissionOverlay.populatedMerchant, "gearMerchant");
  assert.deepEqual(openCounters, {
    setShopOpen: 1, syncChrome: 1, populate: 1, shellShow: 1, layout: 1, sound: 1,
  });

  const pillarKey = { justDown: true };
  const pillarTile = {
    tx: TOWN_SQUARE_CONFIG.milestonePillar.tileX,
    ty: boboTile.ty,
  };
  assert.equal(
    milestone.update(pillarTile, { interact: pillarKey }, { allowOpen: true }),
    true,
  );
  assert.equal(milestone._isBoardOpen, true);
  assert.equal(pillarKey.justDown, false);

  const rowChildren = [];
  const rowRectangles = [];
  let rowSelectSounds = 0;
  let rowRenders = 0;
  function createDisplayObject(type) {
    return {
      type,
      active: true,
      setDepth(depth) { this.depth = depth; return this; },
      setScrollFactor(value) { this.scrollFactor = value; return this; },
      setVisible(value) { this.visible = value; return this; },
      setOrigin() { return this; },
      setColor() { return this; },
      setAlpha() { return this; },
      setText(value) { this.value = value; return this; },
      clear() { return this; },
      fillStyle() { return this; },
      fillRoundedRect() { return this; },
      lineStyle() { return this; },
      strokeRoundedRect() { return this; },
    };
  }
  function createRowRectangle(x, y, width, height, color, alpha) {
    const handlers = new Map();
    const rectangle = {
      ...createDisplayObject("rectangle"),
      x,
      y,
      width,
      height,
      color,
      alpha,
      interactive: false,
      setStrokeStyle(lineWidth, strokeColor) {
        this.lineWidth = lineWidth;
        this.strokeColor = strokeColor;
        return this;
      },
      setInteractive(options) {
        this.interactive = true;
        this.inputOptions = options;
        return this;
      },
      on(event, handler) {
        handlers.set(event, handler);
        return this;
      },
      emit(event) {
        handlers.get(event)?.();
      },
      disableInteractive() {
        this.interactive = false;
        return this;
      },
    };
    rowRectangles.push(rectangle);
    return rectangle;
  }
  const rowOverlay = Object.assign(Object.create(ShopOverlay.prototype), {
    scene: {
      add: {
        rectangle: createRowRectangle,
        container(x, y) {
          const container = {
            ...createDisplayObject("container"),
            x,
            y,
            children: [],
            setSize(width, height) {
              this.width = width;
              this.height = height;
              return this;
            },
            add(children) {
              this.children.push(...(Array.isArray(children) ? children : [children]));
              return this;
            },
            iterate(callback) {
              this.children.forEach(callback);
              return this;
            },
            destroy() {
              this.active = false;
            },
          };
          return container;
        },
        graphics() {
          return createDisplayObject("graphics");
        },
        text(x, y, value) {
          return {
            ...createDisplayObject("button-text"),
            x,
            y,
            value,
          };
        },
        image() {
          return {
            ...createDisplayObject("image"),
            setDisplaySize() { return this; },
          };
        },
      },
      tweens: {
        killTweensOf() {},
        add(config) {
          config.onComplete?.();
          return config;
        },
      },
    },
    shell: { depth: 3000 },
    moneyMonsterMode: "buy",
    currentPage: 0,
    selectedIndex: 1,
    mouseSelectionPinned: false,
    selectedSellButton: 1,
    topButtonSelected: "action",
    itemsPerPage: 5,
    upgradesContainer: {
      add(child) {
        rowChildren.push(child);
        return child;
      },
    },
    _text(x, y, value) {
      const text = { type: "text", value };
      rowChildren.push(text);
      return text;
    },
    _render() {
      rowRenders += 1;
    },
    soundSystem: {
      playUiSelect() {
        rowSelectSounds += 1;
      },
    },
  });
  ShopOverlay.prototype._renderList.call(
    rowOverlay,
    [{
      id: "hardcoreConversion",
      name: "Hardcore Oath",
      isHardcoreConversion: true,
    }],
    10,
    20,
    360,
    400,
  );
  assert.equal(rowRectangles.length, 2);
  const [rowBackground, rowHitTarget] = rowRectangles;
  assert.equal(rowBackground.interactive, false);
  assert.equal(rowHitTarget.interactive, true);
  assert.equal(rowHitTarget.width, rowBackground.width);
  assert.equal(rowHitTarget.height, rowBackground.height);
  const rowButtonRoot = rowChildren.find(child => (
    child.type === "container" && child.children.includes(rowHitTarget)
  ));
  const rowHitIndex = rowChildren.indexOf(rowButtonRoot);
  const rowIconIndex = rowChildren.findIndex(child => child.type === "image");
  const rowNameIndex = rowChildren.findIndex(child => child.value === "Hardcore Oath");
  assert.equal(rowButtonRoot.depth, rowOverlay.shell.depth + 2);
  assert.ok(
    rowHitIndex > rowIconIndex && rowHitIndex > rowNameIndex,
    "the full-row hit target must sit above its icon, name, and status",
  );
  assert.equal(
    rowChildren.some(child => child.value === SHOP_SELECTION_BEHAVIOR.previewLabel),
    true,
    "the shop list must explain that hover is only previewing before a click pins it",
  );
  rowHitTarget.emit("pointerover");
  assert.equal(rowOverlay.selectedIndex, 0);
  assert.equal(rowOverlay.selectedSellButton, 0);
  assert.equal(rowOverlay.topButtonSelected, null);
  assert.equal(rowOverlay.mouseSelectionPinned, false);
  assert.equal(rowRenders, 1);
  rowHitTarget.emit("pointerdown");
  assert.equal(rowOverlay.mouseSelectionPinned, true);
  assert.equal(rowSelectSounds, 1);
  assert.equal(rowRenders, 2);
  assert.equal(rowOverlay._handleListHover(1), false);
  assert.equal(rowOverlay.selectedIndex, 0, "hover cannot replace a pinned shop row");
  assert.equal(rowOverlay._handleListClick(1), true);
  assert.equal(rowOverlay.selectedIndex, 1, "an explicit click can move the pin");
  assert.equal(rowOverlay._handleListClick(1), false);
  assert.equal(rowOverlay.mouseSelectionPinned, false, "clicking the pinned row releases it");
  assert.equal(rowOverlay._handleListHover(0), true);
  assert.equal(rowOverlay.selectedIndex, 0, "hover preview resumes after release");

  rowOverlay.allUpgrades = [{}, {}, {}, {}, {}, {}];
  rowOverlay.forgeRecipes = [];
  rowOverlay.sellItems = [];
  rowOverlay.mouseSelectionPinned = true;
  rowOverlay.navigateDown();
  assert.equal(rowOverlay.mouseSelectionPinned, false, "keyboard selection releases the mouse pin");
  rowOverlay.mouseSelectionPinned = true;
  rowOverlay.nextPage();
  assert.equal(rowOverlay.mouseSelectionPinned, false, "page navigation releases the mouse pin");

  const shopSource = readFileSync(
    new URL("../ui/overlays/ShopOverlay.js", import.meta.url),
    "utf8",
  );
  assert.equal(
    (shopSource.match(/createButton\(this\.scene/g) || []).length,
    1,
    "all shop controls must route through the modal-depth click wrapper",
  );

  console.log("Shop UI uptime contract passed");
} finally {
  globalThis.Phaser = originalPhaser;
}
