import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  WORLDROOT_MODULAR_V4_CONFIG,
} from "../values/worldrootModularV4.js";

const require = createRequire(import.meta.url);
const sharp = (() => {
  try { return require("sharp"); } catch {
    return require(join(
      process.env.USERPROFILE || "",
      ".cache", "codex-runtimes", "codex-primary-runtime",
      "dependencies", "node", "node_modules", "sharp",
    ));
  }
})();

const quality = WORLDROOT_MODULAR_V4_CONFIG.quality;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

async function loadRgba(path) {
  return sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function assetPath(asset) {
  return fileURLToPath(new URL(`../${asset.path.split("?")[0]}`, import.meta.url));
}

function chromaSourcePath(module) {
  return fileURLToPath(new URL(
    `../sprites/environment/worldroot-modular-v4/source/${module.id}-living-chroma.png`,
    import.meta.url,
  ));
}

function chromaKeyStrength(red, green, blue, matte) {
  const dominanceRatio = (green - Math.max(red, blue)) / Math.max(green, 1);
  const greenAmount = clamp((green - matte.greenFloor) / matte.greenRange, 0, 1);
  const dominanceAmount = clamp(
    (dominanceRatio - matte.dominanceRatioFloor) / matte.dominanceRatioRange,
    0,
    1,
  );
  return greenAmount * dominanceAmount;
}

function alphaAt(image, x, y) {
  if (x < 0 || y < 0 || x >= image.info.width || y >= image.info.height) return 0;
  return image.data[(Math.floor(y) * image.info.width + Math.floor(x)) * 4 + 3] || 0;
}

function maximumVerticalAlpha(image, x, y, radiusPx, horizontalRadiusPx = 1) {
  let maximum = 0;
  for (let dy = -radiusPx; dy <= radiusPx; dy += 1) {
    for (let dx = -horizontalRadiusPx; dx <= horizontalRadiusPx; dx += 1) {
      maximum = Math.max(maximum, alphaAt(image, x + dx, y + dy));
    }
  }
  return maximum;
}

const moduleResults = [];
const platformResults = [];
const platformIds = new Set();

for (const module of WORLDROOT_MODULAR_V4_CONFIG.modules) {
  const [living, consumed] = await Promise.all([
    loadRgba(assetPath(module.living)),
    loadRgba(assetPath(module.consumed)),
  ]);
  assert.equal(living.info.width, consumed.info.width, `${module.id} width mismatch`);
  assert.equal(living.info.height, consumed.info.height, `${module.id} height mismatch`);
  assert.equal(living.info.channels, 4);
  assert.equal(consumed.info.channels, 4);
  assert.ok(
    living.info.width >= quality.minimumWidthPx,
    `${module.id} is below the native HD width floor`,
  );
  if (module.sourceCrop) {
    const expectedWidth = Math.min(module.maxWidthPx, module.sourceCrop.width);
    const expectedHeight = Math.round(
      module.sourceCrop.height * expectedWidth / module.sourceCrop.width,
    );
    assert.equal(living.info.width, expectedWidth, `${module.id} crop width drifted`);
    assert.equal(living.info.height, expectedHeight, `${module.id} crop height drifted`);
  }

  let opaquePixels = 0;
  let alphaMismatchPixels = 0;
  let livingLuminance = 0;
  let consumedLuminance = 0;
  let rgbDistance = 0;
  let greenDominantPixels = 0;
  let visibleChromaLeakPixels = 0;
  for (let offset = 0; offset < living.data.length; offset += 4) {
    if (living.data[offset + 3] !== consumed.data[offset + 3]) alphaMismatchPixels += 1;
    if (living.data[offset + 3] < quality.visibleAlpha) continue;
    opaquePixels += 1;
    if (living.data[offset + 1] > Math.max(living.data[offset], living.data[offset + 2])) {
      greenDominantPixels += 1;
    }
    const livingLum = living.data[offset] * 0.2126
      + living.data[offset + 1] * 0.7152
      + living.data[offset + 2] * 0.0722;
    const consumedLum = consumed.data[offset] * 0.2126
      + consumed.data[offset + 1] * 0.7152
      + consumed.data[offset + 2] * 0.0722;
    livingLuminance += livingLum;
    consumedLuminance += consumedLum;
    rgbDistance += Math.hypot(
      living.data[offset] - consumed.data[offset],
      living.data[offset + 1] - consumed.data[offset + 1],
      living.data[offset + 2] - consumed.data[offset + 2],
    );
  }

  assert.equal(alphaMismatchPixels, 0, `${module.id} state silhouettes drifted`);
  if (module.despillGreen) {
    assert.equal(greenDominantPixels, 0, `${module.id} retained visible green-key spill`);
  }
  if (module.chromaMatte) {
    assert.ok(module.sourceCrop, `${module.id} must lock its source crop`);
    const source = await sharp(chromaSourcePath(module))
      .removeAlpha()
      .extract(module.sourceCrop)
      .resize({
        width: living.info.width,
        height: living.info.height,
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
      })
      .raw()
      .toBuffer();
    for (let index = 0; index < living.info.width * living.info.height; index += 1) {
      const sourceOffset = index * 3;
      const outputOffset = index * 4;
      if (
        chromaKeyStrength(
          source[sourceOffset],
          source[sourceOffset + 1],
          source[sourceOffset + 2],
          module.chromaMatte,
        ) >= module.chromaMatte.fullKeyStrength
        && living.data[outputOffset + 3] >= quality.visibleAlpha
      ) visibleChromaLeakPixels += 1;
    }
    assert.ok(
      visibleChromaLeakPixels <= quality.maximumVisibleChromaLeakPixels,
      `${module.id} retained visible keyed-background alpha`,
    );
  }
  assert.ok(opaquePixels > 0, `${module.id} is empty`);
  const luminanceRatio = consumedLuminance / livingLuminance;
  const meanRgbDistance = rgbDistance / opaquePixels;
  assert.ok(
    luminanceRatio <= quality.maximumConsumedLuminanceRatio,
    `${module.id} consumed state is not dark enough`,
  );
  assert.ok(
    meanRgbDistance >= quality.minimumMeanStateRgbDistance,
    `${module.id} living and consumed states are not distinct enough`,
  );
  for (const [x, y] of [
    [0, 0],
    [living.info.width - 1, 0],
    [0, living.info.height - 1],
    [living.info.width - 1, living.info.height - 1],
  ]) {
    assert.ok(alphaAt(living, x, y) < quality.visibleAlpha, `${module.id} has an opaque corner`);
  }

  for (const platform of module.platforms) {
    assert.ok(!platformIds.has(platform.id), `duplicate platform id ${platform.id}`);
    platformIds.add(platform.id);
    assert.ok(platform.leftPx >= 0 && platform.leftPx < platform.rightPx);
    assert.ok(platform.rightPx < living.info.width, `${platform.id} exceeds ${module.id} width`);
    assert.ok(platform.yPx >= 0 && platform.yPx < living.info.height);
    let coveredPixels = 0;
    const pixelCount = platform.rightPx - platform.leftPx + 1;
    for (let x = platform.leftPx; x <= platform.rightPx; x += 1) {
      if (maximumVerticalAlpha(
        living,
        x,
        platform.yPx,
        quality.platformContactRadiusPx,
      ) >= quality.visibleAlpha) coveredPixels += 1;
    }
    const coverage = coveredPixels / pixelCount;
    assert.equal(
      coverage,
      1,
      `${platform.id} places collision over transparent sprite pixels`,
    );
    platformResults.push({
      id: platform.id,
      moduleId: module.moduleId,
      widthPx: pixelCount,
      yPx: platform.yPx,
      coverage,
    });
  }

  moduleResults.push({
    id: module.id,
    width: living.info.width,
    height: living.info.height,
    alphaMismatchPixels,
    greenDominantPixels,
    visibleChromaLeakPixels,
    luminanceRatio,
    meanRgbDistance,
  });
}

assert.equal(platformResults.length, platformIds.size);
console.log(
  "WORLDROOT_MODULAR_V4_ART_CONTRACT_OK",
  JSON.stringify({
    modules: moduleResults.length,
    platforms: platformResults.length,
    minimumWidthPx: Math.min(...moduleResults.map(module => module.width)),
    maximumConsumedLuminanceRatio: Math.max(...moduleResults.map(module => module.luminanceRatio)),
    minimumMeanStateRgbDistance: Math.min(...moduleResults.map(module => module.meanRgbDistance)),
    maximumVisibleChromaLeakPixels: Math.max(
      ...moduleResults.map(module => module.visibleChromaLeakPixels),
    ),
  }),
);
