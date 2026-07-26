const clamp01 = value => Math.max(0, Math.min(1, value));

const smoothstep = value => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function sampleGradientStops(stops, position) {
  if (!Array.isArray(stops) || stops.length === 0) return 0;
  if (position <= stops[0][0]) return clamp01(stops[0][1]);

  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1];
    const next = stops[index];
    if (position > next[0]) continue;
    const span = Math.max(Number.EPSILON, next[0] - previous[0]);
    const amount = smoothstep((position - previous[0]) / span);
    return clamp01(previous[1] + (next[1] - previous[1]) * amount);
  }

  return clamp01(stops[stops.length - 1][1]);
}

function ensureLegacyMaskTexture(scene, key, size) {
  if (scene.textures.exists(key)) return;

  const radius = size / 2;
  const texture = scene.textures.createCanvas(key, size, size);
  const context = texture.getContext();
  const image = context.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x - radius) / (radius * 0.94);
      const ny = (y - radius) / (radius * 1.06);
      const angle = Math.atan2(ny, nx);
      const lift = Math.max(0, -ny) * 0.13;
      const wobble = Math.sin(angle * 3.0 + 0.4) * 0.050
        + Math.sin(angle * 5.0 - 1.2) * 0.034
        + Math.sin(angle * 9.0 + 2.1) * 0.018;
      const distance = Math.sqrt(nx * nx + ny * ny) / Math.max(0.72, 1 + wobble + lift);
      let alpha = 0;

      if (distance < 0.38) {
        alpha = 1;
      } else if (distance < 0.68) {
        alpha = 1 - smoothstep((distance - 0.38) / 0.30) * 0.22;
      } else if (distance < 0.98) {
        alpha = 0.78 * (1 - smoothstep((distance - 0.68) / 0.30));
      }

      const offset = (y * size + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(clamp01(alpha) * 255);
    }
  }

  context.clearRect(0, 0, size, size);
  context.putImageData(image, 0, 0);
  texture.refresh();
}

function ensureNaturalMaskTexture(scene, key, size, profile) {
  if (scene.textures.exists(key)) return;

  const shape = profile.maskShape;
  const radius = size / 2;
  const texture = scene.textures.createCanvas(key, size, size);
  const context = texture.getContext();
  const image = context.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x - radius) / (radius * shape.horizontalScale);
      const ny = (y - radius) / (radius * shape.verticalScale);
      const angle = Math.atan2(ny, nx);
      const edgeNoise = Math.sin(
        angle * shape.primaryNoiseFrequency + shape.primaryNoisePhase
      ) * shape.primaryNoiseStrength
        + Math.sin(
          angle * shape.secondaryNoiseFrequency + shape.secondaryNoisePhase
        ) * shape.secondaryNoiseStrength;
      const edgeScale = Math.max(shape.minimumEdgeScale, 1 + edgeNoise);
      const distance = Math.sqrt(nx * nx + ny * ny) / edgeScale;
      const alpha = sampleGradientStops(profile.maskGradientStops, distance);
      const offset = (y * size + x) * 4;

      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }

  context.clearRect(0, 0, size, size);
  context.putImageData(image, 0, 0);
  texture.refresh();
}

function ensureRadialGlowTexture(scene, key, size, stops) {
  if (scene.textures.exists(key)) return;

  const radius = size / 2;
  const texture = scene.textures.createCanvas(key, size, size);
  const context = texture.getContext();
  const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
  stops.forEach(([position, alpha]) => {
    gradient.addColorStop(position, `rgba(255,255,255,${alpha})`);
  });
  context.clearRect(0, 0, size, size);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.refresh();
}

/**
 * Creates the selected player-light visibility mask and additive glow texture.
 */
export function ensurePlayerLightTextures(scene, config, mode) {
  const naturalProfile = config.playerLightVisual?.natural;
  const useNatural = mode === config.playerLightVisual?.naturalMode && naturalProfile;
  const maskKey = useNatural
    ? naturalProfile.visibilityMaskTextureKey
    : config.visibilityMaskTextureKey;
  const glowKey = useNatural
    ? naturalProfile.warmGlowTextureKey
    : config.warmGlowTextureKey;
  const glowStops = useNatural
    ? naturalProfile.glowGradientStops
    : config.glowGradientStops;

  if (useNatural) {
    ensureNaturalMaskTexture(
      scene,
      maskKey,
      config.gradientTextureSize,
      naturalProfile
    );
  } else {
    ensureLegacyMaskTexture(scene, maskKey, config.gradientTextureSize);
  }
  ensureRadialGlowTexture(scene, glowKey, config.gradientTextureSize, glowStops);

  return Object.freeze({ maskKey, glowKey });
}
