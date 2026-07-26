const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const mix = (from, to, amount) => from + (to - from) * clamp01(amount);

function hasFiniteBody(body) {
  return Boolean(
    body
    && Number.isFinite(body.x)
    && Number.isFinite(body.y)
    && Number.isFinite(body.w)
    && Number.isFinite(body.h)
  );
}

export function resolvePlayerLightProfile(config, search = globalThis.location?.search || "") {
  const profile = config?.playerLightV2;
  const rollback = profile?.rollbackQuery;
  if (!profile?.enabled) return "legacy";
  if (!rollback?.name) return profile.id || "v2";

  const selected = new URLSearchParams(search).get(rollback.name);
  return selected === rollback.legacyValue ? "legacy" : profile.id || "v2";
}

export function resolvePlayerLightAnchor(
  player,
  playerController,
  profileConfig,
  tileSize,
  profileId
) {
  if (profileId === "legacy") {
    return {
      x: Number(player?.x) || 0,
      y: Number(player?.y) || 0,
      source: "legacy-player-origin",
    };
  }

  const body = playerController?.physicsBody;
  const anchor = profileConfig?.anchor || {};
  if (hasFiniteBody(body)) {
    return {
      x: body.x + body.w * anchor.bodyXRatio,
      y: body.y + body.h * anchor.bodyYRatio,
      source: "physics-upper-body",
    };
  }

  return {
    x: Number(player?.x) || 0,
    y: (Number(player?.y) || 0) + (Number(tileSize) || 0) * anchor.fallbackYOffsetTiles,
    source: "sprite-fallback",
  };
}

export function resolvePlayerLightEnvironment(lighting, profileConfig, profileId) {
  if (profileId === "legacy") {
    return {
      profileId,
      intensity: 1,
      radiusScale: 1,
      warmth: 1,
      coolEdge: 0,
      flickerScale: 1,
      verticalScale: 1,
    };
  }

  const environment = profileConfig?.environment || {};
  const surface = clamp01(lighting?.surfaceLightInfluence);
  const underground = clamp01(lighting?.undergroundDarknessInfluence);
  const night = clamp01(lighting?.nightAmount);
  const sun = clamp01(lighting?.sunStrength);
  const weather = lighting?.weather || {};
  const rain = clamp01(weather.rainAmount) * surface;
  const storm = clamp01(weather.stormAmount) * surface;
  const lightning = clamp01(weather.lightningFlashAmount) * surface;

  const surfaceDay = environment.surfaceDay;
  const surfaceNight = environment.surfaceNight;
  const cave = environment.underground;
  const weatherResponse = environment.weather;

  let intensity = mix(surfaceDay.intensity, surfaceNight.intensity, night);
  intensity += (1 - sun) * surface * environment.lowSunIntensityLift;
  intensity = mix(intensity, cave.intensity, underground);
  intensity *= mix(1, weatherResponse.rainIntensityMultiplier, rain);
  intensity *= mix(1, weatherResponse.stormIntensityMultiplier, storm);
  intensity *= mix(1, weatherResponse.lightningIntensityMultiplier, lightning);

  let radiusScale = mix(surfaceDay.radiusScale, surfaceNight.radiusScale, night);
  radiusScale = mix(radiusScale, cave.radiusScale, underground);
  radiusScale *= mix(1, weatherResponse.rainRadiusMultiplier, rain);
  radiusScale *= mix(1, weatherResponse.stormRadiusMultiplier, storm);

  let warmth = mix(surfaceDay.warmth, surfaceNight.warmth, night);
  warmth = mix(warmth, cave.warmth, underground);
  warmth *= mix(1, weatherResponse.rainWarmthMultiplier, rain);
  warmth *= mix(1, weatherResponse.stormWarmthMultiplier, storm);

  let coolEdge = mix(surfaceDay.coolEdge, surfaceNight.coolEdge, night);
  coolEdge = mix(coolEdge, cave.coolEdge, underground);
  coolEdge += weatherResponse.rainCoolEdgeAdd * rain;
  coolEdge += weatherResponse.stormCoolEdgeAdd * storm;

  let flickerScale = mix(surfaceDay.flickerScale, surfaceNight.flickerScale, night);
  flickerScale = mix(flickerScale, cave.flickerScale, underground);
  flickerScale *= mix(1, weatherResponse.rainFlickerMultiplier, rain);
  flickerScale *= mix(1, weatherResponse.stormFlickerMultiplier, storm);

  return {
    profileId,
    intensity: Math.max(environment.minimumIntensity, Math.min(environment.maximumIntensity, intensity)),
    radiusScale: Math.max(environment.minimumRadiusScale, radiusScale),
    warmth: clamp01(warmth),
    coolEdge: clamp01(coolEdge),
    flickerScale: Math.max(environment.minimumFlickerScale, flickerScale),
    verticalScale: profileConfig.reveal.verticalScale,
  };
}
