// Preserve native plant alpha and extract exact existing in-game Star frames.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WORLDROOT_SANCTUARY_CONFIG as config } from "../values/worldrootSanctuary.js";
import { STAR_IDENTITY_LIBRARY_CONFIG as stars } from "../values/starIdentityLibrary.js";

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require("sharp"); } catch {
  sharp = require(join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp"));
}
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const target = join(root, config.detailBuild.root);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const manifest = { version: 2, date: "2026-09-03", builtInImageGen: true,
  processing: "Native RGBA plants; exact existing Star atlas frame extraction. No repainting or resizing.", assets: [] };
async function save(name, pipeline, provenance) {
  const pixels = await pipeline.clone().ensureAlpha().raw().toBuffer();
  const path = join(target, `${name}.png`);
  await pipeline.png({ compressionLevel: config.build.compressionLevel }).toFile(path);
  const bytes = await readFile(path);
  const meta = await sharp(bytes).metadata();
  const stats = await sharp(bytes).stats();
  if (!meta.hasAlpha || stats.isOpaque) throw new Error(`${name}: transparency is missing`);
  const outputPixels = await sharp(bytes).ensureAlpha().raw().toBuffer();
  if (!pixels.equals(outputPixels)) throw new Error(`${name}: source pixels changed`);
  manifest.assets.push({ name, path: `${config.detailBuild.root}${name}.png`,
    width: meta.width, height: meta.height, hasAlpha: true, sourcePixelsPreserved: true,
    bytes: bytes.length, sha256: hash(bytes), pixelSha256: hash(pixels), ...provenance });
}
for (const [name, source] of Object.entries(config.detailBuild.sources)) {
  const bytes = await readFile(join(target, source));
  await save(name, sharp(bytes), { kind: "imagegen-plant", source, sourceSha256: hash(bytes) });
}
for (const [name, id] of Object.entries(config.detailBuild.starIdentities)) {
  const identity = stars.identities.find(entry => entry.id === id);
  const atlas = stars.atlases.find(entry => entry.key === identity.atlasKey);
  const bytes = await readFile(join(root, atlas.path.split("?")[0]));
  const frame = Number(identity.frameName.slice(atlas.framePrefix.length));
  const rect = { left: frame % atlas.columns * atlas.frameSizePx,
    top: Math.floor(frame / atlas.columns) * atlas.frameSizePx,
    width: atlas.frameSizePx, height: atlas.frameSizePx };
  await save(name, sharp(bytes).extract(rect), { kind: "existing-game-star", identity: id,
    source: atlas.path.split("?")[0], frame: identity.frameName, rect, sourceSha256: hash(bytes) });
}
await writeFile(join(target, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ result: "WORLDROOT_DETAILS_IMPORTED", assets: manifest.assets }, null, 2));
