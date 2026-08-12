import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../../values/starIdentityLibrary.js";

export function installStarIdentityTextureFrames(
  scene,
  config = STAR_IDENTITY_LIBRARY_CONFIG,
) {
  if (
    !scene?.textures
    || typeof scene.textures.get !== "function"
  ) return false;
  let installedAtlases = 0;
  for (const atlases of [config.atlases, config.lightAtlases]) {
    for (const atlas of atlases) {
      if (!scene.textures.exists(atlas.key)) continue;
      const texture = scene.textures.get(atlas.key);
      installedAtlases += 1;
      for (let frame = 0; frame < atlas.frameCount; frame += 1) {
        const frameName = `${atlas.framePrefix}${frame}`;
        if (texture.has(frameName)) continue;
        texture.add(
          frameName,
          0,
          (frame % atlas.columns) * atlas.frameSizePx,
          Math.floor(frame / atlas.columns) * atlas.frameSizePx,
          atlas.frameSizePx,
          atlas.frameSizePx,
        );
      }
    }
  }
  return installedAtlases > 0;
}
