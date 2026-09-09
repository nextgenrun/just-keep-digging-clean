// Deterministic import of ImageGen art: chroma matte and cell extraction only.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WORLDROOT_SANCTUARY_CONFIG as config } from "../values/worldrootSanctuary.js";

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require("sharp"); } catch {
  sharp = require(join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp"));
}
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const assetRoot = join(root, config.assetRoot);
if (!config.assetRoot.endsWith("worldroot-sanctuary-v1/"))
  throw new Error("V1 importer is retained for history. Use 2026-09-03-build-worldroot-sanctuary-v3.mjs for the active art.");
const clamp = value => Math.max(0, Math.min(1, value));

async function importChroma(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const build = config.build;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = data.subarray(i, i + 3);
    const keyCandidate = g <= build.keyGreenMaximum && Math.abs(r - b) < build.keyChannelDifference;
    const key = keyCandidate ? clamp((Math.min(r, b) - g - build.keyDominanceStart)
      / (build.keyDominanceEnd - build.keyDominanceStart)) : 0;
    const alpha = 1 - key;
    if (data[i + 3] * alpha < build.alphaCutoff) {
      data.fill(0, i, i + 4);
    } else if (key > 0) {
      // Unmix the known magenta carrier; preserve the authored foreground.
      data[i] = Math.max(0, Math.round((r - 255 * key) / alpha));
      data[i + 1] = Math.min(255, Math.round(g / alpha));
      data[i + 2] = Math.max(0, Math.round((b - 255 * key) / alpha));
      data[i + 3] = Math.round(data[i + 3] * alpha);
    }
  }
  return { data, info };
}

const manifest = { version: 1, date: "2026-09-02", builtInImageGen: true,
  contract: "independent-trunk-five-foliage-pairs-separate-live-stars-no-platforms",
  processing: "Magenta carrier removal and integer cell extraction; no painted runtime stars or campfire.",
  assets: [], sources: [] };

async function saveAsset(pipeline, asset, extra = {}) {
  const path = join(root, asset.path.split("?")[0]);
  await pipeline.png({ compressionLevel: config.build.compressionLevel }).toFile(path);
  const bytes = await readFile(path);
  const meta = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  let visible = 0;
  let chromaLeak = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < config.build.alphaCutoff) continue;
    visible += 1;
    if (data[i] > 190 && data[i + 2] > 190 && data[i + 1] < 40) chromaLeak += 1;
  }
  manifest.assets.push({ key: asset.key, path: asset.path.split("?")[0],
    width: meta.width, height: meta.height, hasAlpha: meta.hasAlpha,
    visiblePixels: visible, chromaLeak, sha256: createHash("sha256").update(bytes).digest("hex"), ...extra });
}

for (const [id, path] of Object.entries(config.build.sources)) {
  const bytes = await readFile(join(assetRoot, path));
  manifest.sources.push({ id, path, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const trunk = await importChroma(join(assetRoot, config.build.sources.trunk));
await saveAsset(sharp(trunk.data, { raw: trunk.info }), config.base);
const foliage = await importChroma(join(assetRoot, config.build.sources.foliage));
for (const [column, region] of config.regions.entries()) {
  for (const [row, state] of ["living", "consumed"].entries()) {
    const left = Math.round(column * foliage.info.width / config.build.columns);
    const top = Math.round(row * foliage.info.height / config.build.rows);
    const width = Math.round((column + 1) * foliage.info.width / config.build.columns) - left;
    const height = Math.round((row + 1) * foliage.info.height / config.build.rows) - top;
    await saveAsset(sharp(foliage.data, { raw: foliage.info }).extract({ left, top, width, height }),
      region[state], { regionId: region.id, state, sourceCell: { left, top, width, height } });
  }
}
await writeFile(join(assetRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ result: "WORLDROOT_SANCTUARY_ART_IMPORTED", assets: manifest.assets }, null, 2));
