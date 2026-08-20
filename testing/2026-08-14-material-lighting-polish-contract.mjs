import assert from "node:assert/strict";

import {
  SHADER_CONFIG,
  isMaterialResponseEnabled,
} from "../values/shaderConfig.js";
import {
  MATERIAL_RESPONSE_FRAGMENT,
  MATERIAL_RESPONSE_SHADER_KEY,
} from "../systems/lighting/materialResponseShader.js";
import * as shaderIndex from "../systems/lighting/shaderIndex.js";

const material = SHADER_CONFIG.layers.materialResponse;
const darkness = SHADER_CONFIG.layers.darknessLight;

assert.equal(material.enabled, false);
assert.ok(material.depth < darkness.depth, "material polish must remain below the darkness mask");
assert.ok(material.alpha <= 0.40, "material layer alpha must stay restrained");
assert.ok(material.highlightCeiling <= 0.10, "highlight energy must not crush midtones");
assert.ok(material.wetSurfaceStrength <= 0.22);
assert.ok(material.warmPoolStrength <= 0.16);
assert.ok(material.floorBounceStrength <= 0.12);
assert.ok(material.caveReliefStrength <= 0.07);
assert.ok(material.groundBandStart < material.groundBandEnd);

assert.equal(isMaterialResponseEnabled(""), false);
assert.equal(isMaterialResponseEnabled("?materialLighting=1"), true);
assert.equal(isMaterialResponseEnabled("?materialLighting=0"), false);

assert.equal(shaderIndex.MATERIAL_RESPONSE_SHADER_KEY, MATERIAL_RESPONSE_SHADER_KEY);
assert.equal(shaderIndex.MATERIAL_RESPONSE_FRAGMENT, MATERIAL_RESPONSE_FRAGMENT);
for (const uniform of [
  "uMaterialWetSurfaceStrength",
  "uMaterialWarmPoolStrength",
  "uMaterialFloorBounceStrength",
  "uMaterialCaveReliefStrength",
  "uMaterialHighlightCeiling",
]) {
  assert.ok(MATERIAL_RESPONSE_FRAGMENT.includes(uniform), `missing ${uniform}`);
}
assert.ok(!MATERIAL_RESPONSE_FRAGMENT.includes("contrast("), "global contrast is not part of this pass");

console.log("material tint diagnostic contract: disabled production default, bounded review response, and rollback passed");
