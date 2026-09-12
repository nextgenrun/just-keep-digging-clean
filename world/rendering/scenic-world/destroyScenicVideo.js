import { hasLiveTextureConsumer } from "../hasLiveTextureConsumer.js";

// Phaser destroys the video element, but leaves its generated texture registered.
export function destroyScenicVideo(video) {
  if (!video) return;
  const scene = video.scene;
  const texture = video.videoTexture;
  const key = texture?.key;
  const ownsTexture = key && key === video._key;
  video.stop?.(false);
  video.clearMask?.(false);
  video.destroy();
  if (!ownsTexture) return;
  const scenes = scene?.sys?.game?.scene?.scenes || [scene];
  if (scenes.some(candidate => hasLiveTextureConsumer(candidate, key))) return;
  const manager = texture.manager || scene?.textures;
  if (manager?.exists?.(key) && manager.get(key) === texture) {
    manager.remove(key);
    scene?.runtimeAssetLoadCoordinator?.textureMemory?.release?.(key);
    scene?.runtimeAssetLoadCoordinator?.assetCatalog?.descriptors?.delete(key);
  }
}
