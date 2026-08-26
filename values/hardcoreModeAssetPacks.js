import { HARDCORE_MODE_CONFIG } from "./hardcoreMode.js";

function asAsset(asset) {
  return Object.freeze({ key: asset.key, path: asset.path });
}

export function getTypedConfirmationPreloadAssets() {
  return Object.freeze([asAsset(HARDCORE_MODE_CONFIG.assets.panel)]);
}

export function getHardcoreModeOnlyPreloadAssets() {
  return Object.freeze([
    asAsset(HARDCORE_MODE_CONFIG.assets.crest),
    asAsset(HARDCORE_MODE_CONFIG.assets.panicWarning),
    asAsset(HARDCORE_MODE_CONFIG.assets.panicCritical),
    asAsset(HARDCORE_MODE_CONFIG.assets.panicEdgeFrame),
  ]);
}
