export function resolveWorldVisualBlendBits(blend, edges = {}) {
  if (!blend?.edgeBits) return 0;
  return (
    (edges.left ? blend.edgeBits.left : 0)
    | (edges.right ? blend.edgeBits.right : 0)
    | (edges.top ? blend.edgeBits.top : 0)
    | (edges.bottom ? blend.edgeBits.bottom : 0)
  );
}

export function ensureWorldVisualBlendMaskFrame(
  scene,
  asset,
  blend,
  bits
) {
  if (!asset || !blend || !scene.textures.exists(asset.key)) return null;
  const texture = scene.textures.get(asset.key);
  const frameName = `${asset.key}-blend-${bits}`;
  if (!texture.has(frameName)) {
    const frameX = (bits % blend.columns) * blend.frameWidthPx;
    const frameY = Math.floor(bits / blend.columns) * blend.frameHeightPx;
    texture.add(
      frameName,
      0,
      frameX,
      frameY,
      blend.frameWidthPx,
      blend.frameHeightPx
    );
  }
  return frameName;
}

export function createWorldVisualBlendMask(
  scene,
  asset,
  blend,
  bits,
  x,
  y,
  width,
  height
) {
  const frameName = ensureWorldVisualBlendMaskFrame(
    scene,
    asset,
    blend,
    bits
  );
  if (!frameName) return null;
  const image = scene.make?.image
    ? scene.make.image({
      x,
      y,
      key: asset.key,
      frame: frameName,
      add: false,
    })
    : scene.add.image(x, y, asset.key, frameName);
  if (!image?.createBitmapMask) {
    image?.destroy?.();
    return null;
  }
  image
    .setOrigin(0)
    .setDisplaySize(width, height);
  if (!scene.make?.image) image.setVisible?.(false);
  return {
    image,
    bitmap: image.createBitmapMask(),
  };
}
