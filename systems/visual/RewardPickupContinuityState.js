const STATE_BY_SCENE = new WeakMap();

function getState(scene) {
  if (!scene || (typeof scene !== "object" && typeof scene !== "function")) return null;
  let state = STATE_BY_SCENE.get(scene);
  if (!state) {
    state = { resources: new Map(), specials: new Map() };
    STATE_BY_SCENE.set(scene, state);
  }
  return state;
}

/** Session-only presentation state; it never owns inventory values or saves. */
export function rememberRewardPickupVisual(scene, context = {}) {
  const state = getState(scene);
  const descriptor = context.descriptor;
  if (!state || !descriptor?.textureKey) return false;
  const resourceType = context.resourceType || descriptor.resourceType;
  if (descriptor.kind === "resource" && resourceType) {
    state.resources.set(resourceType, descriptor);
    return true;
  }
  const tileType = context.tileType ?? descriptor.tileType;
  if (descriptor.kind === "special" && Number.isInteger(tileType)) {
    state.specials.set(tileType, descriptor);
    return true;
  }
  return false;
}

export function getRememberedResourcePickupVisual(scene, resourceType) {
  return STATE_BY_SCENE.get(scene)?.resources.get(resourceType) || null;
}

export function getRememberedSpecialPickupVisual(scene, tileType) {
  return STATE_BY_SCENE.get(scene)?.specials.get(tileType) || null;
}
