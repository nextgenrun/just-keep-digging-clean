import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
  getTitanDiscoveryPreloadAssets,
} from "../values/titanDiscoveries.js";
import {
  TITAN_DISCOVERY_EXPERIENCE,
} from "../values/titanDiscoveryExperience.js";
import {
  TitanCoverageGlowSystem,
} from "../systems/visual/TitanCoverageGlowSystem.js";
import {
  clearRemainingTitanCoverage,
} from "../systems/visual/titanCoverageAutoClear.js";
import {
  getTitanCoverageRequired,
  isTitanCoverageReady,
} from "../systems/visual/titanCoverageThreshold.js";
import { readRgbaPng } from "./titanCreatureFootprintFixture.mjs";

function visibleRatio(image) {
  let visible = 0;
  for (let offset = 3; offset < image.rgba.length; offset += 4) {
    if (image.rgba[offset] > 24) visible += 1;
  }
  return visible / (image.width * image.height);
}

function assertTransparentCorners(image, label) {
  const alphaAt = (x, y) => image.rgba[(y * image.width + x) * 4 + 3];
  assert.equal(alphaAt(0, 0), 0, `${label} upper-left alpha`);
  assert.equal(alphaAt(image.width - 1, 0), 0, `${label} upper-right alpha`);
  assert.equal(alphaAt(0, image.height - 1), 0, `${label} lower-left alpha`);
  assert.equal(
    alphaAt(image.width - 1, image.height - 1),
    0,
    `${label} lower-right alpha`,
  );
}

const dais = readRgbaPng(new URL(
  `../${TITAN_DISCOVERY_CONFIG.assets.undergroundDais.path}`,
  import.meta.url,
));
const resonance = readRgbaPng(new URL(
  `../${TITAN_DISCOVERY_CONFIG.assets.coverResonance.path}`,
  import.meta.url,
));
assert.deepEqual([dais.width, dais.height], [1024, 384]);
assert.deepEqual([resonance.width, resonance.height], [512, 512]);
assertTransparentCorners(dais, "dais");
assertTransparentCorners(resonance, "resonance");
assert.ok(visibleRatio(dais) > 0.35 && visibleRatio(dais) < 0.8);
assert.ok(visibleRatio(resonance) > 0.05 && visibleRatio(resonance) < 0.55);

const preloadKeys = new Set(
  getTitanDiscoveryPreloadAssets().map(asset => asset.key),
);
for (const definition of TITAN_DEFINITIONS) {
  assert.ok(preloadKeys.has(definition.surfaceAsset.key));
}
assert.ok(preloadKeys.has(TITAN_DISCOVERY_CONFIG.assets.undergroundDais.key));
assert.ok(preloadKeys.has(TITAN_DISCOVERY_CONFIG.assets.coverResonance.key));
assert.ok(TITAN_DISCOVERY_CONFIG.underground.discoveredAlpha >= 0.99);
assert.ok(TITAN_DISCOVERY_CONFIG.chambers.discoveredCardAlpha <= 0.2);
assert.equal(
  TITAN_DISCOVERY_CONFIG.coverageGlow.depth,
  898,
  "cover resonance must use the established below-darkness emissive layer",
);
assert.ok(TITAN_DISCOVERY_CONFIG.coverageGlow.minimumAlpha >= 0.4);
assert.ok(TITAN_DISCOVERY_CONFIG.coverageGlow.maximumAlpha <= 0.75);
const minimumTitanWidthTiles = Math.min(
  ...TITAN_DEFINITIONS.map(definition => (
    Math.min(definition.zoneWidthTiles, definition.zoneHeightTiles)
      * TITAN_DISCOVERY_CONFIG.underground.titanFitFraction
  )),
);
assert.ok(
  TITAN_DISCOVERY_CONFIG.underground.daisWidthTiles
    < minimumTitanWidthTiles * 0.6,
  "the authored underground dais must remain far smaller than every Titan",
);

const encounter = TITAN_DISCOVERY_EXPERIENCE.encounter;
assert.equal(getTitanCoverageRequired(50, encounter.requiredClearRatio), 25);
assert.equal(getTitanCoverageRequired(51, encounter.requiredClearRatio), 26);
assert.equal(isTitanCoverageReady({
  coverageTotal: 51,
  coverageRemaining: 26,
}, encounter), false);
assert.equal(isTitanCoverageReady({
  coverageTotal: 51,
  coverageRemaining: 25,
}, encounter), true);

const solidKeys = new Set(["3,4", "4,4"]);
const clearedKeys = [];
const clearWorld = {
  isSolid: (tx, ty) => solidKeys.has(`${tx},${ty}`),
  applyDugTileKeys(keys) {
    keys.forEach(key => {
      solidKeys.delete(key);
      clearedKeys.push(key);
    });
    return keys.map(key => {
      const [tx, ty] = key.split(",").map(Number);
      return { tx, ty };
    });
  },
};
assert.equal(clearRemainingTitanCoverage(clearWorld, [
  { tx: 3, ty: 4 },
  { tx: 4, ty: 4 },
  { tx: 5, ty: 4 },
]).length, 2);
assert.deepEqual(clearedKeys, ["3,4", "4,4"]);

class FakeImage {
  setOrigin() { return this; }
  setDepth(value) { this.depth = value; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setTint(value) { this.tint = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  destroy() { this.destroyed = true; }
}
const images = [];
const glowWorld = {
  tileSize: 94,
  isSolid: (tx, ty) => `${tx},${ty}` !== "11,10",
};
const glowSystem = new TitanCoverageGlowSystem({
  textures: { exists: () => true },
  add: {
    image() {
      const image = new FakeImage();
      images.push(image);
      return image;
    },
  },
}, glowWorld);
assert.equal(glowSystem.create(), true);
const glowView = {
  definition: TITAN_DEFINITIONS[0],
  discovered: false,
  ready: false,
  coverageValid: true,
  zone: {
    left: 10,
    top: 10,
    rightExclusive: 13,
    bottomExclusive: 11,
  },
  coverageCells: [
    { tx: 10, ty: 10 },
    { tx: 11, ty: 10 },
    { tx: 12, ty: 10 },
  ],
};
glowSystem.update(900, { tx: 10, ty: 10 }, [glowView]);
assert.equal(glowSystem.getSnapshot().visibleTiles, 2);
assert.equal(images.length, 2);
assert.ok(images.every(image => image.tint === glowView.definition.glowTint));
glowSystem.update(1000, { tx: 100, ty: 100 }, [glowView]);
assert.equal(glowSystem.getSnapshot().visibleTiles, 0);
assert.ok(images.every(image => image.visible === false));
glowSystem.destroy();
assert.ok(images.every(image => image.destroyed));

const guidanceSource = readFileSync(
  new URL("../systems/visual/TitanDiscoveryGuidance.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(guidanceSource, /coverageRemaining|COVERING TILE/);

console.log(
  "titan underground presentation v2 contract: sharp stances, compact authored dais, exact colored tile glow, 50% threshold, and remainder auto-clear passed",
);
