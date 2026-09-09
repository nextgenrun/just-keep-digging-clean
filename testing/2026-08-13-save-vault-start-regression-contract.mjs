import assert from "node:assert/strict";
import fs from "node:fs";

import { getHardcoreModePreloadAssets } from "../values/hardcoreMode.js";

const read = relativePath => fs.readFileSync(
  new URL(`../${relativePath}`, import.meta.url),
  "utf8",
);

const startMenuSource = read("ui/scenes/StartMenuScene.js");
const mainMenuSource = read("ui/scenes/MainMenuScene.js");
const styleSource = read("css/style.css");

assert.match(startMenuSource, /getHardcoreModePreloadAssets/);
assert.match(startMenuSource, /this\.load\.image\(asset\.key, asset\.path\)/);
assert.match(startMenuSource, /keydown-ENTER/);
assert.match(startMenuSource, /keydown-SPACE/);
assert.match(mainMenuSource, /keydown-ENTER/);
assert.match(mainMenuSource, /keydown-SPACE/);

const preloadAssets = getHardcoreModePreloadAssets();
assert.deepEqual(
  preloadAssets.map(asset => asset.key),
  ["ui-hardcore-oath-panel-v1", "ui-hardcore-oath-crest-v1"],
);
for (const asset of preloadAssets) {
  assert.equal(
    fs.existsSync(new URL(`../${asset.path}`, import.meta.url)),
    true,
    `Missing Save Vault setup asset: ${asset.path}`,
  );
}

const fullscreenRule = styleSource.match(/#fs-btn\s*\{([\s\S]*?)\}/)?.[1] || "";
assert.match(fullscreenRule, /top:\s*50%/);
assert.match(fullscreenRule, /transform:\s*translateY\(-50%\)/);
assert.doesNotMatch(fullscreenRule, /bottom:/);

console.log("SAVE_VAULT_START_REGRESSION_CONTRACT_OK");
