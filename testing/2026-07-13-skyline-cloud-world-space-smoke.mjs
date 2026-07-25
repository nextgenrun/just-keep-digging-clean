import assert from "node:assert/strict";
import { SkylineWeatherVfxSystem } from "../systems/environment/SkylineWeatherVfxSystem.js";
import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";

function fakeSprite() {
  return {
    scrollFactor: null,
    x: 0,
    y: 0,
    texture: { key: "clouds" },
    frame: { name: "clouds-0" },
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setTint() { return this; },
    setAlpha() { return this; },
    setVisible() { return this; },
  };
}

const scene = {
  config: { tileSize: 94, worldWidthTiles: 280, topAirRows: 65 },
  cameras: { main: { width: 1280, height: 720, scrollX: 0, scrollY: 0 } },
};

const system = new SkylineWeatherVfxSystem(scene, SKYLINE_WEATHER_VFX);
system._image = (_sheet, _frame, depth, screenSpace) => {
  const sprite = fakeSprite().setScrollFactor(screenSpace ? 0 : 1);
  sprite.depth = depth;
  return sprite;
};
system._setFrame = () => {};
system._createClouds();

assert.equal(system.clouds.length, 35, "cloud field should span the 280-tile world at eight-tile spacing");
assert.ok(system.clouds.every(actor => actor.sprite.scrollFactor === 1), "all clouds must use world-space scroll factor");
assert.ok(system.clouds.every(actor => actor.sprite.depth === SKYLINE_WEATHER_VFX.renderDepths.cloudsFar),
  "benchmark clouds must remain in the far background layer");

const weather = { cloudCoverAmount: 0.7, kind: "clear", wind: 0 };
system._updateClouds(0, weather, 0xffffff, 0, 1);
const beforeCameraMove = system.clouds.map(actor => ({ x: actor.sprite.x, y: actor.sprite.y }));
scene.cameras.main.scrollX = 6000;
scene.cameras.main.scrollY = 1200;
system._updateClouds(0, weather, 0xffffff, 0, 1);
const afterCameraMove = system.clouds.map(actor => ({ x: actor.sprite.x, y: actor.sprite.y }));

assert.deepEqual(afterCameraMove, beforeCameraMove, "camera movement must not reposition world clouds");
const expectedCloudY = (scene.config.topAirRows - SKYLINE_WEATHER_VFX.clouds.actors[0].altitudeTiles) * scene.config.tileSize;
assert.ok(
  Math.abs(system.clouds[0].sprite.y - expectedCloudY)
    <= SKYLINE_WEATHER_VFX.clouds.bobAmplitudeTiles * scene.config.tileSize,
  "cloud altitude may softly bob but must stay anchored to the authored surface row",
);

console.log("Skyline cloud world-space smoke passed");
