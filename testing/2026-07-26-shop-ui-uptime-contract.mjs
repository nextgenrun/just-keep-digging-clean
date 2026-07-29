import assert from "node:assert/strict";

import { ASSET_KEYS } from "../values/assetKeys.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";
import { SHOP_MERCHANT_PROFILES } from "../values/uiLayout.js";
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
  const scene = {
    config: {
      spawnTileX: 28,
      tileSize: 94,
      topAirRows: 65,
    },
    interactKey,
    playerController: {
      state: {
        getPlayerTile: () => ({ ...boboTile }),
      },
    },
    shopOverlay: {
      show: merchantId => openedShops.push(merchantId),
    },
    soundSystem: {
      playNPCVoiceLine() {},
    },
  };
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

  manager.npcSprites.set("boboMerchant", {});
  manager._interactPrompts.push({
    npc: { merchantId: "boboMerchant" },
    text: {},
  });
  assert.deepEqual(manager.getInteractionHealthSnapshot(), {
    ready: true,
    boboDefined: true,
    promptReady: true,
    visualReady: true,
    shopReady: true,
    interactKeyReady: true,
  });
  assert.equal(SHOP_MERCHANT_PROFILES.boboMerchant.title, "BOBO'S COUNTER");

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
  rowHitTarget.emit("pointerdown");
  assert.equal(rowOverlay.selectedIndex, 0);
  assert.equal(rowOverlay.selectedSellButton, 0);
  assert.equal(rowOverlay.topButtonSelected, null);
  assert.equal(rowSelectSounds, 1);
  assert.equal(rowRenders, 1);

  console.log("Shop UI uptime contract passed");
} finally {
  globalThis.Phaser = originalPhaser;
}
