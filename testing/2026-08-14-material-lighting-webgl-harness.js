import {
  MATERIAL_RESPONSE_FRAGMENT,
} from "../systems/lighting/materialResponseShader.js";
import {
  isMaterialResponseEnabled,
} from "../values/shaderConfig.js";

const canvas = document.getElementById("material-lighting-canvas");
const status = document.getElementById("material-lighting-status");

const VERTEX_SHADER = `
precision mediump float;

attribute vec2 aPosition;
uniform vec2 resolution;
varying vec2 fragCoord;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  fragCoord = (aPosition * 0.5 + 0.5) * resolution;
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
  }
  return shader;
}

function setFloat(gl, program, name, value) {
  const location = gl.getUniformLocation(program, name);
  if (location) gl.uniform1f(location, value);
}

function setVec2(gl, program, name, x, y) {
  const location = gl.getUniformLocation(program, name);
  if (location) gl.uniform2f(location, x, y);
}

function run() {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl) throw new Error("WebGL unavailable");

  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, MATERIAL_RESPONSE_FRAGMENT);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "shader link failed");
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  setVec2(gl, program, "resolution", canvas.width, canvas.height);
  setVec2(gl, program, "uTorchPosition", 0.5, 0.52);
  const floats = {
    uLayerAlpha: 0.36,
    uGameTime: 1200,
    uRainAmount: 0.8,
    uStormAmount: 0.6,
    uSurfaceAmount: 1,
    uUndergroundAmount: 0,
    uWeatherWetness: 0.9,
    uWeatherShelterAmount: 0,
    uNightAmount: 0.7,
    uTorchActive: 1,
    uTorchRadius: 0.24,
    uTorchGlow: 0.72,
    uTorchWarmth: 0.86,
    uTorchCoolEdge: 0.28,
    uSurfaceLightInfluence: 1,
    uUndergroundDarknessInfluence: 0,
    uMaterialWetSurfaceStrength: 0.20,
    uMaterialWarmPoolStrength: 0.15,
    uMaterialFloorBounceStrength: 0.11,
    uMaterialCaveReliefStrength: 0.065,
    uMaterialHighlightCeiling: 0.085,
    uMaterialGroundBandStart: 0.20,
    uMaterialGroundBandEnd: 0.64,
    uMaterialDetailFrequency: 68,
  };
  for (const [name, value] of Object.entries(floats)) {
    setFloat(gl, program, name, value);
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  const center = new Uint8Array(4);
  gl.readPixels(
    Math.floor(canvas.width / 2),
    Math.floor(canvas.height / 2),
    1,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    center,
  );
  const error = gl.getError();
  if (error !== gl.NO_ERROR) throw new Error(`WebGL error ${error}`);
  if (center[3] === 0) throw new Error("material response produced no center alpha");
  if (!isMaterialResponseEnabled("") || isMaterialResponseEnabled("?materialLighting=0")) {
    throw new Error("material lighting rollback contract failed");
  }

  status.dataset.status = "pass";
  status.textContent = `PASS rgba(${[...center].join(",")})`;
}

try {
  run();
} catch (error) {
  status.dataset.status = "fail";
  status.textContent = `FAIL ${error?.message || error}`;
}
