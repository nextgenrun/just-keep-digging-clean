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

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function maskWeight(index, size, feather, incoming, outgoing) {
  let weight = 1;
  if (incoming && index < feather) {
    weight *= smoothstep((index + 0.5) / feather);
  }
  if (outgoing && index >= size - feather) {
    weight *= smoothstep((size - index - 0.5) / feather);
  }
  return weight;
}

export function ensureWorldVisualNormalizedBlendMaskTexture(
  scene,
  blend,
  bits,
  width,
  height
) {
  if (!blend?.edgeBits) return null;
  const displayWidth = Math.max(1, Math.round(width));
  const displayHeight = Math.max(1, Math.round(height));
  const resolutionScale = Math.max(
    0.05,
    Math.min(1, Number(blend.maskResolutionScale) || 1)
  );
  const textureWidth = Math.max(1, Math.round(displayWidth * resolutionScale));
  const textureHeight = Math.max(1, Math.round(displayHeight * resolutionScale));
  const featherX = Math.max(1, Math.min(
    textureWidth,
    Math.round(
      (Number(blend.featherXPx) || 1) * textureWidth / displayWidth
    )
  ));
  const featherY = Math.max(1, Math.min(
    textureHeight,
    Math.round(
      (Number(blend.featherYPx) || 1) * textureHeight / displayHeight
    )
  ));
  const prefix = blend.textureKeyPrefix || "world-visual-normalized-mask";
  const key = [
    prefix,
    bits,
    `${textureWidth}x${textureHeight}`,
    `${featherX}x${featherY}`,
  ].join("-");
  if (scene.textures.exists(key)) return key;
  if (!scene.textures?.createCanvas) return null;

  const texture = scene.textures.createCanvas(
    key,
    textureWidth,
    textureHeight
  );
  const context = texture?.getContext?.();
  if (!texture || !context) {
    if (scene.textures.exists(key)) scene.textures.remove?.(key);
    return null;
  }
  const imageData = context.createImageData(textureWidth, textureHeight);
  const pixels = imageData.data;
  const left = Boolean(bits & blend.edgeBits.left);
  const right = Boolean(bits & blend.edgeBits.right);
  const top = Boolean(bits & blend.edgeBits.top);
  const bottom = Boolean(bits & blend.edgeBits.bottom);
  for (let y = 0; y < textureHeight; y += 1) {
    const vertical = maskWeight(
      y,
      textureHeight,
      featherY,
      top,
      bottom
    );
    for (let x = 0; x < textureWidth; x += 1) {
      const alpha = Math.round(
        255 * vertical * maskWeight(
          x,
          textureWidth,
          featherX,
          left,
          right
        )
      );
      const offset = (y * textureWidth + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = alpha;
    }
  }
  context.putImageData(imageData, 0, 0);
  texture.refresh();
  return key;
}

export function createWorldVisualNormalizedBlendMask(
  scene,
  blend,
  bits,
  x,
  y,
  width,
  height
) {
  const key = ensureWorldVisualNormalizedBlendMaskTexture(
    scene,
    blend,
    bits,
    width,
    height
  );
  if (!key) return null;
  const image = scene.make?.image
    ? scene.make.image({ x, y, key, add: false })
    : scene.add.image(x, y, key);
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
    textureKey: key,
  };
}
