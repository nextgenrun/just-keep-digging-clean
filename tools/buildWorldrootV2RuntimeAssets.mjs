import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(scriptDir, "..");
const assetDirectory = process.argv[2] || "worldroot-v2";
if (!/^worldroot-v\d+$/.test(assetDirectory)) {
  throw new Error("Worldroot asset directory must use the worldroot-vN format");
}
const versionSuffix = assetDirectory.slice("worldroot-".length);
const assetRoot = join(projectRoot, "sprites", "environment", assetDirectory);
const sourceRoot = join(assetRoot, "source");

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
      throw new Error("sharp is required to build the authored Worldroot runtime assets");
    }
    return require(bundled);
  }
}

const sharp = loadSharp();
const livingSource = join(sourceRoot, "imagegen-living-checker-source.png");
const consumedSource = join(sourceRoot, "imagegen-consumed-checker-source.png");
const livingOutput = join(assetRoot, `worldroot-living-${versionSuffix}.png`);
const consumedOutput = join(assetRoot, `worldroot-consumed-${versionSuffix}.png`);
const contactGridOutput = join(assetRoot, `worldroot-contact-grid-${versionSuffix}.png`);

for (const path of [livingSource, consumedSource]) {
  if (!existsSync(path)) throw new Error(`Missing authored Worldroot source: ${path}`);
}

const [livingMeta, consumedMeta] = await Promise.all([
  sharp(livingSource).metadata(),
  sharp(consumedSource).metadata(),
]);

if (
  livingMeta.width !== consumedMeta.width
  || livingMeta.height !== consumedMeta.height
) {
  throw new Error("Worldroot living and consumed sources must share one canvas");
}

const width = livingMeta.width;
const height = livingMeta.height;
const pixelCount = width * height;
const [{ data: livingRgb }, { data: consumedRgb }] = await Promise.all([
  sharp(livingSource).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  sharp(consumedSource).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
]);

const isCheckerBackground = (red, green, blue) => {
  const minimum = Math.min(red, green, blue);
  const chroma = Math.max(red, green, blue) - minimum;
  return minimum >= 232 && chroma <= 20;
};

const candidate = new Uint8Array(pixelCount);
for (let index = 0; index < pixelCount; index += 1) {
  const rgbIndex = index * 3;
  candidate[index] = isCheckerBackground(
    livingRgb[rgbIndex],
    livingRgb[rgbIndex + 1],
    livingRgb[rgbIndex + 2],
  ) ? 1 : 0;
}

// Image generation delivers a painted neutral checker even when transparency
// is requested. Remove only connected checker regions: the outer canvas and
// large enclosed openings. This retains isolated pale bark and Crown highlights.
const alpha = new Uint8Array(pixelCount);
alpha.fill(255);
const visited = new Uint8Array(pixelCount);
const queue = new Int32Array(pixelCount);
let removedPixels = 0;
let removedComponents = 0;

for (let seed = 0; seed < pixelCount; seed += 1) {
  if (!candidate[seed] || visited[seed]) continue;
  let head = 0;
  let tail = 0;
  queue[tail++] = seed;
  visited[seed] = 1;
  let minimumX = width;
  let maximumX = 0;
  let minimumY = height;
  let maximumY = 0;
  let touchesEdge = false;
  let sumMinimum = 0;
  let sumChroma = 0;

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    minimumX = Math.min(minimumX, x);
    maximumX = Math.max(maximumX, x);
    minimumY = Math.min(minimumY, y);
    maximumY = Math.max(maximumY, y);
    touchesEdge ||= x === 0 || y === 0 || x === width - 1 || y === height - 1;
    const rgbIndex = index * 3;
    const red = livingRgb[rgbIndex];
    const green = livingRgb[rgbIndex + 1];
    const blue = livingRgb[rgbIndex + 2];
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
  // Preserve only neutral components that actually intersect the Crown Star's
  // white core. A previous broad upper-right exemption also retained the
  // generator's large white checker windows inside the canopy.
  const crownHighlight = maximumX >= width * 0.70
    && minimumX <= width * 0.80
    && maximumY >= height * 0.06
    && minimumY <= height * 0.23;
  const enclosedChecker = tail >= 120
    && componentWidth >= 8
    && componentHeight >= 8
    && fillRatio >= 0.22
    && (sumMinimum / tail) >= 238
    && (sumChroma / tail) <= 10
    && !crownHighlight;
  if (!touchesEdge && !enclosedChecker) continue;
  removedComponents += 1;
  removedPixels += tail;
  for (let index = 0; index < tail; index += 1) alpha[queue[index]] = 0;
}

// Feather only neutral fringe pixels adjacent to a removed checker region.
// Colored emissive tips remain solid, while white checker halos disappear.
const crispAlpha = new Uint8Array(alpha);
for (let index = 0; index < pixelCount; index += 1) {
  if (crispAlpha[index] === 0) continue;
  const x = index % width;
  const y = Math.floor(index / width);
  let nearBackground = false;
  for (let offsetY = -2; offsetY <= 2 && !nearBackground; offsetY += 1) {
    const sampleY = y + offsetY;
    if (sampleY < 0 || sampleY >= height) continue;
    for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
      const sampleX = x + offsetX;
      if (sampleX < 0 || sampleX >= width) continue;
      if (crispAlpha[sampleY * width + sampleX] === 0) {
        nearBackground = true;
        break;
      }
    }
  }
  if (!nearBackground) continue;
  const rgbIndex = index * 3;
  const red = livingRgb[rgbIndex];
  const green = livingRgb[rgbIndex + 1];
  const blue = livingRgb[rgbIndex + 2];
  const minimum = Math.min(red, green, blue);
  const chroma = Math.max(red, green, blue) - minimum;
  const neutralLight = Math.max(0, Math.min(1, (minimum - 190) / 48))
    * Math.max(0, Math.min(1, (28 - chroma) / 28));
  alpha[index] = Math.max(24, Math.round(255 * (1 - neutralLight * 0.9)));
}

const alphaInput = { raw: { width, height, channels: 1 } };
await sharp(livingRgb, { raw: { width, height, channels: 3 } })
  .joinChannel(alpha, alphaInput)
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(livingOutput);

// The authored consumed painting is intentionally dramatic but has tiny
// geometry drift. Reuse the living alpha and fill any drifted checker pixels
// with a deterministic rotten version of the exact living pixel.
const alignedConsumedRgb = Buffer.allocUnsafe(livingRgb.length);
for (let index = 0; index < pixelCount; index += 1) {
  const rgbIndex = index * 3;
  const consumedRed = consumedRgb[rgbIndex];
  const consumedGreen = consumedRgb[rgbIndex + 1];
  const consumedBlue = consumedRgb[rgbIndex + 2];
  if (!isCheckerBackground(consumedRed, consumedGreen, consumedBlue)) {
    alignedConsumedRgb[rgbIndex] = consumedRed;
    alignedConsumedRgb[rgbIndex + 1] = consumedGreen;
    alignedConsumedRgb[rgbIndex + 2] = consumedBlue;
    continue;
  }
  const livingRed = livingRgb[rgbIndex];
  const livingGreen = livingRgb[rgbIndex + 1];
  const livingBlue = livingRgb[rgbIndex + 2];
  const luminance = livingRed * 0.24 + livingGreen * 0.68 + livingBlue * 0.08;
  alignedConsumedRgb[rgbIndex] = Math.round(Math.min(255, 8 + luminance * 0.28));
  alignedConsumedRgb[rgbIndex + 1] = Math.round(Math.min(255, 6 + luminance * 0.2));
  alignedConsumedRgb[rgbIndex + 2] = Math.round(Math.min(255, 10 + luminance * 0.25));
}

await sharp(alignedConsumedRgb, { raw: { width, height, channels: 3 } })
  .joinChannel(alpha, alphaInput)
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(consumedOutput);

const outputs = await Promise.all(
  [livingOutput, consumedOutput].map(async path => ({
    path,
    metadata: await sharp(path).metadata(),
  })),
);
for (const output of outputs) {
  if (
    output.metadata.width !== width
    || output.metadata.height !== height
    || output.metadata.hasAlpha !== true
  ) {
    throw new Error(`Invalid authored Worldroot runtime output: ${output.path}`);
  }
}

const gridLines = [];
const gridLabels = [];
for (let index = 0; index <= 20; index += 1) {
  const x = Math.round(index * width / 20);
  const y = Math.round(index * height / 20);
  const label = (index / 20).toFixed(2);
  gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#ff24c7" stroke-width="1"/>`);
  gridLines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#20f4ef" stroke-width="1"/>`);
  if (index < 20) {
    gridLabels.push(`<text x="${Math.min(width - 48, x + 3)}" y="18">${label}</text>`);
    if (index > 0) gridLabels.push(`<text x="3" y="${Math.min(height - 4, y + 18)}">${label}</text>`);
  }
}
const gridSvg = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`
  + `<g>${gridLines.join("")}</g>`
  + `<g fill="#ffffff" stroke="#000000" stroke-width="3" paint-order="stroke" font-family="Arial" font-size="15">${gridLabels.join("")}</g>`
  + `</svg>`,
);
await sharp({
  create: {
    width,
    height,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 1 },
  },
})
  .composite([{ input: livingOutput }, { input: gridSvg }])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(contactGridOutput);
const contactGridMetadata = await sharp(contactGridOutput).metadata();
if (contactGridMetadata.width !== width || contactGridMetadata.height !== height) {
  throw new Error(`Invalid Worldroot contact-grid output: ${contactGridOutput}`);
}

console.log(JSON.stringify({
  canvas: `${width}x${height}`,
  removedComponents,
  removedPixels,
  outputs: outputs.map(output => ({
    path: output.path,
    hasAlpha: output.metadata.hasAlpha,
  })),
  contactGrid: contactGridOutput,
}, null, 2));
