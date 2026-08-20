import { hasBlockingUiLayer } from "./UiLayerOwnership.js";

export function hasEscapeClosableUi(scene) {
  return hasBlockingUiLayer(scene);
}
