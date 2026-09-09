import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WORLDROOT_MODULAR_V4_CONFIG } from "../values/worldrootModularV4.js";

const require = createRequire(import.meta.url);
const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(scriptDir, "..");
const assetRoot = join(projectRoot, "sprites", "environment", "worldroot-modular-v4");
const sourceRoot = join(assetRoot, "source");
const livingRoot = join(assetRoot, "living");
const consumedRoot = join(assetRoot, "consumed");

function loadSharp() {
  try {
    return require("sharp");
  } catch {
    const bundled = join(
      process.env.USERPROFILE || "",
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "node_modules",
      "sharp",
    );
    if (!existsSync(bundled)) throw new Error("sharp is required for Worldroot module builds");
    return require(bundled);
  }
}

const sharp = loadSharp();
const MODULES = WORLDROOT_MODULAR_V4_CONFIG.modules;

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const hashFile = path => createHash("sha256").update(readFileSync(path)).digest("hex");

function neutralizeGreenDominance(rgba) {
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const other = Math.max(rgba[offset], rgba[offset + 2]);
    if (rgba[offset + 1] > other) rgba[offset + 1] = other;
  }
  return rgba;
}

function chromaKeyStrength(red, green, blue, matte) {
  const other = Math.max(red, blue);
  const dominance = green - other;
  if (!matte) {
    const greenAmount = clamp((green - 96) / 128, 0, 1);
    const dominanceAmount = clamp((dominance - 22) / 92, 0, 1);
    return greenAmount * dominanceAmount;
  }
  const greenAmount = clamp(
    (green - matte.greenFloor) / matte.greenRange,
    0,
    1,
  );
  const dominanceRatio = dominance / Math.max(green, 1);
  const dominanceAmount = clamp(
    (dominanceRatio - matte.dominanceRatioFloor) / matte.dominanceRatioRange,
    0,
    1,
  );
  return greenAmount * dominanceAmount;
}

function applyFinalChromaMatte(rgba, sourceRgb, matte) {
  for (let index = 0; index < sourceRgb.length / 3; index += 1) {
    const sourceOffset = index * 3;
    const outputOffset = index * 4;
    const keyStrength = chromaKeyStrength(
      sourceRgb[sourceOffset],
      sourceRgb[sourceOffset + 1],
      sourceRgb[sourceOffset + 2],
      matte,
    );
    rgba[outputOffset + 3] = Math.round(rgba[outputOffset + 3] * (1 - keyStrength));
    if (rgba[outputOffset + 3] < matte.alphaCutoff) rgba[outputOffset + 3] = 0;
  }
  return rgba;
}

function extractChroma(rgb, width, height, matte = null) {
  const alpha = new Uint8Array(width * height);
  const cleaned = Buffer.from(rgb);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 3;
    const red = rgb[offset];
    const green = rgb[offset + 1];
    const blue = rgb[offset + 2];
    const other = Math.max(red, blue);
    const keyStrength = chromaKeyStrength(red, green, blue, matte);
    const fullKeyStrength = matte?.fullKeyStrength ?? 0.985;
    const alphaCutoff = matte?.alphaCutoff ?? 10;
    const value = keyStrength >= fullKeyStrength
      ? 0
      : Math.round(255 * (1 - keyStrength));
    alpha[index] = value < alphaCutoff ? 0 : value;
    if (alpha[index] === 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
    if (keyStrength > 0.01) {
      cleaned[offset + 1] = Math.min(green, Math.round(other + (matte ? 0 : 12)));
    }
  }
  if (right < left || bottom < top) throw new Error("Chroma extraction produced an empty module");
  const padding = 8;
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);
  return {
    alpha,
    cleaned,
    crop: {
      left,
      top,
      width: right - left + 1,
      height: bottom - top + 1,
    },
  };
}

async function buildLiving(spec) {
  const sourcePath = join(sourceRoot, `${spec.id}-living-chroma.png`);
  const outputPath = join(livingRoot, `${spec.id}-living.png`);
  if (!existsSync(sourcePath)) throw new Error(`Missing Worldroot module source: ${sourcePath}`);
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const extracted = extractChroma(data, info.width, info.height, spec.chromaMatte);
  const crop = spec.sourceCrop || extracted.crop;
  const rgba = Buffer.allocUnsafe(info.width * info.height * 4);
  for (let index = 0; index < info.width * info.height; index += 1) {
    const sourceOffset = index * 3;
    const outputOffset = index * 4;
    rgba[outputOffset] = extracted.cleaned[sourceOffset];
    rgba[outputOffset + 1] = extracted.cleaned[sourceOffset + 1];
    rgba[outputOffset + 2] = extracted.cleaned[sourceOffset + 2];
    rgba[outputOffset + 3] = extracted.alpha[index];
  }
  const resized = sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract(crop)
    .resize({
      width: Math.min(spec.maxWidthPx, crop.width),
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });
  if (spec.despillGreen) {
    const final = await resized.raw().toBuffer({ resolveWithObject: true });
    if (spec.chromaMatte) {
      const sourceRgb = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 3 },
      })
        .extract(crop)
        .resize({
          width: final.info.width,
          height: final.info.height,
          fit: "fill",
          kernel: sharp.kernel.lanczos3,
        })
        .raw()
        .toBuffer();
      applyFinalChromaMatte(final.data, sourceRgb, spec.chromaMatte);
    }
    neutralizeGreenDominance(final.data);
    await sharp(final.data, { raw: final.info })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath);
  } else {
    await resized
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath);
  }
  return { sourcePath, outputPath, crop };
}

async function buildConsumed(spec, livingPath) {
  const outputPath = join(consumedRoot, `${spec.id}-consumed.png`);
  const { data, info } = await sharp(livingPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.allocUnsafe(data.length);
  for (let index = 0; index < info.width * info.height; index += 1) {
    const offset = index * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];
    const luminance = red * 0.22 + green * 0.7 + blue * 0.08;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    const rotMix = 0.08 + chroma / 255 * 0.34;
    const ash = luminance * 0.19;
    const wound = Math.sin(index * 0.0017 + spec.id.length) > 0.994 ? 24 : 0;
    output[offset] = clamp(Math.round(ash + spec.rot[0] * rotMix + wound), 0, 255);
    output[offset + 1] = clamp(Math.round(ash * 0.72 + spec.rot[1] * rotMix), 0, 255);
    output[offset + 2] = clamp(Math.round(ash * 0.9 + spec.rot[2] * rotMix + wound * 0.45), 0, 255);
    output[offset + 3] = alpha;
  }
  await sharp(output, { raw: info })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
  return outputPath;
}

mkdirSync(livingRoot, { recursive: true });
mkdirSync(consumedRoot, { recursive: true });
const manifestModules = [];
for (const spec of MODULES) {
  const living = await buildLiving(spec);
  const consumedPath = await buildConsumed(spec, living.outputPath);
  const [livingMetadata, consumedMetadata] = await Promise.all([
    sharp(living.outputPath).metadata(),
    sharp(consumedPath).metadata(),
  ]);
  if (
    livingMetadata.width !== consumedMetadata.width
    || livingMetadata.height !== consumedMetadata.height
    || livingMetadata.hasAlpha !== true
    || consumedMetadata.hasAlpha !== true
    || livingMetadata.width > spec.maxWidthPx
  ) throw new Error(`Invalid modular Worldroot output: ${spec.id}`);
  manifestModules.push({
    id: spec.id,
    width: livingMetadata.width,
    height: livingMetadata.height,
    runtimeScale: 1,
    sourceCrop: living.crop,
    source: `source/${spec.id}-living-chroma.png`,
    living: `living/${spec.id}-living.png`,
    consumed: `consumed/${spec.id}-consumed.png`,
    hashes: {
      source: hashFile(living.sourcePath),
      living: hashFile(living.outputPath),
      consumed: hashFile(consumedPath),
    },
  });
}

const manifest = {
  version: 4,
  contract: "native-pixel-modules-no-runtime-stretch",
  generatedAt: new Date().toISOString(),
  modules: manifestModules,
};
const manifestPath = join(assetRoot, "worldroot-modular-v4.manifest.json");
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ manifest: manifestPath, modules: manifestModules }, null, 2));
