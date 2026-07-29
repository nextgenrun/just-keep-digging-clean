import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

export function sha256(filePath) {
  return crypto.createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

export function readWebpMetadata(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF", filePath);
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP", filePath);
  let offset = 12;
  let metadata = null;
  let alphaChunk = false;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (type === "VP8X") {
      metadata = {
        width: 1 + buffer.readUIntLE(payload + 4, 3),
        height: 1 + buffer.readUIntLE(payload + 7, 3),
        alphaFlag: Boolean(buffer[payload] & 0x10),
      };
    } else if (type === "VP8L") {
      assert.equal(buffer[payload], 0x2f, `${filePath} VP8L signature`);
      const bits = buffer.readUInt32LE(payload + 1);
      metadata = {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >>> 14) & 0x3fff),
        alphaFlag: Boolean(bits & (1 << 28)),
      };
    } else if (type === "VP8 " && !metadata) {
      assert.equal(
        buffer.toString("hex", payload + 3, payload + 6),
        "9d012a",
        `${filePath} VP8 frame header`
      );
      metadata = {
        width: buffer.readUInt16LE(payload + 6) & 0x3fff,
        height: buffer.readUInt16LE(payload + 8) & 0x3fff,
        alphaFlag: false,
      };
    } else if (type === "ALPH") {
      alphaChunk = true;
    }
    offset = payload + size + (size % 2);
  }
  assert.ok(metadata, `${filePath} supported WebP metadata`);
  return { ...metadata, hasAlpha: metadata.alphaFlag || alphaChunk };
}
