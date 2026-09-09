// Shared renderer selection prevents presentation systems enabling on a legacy world.
export const WORLD_VISUAL_RUNTIME_MODES = Object.freeze({scenic:"scenic-v2",legacy:"legacy"});
export const WORLD_VISUAL_RUNTIME_SELECTION = Object.freeze({
  defaultMode:WORLD_VISUAL_RUNTIME_MODES.scenic,
  queryParam:"worldVisualRuntime",
  legacyValues:Object.freeze(["legacy","tiled","tiles","old"]),
  scenicValues:Object.freeze(["scenic","scenic-v2","new","v2"]),
});
export function resolveWorldVisualRuntimeMode(config=WORLD_VISUAL_RUNTIME_SELECTION,search=globalThis.location?.search||""){
  const value=new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if(value&&config.legacyValues.includes(value))return WORLD_VISUAL_RUNTIME_MODES.legacy;
  if(value&&config.scenicValues.includes(value))return WORLD_VISUAL_RUNTIME_MODES.scenic;
  return config.defaultMode;
}
