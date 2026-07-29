import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

function paeth(left, above, upperLeft) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function unfilter(scanlines, width, height, bytesPerPixel) {
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = scanlines[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = scanlines[sourceOffset + x];
      const left = x >= bytesPerPixel
        ? pixels[rowOffset + x - bytesPerPixel]
        : 0;
      const above = y > 0 ? pixels[rowOffset + x - stride] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[rowOffset + x - stride - bytesPerPixel]
        : 0;
      let value = raw;
      if (filter === 1) value += left;
      else if (filter === 2) value += above;
      else if (filter === 3) value += Math.floor((left + above) / 2);
      else if (filter === 4) value += paeth(left, above, upperLeft);
      pixels[rowOffset + x] = value & 0xff;
    }
    sourceOffset += stride;
  }
  return pixels;
}

export function readRgbaPng(path) {
  const png = readFileSync(path);
  const signature = png.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error(`Not a PNG: ${path}`);
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error(`Interlaced PNG unsupported: ${path}`);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Expected 8-bit RGBA PNG: ${path}`);
  }
  const rgba = unfilter(
    inflateSync(Buffer.concat(idat)),
    width,
    height,
    4
  );
  return { width, height, rgba };
}

export function buildTitanFootprintRows(
  image,
  zoneWidth,
  zoneHeight,
  {
    fitFraction,
    minimumAlpha,
    minimumCoveredPixelRatio = 0,
    minimumOpaquePixelsPerTile = 1,
  }
) {
  const scaleTilesPerPixel = Math.min(
    zoneWidth * fitFraction / image.width,
    zoneHeight * fitFraction / image.height
  );
  const displayWidth = image.width * scaleTilesPerPixel;
  const displayHeight = image.height * scaleTilesPerPixel;
  const left = (zoneWidth - displayWidth) / 2;
  const top = (zoneHeight - displayHeight) / 2;
  const opaqueCounts = Array.from(
    { length: zoneHeight },
    () => Array(zoneWidth).fill(0)
  );

  for (let sourceY = 0; sourceY < image.height; sourceY += 1) {
    for (let sourceX = 0; sourceX < image.width; sourceX += 1) {
      const alpha = image.rgba[
        (sourceY * image.width + sourceX) * 4 + 3
      ];
      if (alpha < minimumAlpha) continue;
      const column = Math.floor(
        left + (sourceX + 0.5) * scaleTilesPerPixel
      );
      const row = Math.floor(
        top + (sourceY + 0.5) * scaleTilesPerPixel
      );
      if (
        column >= 0
        && column < zoneWidth
        && row >= 0
        && row < zoneHeight
      ) {
        opaqueCounts[row][column] += 1;
      }
    }
  }

  const fullTileSourcePixels = 1 / (
    scaleTilesPerPixel * scaleTilesPerPixel
  );
  const requiredOpaquePixels = Math.max(
    minimumOpaquePixelsPerTile,
    Math.ceil(fullTileSourcePixels * minimumCoveredPixelRatio)
  );
  return opaqueCounts.map(row => row.reduce(
    (mask, count, column) => (
      count >= requiredOpaquePixels ? mask + 2 ** column : mask
    ),
    0
  ));
}

export function formatFootprintRows(rows, width) {
  return rows.map(mask => (
    Array.from(
      { length: width },
      (_, column) => (mask & 2 ** column ? "#" : ".")
    ).join("")
  ));
}
