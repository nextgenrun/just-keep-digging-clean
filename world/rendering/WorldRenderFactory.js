import {
  WORLD_VISUAL_RUNTIME_MODES,
  resolveWorldVisualRuntimeMode,
} from "../../values/worldVisualRuntime.js?rev=20260826-surface-motion-v2";
import { WorldRenderer } from "./WorldRenderer.js";
import { WorldVisualRuntime } from
  "./scenic-world/WorldVisualRuntime.js?rev=20260826-surface-motion-v2";

export function createWorldRenderer(scene, worldModel, gameConfig, search = globalThis.location?.search || "") {
  const mode = resolveWorldVisualRuntimeMode(undefined, search);
  const renderer = mode === WORLD_VISUAL_RUNTIME_MODES.legacy
    ? new WorldRenderer(scene, worldModel, gameConfig)
    : new WorldVisualRuntime(scene, worldModel, gameConfig);
  return Object.freeze({ mode, renderer });
}
