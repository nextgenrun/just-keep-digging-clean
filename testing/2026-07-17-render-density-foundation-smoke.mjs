import assert from "node:assert/strict";
import fs from "node:fs";
import {
  applyRenderDensityToMatrix,
  installRenderDensityFoundation,
  resolveRenderDensityProfile,
  restoreRenderDensityFromMatrix,
  toLogicalScreenCoordinate,
} from "../systems/visual/RenderDensitySystem.js";

const viewport = Object.freeze({ viewportWidth: 1280, viewportHeight: 720 });

const defaultProfile = resolveRenderDensityProfile("", viewport);
assert.equal(defaultProfile.preset, "ultra");
assert.equal(defaultProfile.density, 2);
assert.equal(defaultProfile.backingWidth, 2560);
assert.equal(defaultProfile.backingHeight, 1440);
assert.equal(defaultProfile.rendererMode, "webgl");

const high = resolveRenderDensityProfile("?renderQuality=high", viewport);
assert.equal(high.preset, "high");
assert.equal(high.density, 1.5);
assert.equal(high.backingWidth, 1920);
assert.equal(high.backingHeight, 1080);

const ultra = resolveRenderDensityProfile("?renderQuality=ultra", viewport);
assert.equal(ultra.preset, "ultra");
assert.equal(ultra.density, 2);
assert.equal(ultra.backingWidth, 2560);
assert.equal(ultra.backingHeight, 1440);

const balanced = resolveRenderDensityProfile("?renderQuality=balanced", viewport);
assert.equal(balanced.preset, "balanced");
assert.equal(balanced.density, 1);

const disabled = resolveRenderDensityProfile("?renderQuality=ultra&nativeDensity=0", viewport);
assert.equal(disabled.requestedPreset, "ultra");
assert.equal(disabled.preset, "legacy");
assert.equal(disabled.density, 1);

const autoRendererRollback = resolveRenderDensityProfile("?renderQuality=ultra&renderer=auto", viewport);
assert.equal(autoRendererRollback.rendererMode, "auto");
assert.equal(autoRendererRollback.preset, "legacy");
assert.equal(autoRendererRollback.backingWidth, 1280);

const matrix = { a: 1, b: 0, c: 0, d: 1, e: 640, f: 360 };
applyRenderDensityToMatrix(matrix, high.density);
assert.deepEqual(matrix, { a: 1.5, b: 0, c: 0, d: 1.5, e: 960, f: 540 });
restoreRenderDensityFromMatrix(matrix, high.density);
assert.deepEqual(matrix, { a: 1, b: 0, c: 0, d: 1, e: 640, f: 360 });

const cameraPrototype = {
  preRender() {
    this.matrix = { a: 1, b: 0, c: 0, d: 1, e: 640, f: 360 };
  },
};
const cameraManagerPrototype = {
  onResize(gameSize, baseSize, displaySize, previousWidth, previousHeight) {
    this.resizeCall = { gameSize, baseSize, displaySize, previousWidth, previousHeight };
    for (const camera of this.cameras) {
      if (
        camera._x === 0
        && camera._y === 0
        && camera._width === previousWidth
        && camera._height === previousHeight
      ) {
        camera.setSize(baseSize.width, baseSize.height);
      }
    }
  },
};
const rendererCalls = [];
const rendererPrototype = {
  preRenderCamera(camera) {
    rendererCalls.push({ stage: "pre", width: camera._width, height: camera._height });
  },
  postRenderCamera(camera) {
    rendererCalls.push({ stage: "post", width: camera._width, height: camera._height });
  },
};
const inputPrototype = {
  transformPointer(pointer, pageX, pageY) {
    pointer.position.x = this.scaleManager.transformX(pageX);
    pointer.position.y = this.scaleManager.transformY(pageY);
  },
};
const textFactoryPrototype = {
  text(x, y, text, style) {
    return { x, y, text, style };
  },
};

globalThis.Phaser = {
  Cameras: {
    Scene2D: {
      Camera: { prototype: cameraPrototype },
      CameraManager: { prototype: cameraManagerPrototype },
    },
  },
  Renderer: { WebGL: { WebGLRenderer: { prototype: rendererPrototype } } },
  Input: { InputManager: { prototype: inputPrototype } },
  GameObjects: { GameObjectFactory: { prototype: textFactoryPrototype } },
};

const game = {
  scale: {
    transformX: value => value,
    transformY: value => value,
  },
};
installRenderDensityFoundation(game, high);
installRenderDensityFoundation(game, high);
assert.equal(game.scale.width, 1280);
assert.equal(game.scale.height, 720);
assert.equal(game.scale.backingWidth, 1920);

const camera = Object.create(cameraPrototype);
camera.scene = { sys: { game } };
camera._x = 0;
camera._y = 0;
camera._width = 1280;
camera._height = 720;
camera.preRender();
assert.equal(camera.matrix.e, 960);
rendererPrototype.preRenderCamera.call({}, camera);
assert.deepEqual(rendererCalls[0], { stage: "pre", width: 1920, height: 1080 });
assert.equal(camera._width, 1280, "the physical viewport is temporary");
rendererPrototype.postRenderCamera.call({}, camera);
assert.deepEqual(rendererCalls[1], { stage: "post", width: 1920, height: 1080 });
assert.equal(camera.matrix.e, 640);
assert.equal(camera._width, 1280);

const resizeManagedCamera = {
  _x: 0,
  _y: 0,
  _width: 1280,
  _height: 720,
  setSize(width, height) {
    this._width = width;
    this._height = height;
  },
};
const cameraManager = Object.create(cameraManagerPrototype);
cameraManager.systems = { game };
cameraManager.cameras = [resizeManagedCamera];
cameraManagerPrototype.onResize.call(
  cameraManager,
  { width: 2560, height: 1440 },
  { width: 2560, height: 1440 },
  { width: 632, height: 356 },
  1280,
  720
);
assert.equal(resizeManagedCamera._width, 1280, "Ultra resize keeps the camera logical");
assert.equal(resizeManagedCamera._height, 720, "Ultra resize keeps the camera logical");
assert.deepEqual(cameraManager.resizeCall.gameSize, { width: 1280, height: 720 });
assert.deepEqual(cameraManager.resizeCall.baseSize, { width: 1280, height: 720 });

const pointer = { position: { x: 0, y: 0 } };
const inputManager = Object.create(inputPrototype);
inputManager.game = game;
inputManager.scaleManager = game.scale;
inputManager.transformPointer(pointer, 960, 540, false);
assert.deepEqual(pointer.position, { x: 640, y: 360 });
assert.equal(toLogicalScreenCoordinate(game, 960), 640);

const textFactory = Object.create(textFactoryPrototype);
textFactory.scene = { sys: { game } };
assert.equal(textFactory.text(10, 20, "High", {}).style.resolution, 1.5);
assert.equal(textFactory.text(10, 20, "Custom", { resolution: 3 }).style.resolution, 3);

const mainSource = fs.readFileSync(new URL("../main.js", import.meta.url), "utf8");
assert.match(mainSource, /type:\s*renderDensityProfile\.rendererMode === "auto" \? Phaser\.AUTO : Phaser\.WEBGL/);
assert.match(mainSource, /width:\s*renderDensityProfile\.backingWidth/);
assert.match(mainSource, /height:\s*renderDensityProfile\.backingHeight/);
assert.match(
  mainSource,
  /preBoot:\s*game =>\s*\{[\s\S]{0,240}installRenderDensityFoundation\(game, renderDensityProfile\)/,
);
assert.match(mainSource, /game\.registry\.set\("gameplayCapabilities", gameplayCapabilities\)/);
assert.match(
  mainSource,
  /postBoot:\s*game =>\s*(?:\{\s*)?finalizeRenderDensityFoundation\(game, renderDensityProfile\)/,
);

console.log("render-density-foundation smoke: ok");
