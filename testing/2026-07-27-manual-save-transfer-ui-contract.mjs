import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  PAUSE_MENU_LAYOUT,
  SAVE_TRANSFER_UI,
} from "../values/uiLayout.js";
import {
  getSaveTransferPanelMetrics,
} from "../ui/overlays/SaveTransferPanelContent.js";
import { DugTilesSaveStore } from "../world/model/DugTilesSaveStore.js";

for (const [width, height] of [
  [896, 466],
  [808, 346],
  [620, 260],
]) {
  const metrics = getSaveTransferPanelMetrics(width, height);
  assert.ok(metrics.buttonWidth <= width - metrics.horizontalInset * 2);
  assert.ok(metrics.firstButtonY - metrics.buttonHeight / 2 >= metrics.actionTop);
  assert.ok(metrics.lastButtonBottom <= metrics.actionBottom);
  assert.ok(metrics.actionBottom < metrics.statusY);
  assert.ok(metrics.statusY <= height);
}

const start = SAVE_TRANSFER_UI.startMenu;
assert.ok(
  start.buttonRowY + start.buttonHeight / 2 < start.startPromptY,
  "visible Start Menu save controls must end above the start prompt",
);
assert.ok(start.startPromptY < start.dividerY);
assert.ok(start.dividerY < start.hintY);
assert.ok(start.hintY < 720);
assert.ok(
  start.importPanelButtonOffsetY + 19
    < start.importPanelHeight / 2 - start.importPanelFooterInsetY,
  "the import button row must end above its footer",
);

const pauseTabs = 5;
const pauseContentWidth = 896;
const pauseTabButtonWidth = Math.max(
  PAUSE_MENU_LAYOUT.tabButtonMinWidth,
  Math.min(
    PAUSE_MENU_LAYOUT.tabButtonMaxWidth,
    (
      pauseContentWidth
      - PAUSE_MENU_LAYOUT.tabGap * (pauseTabs - 1)
    ) / pauseTabs,
  ),
);
const pauseTabSpan = pauseTabButtonWidth * pauseTabs
  + PAUSE_MENU_LAYOUT.tabGap * (pauseTabs - 1);
assert.ok(pauseTabSpan <= pauseContentWidth);

const storage = new Map();
const localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
};
globalThis.window = { localStorage };
globalThis.localStorage = localStorage;

const store = new DugTilesSaveStore({ slotId: 2 });
const world = {
  seed: 1701,
  width: 320,
  depth: 2100,
  topAirRows: 75,
};
const currentSave = store.createPayload(world, ["1,1"]);
currentSave.updatedAt = "2026-07-27T10:00:00.000Z";
const importedSave = store.createPayload(world, ["9,9"]);
importedSave.updatedAt = "2026-07-27T11:00:00.000Z";
assert.equal(store.saveToLocalStorage(currentSave), true);

const importResult = await store.importSave({
  text: async () => JSON.stringify({
    version: importedSave.version,
    exportedAt: "2026-07-27T12:00:00.000Z",
    slotId: 1,
    saveData: importedSave,
  }),
});
assert.equal(importResult.success, true);
assert.deepEqual(store.loadForDisplay().dugTiles, ["9,9"]);
const backups = store.getBackups();
assert.equal(backups.length, 1);
assert.deepEqual(
  backups[0].data.dugTiles,
  ["1,1"],
  "import must preserve the previous slot data, not back up the replacement",
);

const [startMenuSource, pauseSource] = await Promise.all([
  readFile(new URL("../ui/scenes/StartMenuScene.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
]);
assert.match(startMenuSource, /_buildSaveTransferControls\(W\)/);
assert.match(startMenuSource, /SAVE_TRANSFER_UI\.copy\.startExport/);
assert.match(startMenuSource, /SAVE_TRANSFER_UI\.copy\.startImport/);
assert.match(pauseSource, /\{\s*key:\s*"saves",\s*label:\s*"SAVES"/);
assert.match(pauseSource, /createSaveTransferPanelContent/);
assert.match(pauseSource, /saveGame\(\)[\s\S]*importSave\(file\)/);
assert.match(pauseSource, /scene\.start\("WorldLoadScene"/);

console.log("manual save transfer UI contract: visible controls, safe layout, backup-first import, and reload passed");
