import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  WORLDROOT_GATE_B_CONFIG,
  isWorldrootGateBEnabled,
  resolveWorldrootNativeModuleBounds,
} from "../values/worldrootModuleArt.js";
import { WORLDROOT_WHITEBOX_CONFIG } from "../values/worldrootWhitebox.js";

const require = createRequire(import.meta.url);
const bundledSharp = join(
  process.env.USERPROFILE || "",
  ".cache", "codex-runtimes", "codex-primary-runtime",
  "dependencies", "node", "node_modules", "sharp",
);
const sharp = (() => {
  try { return require("sharp"); } catch { return require(bundledSharp); }
})();
const projectRoot = new URL("../", import.meta.url);
const config = WORLDROOT_GATE_B_CONFIG;

assert.equal(isWorldrootGateBEnabled(""), false, "Gate B must be review-only");
assert.equal(isWorldrootGateBEnabled("?worldrootGateB=1"), true);
assert.equal(config.sourceTileSizePx, 94);
assert.equal(config.runtimeScale, 1, "Gate B art may never be stretched at runtime");
assert.deepEqual(
  config.modules.map(entry => entry.id),
  ["rootways", "cobalt", "root-cobalt-seat"],
);
assert.deepEqual(
  WORLDROOT_WHITEBOX_CONFIG.modules
    .filter(entry => !config.modules.some(module => module.id === entry.id))
    .map(entry => entry.id),
  ["amber", "mirror", "starfire", "crown"],
  "all unapproved regions must stay whitebox",
);

const buildSource = await readFile(new URL(
  "../ai-tools/2026-08-30-worldroot-native-module-builder.mjs",
  import.meta.url,
), "utf8");
const runtimeSource = await readFile(new URL(
  "../systems/visual/WorldrootNativeModuleView.js",
  import.meta.url,
), "utf8");
const worldVisualSource = await readFile(new URL(
  "../systems/visual/WorldrootWorldVisual.js",
  import.meta.url,
), "utf8");
const bootSource = await readFile(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8");
assert.doesNotMatch(buildSource, /\.resize\s*\(/, "the Gate B build may not resize generated pixels");
assert.match(buildSource, /maskAlpha\[index\] \* foregroundAlpha\[index\]/, "art must be clipped to authored geometry");
assert.match(runtimeSource, /setScale\(this\.config\.runtimeScale\)/);
assert.doesNotMatch(runtimeSource, /setDisplaySize|setAngle|setRotation/);
assert.match(worldVisualSource, /WORLDROOT_GATE_B_CONFIG/);
assert.match(worldVisualSource, /new WorldrootNativeModuleView/);
assert.match(bootSource, /getWorldrootModuleGatePreloadAssets/);

const promptFile = JSON.parse(await readFile(new URL(
  "../sprites/environment/worldroot-gate-b-v1/source/2026-08-30-imagegen-prompts.json",
  import.meta.url,
), "utf8"));
assert.equal(promptFile.mode, "built-in-imagegen");
for (const module of config.modules) {
  const prompt = promptFile[module.promptId]?.prompt || "";
  assert.match(prompt, /strict orthographic side elevation/i);
  assert.match(prompt, /actual transparent background/i);
  assert.match(prompt, /No isometric view/i);
  assert.match(prompt, /No .*floating platforms/i);
  assert.match(prompt, /fruit, Stars, blue Crown Star, sockets, Titans, statues, Campfire/i);

  const bounds = resolveWorldrootNativeModuleBounds(WORLDROOT_WHITEBOX_CONFIG, module, config);
  const cleanAssetPath = module.path.split("?")[0];
  const assetUrl = new URL(`../${cleanAssetPath}`, import.meta.url);
  const maskUrl = new URL(`../${module.maskPath}`, import.meta.url);
  const sourceUrl = new URL(
    `../sprites/environment/worldroot-gate-b-v1/source/${module.id}-imagegen-source-v1.png`,
    import.meta.url,
  );
  const assetPath = fileURLToPath(assetUrl);
  const maskPath = fileURLToPath(maskUrl);
  const sourcePath = fileURLToPath(sourceUrl);
  assert.ok(existsSync(assetPath), `${module.id} runtime art is missing`);
  assert.ok(
    (await stat(assetPath)).size > module.minimumAssetBytes,
    `${module.id} art is suspiciously small`,
  );
  const [assetMeta, sourceMeta] = await Promise.all([
    sharp(assetPath).metadata(),
    sharp(sourcePath).metadata(),
  ]);
  assert.deepEqual(
    { width: assetMeta.width, height: assetMeta.height, hasAlpha: assetMeta.hasAlpha },
    { width: bounds.widthPx, height: bounds.heightPx, hasAlpha: true },
  );
  assert.equal(sourceMeta.width, config.carrier.widthPx);
  assert.equal(sourceMeta.height, config.carrier.heightPx, `${module.id} source was resized away from its native carrier`);

  const extract = {
    left: bounds.carrierLeftPx,
    top: bounds.carrierTopPx,
    width: bounds.widthPx,
    height: bounds.heightPx,
  };
  const [assetAlpha, maskAlpha] = await Promise.all([
    sharp(assetPath).ensureAlpha().extractChannel(3).raw().toBuffer(),
    sharp(maskPath).extract(extract).ensureAlpha().extractChannel(3).raw().toBuffer(),
  ]);
  for (let index = 0; index < assetAlpha.length; index += 1) {
    assert.ok(assetAlpha[index] <= maskAlpha[index], `${module.id} painted beyond Gate A`);
  }
  const opaquePixels = assetAlpha.reduce((total, value) => total + (value > 220 ? 1 : 0), 0);
  const transparentPixels = assetAlpha.reduce((total, value) => total + (value === 0 ? 1 : 0), 0);
  assert.ok(opaquePixels > assetAlpha.length * 0.07, `${module.id} mask lacks visible structure`);
  assert.ok(transparentPixels > assetAlpha.length * 0.02, `${module.id} crop lost transparency`);

  const contacts = WORLDROOT_WHITEBOX_CONFIG.platforms.filter(entry => entry.moduleId === module.id);
  for (const contact of contacts) {
    const y = Math.round(contact.yTile * config.sourceTileSizePx - bounds.worldTopPx);
    for (let step = 1; step <= 5; step += 1) {
      const ratio = step / 6;
      const xTile = contact.leftTile + (contact.rightTile - contact.leftTile) * ratio;
      const x = Math.round(xTile * config.sourceTileSizePx - bounds.worldLeftPx);
      const edgeAlpha = Math.max(...[-2, -1, 0, 1, 2].map(offset => (
        assetAlpha[(y + offset) * bounds.widthPx + x] || 0
      )));
      assert.ok(edgeAlpha >= 220, `${contact.id} lacks art on its collision top at sample ${step} (${x}, ${y}; alpha ${edgeAlpha})`);
    }
  }
}

console.log("Worldroot Gate B native art contract checks passed.");
