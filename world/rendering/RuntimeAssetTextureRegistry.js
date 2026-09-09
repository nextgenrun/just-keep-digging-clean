export function resolveRuntimeAssetType(asset, config) {
  if (asset?.type === config.types.video) return config.types.video;
  if (asset?.type === config.types.audio) return config.types.audio;
  if (asset?.type === config.types.spritesheet) return config.types.spritesheet;
  if (asset?.type === config.types.multiatlas) return config.types.multiatlas;
  return config.types.image;
}

export function runtimeAssetExists(scene, asset, type, config) {
  if (type === config.types.video) {
    return Boolean(scene.cache?.video?.exists?.(asset.key));
  }
  if (type === config.types.audio) {
    return Boolean(scene.cache?.audio?.exists?.(asset.key));
  }
  const textureExists = Boolean(scene.textures?.exists?.(asset.key));
  if (!textureExists) return false;
  if (type === config.types.multiatlas) {
    const texture = scene.textures.get(asset.key);
    return (asset.requiredFrames || []).every(frame => texture.has(String(frame)));
  }
  if (type !== config.types.spritesheet) return textureExists;
  const endFrame = Number(asset?.frameConfig?.endFrame);
  if (!Number.isFinite(endFrame)) return textureExists;
  const frameName = String(endFrame);
  const texture = scene.textures?.get?.(asset.key);
  if (typeof texture?.has === "function") return texture.has(frameName);
  if (typeof scene.textures?.getFrame !== "function") return textureExists;
  const frame = scene.textures.getFrame(asset.key, frameName);
  return Boolean(
    frame
    && (String(frame.name) === frameName || frame.texture?.key === asset.key),
  );
}

export function removeRuntimeAsset(scene, asset, type, config) {
  if ([config.types.image, config.types.spritesheet, config.types.multiatlas].includes(type)) {
    if (scene.textures?.exists?.(asset.key)) scene.textures.remove?.(asset.key);
    return;
  }
  const cache = type === config.types.audio ? scene.cache?.audio : scene.cache?.video;
  if (cache?.exists?.(asset.key)) cache.remove?.(asset.key);
}

export function queueRuntimeAsset(loader, record, config) {
  if (record.type === config.types.video) {
    loader.video?.(record.asset.key, record.asset.path, record.videoNoAudio);
  } else if (record.type === config.types.audio) {
    loader.audio?.(record.asset.key, record.asset.path);
  } else if (record.type === config.types.multiatlas) {
    loader.multiatlas?.(record.asset.key, record.asset.path, record.asset.atlasPath);
  } else if (record.type === config.types.spritesheet) {
    loader.spritesheet?.(record.asset.key, record.asset.path, record.asset.frameConfig);
  } else {
    loader.image?.(
      record.asset.key,
      record.asset.normalMapPath
        ? [record.asset.path, record.asset.normalMapPath]
        : record.asset.path,
    );
  }
}

export function registerRuntimeTexture({
  scene,
  catalog,
  textureMemory,
  record,
  managed = true,
  config,
}) {
  if (![config.types.image, config.types.spritesheet, config.types.multiatlas].includes(record?.type)) return false;
  const texture = scene.textures?.get?.(record.asset.key);
  const source = texture?.source?.[0]?.image || texture?.getSourceImage?.() || null;
  const dimensions = {
    width: Number(record.width || source?.width || source?.naturalWidth || 0),
    height: Number(record.height || source?.height || source?.naturalHeight || 0),
  };
  const descriptor = catalog?.register(record.asset, {
    owner: record.owner,
    capability: record.capability,
    priority: record.priority,
    residencyClass: record.residencyClass,
    packId: record.packId,
    consumers: record.consumers,
    dimensions,
    managed,
  });
  return textureMemory.register(record.asset.key, descriptor || {
    owner: record.owner,
    ...dimensions,
    managed,
  });
}
