// User-authorized background extraction; native size and interior foreground remain.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { WORLDROOT_SANCTUARY_ART as config } from "../values/worldrootSanctuaryArt.js";
import { WORLDROOT_SANCTUARY_CONFIG as presentation } from "../values/worldrootSanctuary.js";
import { extractCheckerForegroundAlpha } from "./2026-08-30-worldroot-image-alpha.mjs";

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require("sharp"); } catch {
  sharp = require(join(process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp"));
}
const root = fileURLToPath(new URL("..", import.meta.url));
const target = join(root, presentation.assetRoot);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const manifest = { version: config.version, date: config.date, builtInImageGen: true,
  processing: "User-approved neutral carrier and fringe removal; native dimensions; untouched source masters.",
  assets: [] };

function unmixNeutralEdges(data, rgb, width, height) {
  const alpha = Uint8Array.from({ length: width * height }, (_, pixel) => data[pixel * 4 + 3]);
  for (let pixel = 0; pixel < alpha.length; pixel++) {
    if (!alpha[pixel]) continue;
    const x = pixel % width, y = Math.floor(pixel / width);
    let background = -1, foreground = -1, foregroundDistance = Infinity;
    for (let dy = -config.foregroundRadius; dy <= config.foregroundRadius; dy++) {
      if (y + dy < 0 || y + dy >= height) continue;
      for (let dx = -config.foregroundRadius; dx <= config.foregroundRadius; dx++) {
        if (x + dx < 0 || x + dx >= width || (!dx && !dy)) continue;
        const sample = (y + dy) * width + x + dx;
        if (!alpha[sample] && Math.abs(dx) <= config.edgeRadius && Math.abs(dy) <= config.edgeRadius
          && Math.min(rgb[sample * 3], rgb[sample * 3 + 1], rgb[sample * 3 + 2]) >= config.checkerMinimum)
          background = sample;
        const offset = sample * 3, distance = dx * dx + dy * dy;
        if (alpha[sample] && distance < foregroundDistance
          && Math.min(rgb[offset], rgb[offset + 1], rgb[offset + 2]) < config.foregroundMinimum) {
          foreground = sample; foregroundDistance = distance;
        }
      }
    }
    if (background < 0 || foreground < 0) continue;
    let numerator = 0, denominator = 0;
    for (let channel = 0; channel < 3; channel++) {
      const back = rgb[background * 3 + channel];
      const difference = rgb[foreground * 3 + channel] - back;
      numerator += (rgb[pixel * 3 + channel] - back) * difference;
      denominator += difference * difference;
    }
    const coverage = Math.max(0, Math.min(1, numerator / Math.max(1, denominator)));
    const index = pixel * 4;
    data[index + 3] = Math.round(alpha[pixel] * coverage);
    if (data[index + 3] < config.alphaCutoff) { data.fill(0, index, index + 4); continue; }
    for (let channel = 0; channel < 3; channel++)
      data[index + channel] = Math.max(0, Math.min(255, Math.round(
        (rgb[pixel * 3 + channel] - (1 - coverage) * rgb[background * 3 + channel]) / coverage)));
    // Very low coverage can amplify neutral-carrier colour noise. Reuse the
    // neighbouring authored foreground colour for those edge pixels only.
    if (Math.min(data[index], data[index + 2]) - data[index + 1] > config.checkerChromaMaximum)
      for (let channel = 0; channel < 3; channel++) data[index + channel] = rgb[foreground * 3 + channel];
  }
}

for (const asset of config.assets) {
  const bytes = await readFile(join(target, asset.source));
  const meta = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (!meta.hasAlpha) {
    const rgb = await sharp(bytes).removeAlpha().raw().toBuffer();
    const alpha = extractCheckerForegroundAlpha(rgb, info.width, info.height, config);
    // Also clear enclosed neutral checker gaps between the branches and leaves.
    for (let pixel = 0; pixel < alpha.length; pixel++) {
      const index = pixel * info.channels;
      const channels = [data[index], data[index + 1], data[index + 2]];
      const minimum = Math.min(...channels);
      const neutralCarrier = minimum >= config.checkerMinimum
        && Math.max(...channels) - minimum <= config.checkerChromaMaximum;
      data[index + 3] = neutralCarrier ? 0 : alpha[pixel];
      if (data[index + 3] === 0) data.fill(0, index, index + info.channels);
    }
    unmixNeutralEdges(data, rgb, info.width, info.height);
  }
  const path = `${asset.name}.png`;
  await sharp(data, { raw: info }).png({ compressionLevel: config.compressionLevel }).toFile(join(target, path));
  const result = await readFile(join(target, path));
  const outputMeta = await sharp(result).metadata();
  const stats = await sharp(result).stats();
  if (!outputMeta.hasAlpha || stats.isOpaque) throw new Error(`${asset.name}: missing transparency`);
  let visiblePixels = 0, chromaLeak = 0, carrierPixels = 0;
  const bounds = { left: info.width, top: info.height, right: 0, bottom: 0 };
  for (let pixel = 0; pixel < info.width * info.height; pixel++) {
    const index = pixel * info.channels;
    if (data[index + 3] < config.alphaCutoff) continue;
    visiblePixels++;
    const x = pixel % info.width, y = Math.floor(pixel / info.width);
    bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
    bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
    const [r, g, b] = data.subarray(index, index + 3);
    if (Math.min(r, b) - g > config.checkerChromaMaximum) chromaLeak++;
    if (Math.min(r, g, b) >= config.checkerMinimum
      && Math.max(r, g, b) - Math.min(r, g, b) <= config.checkerChromaMaximum) carrierPixels++;
  }
  manifest.assets.push({ name: asset.name, key: `worldroot-sanctuary-${asset.name}-v3`,
    path: presentation.assetRoot + path, source: asset.source, sourceSha256: hash(bytes), sha256: hash(result),
    width: info.width, height: info.height, hasAlpha: true, visiblePixels, chromaLeak, carrierPixels, bounds });
}
await writeFile(join(target, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log("WORLDROOT_SANCTUARY_V3_IMPORTED", JSON.stringify(manifest));
