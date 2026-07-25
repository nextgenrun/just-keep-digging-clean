import { GAME_CONFIG } from "../../values/gameConfig.js";

const CAMERA_PATCH_MARKER = "__jkdNativeDensityCameraPatch";
const CAMERA_MANAGER_PATCH_MARKER = "__jkdNativeDensityCameraManagerPatch";
const WEBGL_PATCH_MARKER = "__jkdNativeDensityWebGlPatch";
const TEXT_PATCH_MARKER = "__jkdNativeDensityTextPatch";
const CAMERA_MATRIX_DENSITY = "__jkdNativeDensityMatrixScale";
const SCALE_INPUT_PATCH_MARKER = "__jkdNativeDensityInputScalePatch";

function positiveNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function getGame(target) {
  if (!target) return null;
  if (target.__jkdRenderDensityProfile) return target;
  return target.sys?.game
    || target.systems?.game
    || target.game
    || target.scene?.sys?.game
    || null;
}

function getProfile(target) {
  return getGame(target)?.__jkdRenderDensityProfile || null;
}

function installLogicalScaleAccessors(game, profile) {
  if (!game?.scale || profile.density <= 1) return;

  Object.defineProperties(game.scale, {
    width: {
      configurable: true,
      get: () => profile.logicalWidth,
    },
    height: {
      configurable: true,
      get: () => profile.logicalHeight,
    },
    renderDensity: {
      configurable: true,
      get: () => profile.density,
    },
    backingWidth: {
      configurable: true,
      get: () => profile.backingWidth,
    },
    backingHeight: {
      configurable: true,
      get: () => profile.backingHeight,
    },
  });

  if (!game.scale[SCALE_INPUT_PATCH_MARKER]) {
    const originalTransformX = game.scale.transformX;
    const originalTransformY = game.scale.transformY;
    if (typeof originalTransformX === "function" && typeof originalTransformY === "function") {
      game.scale.transformX = function logicalTransformX(value) {
        return originalTransformX.call(this, value) / profile.density;
      };
      game.scale.transformY = function logicalTransformY(value) {
        return originalTransformY.call(this, value) / profile.density;
      };
      Object.defineProperty(game.scale, SCALE_INPUT_PATCH_MARKER, {
        configurable: false,
        value: true,
      });
    }
  }
}

function installCameraMatrixPatch() {
  const cameraPrototype = globalThis.Phaser?.Cameras?.Scene2D?.Camera?.prototype;
  if (!cameraPrototype || cameraPrototype[CAMERA_PATCH_MARKER]) return;

  const originalPreRender = cameraPrototype.preRender;
  cameraPrototype.preRender = function nativeDensityCameraPreRender(...args) {
    const result = originalPreRender.apply(this, args);
    const density = getProfile(this)?.density || 1;
    if (density <= 1 || !this.matrix) return result;

    applyRenderDensityToMatrix(this.matrix, density);
    this[CAMERA_MATRIX_DENSITY] = density;
    return result;
  };

  Object.defineProperty(cameraPrototype, CAMERA_PATCH_MARKER, {
    configurable: false,
    value: true,
  });
}

function installCameraManagerResizePatch() {
  const managerPrototype = globalThis.Phaser?.Cameras?.Scene2D?.CameraManager?.prototype;
  if (!managerPrototype || managerPrototype[CAMERA_MANAGER_PATCH_MARKER]) return;

  const originalOnResize = managerPrototype.onResize;
  managerPrototype.onResize = function nativeDensityCameraManagerResize(
    gameSize,
    baseSize,
    displaySize,
    previousWidth,
    previousHeight
  ) {
    const profile = getProfile(this);
    if (!profile || profile.density <= 1) {
      return originalOnResize.call(
        this,
        gameSize,
        baseSize,
        displaySize,
        previousWidth,
        previousHeight
      );
    }

    // ScaleManager must retain the physical backing size for WebGL, but its
    // stock resize listener would promote full-screen scene cameras from the
    // logical viewport to that backing size. Feed only CameraManager a logical
    // size so browser-panel/fullscreen resizes cannot move the world framing.
    const logicalSize = {
      width: profile.logicalWidth,
      height: profile.logicalHeight,
    };
    return originalOnResize.call(
      this,
      logicalSize,
      logicalSize,
      displaySize,
      profile.logicalWidth,
      profile.logicalHeight
    );
  };

  Object.defineProperty(managerPrototype, CAMERA_MANAGER_PATCH_MARKER, {
    configurable: false,
    value: true,
  });
}

function restoreLogicalCameraMatrix(camera) {
  const density = positiveNumber(camera?.[CAMERA_MATRIX_DENSITY], 1);
  if (density <= 1 || !camera?.matrix) return;
  restoreRenderDensityFromMatrix(camera.matrix, density);
  camera[CAMERA_MATRIX_DENSITY] = 1;
}

function withPhysicalCameraViewport(camera, callback) {
  const density = getProfile(camera)?.density || 1;
  if (density <= 1 || !camera) return callback();

  const originalViewport = {
    x: camera._x,
    y: camera._y,
    width: camera._width,
    height: camera._height,
  };

  camera._x = Math.round(originalViewport.x * density);
  camera._y = Math.round(originalViewport.y * density);
  camera._width = Math.round(originalViewport.width * density);
  camera._height = Math.round(originalViewport.height * density);

  try {
    return callback();
  } finally {
    camera._x = originalViewport.x;
    camera._y = originalViewport.y;
    camera._width = originalViewport.width;
    camera._height = originalViewport.height;
  }
}

function installWebGlCameraViewportPatch() {
  const rendererPrototype = globalThis.Phaser?.Renderer?.WebGL?.WebGLRenderer?.prototype;
  if (!rendererPrototype || rendererPrototype[WEBGL_PATCH_MARKER]) return;

  const originalPreRenderCamera = rendererPrototype.preRenderCamera;
  const originalPostRenderCamera = rendererPrototype.postRenderCamera;

  rendererPrototype.preRenderCamera = function nativeDensityPreRenderCamera(camera) {
    return withPhysicalCameraViewport(camera, () => originalPreRenderCamera.call(this, camera));
  };

  rendererPrototype.postRenderCamera = function nativeDensityPostRenderCamera(camera) {
    try {
      return withPhysicalCameraViewport(camera, () => originalPostRenderCamera.call(this, camera));
    } finally {
      // Input and update systems run in logical 1280x720 space between render passes.
      restoreLogicalCameraMatrix(camera);
    }
  };

  Object.defineProperty(rendererPrototype, WEBGL_PATCH_MARKER, {
    configurable: false,
    value: true,
  });
}

function installTextResolutionPatch() {
  const factoryPrototype = globalThis.Phaser?.GameObjects?.GameObjectFactory?.prototype;
  if (!factoryPrototype || factoryPrototype[TEXT_PATCH_MARKER]) return;

  const originalTextFactory = factoryPrototype.text;
  factoryPrototype.text = function nativeDensityTextFactory(x, y, text, style) {
    const density = getProfile(this.scene)?.density || 1;
    if (density <= 1) return originalTextFactory.call(this, x, y, text, style);

    const requestedResolution = positiveNumber(style?.resolution, density);
    const resolvedStyle = {
      ...(style || {}),
      resolution: Math.max(density, requestedResolution),
    };
    return originalTextFactory.call(this, x, y, text, resolvedStyle);
  };

  Object.defineProperty(factoryPrototype, TEXT_PATCH_MARKER, {
    configurable: false,
    value: true,
  });
}

function publishDiagnostics(game, profile) {
  const rendererType = game?.renderer?.type === globalThis.Phaser?.WEBGL ? "webgl" : "canvas";
  const diagnostics = Object.freeze({
    requestedPreset: profile.requestedPreset,
    preset: profile.preset,
    density: profile.density,
    logicalWidth: profile.logicalWidth,
    logicalHeight: profile.logicalHeight,
    backingWidth: profile.backingWidth,
    backingHeight: profile.backingHeight,
    renderer: rendererType,
    rendererMode: profile.rendererMode,
    coordinateSpace: "logical-input-and-camera/physical-backing",
  });

  game.__jkdRenderDensity = diagnostics;
  if (globalThis.window) globalThis.window.__jkdRenderDensity = diagnostics;
  console.info(
    `[RenderDensity] ${profile.preset} ${profile.backingWidth}x${profile.backingHeight}`
      + ` backing / ${profile.logicalWidth}x${profile.logicalHeight} logical (${rendererType})`
  );
}

export function resolveRenderDensityProfile(search = "", viewport = GAME_CONFIG) {
  const quality = GAME_CONFIG.rendererQuality;
  const query = quality.query;
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const requestedPresetRaw = String(params.get(query.qualityParam) || quality.defaultDensityPreset).toLowerCase();
  const requestedPreset = Object.prototype.hasOwnProperty.call(quality.densityPresets, requestedPresetRaw)
    ? requestedPresetRaw
    : quality.defaultDensityPreset;
  const rendererMode = String(params.get(query.rendererParam) || "webgl").toLowerCase() === query.autoRendererValue
    ? query.autoRendererValue
    : "webgl";
  const rollbackDisabled = params.get(query.densityRollbackParam) === query.disabledValue;
  const forceLegacyDensity = rollbackDisabled || rendererMode === query.autoRendererValue;
  const preset = forceLegacyDensity ? "legacy" : requestedPreset;
  const density = positiveNumber(quality.densityPresets[preset], 1);
  const logicalWidth = Math.round(positiveNumber(viewport.viewportWidth, 1280));
  const logicalHeight = Math.round(positiveNumber(viewport.viewportHeight, 720));

  return Object.freeze({
    requestedPreset,
    preset,
    density,
    logicalWidth,
    logicalHeight,
    backingWidth: Math.round(logicalWidth * density),
    backingHeight: Math.round(logicalHeight * density),
    rendererMode,
  });
}

export function getRenderDensity(target) {
  return getProfile(target)?.density || 1;
}

export function toLogicalScreenCoordinate(target, value) {
  return Number(value) / getRenderDensity(target);
}

export function applyRenderDensityToMatrix(matrix, density) {
  const resolvedDensity = positiveNumber(density, 1);
  if (!matrix || resolvedDensity <= 1) return matrix;
  matrix.a *= resolvedDensity;
  matrix.b *= resolvedDensity;
  matrix.c *= resolvedDensity;
  matrix.d *= resolvedDensity;
  matrix.e *= resolvedDensity;
  matrix.f *= resolvedDensity;
  return matrix;
}

export function restoreRenderDensityFromMatrix(matrix, density) {
  const resolvedDensity = positiveNumber(density, 1);
  if (!matrix || resolvedDensity <= 1) return matrix;
  matrix.a /= resolvedDensity;
  matrix.b /= resolvedDensity;
  matrix.c /= resolvedDensity;
  matrix.d /= resolvedDensity;
  matrix.e /= resolvedDensity;
  matrix.f /= resolvedDensity;
  return matrix;
}

export function installRenderDensityFoundation(game, profile) {
  if (!game || !profile) return;
  game.__jkdRenderDensityProfile = profile;

  installLogicalScaleAccessors(game, profile);
  installCameraMatrixPatch();
  installCameraManagerResizePatch();
  installWebGlCameraViewportPatch();
  installTextResolutionPatch();
}

export function finalizeRenderDensityFoundation(game, profile) {
  publishDiagnostics(game, profile);
}
