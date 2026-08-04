import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  UI_INVENTORY_COPY,
  UI_INVENTORY_LAYOUT,
  UI_RESOURCE_PRESENTATION,
} from "../values/uiIcons.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { INVENTORY_RESOURCE_GUIDE } from "../values/inventoryResourceGuide.js";
import { UI_MODAL_LAYOUT } from "../values/uiLayout.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const popupSource = fs.readFileSync(
  path.join(root, "ui/overlays/UIInventoryPopup.js"),
  "utf8"
);
const holdingsSource = fs.readFileSync(
  path.join(root, "ui/overlays/UIInventoryHoldingsView.js"),
  "utf8"
);

const entries = Object.entries(UI_RESOURCE_PRESENTATION);
assert(entries.length >= 10, "inventory icon key must cover the complete material catalog");
assert.equal(
  new Set(entries.map(([, config]) => config.name)).size,
  entries.length,
  "every inventory material needs a unique visible name"
);

for (const [key, config] of entries) {
  assert.match(config.name, /\S/, `${key} needs a visible inventory name`);
  assert.match(config.icon, /\S/, `${key} needs a real icon key`);
  assert.match(config.color, /^#[0-9a-f]{6}$/i, `${key} needs a readable label color`);
  assert.match(
    ASSET_KEYS.ui.lootPickups[key] || "",
    /\S/,
    `${key} needs current pickup artwork`,
  );
}

assert.equal(UI_INVENTORY_COPY.iconKeyTitle, "RESOURCE ICON KEY");
assert.match(UI_INVENTORY_COPY.subtitle, /icon is named/i);
assert.match(UI_INVENTORY_COPY.undiscoveredStatus, /NOT YET MINED/);

const desktopContentWidth = UI_INVENTORY_LAYOUT.maxWidth
  - UI_MODAL_LAYOUT.contentPadding * 2;
const desktopContentHeight = UI_INVENTORY_LAYOUT.maxHeight
  - UI_MODAL_LAYOUT.headerHeight
  - 14
  - UI_MODAL_LAYOUT.footerHeight;
const desktopGridHeight = desktopContentHeight
  - INVENTORY_RESOURCE_GUIDE.layout.tabBodyGap
  - UI_INVENTORY_LAYOUT.summaryHeight
  - UI_INVENTORY_LAYOUT.summaryGap;
const desktopRows = Math.ceil(
  entries.length / UI_INVENTORY_LAYOUT.desktopColumns
);
const desktopCardHeight = Math.min(
  UI_INVENTORY_LAYOUT.maxItemHeight,
  (
    desktopGridHeight
    - UI_INVENTORY_LAYOUT.rowGap * (desktopRows - 1)
  ) / desktopRows
);
assert(
  desktopContentWidth >= UI_INVENTORY_LAYOUT.desktopColumnThreshold,
  "desktop inventory modal must select the three-column icon key"
);
assert(
  desktopCardHeight >= UI_INVENTORY_LAYOUT.minItemHeight,
  "all named resource rows must fit within the desktop inventory modal"
);

assert.match(
  holdingsSource,
  /ASSET_KEYS\.ui\.lootPickups\[key\]/,
  "inventory resources must use the current pickup-art key map"
);
assert.match(
  holdingsSource,
  /scene\.add\.image\(x, y, textureKey\)/,
  "inventory resources must render their current bitmap artwork"
);
assert.doesNotMatch(
  holdingsSource,
  /createIconBadge\(scene,\s*config\.icon,/,
  "inventory resource cards must not return to the legacy glyph atlas"
);
assert.match(
  holdingsSource,
  /config\.name\.toUpperCase\(\)/,
  "every resource card must render its explicit name"
);
assert.match(
  holdingsSource,
  /color:\s*config\.color/,
  "resource names should reinforce their icon identity with the configured color"
);
assert.match(
  holdingsSource,
  /UI_INVENTORY_LAYOUT\.desktopColumns/,
  "desktop inventory must use the compact three-column icon key"
);
assert.doesNotMatch(
  holdingsSource,
  /discovered\s*\?\s*config\.icon\s*:\s*"lock"/,
  "discovery state must not replace the resource icon"
);
assert.doesNotMatch(
  holdingsSource,
  /"UNDISCOVERED"|\?\?\? MATERIAL/,
  "inventory cards must not hide resource identity behind generic copy"
);
assert.match(
  popupSource,
  /createTabBar\(this\.scene,/,
  "the I menu must expose its inventory and world-guide tabs"
);

console.log(
  `Inventory resource icon key contract passed (${entries.length} named materials).`
);
