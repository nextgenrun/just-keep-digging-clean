import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(scriptDir, "..");
const assetRoot = join(
  projectRoot,
  "sprites",
  "environment",
  "starless-scar-v3",
);
const sourcePath = join(
  assetRoot,
  "source",
  "imagegen-frontier-checker-source.png",
);
const outputPath = join(assetRoot, "starless-scar-frontier-edge-v3.png");

function extractCheckerForegroundAlpha(rgb, width, height, build) {
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
    candidate[index] = minimum >= build.checkerMinimum
      && chroma <= build.checkerChromaMaximum ? 1 : 0;
  }

  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  const enqueue = index => {
    if (!candidate[index] || visited[index]) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head];
    head += 1;
    alpha[index] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  const crisp = new Uint8Array(alpha);
  for (let index = 0; index < pixelCount; index += 1) {
    if (crisp[index] === 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    let nearBackground = false;
    for (
      let dy = -build.checkerFringeRadiusPx;
      dy <= build.checkerFringeRadiusPx && !nearBackground;
      dy += 1
    ) {
      const sampleY = y + dy;
      if (sampleY < 0 || sampleY >= height) continue;
      for (
        let dx = -build.checkerFringeRadiusPx;
        dx <= build.checkerFringeRadiusPx;
        dx += 1
      ) {
        const sampleX = x + dx;
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
      minimum >= build.fringeMinimum
      && chroma <= build.fringeChromaMaximum
    ) alpha[index] = build.fringeAlpha;
  }
  return alpha;
}

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
    if (!existsSync(bundled)) {
      throw new Error("sharp is required to build the Starless Scar frontier");
    }
    return require(bundled);
  }
}

if (!existsSync(sourcePath)) {
  throw new Error(`Missing authored frontier source: ${sourcePath}`);
}

const sharp = loadSharp();
const { data: rgb, info } = await sharp(sourcePath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const alpha = extractCheckerForegroundAlpha(
  rgb,
  info.width,
  info.height,
  {
    checkerMinimum: 224,
    checkerChromaMaximum: 18,
    checkerFringeRadiusPx: 2,
    fringeMinimum: 176,
    fringeChromaMaximum: 30,
    fringeAlpha: 72,
  },
);
for (let index = 0; index < alpha.length; index += 1) {
  const offset = index * 3;
  const red = rgb[offset];
  const green = rgb[offset + 1];
  const blue = rgb[offset + 2];
  const minimum = Math.min(red, green, blue);
  const chroma = Math.max(red, green, blue) - minimum;
  if (minimum >= 206 && chroma <= 28) alpha[index] = 0;
}
const cleaned = Buffer.from(rgb);
for (let index = 0; index < alpha.length; index += 1) {
  const opacity = alpha[index] / 255;
  const offset = index * 3;
  if (opacity === 0) {
    cleaned.fill(0, offset, offset + 3);
    continue;
  }
  if (opacity >= 1) continue;
  for (let channel = 0; channel < 3; channel += 1) {
    const foreground = (rgb[offset + channel] - 246 * (1 - opacity)) / opacity;
    cleaned[offset + channel] = Math.max(0, Math.min(255, Math.round(foreground)));
  }
}
for (let index = 0; index < alpha.length; index += 1) {
  if (alpha[index] === 0) continue;
  const offset = index * 3;
  const maximum = Math.max(
    cleaned[offset],
    cleaned[offset + 1],
    cleaned[offset + 2],
  );
  if (maximum <= 176) continue;
  const scale = 176 / maximum;
  cleaned[offset] = Math.round(cleaned[offset] * scale);
  cleaned[offset + 1] = Math.round(cleaned[offset + 1] * scale);
  cleaned[offset + 2] = Math.round(cleaned[offset + 2] * scale);
}

await sharp(cleaned, {
  raw: { width: info.width, height: info.height, channels: 3 },
}).joinChannel(alpha, {
  raw: { width: info.width, height: info.height, channels: 1 },
}).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outputPath);

const transparentPixels = alpha.reduce(
  (total, value) => total + Number(value === 0),
  0,
);
console.log(JSON.stringify({
  outputPath,
  width: info.width,
  height: info.height,
  transparentRatio: transparentPixels / alpha.length,
}, null, 2));
