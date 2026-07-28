import assert from "node:assert/strict";

import { resolveLightCoordinateSpaces } from "../systems/lighting/lightCoordinateSpace.js";
import { shouldApplyRenderDensityToCamera } from "../systems/visual/RenderDensitySystem.js";

const width = 1280;
const height = 720;
const zoom = 1.1;
const originX = width * 0.5;
const originY = height * 0.5;
const camera = {
  x: 0,
  y: 0,
  width,
  height,
  originX: 0.5,
  originY: 0.5,
  scrollX: 1000,
  scrollY: 2000,
  zoomX: zoom,
  zoomY: zoom,
  matrix: {
    transformPoint(x, y, output) {
      output.x = originX + (x - originX) * zoom;
      output.y = originY + (y - originY) * zoom;
      return output;
    },
  },
};

const point = resolveLightCoordinateSpaces(camera, 1900, 2500);
assert.equal(point.textureX, 900);
assert.equal(point.textureY, 500);
assert.equal(point.x, 926);
assert.equal(point.y, 514);

// The RenderTexture is transformed by the same main camera as the player.
// Using texture-local coordinates therefore lands on the exact shader point.
const renderedTexturePoint = camera.matrix.transformPoint(
  point.textureX,
  point.textureY,
  {}
);
assert.deepEqual(renderedTexturePoint, { x: point.x, y: point.y });

// Feeding final screen pixels into the RenderTexture reproduces the old drift.
const oldDoubleTransform = camera.matrix.transformPoint(point.x, point.y, {});
assert.notDeepEqual(oldDoubleTransform, renderedTexturePoint);
assert.ok(oldDoubleTransform.x > renderedTexturePoint.x);
assert.ok(oldDoubleTransform.y > renderedTexturePoint.y);

const systemScene = {};
const game = { scene: { systemScene } };
systemScene.sys = { game };
const gameplayScene = { sys: { game } };

assert.equal(
  shouldApplyRenderDensityToCamera({ scene: systemScene }),
  false,
  "RenderTexture internal cameras must stay in texture-local pixels"
);
assert.equal(
  shouldApplyRenderDensityToCamera({ scene: gameplayScene }),
  true,
  "scene cameras still scale to the physical backing canvas"
);

console.log("light coordinate spaces stay centered across camera zoom and native render density");
