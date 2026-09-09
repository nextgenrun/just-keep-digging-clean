export function normalizeLootPickupDescriptor(descriptor) {
  if (!descriptor?.textureKey) return null;
  return Object.freeze({
    ...descriptor,
    textureFrame: descriptor.textureFrame ?? descriptor.frameName ?? null,
    lightTextureFrame: descriptor.lightTextureFrame ?? descriptor.lightFrameName ?? null,
  });
}

export function lootPickupUnit(context, salt) {
  const key = [
    context.eventId,
    context.index,
    context.resourceType || context.descriptor.visualId,
    context.tileX,
    context.tileY,
    context.skyTileRarity,
    salt,
  ].join("|");
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}
