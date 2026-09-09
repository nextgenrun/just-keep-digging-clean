import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  resolveWorldrootNativeModuleBounds,
  resolveWorldrootNativeModuleGeometry,
} from "../values/worldrootModuleArt.js";
import { extractCheckerForegroundAlpha } from
  "./2026-08-30-worldroot-image-alpha.mjs";

const require = createRequire(import.meta.url);

function loadSharp() {
  try {
    return require("sharp");
  } catch {
    const bundled = join(
      process.env.USERPROFILE || "",
      ".cache", "codex-runtimes", "codex-primary-runtime",
      "dependencies", "node", "node_modules", "sharp",
    );
    if (!existsSync(bundled)) throw new Error("sharp is required for exact Worldroot alpha masks.");
    return require(bundled);
  }
}

const sharp = loadSharp();
const cleanRelativePath = path => path.split("?")[0].replaceAll("/", "\\");
const escapeAttribute = value => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;");

export async function runWorldrootNativeModuleBuilder({
  config,
  whiteboxConfig,
  projectRoot,
  argv = process.argv.slice(2),
}) {
  const assetRoot = join(projectRoot, cleanRelativePath(config.assetRoot));
  const guideRoot = join(assetRoot, "guides");
  const sourceRoot = join(assetRoot, "source");
  const livingRoot = join(assetRoot, "living");
  const manifestPath = join(assetRoot, config.manifestFilename);
  const moduleById = new Map(config.modules.map(entry => [entry.id, entry]));

  const moduleGeometry = module => ({
    ...resolveWorldrootNativeModuleGeometry(whiteboxConfig, module),
    bounds: resolveWorldrootNativeModuleBounds(whiteboxConfig, module, config),
  });

  const carrierSvg = (moduleId, mode) => {
    const module = moduleById.get(moduleId);
    if (!module) throw new Error(`Unknown Gate ${config.gateLabel} module: ${moduleId}`);
    const geometry = moduleGeometry(module);
    const offsetX = geometry.bounds.carrierLeftPx - geometry.bounds.worldLeftPx;
    const offsetY = geometry.bounds.carrierTopPx - geometry.bounds.worldTopPx;
    const transform = `translate(${offsetX} ${offsetY})`;
    const fill = mode === "mask" ? "#ffffff" : module.guideFill;
    const outline = mode === "mask" ? "none" : module.guideOutline;
    const polygons = geometry.polygons.map(entry => {
      const points = entry.points.map(point => (
        `${point.x * config.sourceTileSizePx},${point.y * config.sourceTileSizePx}`
      )).join(" ");
      return `<polygon points="${escapeAttribute(points)}" fill="${fill}" stroke="${outline}" stroke-width="${mode === "mask" ? 0 : 3}"/>`;
    }).join("");
    const connectors = geometry.connectors.map(entry => {
      const points = entry.points.map(point => (
        `${point.x * config.sourceTileSizePx},${point.y * config.sourceTileSizePx}`
      )).join(" ");
      return `<polyline points="${escapeAttribute(points)}" fill="none" stroke="${fill}" stroke-width="${entry.widthTiles * config.sourceTileSizePx}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join("");
    const contacts = mode === "mask" ? "" : geometry.platforms.map(entry => (
      `<line x1="${entry.leftTile * config.sourceTileSizePx}" y1="${entry.yTile * config.sourceTileSizePx}" x2="${entry.rightTile * config.sourceTileSizePx}" y2="${entry.yTile * config.sourceTileSizePx}" stroke="#7ff4ff" stroke-width="4"/>`
    )).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${config.carrier.widthPx}" height="${config.carrier.heightPx}" viewBox="0 0 ${config.carrier.widthPx} ${config.carrier.heightPx}"><g transform="${transform}">${connectors}${polygons}${contacts}</g></svg>`;
  };

  const ensureFolders = () => Promise.all(
    [guideRoot, sourceRoot, livingRoot].map(path => mkdir(path, { recursive: true })),
  );

  const writeManifest = async () => {
    const promptPath = join(sourceRoot, config.promptFilename);
    const prompts = existsSync(promptPath)
      ? JSON.parse(await readFile(promptPath, "utf8"))
      : null;
    const modules = [];
    for (const module of config.modules) {
      const bounds = moduleGeometry(module).bounds;
      const outputPath = join(projectRoot, cleanRelativePath(module.path));
      const metadata = existsSync(outputPath) ? await sharp(outputPath).metadata() : null;
      modules.push({
        id: module.id,
        stage: module.stage,
        key: module.key,
        path: module.path,
        promptId: module.promptId,
        sourcePath: module.sourcePath,
        sourceOffsetYPx: module.sourceOffsetYPx,
        geometry: module.geometry,
        bounds,
        output: metadata
          ? { width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha }
          : null,
      });
    }
    const manifest = {
      generatedAt: new Date().toISOString(),
      gate: config.gateLabel,
      reviewStatus: config.reviewStatus,
      builtInImageGen: true,
      sourceTileSizePx: config.sourceTileSizePx,
      runtimeScale: config.runtimeScale,
      carrier: config.carrier,
      noRuntimeResize: true,
      contactRepairDepthPx: config.contactRepairDepthPx,
      alphaContract: "generated foreground intersected with Gate A; pixels can never exist beyond the collision silhouette",
      geometryAuthority: "values/worldrootWhitebox.js",
      prompts,
      modules,
    };
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return manifest;
  };

  const buildGuides = async () => {
    await ensureFolders();
    const results = [];
    for (const module of config.modules) {
      const guidePath = join(projectRoot, cleanRelativePath(module.guidePath));
      const maskPath = join(projectRoot, cleanRelativePath(module.maskPath));
      await Promise.all([
        sharp(Buffer.from(carrierSvg(module.id, "guide")))
          .png({ compressionLevel: config.build.pngCompression }).toFile(guidePath),
        sharp(Buffer.from(carrierSvg(module.id, "mask")))
          .png({ compressionLevel: config.build.pngCompression }).toFile(maskPath),
      ]);
      results.push({ id: module.id, guidePath, maskPath, bounds: moduleGeometry(module).bounds });
    }
    await writeManifest();
    return results;
  };

  const repairWalkableContactTops = (module, bounds, rgb, alpha, maskAlpha) => {
    for (const contact of moduleGeometry(module).platforms) {
      const left = Math.ceil(contact.leftTile * config.sourceTileSizePx - bounds.worldLeftPx);
      const right = Math.floor(contact.rightTile * config.sourceTileSizePx - bounds.worldLeftPx);
      const top = Math.floor(contact.yTile * config.sourceTileSizePx - bounds.worldTopPx);
      for (let x = left; x <= right; x += 1) {
        let sourceY = -1;
        for (let depth = 0; depth <= config.contactRepairDepthPx; depth += 1) {
          const index = (top + depth) * bounds.widthPx + x;
          if (maskAlpha[index] > 0 && alpha[index] > config.build.visibleAlpha) {
            sourceY = top + depth;
            break;
          }
        }
        if (sourceY < 0) continue;
        const sourceRgbIndex = (sourceY * bounds.widthPx + x) * 3;
        for (let y = top; y < sourceY; y += 1) {
          const index = y * bounds.widthPx + x;
          if (maskAlpha[index] === 0 || alpha[index] > config.build.visibleAlpha) continue;
          const rgbIndex = index * 3;
          rgb[rgbIndex] = rgb[sourceRgbIndex];
          rgb[rgbIndex + 1] = rgb[sourceRgbIndex + 1];
          rgb[rgbIndex + 2] = rgb[sourceRgbIndex + 2];
          alpha[index] = maskAlpha[index];
        }
      }
    }
  };

  const finalizeModule = async (moduleId, suppliedSourcePath) => {
    const module = moduleById.get(moduleId);
    if (!module) throw new Error(`Unknown Gate ${config.gateLabel} module: ${moduleId}`);
    if (!suppliedSourcePath) throw new Error(`Supply the built-in ImageGen PNG for ${moduleId}.`);
    await ensureFolders();
    const sourcePath = module.sourcePath
      ? join(projectRoot, cleanRelativePath(module.sourcePath))
      : join(sourceRoot, `${moduleId}-imagegen-source-v1.png`);
    const resolvedSourcePath = resolve(suppliedSourcePath);
    if (resolve(sourcePath) !== resolvedSourcePath) {
      await copyFile(resolvedSourcePath, sourcePath);
    }
    const metadata = await sharp(sourcePath).metadata();
    if (metadata.width !== config.carrier.widthPx || metadata.height !== config.carrier.heightPx) {
      throw new Error(`${moduleId} must remain ${config.carrier.widthPx}x${config.carrier.heightPx}; received ${metadata.width}x${metadata.height}. No resize is allowed.`);
    }
    const bounds = moduleGeometry(module).bounds;
    const extract = {
      left: bounds.carrierLeftPx,
      top: bounds.carrierTopPx,
      width: bounds.widthPx,
      height: bounds.heightPx,
    };
    const maskPath = join(projectRoot, cleanRelativePath(module.maskPath));
    const outputPath = join(projectRoot, cleanRelativePath(module.path));
    const offsetY = Math.trunc(module.sourceOffsetYPx || 0);
    const shiftY = Math.abs(offsetY);
    let sourcePipeline = sharp(sourcePath).removeAlpha();
    if (shiftY > 0) {
      sourcePipeline = sourcePipeline
        .extract({
          left: 0,
          top: offsetY < 0 ? shiftY : 0,
          width: config.carrier.widthPx,
          height: config.carrier.heightPx - shiftY,
        })
        .extend({
          top: offsetY > 0 ? shiftY : 0,
          bottom: offsetY < 0 ? shiftY : 0,
          left: 0,
          right: 0,
          background: { r: 255, g: 255, b: 255 },
        });
    }
    const [{ data: maskAlpha }, { data: sourceCarrierRgb }] = await Promise.all([
      sharp(maskPath).extract(extract).ensureAlpha().extractChannel(3)
        .raw().toBuffer({ resolveWithObject: true }),
      sourcePipeline.raw().toBuffer({ resolveWithObject: true }),
    ]);
    const foregroundCarrierAlpha = extractCheckerForegroundAlpha(
      sourceCarrierRgb,
      config.carrier.widthPx,
      config.carrier.heightPx,
      config.build,
    );
    const [{ data: sourceRgb }, { data: foregroundAlpha }] = await Promise.all([
      sharp(sourceCarrierRgb, {
        raw: { width: config.carrier.widthPx, height: config.carrier.heightPx, channels: 3 },
      }).extract(extract).raw().toBuffer({ resolveWithObject: true }),
      sharp(foregroundCarrierAlpha, {
        raw: { width: config.carrier.widthPx, height: config.carrier.heightPx, channels: 1 },
      }).extract(extract).extractChannel(0).raw().toBuffer({ resolveWithObject: true }),
    ]);
    const clippedAlpha = Buffer.allocUnsafe(maskAlpha.length);
    for (let index = 0; index < maskAlpha.length; index += 1) {
      clippedAlpha[index] = Math.round(maskAlpha[index] * foregroundAlpha[index] / 255);
    }
    repairWalkableContactTops(module, bounds, sourceRgb, clippedAlpha, maskAlpha);
    await sharp(sourceRgb, {
      raw: { width: bounds.widthPx, height: bounds.heightPx, channels: 3 },
    }).joinChannel(clippedAlpha, {
      raw: { width: bounds.widthPx, height: bounds.heightPx, channels: 1 },
    }).png({ compressionLevel: config.build.pngCompression, adaptiveFiltering: true })
      .toFile(outputPath);
    const outputMetadata = await sharp(outputPath).metadata();
    if (outputMetadata.width !== bounds.widthPx
      || outputMetadata.height !== bounds.heightPx
      || outputMetadata.hasAlpha !== true) {
      throw new Error(`${moduleId} runtime output violated its native crop contract.`);
    }
    await writeManifest();
    return { moduleId, sourcePath, outputPath, bounds, metadata: outputMetadata };
  };

  const [command = "guides", moduleId, sourcePath] = argv;
  if (command === "guides") return buildGuides();
  if (command === "finalize") return finalizeModule(moduleId, sourcePath);
  if (command === "manifest") return writeManifest();
  throw new Error(`Unknown command: ${command}`);
}
