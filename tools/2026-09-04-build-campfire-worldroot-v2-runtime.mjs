import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(scriptDirectory, "..");
const familyRoot = join(projectRoot, "sprites", "npc", "campfire", "worldroot-v2");
const sourceRoot = join(familyRoot, "sources");
const runtimeRoot = join(familyRoot, "runtime");

const EXTRACTION = Object.freeze({
  checkerMinimum: 216,
  checkerChromaMaximum: 26,
  enclosedMinimumPixels: 80,
  enclosedMinimumSpan: 8,
  enclosedMinimumFill: 0.60,
  enclosedAverageMinimum: 232,
  enclosedAverageChromaMaximum: 8,
  fringeRadiusPx: 2,
  fringeMinimum: 170,
  fringeChromaMaximum: 36,
  fringeAlpha: 72,
  matteValue: 246,
});

function loadSharp() {
  try {
    return require("sharp");
  } catch {
    const bundled = join(process.env.USERPROFILE || "", ".cache", "codex-runtimes",
      "codex-primary-runtime", "dependencies", "node", "node_modules", "sharp");
    if (!existsSync(bundled)) {
      throw new Error("sharp is required to build Campfire runtime assets");
    }
    return require(bundled);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function extractAlpha(rgb, width, height, config = EXTRACTION) {
  const pixelCount = width * height;
  const candidate = new Uint8Array(pixelCount);
  const alpha = new Uint8Array(pixelCount);
  alpha.fill(255);
  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 3;
    const red = rgb[offset];
    const green = rgb[offset + 1];
    const blue = rgb[offset + 2];
    const minimum = Math.min(red, green, blue);
    const chroma = Math.max(red, green, blue) - minimum;
    candidate[index] = minimum >= config.checkerMinimum
      && chroma <= config.checkerChromaMaximum ? 1 : 0;
  }

  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let removedComponents = 0;
  let removedPixels = 0;
  for (let seed = 0; seed < pixelCount; seed += 1) {
    if (!candidate[seed] || visited[seed]) continue;
    let head = 0;
    let tail = 0;
    let minimumX = width;
    let maximumX = 0;
    let minimumY = height;
    let maximumY = 0;
    let touchesEdge = false;
    let sumMinimum = 0;
    let sumChroma = 0;
    queue[tail++] = seed;
    visited[seed] = 1;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      minimumX = Math.min(minimumX, x);
      maximumX = Math.max(maximumX, x);
      minimumY = Math.min(minimumY, y);
      maximumY = Math.max(maximumY, y);
      touchesEdge ||= x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const offset = index * 3;
      const red = rgb[offset];
      const green = rgb[offset + 1];
      const blue = rgb[offset + 2];
      const minimum = Math.min(red, green, blue);
      sumMinimum += minimum;
      sumChroma += Math.max(red, green, blue) - minimum;

      if (x > 0) {
        const next = index - 1;
        if (candidate[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (x + 1 < width) {
        const next = index + 1;
        if (candidate[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (y > 0) {
        const next = index - width;
        if (candidate[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (y + 1 < height) {
        const next = index + width;
        if (candidate[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    const componentWidth = maximumX - minimumX + 1;
    const componentHeight = maximumY - minimumY + 1;
    const fillRatio = tail / (componentWidth * componentHeight);
    const enclosedBackdrop = tail >= config.enclosedMinimumPixels
      && componentWidth >= config.enclosedMinimumSpan
      && componentHeight >= config.enclosedMinimumSpan
      && fillRatio >= config.enclosedMinimumFill
      && (sumMinimum / tail) >= config.enclosedAverageMinimum
      && (sumChroma / tail) <= config.enclosedAverageChromaMaximum;
    if (!touchesEdge && !enclosedBackdrop) continue;
    removedComponents += 1;
    removedPixels += tail;
    for (let index = 0; index < tail; index += 1) alpha[queue[index]] = 0;
  }

  const crisp = new Uint8Array(alpha);
  let fringePixels = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    if (crisp[index] === 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    let nearBackground = false;
    for (
      let deltaY = -config.fringeRadiusPx;
      deltaY <= config.fringeRadiusPx && !nearBackground;
      deltaY += 1
    ) {
      const sampleY = y + deltaY;
      if (sampleY < 0 || sampleY >= height) continue;
      for (
        let deltaX = -config.fringeRadiusPx;
        deltaX <= config.fringeRadiusPx;
        deltaX += 1
      ) {
        const sampleX = x + deltaX;
        if (sampleX < 0 || sampleX >= width) continue;
        if (crisp[sampleY * width + sampleX] === 0) {
          nearBackground = true;
          break;
        }
      }
    }
    if (!nearBackground) continue;
    const offset = index * 3;
    const red = rgb[offset];
    const green = rgb[offset + 1];
    const blue = rgb[offset + 2];
    const minimum = Math.min(red, green, blue);
    const chroma = Math.max(red, green, blue) - minimum;
    if (
      minimum >= config.fringeMinimum
      && chroma <= config.fringeChromaMaximum
    ) {
      alpha[index] = config.fringeAlpha;
      fringePixels += 1;
    }
  }
  return { alpha, removedComponents, removedPixels, fringePixels };
}

function cleanFringe(rgb, alpha, config = EXTRACTION) {
  const cleaned = Buffer.from(rgb);
  for (let index = 0; index < alpha.length; index += 1) {
    const offset = index * 3;
    if (alpha[index] === 0) {
      cleaned.fill(0, offset, offset + 3);
      continue;
    }
    if (alpha[index] === 255) continue;
    const opacity = alpha[index] / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      const foreground = (
        rgb[offset + channel] - config.matteValue * (1 - opacity)
      ) / opacity;
      cleaned[offset + channel] = Math.max(
        0,
        Math.min(255, Math.round(foreground)),
      );
    }
  }
  return cleaned;
}

function visibleBounds(alpha, width, height) {
  let minimumX = width;
  let maximumX = -1;
  let minimumY = height;
  let maximumY = -1;
  let transparentPixels = 0;
  for (let index = 0; index < alpha.length; index += 1) {
    if (alpha[index] === 0) {
      transparentPixels += 1;
      continue;
    }
    const x = index % width;
    const y = Math.floor(index / width);
    minimumX = Math.min(minimumX, x);
    maximumX = Math.max(maximumX, x);
    minimumY = Math.min(minimumY, y);
    maximumY = Math.max(maximumY, y);
  }
  return {
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX + 1,
    height: maximumY - minimumY + 1,
    transparentRatio: transparentPixels / alpha.length,
  };
}

const sharp = loadSharp();
mkdirSync(runtimeRoot, { recursive: true });
const tiers = [];
for (let level = 1; level <= 10; level += 1) {
  const suffix = String(level).padStart(2, "0");
  const filename = "campfire-tier-" + suffix + ".png";
  const sourcePath = join(sourceRoot, filename);
  const outputPath = join(runtimeRoot, filename);
  if (!existsSync(sourcePath)) {
    throw new Error("Missing Campfire source: " + sourcePath);
  }
  const sourceBytes = readFileSync(sourcePath);
  const { data: rgb, info } = await sharp(sourceBytes)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== 1254 || info.height !== 1254) {
    throw new Error("Unexpected Campfire canvas: " + sourcePath);
  }
  const extraction = extractAlpha(rgb, info.width, info.height);
  const cleaned = cleanFringe(rgb, extraction.alpha);
  await sharp(cleaned, {
    raw: { width: info.width, height: info.height, channels: 3 },
  }).joinChannel(extraction.alpha, {
    raw: { width: info.width, height: info.height, channels: 1 },
  }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outputPath);

  const outputBytes = readFileSync(outputPath);
  const metadata = await sharp(outputBytes).metadata();
  const bounds = visibleBounds(extraction.alpha, info.width, info.height);
  if (
    metadata.hasAlpha !== true
    || bounds.transparentRatio < 0.35
    || bounds.transparentRatio > 0.95
    || bounds.width <= 0
    || bounds.height <= 0
  ) throw new Error("Invalid Campfire runtime output: " + outputPath);
  tiers.push({
    level,
    source: "../sources/" + filename,
    runtime: filename,
    sourceSha256: sha256(sourceBytes),
    runtimeSha256: sha256(outputBytes),
    width: info.width,
    height: info.height,
    visibleBounds: bounds,
    removedComponents: extraction.removedComponents,
    removedPixels: extraction.removedPixels,
    fringePixels: extraction.fringePixels,
  });
}

const manifest = {
  schemaVersion: 1,
  family: "campfire-worldroot-v2-runtime",
  sourcePolicy: "RGB sources remain immutable; only neutral connected backdrop is removed.",
  extraction: EXTRACTION,
  tiers,
};
writeFileSync(
  join(runtimeRoot, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(manifest, null, 2));
