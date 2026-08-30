export function appendLevelOneBiomeBoundaryVariants(
  collection,
  entry,
  assets,
  config
) {
  const alignment = config.boundary.variantAlignment;
  if (!alignment?.pairKeys?.includes(entry.pairKey)) {
    collection.push(entry);
    return;
  }
  collection.push(entry);
  const alternatives = assets.filter(asset => asset.key !== entry.asset.key);
  alternatives.forEach((asset, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    const tangentX = entry.axis === "y" ? direction * alignment.spreadTiles : 0;
    const tangentY = entry.axis === "x" ? direction * alignment.spreadTiles : 0;
    collection.push({
      ...entry,
      id: `${entry.id}:aligned-${index + 1}`,
      asset,
      tileX: entry.tileX + tangentX,
      tileY: entry.tileY + tangentY,
      scale: entry.scale * alignment.secondaryScale,
      rotation: entry.rotation + direction * alignment.rotationStepRadians,
      depthOffset: entry.depthOffset + (index + 1) * alignment.depthStep,
    });
  });
}
