import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";

import { SkySteadyLightRenderer } from "../systems/lighting/SkySteadyLightRenderer.js";
import {
  LIGHT_CONFIG,
  getStarBlockSteadyLightPreloadAssets,
} from "../values/lightConfig.js";

globalThis.Phaser = {
  BlendModes: { ADD: 1 },
};

const visuals = LIGHT_CONFIG.skyTileLights.steadyAura;
const assets = getStarBlockSteadyLightPreloadAssets();
const projectRoot = new URL("../", import.meta.url);
const expectedColours = [
  "cyan",
  "lavender",
  "gold",
  "orange",
  "turquoise",
  "violet",
];

assert.equal(visuals.artSource, "ImageGen", "steady light must use ImageGen artwork");
assert.equal(assets.length, expectedColours.length, "all six Star Block colours need steady-light art");
assert.deepEqual(
  assets.map((asset, index) => asset.key.includes(expectedColours[index])),
  expectedColours.map(() => true),
  "steady-light assets must preserve the production rarity colour order"
);
assert.equal(
  new Set(assets.map(asset => asset.key)).size,
  assets.length,
  "each Star Block rarity must own a distinct steady-light texture"
);
assert.ok(
  visuals.renderDepth > LIGHT_CONFIG.darknessRenderDepth,
  "colored Star Block light must composite above hard darkness"
);
assert.ok(
  visuals.renderDepth < LIGHT_CONFIG.skyTileLights.beaconPulse.visuals.renderDepth,
  "the rare traveling pulse must remain above the steady colored atmosphere"
);
assert.ok(visuals.opacity <= 0.25, "steady colored light must remain restrained");
assert.equal(
  visuals.maxImages,
  LIGHT_CONFIG.skyTileLights.maxSourcesPerFrame,
  "the ImageGen light pool must cover every admitted Star Block source"
);

const hashes = new Set();
for (const asset of assets) {
  const cleanPath = asset.path.split("?")[0];
  const fileUrl = new URL(cleanPath, projectRoot);
  assert.equal(existsSync(fileUrl), true, `missing steady-light art: ${cleanPath}`);
  assert.ok(
    statSync(fileUrl).size > 1_000_000,
    `steady-light art must retain high-resolution ImageGen detail: ${cleanPath}`
  );

  const bytes = readFileSync(fileUrl);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", `asset must remain PNG: ${cleanPath}`);
  assert.equal(bytes.readUInt32BE(16), 1254, `unexpected steady-light width: ${cleanPath}`);
  assert.equal(bytes.readUInt32BE(20), 1254, `unexpected steady-light height: ${cleanPath}`);
  hashes.add(createHash("sha256").update(bytes).digest("hex"));
}
assert.equal(hashes.size, assets.length, "the six rarity lights must not duplicate one generic torch texture");

const rendererSource = readFileSync(
  new URL("../systems/lighting/SkySteadyLightRenderer.js", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  rendererSource,
  /createCanvas|add\.graphics|fillCircle|strokeEllipse|lineTo|setTint/,
  "steady Star Block light must never use procedural or runtime-tinted substitute visuals"
);

const imageRecords = [];
function createImageRecord(x, y, key) {
  const image = {
    key,
    x,
    y,
    width: 0,
    height: 0,
    alpha: 1,
    visible: true,
    depth: null,
    blendMode: null,
    destroyed: false,
    setOrigin() {
      return this;
    },
    setDepth(depth) {
      this.depth = depth;
      return this;
    },
    setBlendMode(blendMode) {
      this.blendMode = blendMode;
      return this;
    },
    setAlpha(alpha) {
      this.alpha = alpha;
      return this;
    },
    setVisible(visible) {
      this.visible = visible;
      return this;
    },
    setTexture(nextKey) {
      this.key = nextKey;
      return this;
    },
    setPosition(nextX, nextY) {
      this.x = nextX;
      this.y = nextY;
      return this;
    },
    setDisplaySize(width, height) {
      this.width = width;
      this.height = height;
      return this;
    },
    destroy() {
      this.destroyed = true;
    },
  };
  imageRecords.push(image);
  return image;
}

const knownTextureKeys = new Set(assets.map(asset => asset.key));
const scene = {
  textures: {
    exists(key) {
      return knownTextureKeys.has(key);
    },
    createCanvas() {
      assert.fail("steady Star Block light must not generate a canvas");
    },
  },
  add: {
    image(x, y, key) {
      return createImageRecord(x, y, key);
    },
    graphics() {
      assert.fail("steady Star Block light must not use Phaser graphics");
    },
  },
};

const renderer = new SkySteadyLightRenderer(scene, visuals);
assert.equal(imageRecords.length, visuals.maxImages, "steady-light images must be pooled at setup");

const tileSize = 94;
for (let rarity = 0; rarity < assets.length; rarity += 1) {
  assert.equal(
    renderer.draw({
      worldX: 470 + rarity * tileSize,
      worldY: 376,
      tileSize,
      verticalScale: LIGHT_CONFIG.skyTileLights.verticalScale,
      radiusTiles: LIGHT_CONFIG.skyTileLights.maxRadiusTiles,
      rarity,
      intensity: 1,
    }),
    true,
    `rarity ${rarity} steady light must render`
  );
  assert.equal(
    imageRecords[rarity].key,
    assets[rarity].key,
    `rarity ${rarity} must stain darkness with its own authored colour`
  );
}

for (const light of imageRecords.slice(0, assets.length)) {
  assert.equal(light.visible, true, "drawn steady lights must remain visible through darkness");
  assert.equal(light.blendMode, Phaser.BlendModes.ADD, "black-backed light art must blend additively");
  assert.equal(light.depth, visuals.renderDepth, "steady light must keep its darkness-compositor depth");
  assert.ok(light.alpha > 0 && light.alpha <= visuals.opacity, "steady light alpha must stay colored but quiet");
  assert.ok(light.width > tileSize * 4, "the colored stain must extend beyond the Star Block tile");
  assert.ok(light.height < light.width, "the light pool must keep its softly flattened world shape");
}

renderer.beginFrame();
for (const light of imageRecords.slice(0, assets.length)) {
  assert.equal(light.visible, false, "unused pooled lights must hide on the next frame");
  assert.equal(light.alpha, 0, "unused pooled lights must clear residual color");
}

const lightSystemSource = readFileSync(
  new URL("../systems/lighting/LightSystem.js", import.meta.url),
  "utf8"
);
assert.match(
  lightSystemSource,
  /getSkyTileRarity\?\.\(source\.tx, source\.ty\)/,
  "the steady renderer must receive each live Star Block rarity"
);
assert.match(
  lightSystemSource,
  /_skySteadyLightRenderer\?\.draw/,
  "the hard-darkness source loop must draw the authored colored atmosphere"
);

const bootSource = readFileSync(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8"
);
assert.match(
  bootSource,
  /getStarBlockSteadyLightPreloadAssets/,
  "Boot must preload all steady Star Block light textures"
);

renderer.destroy();
assert.equal(
  imageRecords.every(light => light.destroyed),
  true,
  "destroy must release the complete steady-light pool"
);

console.log("Star Block steady colour light contract passed: six persistent ImageGen rarity auras above hard darkness");
