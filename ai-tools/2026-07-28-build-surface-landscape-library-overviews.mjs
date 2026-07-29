import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = path.resolve(
  "visual-approval-previews",
  "surface-landscape-final-library-v1",
);

const PANELS = Object.freeze([
  ["01", "000-019", "Merchant Hearth", "2026-07-28-01-x000-019-merchant-hearth-v1.png"],
  ["02", "020-039", "Titan Walk West", "2026-07-28-02-x020-039-titan-walk-west-v1.png"],
  ["03", "040-059", "Titan Walk East", "2026-07-28-03-x040-059-titan-walk-east-v2.png"],
  ["04", "060-079", "Craftsmen Commons", "2026-07-28-04-x060-079-craftsmen-commons-v1.png"],
  ["05", "080-099", "Skywell Market", "2026-07-28-05-x080-099-skywell-market-v1.png"],
  ["06", "100-119", "Three-Relic Gate Grove", "2026-07-28-06-x100-119-three-relic-gate-grove-v1.png"],
  ["07", "120-139", "Mine Threshold", "2026-07-28-07-x120-139-mine-threshold-drop-seam-v1.png"],
  ["08", "140-159", "Level 2 Arrival Forge", "2026-07-28-08-x140-159-level2-arrival-forge-v1.png"],
  ["09", "160-179", "Caravan Rest", "2026-07-28-09-x160-179-caravan-rest-v1.png"],
  ["10", "180-199", "Starwell Herb Court", "2026-07-28-10-x180-199-starwell-herb-court-v1.png"],
  ["11", "200-219", "Timberwright Yard", "2026-07-28-11-x200-219-timberwright-yard-v1.png"],
  ["12", "220-239", "Heavenblocks Observatory", "2026-07-28-12-x220-239-heavenblocks-observatory-v1.png"],
  ["13", "240-259", "Frontier Survey Garden", "2026-07-28-13-x240-259-frontier-survey-garden-v1.png"],
  ["14", "260-279", "Far-East Expedition Overlook", "2026-07-28-14-x260-279-far-east-expedition-overlook-v1.png"],
]);

const THUMB_WIDTH = 768;
const THUMB_HEIGHT = 298;
const GAP = 14;
const LABEL_HEIGHT = 42;
const BACKGROUND = "#07111c";
const LABEL_BACKGROUND = "#09121de8";
const LABEL_COLOR = "#f0cf7a";

function labelSvg(panel) {
  const [number, tileRange, title] = panel;
  const escaped = title.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return Buffer.from(`
    <svg width="${THUMB_WIDTH}" height="${THUMB_HEIGHT}">
      <rect x="0" y="0" width="${THUMB_WIDTH}" height="${LABEL_HEIGHT}" fill="${LABEL_BACKGROUND}"/>
      <text x="18" y="28" fill="${LABEL_COLOR}" font-family="Segoe UI, Arial, sans-serif"
        font-size="20" font-weight="700">PANEL ${number}  |  X${tileRange}  |  ${escaped}</text>
    </svg>
  `);
}

async function panelBuffer(panel) {
  const source = path.join(ROOT, panel[3]);
  const image = await sharp(source)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  return sharp(image).composite([{ input: labelSvg(panel), left: 0, top: 0 }]).png().toBuffer();
}

async function buildSheet(panels, outputName) {
  const columns = 2;
  const rows = Math.ceil(panels.length / columns);
  const width = columns * THUMB_WIDTH + (columns + 1) * GAP;
  const height = rows * THUMB_HEIGHT + (rows + 1) * GAP;
  const images = await Promise.all(panels.map(panelBuffer));
  const composites = images.map((input, index) => ({
    input,
    left: GAP + (index % columns) * (THUMB_WIDTH + GAP),
    top: GAP + Math.floor(index / columns) * (THUMB_HEIGHT + GAP),
  }));
  await sharp({
    create: { width, height, channels: 4, background: BACKGROUND },
  }).composite(composites).png().toFile(path.join(ROOT, outputName));
}

async function fileRecord(panel) {
  const file = path.join(ROOT, panel[3]);
  const [bytes, metadata] = await Promise.all([
    fs.readFile(file),
    sharp(file).metadata(),
  ]);
  if (metadata.format !== "png" || !metadata.width || !metadata.height) {
    throw new Error(`Invalid panel image: ${panel[3]}`);
  }
  return {
    panel: Number(panel[0]),
    tileRange: panel[1],
    title: panel[2],
    file: panel[3],
    width: metadata.width,
    height: metadata.height,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

await buildSheet(
  PANELS,
  "2026-07-28-overview-all-14-surface-segments-v1.png",
);
await buildSheet(
  PANELS.slice(0, 7),
  "2026-07-28-overview-level1-segments-01-07-v1.png",
);
await buildSheet(
  PANELS.slice(7),
  "2026-07-28-overview-level2-segments-08-14-v1.png",
);

const files = await Promise.all(PANELS.map(fileRecord));
const manifest = {
  version: 1,
  date: "2026-07-28",
  reviewOnly: true,
  productionChanged: false,
  runtimeWired: false,
  sourceTileRange: { left: 0, rightInclusive: 279 },
  panelCount: files.length,
  contactSheets: [
    "2026-07-28-overview-all-14-surface-segments-v1.png",
    "2026-07-28-overview-level1-segments-01-07-v1.png",
    "2026-07-28-overview-level2-segments-08-14-v1.png",
  ],
  files,
};
await fs.writeFile(
  path.join(ROOT, "2026-07-28-library-manifest-v1.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.info(`Surface landscape library validated: ${files.length} PNG panels`);
