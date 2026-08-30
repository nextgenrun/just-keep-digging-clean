function referencesTexture(gameObject, textureKey) {
  return gameObject.texture?.key === textureKey
    || gameObject.frame?.texture?.key === textureKey
    || gameObject.videoTexture?.key === textureKey
    || gameObject.cacheKey === textureKey;
}

export function hasLiveTextureConsumer(scene, textureKey) {
  if (!textureKey) return false;
  const pending = [...(scene?.children?.list || [])];
  const visited = new Set();
  while (pending.length > 0) {
    const gameObject = pending.pop();
    if (!gameObject || visited.has(gameObject)) continue;
    visited.add(gameObject);
    if (
      gameObject.active !== false
      && gameObject.destroyed !== true
      && referencesTexture(gameObject, textureKey)
    ) {
      return true;
    }
    if (Array.isArray(gameObject.list)) pending.push(...gameObject.list);
  }
  return false;
}
