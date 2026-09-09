import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(scriptDir, "..");
const assetRoot = join(projectRoot, "sprites", "environment", "worldroot-v1");
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
      throw new Error("sharp is required to compose the authored Worldroot alpha mask");
    }
    return require(bundled);
  }
}

const sharp = loadSharp();
const livingSource = join(sourceRoot, "imagegen-living-checker-source.png");
const consumedSource = join(sourceRoot, "imagegen-consumed-alpha-source.png");
const livingOutput = join(assetRoot, "worldroot-living-v1.png");
const consumedOutput = join(assetRoot, "worldroot-consumed-v1.png");

for (const path of [livingSource, consumedSource]) {
  if (!existsSync(path)) throw new Error(`Missing Worldroot source: ${path}`);
}

const [livingMeta, consumedMeta] = await Promise.all([
  sharp(livingSource).metadata(),
  sharp(consumedSource).metadata(),
]);

if (
  livingMeta.width !== consumedMeta.width
  || livingMeta.height !== consumedMeta.height
  || consumedMeta.hasAlpha !== true
) {
  throw new Error("Worldroot living art and authored consumed alpha must share one RGBA canvas");
}

const [{ data: authoredAlpha }, { data: livingRgb }] = await Promise.all([
  sharp(consumedSource)
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true }),
  sharp(livingSource)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }),
]);
const cleanedAlpha = Buffer.allocUnsafe(authoredAlpha.length);
const transparentFloor = 96;
const opaqueCeiling = 224;
for (let index = 0; index < authoredAlpha.length; index += 1) {
  const value = authoredAlpha[index];
  const authored = value <= transparentFloor
    ? 0
    : value >= opaqueCeiling
      ? 255
      : Math.round(
        ((value - transparentFloor) / (opaqueCeiling - transparentFloor)) * 255,
      );
  const rgbIndex = index * 3;
  const red = livingRgb[rgbIndex];
  const green = livingRgb[rgbIndex + 1];
  const blue = livingRgb[rgbIndex + 2];
  const darkest = Math.min(red, green, blue);
  const chroma = Math.max(red, green, blue) - darkest;
  const darkSignal = Math.max(0, Math.min(255, Math.round(((244 - darkest) / 18) * 255)));
  const colorSignal = Math.max(0, Math.min(255, Math.round(((chroma - 2) / 18) * 255)));
  const checkerCutout = Math.max(darkSignal, colorSignal);
  cleanedAlpha[index] = Math.round((authored * checkerCutout) / 255);
}
const alphaInput = {
  raw: {
    width: livingMeta.width,
    height: livingMeta.height,
    channels: 1,
  },
};

await sharp(livingSource)
  .joinChannel(cleanedAlpha, alphaInput)
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(livingOutput);

const consumedRgb = await sharp(consumedSource)
  .removeAlpha()
  .png()
  .toBuffer();
await sharp(consumedRgb)
  .joinChannel(cleanedAlpha, alphaInput)
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(consumedOutput);

const outputs = await Promise.all(
  [livingOutput, consumedOutput].map(async path => ({
    path,
    metadata: await sharp(path).metadata(),
  })),
);

for (const output of outputs) {
  const { width, height, hasAlpha } = output.metadata;
  if (width !== livingMeta.width || height !== livingMeta.height || hasAlpha !== true) {
    throw new Error(`Invalid Worldroot runtime output: ${output.path}`);
  }
}

console.log(JSON.stringify({
  canvas: `${livingMeta.width}x${livingMeta.height}`,
  outputs: outputs.map(output => ({
    path: output.path,
    hasAlpha: output.metadata.hasAlpha,
  })),
}, null, 2));
