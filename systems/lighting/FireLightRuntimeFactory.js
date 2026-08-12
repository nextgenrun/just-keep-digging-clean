import { FireLightRenderer } from "./FireLightRenderer.js";
import { resolveFireLightLayerPolicy } from "./fireLightLayerPolicy.js";

export function createFireLightRenderer(
  scene,
  config,
  presentation,
  raysRequested,
) {
  const policy = resolveFireLightLayerPolicy(config, presentation, raysRequested);
  if (!policy.textureKeys.every(key => scene.textures?.exists?.(key))) {
    return Object.freeze({ renderer: null, disabledReason: "missing-authored-assets" });
  }
  const renderer = new FireLightRenderer(scene, config, presentation);
  if (renderer.available) return Object.freeze({ renderer, disabledReason: null });
  renderer.destroy();
  return Object.freeze({ renderer: null, disabledReason: "renderer-unavailable" });
}
