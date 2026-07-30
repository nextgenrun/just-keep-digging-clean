import assert from "node:assert/strict";
import {
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MENU_BACKGROUND_ASSETS } from "../ui/components/LoadingScreenView.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bootPath = path.join(ROOT, "ui/scenes/BootScene.js");
const bootSource = readFileSync(bootPath, "utf8");
const activeSheet = path.join(
  ROOT,
  "sprites/npc/npc-v3/sheets/shadow-miner-sheet.webp",
);

assert.match(
  bootSource,
  /load\.spritesheet\(ASSET_KEYS\.shadowMiner\.sheet,/,
  "the compact active Shadow Miner sheet must remain in the boot queue",
);
assert.doesNotMatch(
  bootSource,
  /load\.spritesheet\(ASSET_KEYS\.shadowMiner\.idleSheet,/,
  "the archived 3840x3840 idle atlas must not block live boot",
);
assert.doesNotMatch(
  bootSource,
  /createSheetAnim\(\s*ASSET_KEYS\.shadowMiner\.idleAnim,/,
  "live boot must not create an animation from an unloaded archive atlas",
);
assert.ok(statSync(activeSheet).size > 0, "the active Shadow Miner sheet is missing");
for (const asset of MENU_BACKGROUND_ASSETS) {
  assert.match(
    asset.path,
    /^sprites\/backgrounds\/background-database\//,
    `${asset.key} must use the live project-relative background database`,
  );
  const menuBackground = path.join(ROOT, asset.path);
  assert.ok(
    statSync(menuBackground).size > 0,
    `${asset.key} points at a missing menu background`,
  );
}

const liveRoots = ["player", "systems", "ui", "values", "world"];
const pending = liveRoots.map(name => path.join(ROOT, name));
const consumers = [];
while (pending.length > 0) {
  const current = pending.pop();
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const target = path.join(current, entry.name);
    if (entry.isDirectory()) pending.push(target);
    else if (entry.name.endsWith(".js")
      && target !== bootPath
      && readFileSync(target, "utf8").includes("shadowMiner.idleSheet")) {
      consumers.push(path.relative(ROOT, target));
    }
  }
}
assert.deepEqual(consumers, [], "archive-only Shadow Miner idle atlas gained a live consumer");

console.log("boot live-asset health contract: NPC and all six menu backgrounds resolve locally");
