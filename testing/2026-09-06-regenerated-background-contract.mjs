import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WORLD_VISUAL_LAYERED_SKY_REVIEW as C, getLayeredSkyReviewAssets } from "../values/worldVisualLayeredSkyReview.js";
import { getWorldVisualPreloadAssets, WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import { WorldVisualLayeredSkyReview } from "../world/rendering/scenic-world/WorldVisualLayeredSkyReview.js";
import { WorldVisualLayeredLandscapeField } from "../world/rendering/scenic-world/WorldVisualLayeredLandscapeField.js";
import { WorldVisualSkyCohesionLayer } from "../world/rendering/scenic-world/WorldVisualSkyCohesionLayer.js";
import { WorldVisualSurfaceAtmosphereLayer } from "../world/rendering/scenic-world/WorldVisualSurfaceAtmosphereLayer.js";

// Phaser-independent geometry/admission/lifecycle proof; browser captures assess the art.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.location = { search: "?layeredSky=1" };
const assets = getLayeredSkyReviewAssets();
assert.equal(assets.length, 13);
assert.equal(new Set(assets.map(asset => asset.key)).size, 13);
assert.equal(getLayeredSkyReviewAssets("?layeredSky=0").length, 0);
const candidate = getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, "?layeredSky=1");
assert.ok(!candidate.some(asset => asset.key === WORLD_VISUAL_RUNTIME.assets.far.key));
assert.ok(getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, "?layeredSky=0")
  .some(asset => asset.key === WORLD_VISUAL_RUNTIME.assets.far.key));

const legacySky = new WorldVisualSkyCohesionLayer({}, undefined, "?layeredSky=1");
assert.equal(legacySky.create(), false);
assert.equal(legacySky.sync({ left: 0, right: 10, top: 0, bottom: 10 }, {}), false);
assert.equal(legacySky.assetCache, null);
assert.equal(new WorldVisualSkyCohesionLayer({}, undefined, "?layeredSky=0").enabled, true);
const legacyAtmosphere = new WorldVisualSurfaceAtmosphereLayer({});
legacyAtmosphere.atlas.register = () => { throw new Error("Legacy atmosphere registered"); };
assert.equal(legacyAtmosphere.create("?layeredSky=1"), false);

const textures = new Map(), actors = [];
function texture(width, height) {
  const frames = new Set();
  return {
    source: { width, height }, getSourceImage() { return this.source; },
    has: id => frames.has(id), add: id => frames.add(id),
    remove: id => frames.delete(id), frames,
  };
}
for (const asset of assets) {
  const bytes = fs.readFileSync(path.join(root, asset.path));
  textures.set(asset.key, texture(bytes.readUInt32BE(16), bytes.readUInt32BE(20)));
}
const sourceKeys = [...textures.keys()];
const context = {
  getImageData(){return {data:[]};},putImageData(){},drawImage() {}, createLinearGradient() { return { addColorStop() {} }; }, fillRect() {},
};
const scene = {
  config: { tileSize: 94, topAirRows: 65 }, cameras: { main: {} },
  textures: {
    get(key) { assert.ok(textures.has(key), key); return textures.get(key); },
    exists: key => textures.has(key),
    createCanvas(key, width, height) {
      const value = texture(width, height);
      value.getContext = () => context;
      value.refresh = () => {};
      textures.set(key, value);
      return value;
    },
    remove: key => textures.delete(key),
  },
  add: {
    graphics() {
      const actor={setScrollFactor(){return this;},setDepth(){return this;},clear(){return this;},
        setVisible(){return this;},fillGradientStyle(){return this;},fillRect(){return this;},
        destroy(){this.destroyed=true;}};
      actors.push(actor);return actor;
    },
    image(x, y, key) {
      const actor = {
        x, y, key, scaleX: 1, scaleY: 1,
        setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; },
        setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this;},
        setRotation(r){this.rotation=r;return this;},
        setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
        setTexture(key, frame) { this.key = key; this.frame = frame; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScrollFactor(x, y = x) { this.scrollFactorX = x; this.scrollFactorY = y; return this; },
        setAlpha(alpha) { this.alpha = alpha; return this; },
        setDepth(depth) { this.depth = depth; return this; },
        setVisible(visible) { this.visible = visible; return this; },
        setTint() { return this; },
        destroy() { this.destroyed = true; },
      };
      actors.push(actor);
      return actor;
    },
  },
};
const lighting = { farTint: 0xffffff, wet: 0.8 };
function view(x, y, width = 1472, height = 828) {
  scene.cameras.main = {
    scrollX: x, scrollY: y,
    worldView: { x, y, width, height, bottom: y + height, right: x + width },
  };
  return scene.cameras.main;
}
const owner = new WorldVisualLayeredSkyReview(scene);
let cameraCases = 0, time = 0;
for (const zoom of [1, 0.6]) {
  for (const x of [7, 31, 63, 95, 126]) {
    for (const y of [6, 23, 38, 57, 63]) {
      const camera = view(x * 94 - 736 / zoom, y * 94 - 414 / zoom, 1472 / zoom, 828 / zoom);
      owner.update(time += 16, lighting);
      assert.ok(owner.cards.size > 0);
      assert.ok(owner.clouds.active.size + owner.clouds.pool.length <= C.maxCloudSprites);
      for (const image of [...owner.clouds.active.values(), ...owner.landscape.cards.values()]) {
        assert.ok(image.scaleX <= 1 && image.scaleY <= 1);
      }
      const viewport = camera.worldView, config = C.skyField;
      for (let sx = 0; sx <= 8; sx++) {
        for (let sy = 0; sy <= 6; sy++) {
          const px = viewport.x + viewport.width * sx / 8 - camera.scrollX * (1 - config.parallaxX);
          const py = viewport.y + viewport.height * sy / 6 - camera.scrollY * (1 - config.parallaxY);
          assert.ok([...owner.cards.values()].some(image => {
            const source = textures.get(image.key).source;
            return px >= image.x + config.overlapX && px <= image.x + source.width
              && py >= image.y + config.overlapY && py <= image.y + source.height;
          }), "Sky sample lies inside at least one complete, unfeathered card interior");
        }
      }
      cameraCases++;
    }
  }
}
// Light weather retargets retain the prevailing drift; a strong wind can reverse it smoothly.
for(let step=0;step<80;step++)owner.clouds.update(.08,{...lighting,wind:step%2?8:-8},false);
assert.equal(owner.clouds.windDirection,1);
assert(owner.clouds.wind>0);
for(let step=0;step<100;step++)owner.clouds.update(.08,{...lighting,wind:-120},false);
assert.equal(owner.clouds.windDirection,-1);
assert(owner.clouds.wind<0);
owner.paused = true;
const pausedTime = owner.clouds.traveledSeconds;
owner.update(time += 80, lighting);
assert.equal(owner.clouds.traveledSeconds, pausedTime);
view(0, 10000);
owner.update(time += 16, lighting);
assert.equal(owner.cards.size, 0);
assert.equal(owner.landscape.cards.size, 0);
assert.equal(owner.clouds.active.size, 0);
owner.destroy();
assert.deepEqual([...textures.keys()].sort(), sourceKeys.sort());
assert.equal(textures.get(C.cloudAtlas.key).frames.size, 0);
assert.equal(globalThis.__jkdLayeredSkyReview, undefined);
assert.ok(actors.every(actor => actor.destroyed));

// A negatively offset forest column must remain when its highest strip enters view.
const layer = C.landscapeLayers.find(candidate => candidate.id === "forest");
const forestSource = textures.get(C.forestAsset.key).source;
const forestHeight = Math.min(forestSource.height, layer.heightPx);
const forestTop = 65 * 94 + layer.bottomOffsetPx + Math.min(...C.forestOffsets) - forestHeight;
const landscape = new WorldVisualLayeredLandscapeField(scene, { featherTexture: key => key, ownedTextureKeys: new Set() });
view(0, forestTop - 100, 2000, 99);
landscape.update(scene.cameras.main, lighting, true);
assert.equal([...landscape.cards.keys()].filter(key => key.startsWith("forest:")).length, 0);
view(0, forestTop - 100, 2000, 101);
landscape.update(scene.cameras.main, lighting, true);
assert.ok([...landscape.cards.keys()].some(key => key.startsWith("forest:")));
landscape.destroy();

const result = {
  pass: true, kind: "geometry-admission-lifecycle", cameraCases,
  coverageSamples: cameraCases * 9 * 7, nativeScale: true, tenBackgroundWeatherAssetsTwoReusedDetailsAndBirdAtlas: true,
  legacySkyAdmissionDisabled: true, legacySurfaceAtmosphereDisabled: true,
  baselineFarPresent: true, pause: true, undergroundCull: true, teardown: true,
  forestBoundary: true, visualArtAssessment: false,
};
const resultPath = path.join(root,
  "testing/2026-09-06-level-one-live-v6/geometry-checks.json");
fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
