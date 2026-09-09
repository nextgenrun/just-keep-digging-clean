import { WORLD_VISUAL_RUNTIME } from "../../../values/worldVisualRuntime.js";

// The surface stage is retained only for the unchanged Town Square video.
// Its far plates are always hidden and its ground edges are hidden outside Town.
export const GROUND_LEVEL_SURFACE_CONFIG = Object.freeze({
  ...WORLD_VISUAL_RUNTIME,
  render: Object.freeze({
    ...WORLD_VISUAL_RUNTIME.render,
    farDepth: -18,
  }),
});
