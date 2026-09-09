import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const path = "sprites/character/survival-skeletal-run-v1/survival-legacy-jog.glb";
const original = await fs.readFile(path);
const jsonLength = original.readUInt32LE(12);
const json = JSON.parse(original.subarray(20, 20 + jsonLength).toString());
if (json.animations.length !== 1) throw new Error("Expected only the retained jog action");
json.animations[0].name = "Legacy_Jog_Run";
const binStart = 28 + jsonLength;
const binary = original.subarray(binStart);
const replacements = new Map();
for (const image of json.images || []) {
  const view = json.bufferViews[image.bufferView];
  const source = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  const metadata = await sharp(source).metadata();
  const pipeline = sharp(source).resize({ width:1024, height:1024, fit:"inside", withoutEnlargement:true });
  const hasAlpha = metadata.hasAlpha;
  const bytes = await (hasAlpha ? pipeline.png({ compressionLevel:9 }) : pipeline.jpeg({ quality:88 })).toBuffer();
  image.mimeType = hasAlpha ? "image/png" : "image/jpeg";
  replacements.set(image.bufferView, bytes);
}
const parts = [];
let offset = 0;
for (let index = 0; index < json.bufferViews.length; index++) {
  const view = json.bufferViews[index];
  const bytes = replacements.get(index) || binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  view.byteOffset = offset;
  view.byteLength = bytes.length;
  parts.push(bytes);
  const padding = (4 - bytes.length % 4) % 4;
  if (padding) parts.push(Buffer.alloc(padding));
  offset += bytes.length + padding;
}
json.buffers[0].byteLength = offset;
const jsonBytes = Buffer.from(JSON.stringify(json));
const jsonPadded = Buffer.concat([jsonBytes, Buffer.alloc((4 - jsonBytes.length % 4) % 4, 32)]);
const binBytes = Buffer.concat(parts);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + jsonPadded.length + binBytes.length, 8);
header.writeUInt32LE(jsonPadded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binBytes.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
const result = Buffer.concat([header, jsonPadded, binHeader, binBytes]);
await fs.writeFile(path, result);
const manifestPath = path.replace("survival-legacy-jog.glb","manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath,"utf8"));
manifest.glbBytes = result.length;
manifest.glbSha256 = createHash("sha256").update(result).digest("hex");
manifest.maxVertexInfluences = 4;
manifest.runtimeTextureMaxEdge = 1024;
manifest.runtimeTexturePreparation = "Original embedded PBR textures resized to 1024px using Sharp; source assets unchanged.";
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({ before:original.length, after:result.length, animations:json.animations.map(a=>a.name), skins:json.skins.length, images:json.images.length }));

